import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { unzipSync, zipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import compilerPins from "../compiler-pins.json";
import {
  nativeRevision,
  nativeRuntime,
  nativeRuntimes,
  nativeVersion,
} from "../src/native-runtime";
import { decoder, encoder, MAX_FILE, sha256 } from "../src/project";
import { exportProject, exportRuntimeProject } from "../src/project-archive";
import { runtimePackage } from "../src/runtime-package";
import type { BuildInfo, Files } from "../src/types";

// Use a large executable to exercise the separate distribution limit.
const { fixture } = vi.hoisted(() => ({
  fixture: { binary: new Uint8Array(12 * 1024 * 1024 + 1).fill(0xa5), archive: new Uint8Array() },
}));
vi.mock("../native-runtimes.json", async () => {
  const { createHash } = await import("node:crypto");
  const { zipSync } = await import("fflate");
  fixture.archive = zipSync({
    "immuknow.exe": fixture.binary,
    LICENSE: new TextEncoder().encode("Fixture licence\n"),
  });
  return {
    default: {
      schemaVersion: 1,
      version: "2.0.0",
      revision: "a".repeat(40),
      platforms: [
        {
          id: "windows-x86_64",
          label: "Windows (x64)",
          filename: "immuknow-2.0.0-windows-x86_64.zip",
          size: fixture.archive.length,
          sha256: createHash("sha256").update(fixture.archive).digest("hex"),
        },
      ],
    },
  };
});

const runtimeArchive = fixture.archive;

const template = "templates/notice.en.typ";
const library = "templates/lib/immuknow/lib.typ";
const files: Files = {
  [template]: encoder.encode("\ufeff// @immuknow-settings: settings.typ\r\nAuthored words\r\n"),
  "templates/settings.typ": encoder.encode('#let font = "Custom font"\r\n'),
  [library]: encoder.encode("// reviewed shared components\n"),
  "immuknow-revision.txt": encoder.encode(`${nativeRevision}\n`),
  "sample.json": encoder.encode(JSON.stringify({ csv: "input/sample.csv", template })),
  "input/sample.csv": encoder.encode("Fictional sample\n"),
};
const build: BuildInfo = {
  ...compilerPins,
  application_version: nativeVersion,
  immuknow_source_revision: nativeRevision,
  immuknow_source_modified: false,
  rendering_schema_version: 1,
  native_typst_version: "0.15.1",
  compiler_build_sha256: "c".repeat(64),
  shared_resources: {
    sha256: "d".repeat(64),
    files: [{ path: library, sha256: await sha256(files[library]) }],
  },
  source_revision: null,
  source_modified: null,
};
const runtime = nativeRuntimes[0];

describe("ready-to-run project export", () => {
  it("requires matching reviewed source, project pin and exact archive bytes", async () => {
    for (const incompatible of [
      { ...build, immuknow_source_revision: "b".repeat(40) },
      { ...build, immuknow_source_modified: true },
      { ...build, application_version: "2.0.1" },
    ])
      expect(() => nativeRuntime(runtime.id, incompatible)).toThrow("No bundled runtime matches");
    await expect(
      exportRuntimeProject(
        {
          ...files,
          "immuknow-revision.txt": encoder.encode("b".repeat(40)),
        },
        template,
        build,
        runtime.id,
        runtimeArchive,
      ),
    ).rejects.toThrow("project's ImmuKnow pin differs");
    const changed = runtimeArchive.slice();
    changed[0] ^= 1;
    await expect(exportRuntimeProject(files, template, build, runtime.id, changed)).rejects.toThrow(
      "integrity check",
    );
    await expect(
      exportRuntimeProject(files, template, build, runtime.id, runtimeArchive.subarray(1)),
    ).rejects.toThrow("integrity check");
  });

  it("stores the executable and license directly alongside unchanged authored files", async () => {
    expect(fixture.binary.length).toBeGreaterThan(MAX_FILE);
    const projectOnly = unzipSync(await exportProject(files, template, build));
    const exported = unzipSync(
      await exportRuntimeProject(files, template, build, runtime.id, runtimeArchive),
      {
        filter: ({ compression }) => {
          expect(compression).toBe(0);
          return true;
        },
      },
    );
    expect(await sha256(exported["immuknow.exe"])).toBe(await sha256(fixture.binary));
    expect(decoder.decode(exported["ImmuKnow-LICENSE.txt"])).toBe("Fixture licence\n");
    for (const [name, bytes] of Object.entries(projectOnly)) expect(exported[name]).toEqual(bytes);
    expect(exported["immuknow-project.json"]).toBeUndefined();
    expect(exported[`runtime/${runtime.filename}`]).toBeUndefined();
    const guide = decoder.decode(exported["START-HERE.txt"]);
    expect(guide).toContain("Open run-sample.cmd");
    expect(decoder.decode(exported["immuknow.cmd"])).toContain('"%~dp0immuknow.exe" %*');
    expect(exported["run-sample.cmd"]).toBeDefined();
  });

  it("refuses runtime distribution paths that would replace authored files", async () => {
    for (const name of [
      "START-HERE.txt",
      "start-here.txt",
      "ImmuKnow-LICENSE.txt",
      "immuknow.exe/notes.txt",
      "run-sample.cmd",
    ]) {
      await expect(
        exportRuntimeProject(
          { ...files, [name]: encoder.encode("Keep this authored file") },
          template,
          build,
          runtime.id,
          runtimeArchive,
        ),
      ).rejects.toThrow("would replace");
    }
  });
});

const temporary: string[] = [];
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

function launcherFixture() {
  const root = mkdtempSync(join(tmpdir(), "immuknow runtime test "));
  temporary.push(root);
  const project = join(root, "Project with spaces");
  const source = join(root, "source");
  mkdirSync(source);
  mkdirSync(join(project, "templates/fonts"), { recursive: true });
  writeFileSync(
    join(source, "immuknow"),
    `#!/bin/sh
printf '%s\\n' "$PWD" "$TYPST_FONT_PATHS" "$#"
printf '<%s>\\n' "$@"
exit "\${TEST_NATIVE_EXIT:-0}"
`,
  );
  chmodSync(join(source, "immuknow"), 0o755);
  writeFileSync(join(source, "LICENSE"), "Fixture licence\n");
  const packed = join(root, "fixture.tar.gz");
  execFileSync("tar", ["--format=pax", "-czf", packed, "-C", source, "immuknow", "LICENSE"]);
  const archive = readFileSync(packed);
  const fixtureRuntime = {
    ...runtime,
    id: "linux-x86_64",
    label: "Linux (x64)",
    filename: "fixture.tar.gz",
    size: archive.length,
    sha256: createHash("sha256").update(archive).digest("hex"),
  };
  const entries = unzipSync(zipSync(runtimePackage(fixtureRuntime, archive, template, true)));
  for (const [name, bytes] of Object.entries(entries)) {
    const path = join(project, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
  }
  return { root, project, launcher: join(project, "immuknow.sh") };
}

describe.skipIf(process.platform === "win32")("POSIX runtime launcher", () => {
  it("launches the root executable with quoted arguments, fonts and the native exit status", () => {
    const fixture = launcherFixture();
    const args = ["run", "input with spaces.csv", "--template", "a literal 'quote' and $value"];
    const result = spawnSync("sh", [fixture.launcher, ...args], {
      cwd: fixture.root,
      env: { ...process.env, TYPST_FONT_PATHS: "/other fonts", TEST_NATIVE_EXIT: "23" },
      encoding: "utf8",
    });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(23);
    expect(result.stdout.trimEnd().split("\n")).toEqual([
      fixture.project,
      `${fixture.project}/templates/fonts:/other fonts`,
      String(args.length),
      ...args.map((arg) => `<${arg}>`),
    ]);
    expect(readFileSync(join(fixture.project, "ImmuKnow-LICENSE.txt"), "utf8")).toBe("Fixture licence\n");
  });
});
