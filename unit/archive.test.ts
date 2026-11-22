import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { exportProject, exportTypstFiles } from "../src/project-archive";
import { encoder, MAX_FILE, sha256, verifyProjectBuild } from "../src/project";
import type { BuildInfo, Files } from "../src/types";
import pins from "../compiler-pins.json";

const plugin = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 255]);
const build: BuildInfo = {
  ...pins,
  application_version: "1.1.0",
  rendering_schema_version: 1,
  native_typst_version: "0.15.1",
  compiler_build_sha256: "c".repeat(64),
  shared_resources: {
    sha256: "d".repeat(64),
    files: [
      {
        path: "templates/lib/immuknow/lib.typ",
        sha256: await sha256(encoder.encode("// Supplied components\n")),
      },
      {
        path: "templates/lib/immuknow/vendor/qr/qr.wasm",
        sha256: await sha256(plugin),
      },
    ],
  },
  source_revision: null,
  source_modified: null,
};
const template = "templates/edited.en.typ";
const files: Files = {
  "templates/lib/immuknow/lib.typ": encoder.encode("// Supplied components\n"),
  "templates/lib/immuknow/vendor/qr/qr.wasm": plugin,
  [template]: encoder.encode(
    '\ufeff// @immuknow-settings: settings.typ\r\n#import "settings.typ": *\r\nAuthored words\r\n',
  ),
  "templates/settings.typ": encoder.encode(
    "#let logo = none\n#let show-history = false\n#let width = 12.345678mm\n",
  ),
  "templates/assets/authored.png": new Uint8Array([0, 1, 255, 2, 3]),
};

function unzipStored(bytes: Uint8Array) {
  return unzipSync(bytes, {
    filter: ({ compression }) => {
      expect(compression).toBe(0);
      return true;
    },
  });
}

describe("current project archives", () => {
  it("preserves authored bytes and records their hashes", async () => {
    const archive = unzipStored(await exportProject(files, template, build));
    const manifest = JSON.parse(new TextDecoder().decode(archive["immuknow-project.json"]));
    expect(manifest.template).toBe(template);
    expect(manifest.build).toEqual(build);
    expect(Object.keys(manifest.hashes).sort()).toEqual(Object.keys(files).sort());
    for (const [path, bytes] of Object.entries(files)) {
      expect(archive[path]).toEqual(bytes);
      expect(manifest.hashes[path]).toBe(await sha256(bytes));
    }
  });

  it("rejects unsafe, duplicate and oversized project files before export", async () => {
    for (const name of ["../escape.typ", "/absolute.typ", "templates/../escape.typ"]) {
      await expect(exportProject({ ...files, [name]: encoder.encode("text") }, template, build))
        .rejects.toThrow("Unsafe project path");
    }
    await expect(exportProject({
      ...files,
      "templates/a.en.typ": encoder.encode("one"),
      "templates/A.en.typ": encoder.encode("two"),
    }, template, build)).rejects.toThrow("Duplicate project path");
    await expect(exportProject({ ...files, "large.bin": new Uint8Array(MAX_FILE + 1) }, template, build))
      .rejects.toThrow("12 MB");
  });

  it("keeps draft compatibility tied to formats, shared resources and the compiler", () => {
    for (const incompatible of [
      { ...build, compiler_build_sha256: "a".repeat(64) },
      { ...build, shared_resources: { ...build.shared_resources, sha256: "changed" } },
      { ...build, native_typst_version: "unsupported" },
    ]) {
      expect(() => verifyProjectBuild(build, incompatible)).toThrow("different ImmuKnow format or compiler");
    }
    expect(() => verifyProjectBuild(build, {
      ...build,
      application_version: "another-release",
      source_revision: "another-checkout",
      source_modified: !build.source_modified,
    })).not.toThrow();
  });

  it("requires the same English/French filename contract for selected entries", async () => {
    for (const name of [
      "config/edited.en.typ",
      "templates/.en.typ",
      "templates/has.dots.en.typ",
      "templates/edited.es.typ",
    ]) {
      await expect(
        exportProject({ ...files, [name]: encoder.encode("text") }, name, build),
      ).rejects.toThrow("entry point");
    }
  });

  it("checks library bytes against the app before export", async () => {
    const library = "templates/lib/immuknow/lib.typ";
    for (const change of ["changed", "missing", "extra", "renamed"]) {
      const changed = { ...files };
      if (change === "changed") changed[library] = encoder.encode("// Changed components\n");
      if (change === "extra" || change === "renamed")
        changed["templates/lib/immuknow/extra.typ"] = files[library];
      if (change === "missing" || change === "renamed") delete changed[library];
      await expect(exportProject(changed, template, build)).rejects.toThrow(/supplied/);
    }
  });
});

describe("Typst-only downloads", () => {
  it("preserves authored bytes and transitive paths without bundling a project or shared resources", () => {
    const source: Files = {
      ...files,
      [template]: encoder.encode(
        '\ufeff// @immuknow-settings: settings.typ\r\n#import "lib/immuknow/lib.typ": *\r\n#include "custom/helper.typ"\r\n',
      ),
      "templates/settings.typ": encoder.encode('#import "custom/style.typ": *\r\n'),
      "templates/custom/helper.typ": encoder.encode('#include "../../config/phrases.typ"'),
      "config/phrases.typ": encoder.encode('#include "../templates/custom/helper.typ"'),
      "templates/custom/style.typ": encoder.encode('Authored style'),
      "templates/unrelated.fr.typ": encoder.encode('Other notice'),
      "templates/unused.typ": encoder.encode('Unused helper'),
      "templates/fonts/font.typ": encoder.encode('Font metadata'),
      "config/input.json": encoder.encode('{}'),
      "scripts/run.py": encoder.encode('print("run")'),
    };
    const exported = unzipStored(exportTypstFiles(source, template));
    const expected = [template, "templates/settings.typ", "templates/custom/helper.typ",
      "config/phrases.typ", "templates/custom/style.typ"];
    expect(Object.keys(exported).sort()).toEqual(expected.sort());
    for (const path of expected) expect(exported[path]).toEqual(source[path]);
  });

  it("keeps path, size and entry-point validation for source-only archives", () => {
    expect(() => exportTypstFiles({ ...files, "../escape.typ": encoder.encode("bad") }, template))
      .toThrow("Unsafe project path");
    expect(() => exportTypstFiles({ ...files, [template]: new Uint8Array(MAX_FILE + 1) }, template))
      .toThrow("12 MB");
    expect(() => exportTypstFiles(files, "templates/missing.en.typ")).toThrow("entry point");
  });
});
