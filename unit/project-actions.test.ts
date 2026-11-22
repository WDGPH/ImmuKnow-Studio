import { expect, test } from "vitest";
import { authoredTypstFiles, currentProject, resetProject } from "../src/project-actions";
import { encoder } from "../src/project";
import type { Example, Files } from "../src/types";

const template = "templates/notice.en.typ";
const baseline: Files = {
  [template]: encoder.encode(
    '// @immuknow-settings: settings.typ\n#import "settings.typ": *\nStarting wording',
  ),
  "templates/settings.typ": encoder.encode(
    '#let body-font = "FreeSans"\n#let paper-size = "us-letter"\n',
  ),
  "templates/assets/logo.png": new Uint8Array([1, 2]),
  "templates/custom/signature.svg": new Uint8Array([3, 4]),
  "templates/assets/companion.bin": new Uint8Array([5, 6]),
};
const edited: Files = {
  ...baseline,
  [template]: encoder.encode("// @immuknow-settings: settings.typ\nChanged wording"),
  "templates/settings.typ": encoder.encode(
    '#let body-font = "FreeSerif"\n#let paper-size = "a4"\n',
  ),
  "templates/assets/logo.png": new Uint8Array([7]),
  "templates/custom/signature.svg": new Uint8Array([8]),
  "templates/assets/studio-extra.svg": new Uint8Array([9]),
};

test("fictional sample can be included, omitted and preserved when customized", () => {
  const example: Example = { id: "selected", label: "", description: "", payloads: {}, preparationChecks: {}, csv: "examples/selected.csv" };
  const starters = { ...baseline, [example.csv]: encoder.encode("Fictional client") };
  const included = currentProject(starters, template, [example], example, starters);
  expect(JSON.parse(new TextDecoder().decode(included["sample.json"]))).toEqual({ csv: "input/sample/sample_students.csv", template });
  expect(included["input/sample/sample_students.csv"]).toBe(starters[example.csv]);
  const omitted = currentProject(included, template, [example], example, starters, false);
  expect(omitted["sample.json"]).toBeUndefined();
  expect(omitted["input/sample/sample_students.csv"]).toBeUndefined();
  const custom = { ...included, "input/sample/sample_students.csv": encoder.encode("Custom data") };
  const preserved = currentProject(custom, template, [example], example, starters, false);
  expect(preserved["sample.json"]).toBe(custom["sample.json"]);
  expect(preserved["input/sample/sample_students.csv"]).toBe(custom["input/sample/sample_students.csv"]);
});

test("template-only reset keeps settings and every image", () => {
  expect(resetProject(edited, baseline, template, "template")).toEqual({
    ...edited,
    [template]: baseline[template],
  });
});

test("settings reset keeps theme values and image bytes", () => {
  expect(resetProject(edited, baseline, template, "settings")).toEqual({
    ...edited,
    [template]: baseline[template],
    "templates/settings.typ": encoder.encode(
      '#let body-font = "FreeSerif"\n#let paper-size = "us-letter"\n',
    ),
  });
});

test("full reset restores overwritten images and removes uploads, preserving non-image companions", () => {
  expect(resetProject(edited, baseline, template, "theme")).toEqual(baseline);
  expect(edited["templates/assets/studio-extra.svg"]).toEqual(new Uint8Array([9]));
});

test("legacy downloads gain the pinned scaffold without overwriting authored setup", () => {
  const files = { ...baseline, "README.md": encoder.encode("Authored instructions"), "scripts/run.py": encoder.encode("Imported legacy helper") };
  const starters = {
    "template-source.json": encoder.encode(
      JSON.stringify({ files: { "README.md": "hash", "immuknow-revision.txt": "hash", "templates/other.fr.typ": "hash", "config/new.json": "hash" } }),
    ),
    "README.md": encoder.encode("Upstream instructions"),
    "immuknow-revision.txt": encoder.encode("a".repeat(40)),
    "templates/other.fr.typ": encoder.encode("Unselected starter"),
    "config/new.json": encoder.encode("{}"),
  };
  const result = currentProject(files, template, [], undefined, starters);
  expect(result["README.md"]).toBe(files["README.md"]);
  expect(result["scripts/run.py"]).toBe(files["scripts/run.py"]);
  expect(result["immuknow-revision.txt"]).toBe(starters["immuknow-revision.txt"]);
  expect(result["template-source.json"]).toBeUndefined();
  expect(result["templates/other.fr.typ"]).toBeUndefined();
  expect(result["config/new.json"]).toBeUndefined();
});

test("downloads omit unchanged scaffold extras and keep edited or referenced copies", () => {
  const extras = [".gitignore", "README.md", "build.json", "examples/README.md", "template-source.json"];
  const starters = {
    ...baseline,
    ...Object.fromEntries(extras.map((path) => [path, encoder.encode(path)])),
    "template-source.json": encoder.encode(JSON.stringify({ files: {} })),
  };
  const standard = currentProject(starters, template, [], undefined, starters);
  for (const path of extras) expect(standard[path]).toBeUndefined();

  const authored = {
    ...starters,
    [template]: encoder.encode('#read("../README.md")'),
    "examples/README.md": encoder.encode("My sample instructions"),
  };
  const download = currentProject(authored, template, [], undefined, starters);
  expect(download["README.md"]).toBe(authored["README.md"]);
  expect(download["examples/README.md"]).toBe(authored["examples/README.md"]);
});

test("sample export preserves an existing CSV at the conventional path", () => {
  const example: Example = { id: "selected", label: "", description: "", payloads: {}, preparationChecks: {}, csv: "examples/selected.csv" };
  const starters = { ...baseline, [example.csv]: encoder.encode("Fictional") };
  const files = { ...starters, "input/sample/sample_students.csv": encoder.encode("Authored") };
  const result = currentProject(files, template, [example], example, starters);
  const sample = JSON.parse(new TextDecoder().decode(result["sample.json"]));
  expect(sample).toEqual({ csv: "input/sample/sample_students-fictional-1.csv", template });
  expect(result["input/sample/sample_students.csv"]).toBe(files["input/sample/sample_students.csv"]);
  expect(result[sample.csv]).toBe(starters[example.csv]);
});

test("custom sample dependencies and authored assignments survive", () => {
  const files: Files = { ...baseline, "sample.json": encoder.encode(JSON.stringify({ csv: "input/custom.csv", template: "templates/old.en.typ" })), "input/custom.csv": encoder.encode("Custom"), "input/assignments.json": encoder.encode("Authored assignments"), "templates/old.en.typ": encoder.encode('#include "helper.typ"'), "templates/helper.typ": encoder.encode("Helper"), "templates/other.en.typ": encoder.encode("Candidate") };
  const result = currentProject(files, template, [], undefined, files, false);
  for (const [path, bytes] of Object.entries(files)) expect(result[path], path).toBe(bytes);
});

test("a custom sample template remains when fictional data is omitted", () => {
  const example: Example = { id: "a", label: "", description: "", payloads: {}, preparationChecks: {}, csv: "examples/a.csv" };
  const starters: Files = { ...baseline, [example.csv]: encoder.encode("Fictional") };
  const files: Files = { ...starters, "input/sample/sample_students.csv": starters[example.csv], "sample.json": encoder.encode(JSON.stringify({ csv: "input/sample/sample_students.csv", template: "templates/custom.en.typ" })), "templates/custom.en.typ": encoder.encode("Custom") };
  const result = currentProject(files, template, [example], example, starters, false);
  for (const path of ["sample.json", "input/sample/sample_students.csv", "templates/custom.en.typ"]) expect(result[path]).toBe(files[path]);
});

test.each([
  '{"csv":"input/sample/sample_students.csv","template":"templates/notice.en.typ","extra":true}',
  '{"csv":"input/sample/sample_students.csv","csv":"input/sample/sample_students.csv","template":"templates/notice.en.typ"}',
  '{ "csv": "input/sample/sample_students.csv", "template": "templates/notice.en.typ" }',
  JSON.stringify({ csv: "input/sample/sample_students.csv", template: "templates/other.en.typ" }, null, 2) + "\n",
])("preserves edited or invalid fictional sample descriptors: %s", (raw) => {
  const example: Example = { id: "a", label: "", description: "", payloads: {}, preparationChecks: {}, csv: "examples/a.csv" };
  const starters: Files = { ...baseline, [example.csv]: encoder.encode("Fictional"), "templates/other.en.typ": encoder.encode("Other") };
  const files: Files = { ...starters, "input/sample/sample_students.csv": starters[example.csv], "sample.json": encoder.encode(raw) };
  const result = currentProject(files, template, [example], example, starters, false);
  for (const [path, bytes] of Object.entries(files)) expect(result[path], path).toBe(bytes);
});

test("preserves an authored CSV path even when it matches fictional bytes", () => {
  const example: Example = { id: "a", label: "", description: "", payloads: {}, preparationChecks: {}, csv: "examples/a.csv" };
  const starters: Files = { ...baseline, [example.csv]: encoder.encode("Fictional") };
  const files: Files = { ...starters, "input/my-data.csv": starters[example.csv], "sample.json": encoder.encode(JSON.stringify({ csv: "input/my-data.csv", template }, null, 2) + "\n") };
  const result = currentProject(files, template, [example], example, starters, false);
  expect(result["input/my-data.csv"]).toBe(files["input/my-data.csv"]);
  expect(result["sample.json"]).toBe(files["sample.json"]);
});

test("a fictional sample with computed dependencies retains candidates", () => {
  const example: Example = { id: "a", label: "", description: "", payloads: {}, preparationChecks: {}, csv: "examples/a.csv" };
  const files: Files = { ...baseline, [example.csv]: encoder.encode("Fictional"), "input/sample/sample_students.csv": encoder.encode("Fictional"), "sample.json": encoder.encode(JSON.stringify({ csv: "input/sample/sample_students.csv", template: "templates/other.en.typ" })), "templates/other.en.typ": encoder.encode('#image("assets/" + name)'), "templates/assets/possible.png": new Uint8Array([8]) };
  const result = currentProject(files, template, [example], example, files);
  expect(result["templates/assets/possible.png"]).toBe(files["templates/assets/possible.png"]);
});

test.each(["{", "null", "[]", "{}", '{"csv":"input/missing.csv","template":"templates/old.en.typ"}']) (
  "unfinished sample remains downloadable: %s", (sample) => {
    const files = { ...baseline, "sample.json": encoder.encode(sample), "templates/other.en.typ": encoder.encode("Candidate") };
    const result = currentProject(files, template, [], undefined, files, false);
    for (const [path, bytes] of Object.entries(files)) expect(result[path], path).toBe(bytes);
  },
);

test("edited inactive notices retain their transitive starter dependencies", () => {
  const files: Files = {
    [template]: encoder.encode("Active notice"),
    "templates/other.fr.typ": encoder.encode('#import "unique.typ": *\nEdited notice'),
    "templates/unique.typ": encoder.encode('#image("assets/unique.png")'),
    "templates/assets/unique.png": new Uint8Array([3, 4]),
    "templates/assets/unused.png": new Uint8Array([5]),
    "templates/unrelated.en.typ": encoder.encode("Other starter"),
  };
  const starters = { ...files, "templates/other.fr.typ": encoder.encode("Original notice") };
  const result = currentProject(files, template, [], undefined, starters);
  for (const path of ["templates/other.fr.typ", "templates/unique.typ", "templates/assets/unique.png"])
    expect(result[path], path).toBe(files[path]);
  expect(result["templates/assets/unused.png"]).toBeUndefined();
  expect(result["templates/unrelated.en.typ"]).toBeUndefined();
});

test("computed imports in authored sources retain possible project dependencies", () => {
  const files: Files = {
    [template]: encoder.encode("Active notice"),
    "templates/other.fr.typ": encoder.encode('#let name = "helper"\n#import (name + ".typ"): *'),
    "templates/helper.typ": encoder.encode("Helper"),
    "templates/assets/hidden.png": new Uint8Array([9]),
  };
  const starters = { ...files, "templates/other.fr.typ": encoder.encode("Original") };
  const result = currentProject(files, template, [], undefined, starters);
  for (const [path, bytes] of Object.entries(files)) expect(result[path], path).toBe(bytes);
});


test("computed image path in the active notice retains the starter asset", () => {
  const files: Files = {
    [template]: encoder.encode('#image("assets/" + "signature.png")'),
    "templates/assets/signature.png": new Uint8Array([7, 8]),
  };
  const starters = { ...files, [template]: encoder.encode("Starting notice") };
  const result = currentProject(files, template, [], undefined, starters);
  expect(result["templates/assets/signature.png"]).toBe(files["templates/assets/signature.png"]);
});


test("an edited notice using the stock setup module omits unrelated starters", () => {
  const files: Files = {
    [template]: encoder.encode('#import "setup.typ": *\nEdited notice'),
    "templates/setup.typ": encoder.encode('#import "settings.typ" as immuknow\n#import immuknow: notice, logo'),
    "templates/settings.typ": encoder.encode('#import "lib/immuknow/lib.typ" as immuknow\n#let logo = image("assets/logo.png")'),
    "templates/lib/immuknow/lib.typ": encoder.encode("Shared library"),
    "templates/assets/logo.png": new Uint8Array([1]),
    "templates/assets/unused.png": new Uint8Array([2]),
    "templates/unrelated.en.typ": encoder.encode("Other starter"),
  };
  const starters = { ...files, [template]: encoder.encode("Starting notice") };
  const result = currentProject(files, template, [], undefined, starters);
  for (const path of ["templates/setup.typ", "templates/settings.typ", "templates/lib/immuknow/lib.typ", "templates/assets/logo.png"])
    expect(result[path], path).toBe(files[path]);
  expect(result["templates/assets/unused.png"]).toBeUndefined();
  expect(result["templates/unrelated.en.typ"]).toBeUndefined();
});


test.each(["json", "csv", "yaml", "xml", "toml", "cbor"])(
  "computed %s paths retain possible starter dependencies", (loader) => {
    const files: Files = {
      [template]: encoder.encode(`#let data = ${loader}("data/" + suffix)`),
      "templates/data/needed.json": encoder.encode("source data"),
    };
    const starters = { ...files, [template]: encoder.encode("Starting notice") };
    expect(currentProject(files, template, [], undefined, starters)["templates/data/needed.json"])
      .toBe(files["templates/data/needed.json"]);
  },
);

test.each(['json(sys.inputs.at("data"))', 'json(sys.inputs.data)'])(
  "native prepared input %s does not retain unused starters", (expression) => {
    const files: Files = {
      [template]: encoder.encode(`#let notice = ${expression}`),
      "templates/unrelated.en.typ": encoder.encode("Other starter"),
    };
    const starters = { ...files, [template]: encoder.encode("Starting notice") };
    expect(currentProject(files, template, [], undefined, starters)["templates/unrelated.en.typ"])
      .toBeUndefined();
  },
);

test("other sys.inputs data paths retain possible starter dependencies", () => {
  const files: Files = {
    [template]: encoder.encode('json(sys.inputs.at("translations"))'),
    "templates/data/translations.json": encoder.encode("translations"),
  };
  const starters = { ...files, [template]: encoder.encode("Starting notice") };
  expect(currentProject(files, template, [], undefined, starters)["templates/data/translations.json"])
    .toBe(files["templates/data/translations.json"]);
});


test("rebinding an imported module alias retains possible dependencies", () => {
  const files: Files = {
    [template]: encoder.encode('#import "settings.typ" as lib\n#let lib = target\n#import lib: *'),
    "templates/settings.typ": encoder.encode("Settings"),
    "templates/other.typ": encoder.encode("Possible dependency"),
  };
  const starters = { ...files, [template]: encoder.encode("Starting notice") };
  expect(currentProject(files, template, [], undefined, starters)["templates/other.typ"])
    .toBe(files["templates/other.typ"]);
});


test("source-only download retains possible computed companions and their bytes", () => {
  const files: Files = {
    [template]: encoder.encode('#include "custom/wrapper.typ"'),
    "templates/custom/wrapper.typ": encoder.encode('#let name = "helper"\n#import (name + ".typ"): *'),
    "templates/custom/helper.typ": new Uint8Array([0xef, 0xbb, 0xbf, 65, 13, 10]),
    "config/other.typ": encoder.encode("Possible companion"),
    "templates/lib/immuknow/lib.typ": encoder.encode("Shared library"),
    "templates/fonts/font.typ": encoder.encode("Font resource"),
    "templates/custom/image.png": new Uint8Array([1]),
  };
  const result = authoredTypstFiles(files, template);
  for (const path of [template, "templates/custom/wrapper.typ", "templates/custom/helper.typ", "config/other.typ"])
    expect(result[path], path).toBe(files[path]);
  for (const path of ["templates/lib/immuknow/lib.typ", "templates/fonts/font.typ", "templates/custom/image.png"])
    expect(result[path], path).toBeUndefined();
});
