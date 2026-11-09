import { expect, test } from "vitest";
import { currentProject, resetProject } from "../src/project-actions";
import { encoder } from "../src/project";
import type { Example, Files } from "../src/types";

test("a scoped import retains authored example inputs without adding preview copies", () => {
  const example: Example = {
    id: "selected",
    label: "",
    description: "",
    payloads: {},
    preparationChecks: {},
    inputs: {
      "notice.en.typ": { csv: "examples/selected.csv", assignments: "examples/selected.json" },
    },
  };
  const authored = {
    "templates/notice.en.typ": encoder.encode("Notice"),
    "examples/selected.csv": encoder.encode("Authored CSV"),
  };
  const starters = {
    "examples/selected.csv": encoder.encode("Starter CSV"),
    "examples/selected.json": encoder.encode("Starter assignment"),
  };
  const result = currentProject(authored, "templates/notice.en.typ", [example], example, starters);
  expect(result["examples/selected.csv"]).toBe(authored["examples/selected.csv"]);
  expect(result["examples/selected.json"]).toBeUndefined();
});

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

test("fictional inputs are optional, including after importing a Studio sample", () => {
  const inputs = { csv: "examples/selected.csv", assignments: "examples/selected.json" };
  const example: Example = {
    id: "selected", label: "", description: "", payloads: {}, preparationChecks: {},
    inputs: { "notice.en.typ": inputs },
  };
  const starters = {
    ...baseline,
    "examples/sample/clients.csv": encoder.encode("Full cohort"),
    "examples/sample/assignments.json": encoder.encode('[ {"client_id":"123","template":"notice.en.typ"} ]'),
    [inputs.csv]: encoder.encode("Fictional client"),
    [inputs.assignments]: encoder.encode('[{"client_id":"123","template":"notice.en.typ"}]'),
  };
  const included = currentProject(starters, template, [example], example, starters);
  for (const files of [starters, included]) {
    const omitted = currentProject(files, template, [example], example, starters, false);
    for (const path of [inputs.csv, inputs.assignments, "sample.json", "input/sample/sample_students.csv", "input/sample/sample_assignments.json"])
      expect(omitted[path], path).toBeUndefined();
    for (const path of [template, "templates/settings.typ"]) expect(omitted[path]).toBe(baseline[path]);
  }
  expect(included["sample.json"]).toBeDefined();
  expect(starters[inputs.csv]).toBeDefined();

  const custom: Files = {
    ...included,
    "input/sample/sample_students.csv": encoder.encode("Custom imported data"),
  };
  const preserved = currentProject(custom, template, [example], example, starters, false);
  for (const path of ["sample.json", "input/sample/sample_students.csv", "input/sample/sample_assignments.json"])
    expect(preserved[path]).toBe(custom[path]);
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

test("current download keeps selected example and referenced entries but excludes unrelated examples", () => {
  const example: Example = {
    id: "selected",
    label: "",
    description: "",
    payloads: {},
    preparationChecks: {},
    inputs: {
      "notice.en.typ": { csv: "examples/selected.csv", assignments: "examples/selected.json" },
    },
  };
  const other: Example = {
    ...example,
    id: "other",
    inputs: { "other.fr.typ": { csv: "examples/other.csv", assignments: "examples/other.json" } },
  };
  const files = {
    ...baseline,
    [template]: encoder.encode('#import "nested/helper.typ"\n#import "notice.fr.typ"'),
    "templates/nested/helper.typ": encoder.encode('#include "../extra.en.typ"'),
    "templates/notice.fr.typ": encoder.encode("Referenced translation"),
    "templates/extra.en.typ": encoder.encode("Referenced companion"),
    "templates/unrelated.en.typ": encoder.encode("Other starter"),
    "examples/selected.csv": new Uint8Array([1]),
    "examples/selected.json": new Uint8Array([2]),
    "examples/other.csv": new Uint8Array([3]),
    "examples/other.json": new Uint8Array([4]),
  };
  const selected = currentProject(files, template, [example, other], example, files);
  expect(Object.keys(selected)).not.toContain("templates/unrelated.en.typ");
  expect(Object.keys(selected)).not.toContain("examples/other.csv");
  expect(Object.keys(selected)).not.toContain("examples/other.json");
  for (const path of [
    template,
    "templates/nested/helper.typ",
    "templates/notice.fr.typ",
    "templates/extra.en.typ",
  ])
    expect(selected[path]).toBe(files[path]);
});

test("legacy downloads gain the pinned scaffold without overwriting authored setup", () => {
  const files = { ...baseline, "README.md": encoder.encode("Authored instructions"), "scripts/run.py": encoder.encode("Imported legacy helper") };
  const starters = {
    "template-source.json": encoder.encode(
      JSON.stringify({ files: { "README.md": "hash", "core-revision.txt": "hash", "templates/other.fr.typ": "hash", "config/new.json": "hash" } }),
    ),
    "README.md": encoder.encode("Upstream instructions"),
    "core-revision.txt": encoder.encode("a".repeat(40)),
    "templates/other.fr.typ": encoder.encode("Unselected starter"),
    "config/new.json": encoder.encode("{}"),
  };
  const result = currentProject(files, template, [], undefined, starters);
  expect(result["README.md"]).toBe(files["README.md"]);
  expect(result["scripts/run.py"]).toBe(files["scripts/run.py"]);
  expect(result["core-revision.txt"]).toBe(starters["core-revision.txt"]);
  expect(result["template-source.json"]).toBe(starters["template-source.json"]);
  expect(result["templates/other.fr.typ"]).toBeUndefined();
  expect(result["config/new.json"]).toBeUndefined();
});

test("switching preview retains an imported sample and its original inputs", () => {
  const original = { csv: "examples/old.csv", assignments: "examples/old.json" };
  const next = { csv: "examples/new.csv", assignments: "examples/new.json" };
  const example: Example = {
    id: "new",
    label: "",
    description: "",
    payloads: {},
    preparationChecks: {},
    inputs: { "notice.en.typ": next },
  };
  const old = { ...example, id: "old", inputs: { "notice.en.typ": original } };
  const files = {
    ...baseline,
    "sample.json": encoder.encode(JSON.stringify(original)),
    [original.csv]: encoder.encode("Authored CSV"),
    [original.assignments]: encoder.encode("Authored assignments"),
    [next.csv]: encoder.encode("New CSV"),
    [next.assignments]: encoder.encode("New assignments"),
  };
  const result = currentProject(files, template, [old, example], example);
  for (const path of ["sample.json", ...Object.values(original), ...Object.values(next)])
    expect(result[path]).toBe(files[path]);
});

test("new downloads include conventional sample copies without replacing authored bytes", () => {
  const inputs = { csv: "examples/selected.csv", assignments: "examples/selected.json" };
  const example: Example = {
    id: "selected",
    label: "",
    description: "",
    payloads: {},
    preparationChecks: {},
    inputs: { "notice.en.typ": inputs },
  };
  const files = {
    ...baseline,
    [inputs.csv]: encoder.encode("Selected CSV"),
    [inputs.assignments]: encoder.encode("Selected assignments"),
    "input/sample/sample_students.csv": encoder.encode("Authored sample"),
  };
  const starters = {
    ...baseline,
    [inputs.csv]: encoder.encode("Full cohort"),
    [inputs.assignments]: encoder.encode('[{"client_id":"123","template":"notice.en.typ"}]'),
  };
  const result = currentProject(files, template, [example], example, starters);
  expect(result["input/sample/sample_students.csv"]).toBe(
    files["input/sample/sample_students.csv"],
  );
  expect(result["input/sample/sample_assignments.json"]).toBe(starters[inputs.assignments]);
  expect(result[inputs.csv]).toBe(files[inputs.csv]);
  expect(JSON.parse(new TextDecoder().decode(result["sample.json"]))).toEqual({
    csv: "input/sample/sample_students-fictional-1.csv",
    assignments: "input/sample/sample_assignments.json",
  });
  expect(result["input/sample/sample_students-fictional-1.csv"]).toBe(starters[inputs.csv]);
});

test("preserved sample assignments retain their notice and transitive companions", () => {
  const files = {
    ...baseline,
    "sample.json": encoder.encode(
      JSON.stringify({ csv: "examples/old.csv", assignments: "examples/old.json" }),
    ),
    "examples/old.csv": encoder.encode("Original cohort"),
    "examples/old.json": encoder.encode(
      JSON.stringify([{ client_id: "123", template: "old.en.typ" }]),
    ),
    "templates/old.en.typ": encoder.encode('#include "helper.fr.typ"'),
    "templates/helper.fr.typ": encoder.encode('#image("assets/old.png")'),
    "templates/assets/old.png": new Uint8Array([42]),
    "templates/unrelated.en.typ": encoder.encode("Unrelated starter"),
  };
  const result = currentProject(files, template, [], undefined, files);
  expect(result["templates/assets/old.png"]).toBe(files["templates/assets/old.png"]);
  expect(result["templates/old.en.typ"]).toBe(files["templates/old.en.typ"]);
  expect(result["templates/helper.fr.typ"]).toBe(files["templates/helper.fr.typ"]);
  expect(result["templates/unrelated.en.typ"]).toBe(files["templates/unrelated.en.typ"]);
});

test.each(["{", "{}", '{"csv":"examples/old.csv","assignments":"missing.json"}'])(
  "unfinished sample selection remains downloadable unchanged: %s",
  (sample) => {
    const files = {
      ...baseline,
      "sample.json": encoder.encode(sample),
      "templates/other.fr.typ": encoder.encode("Possible sample notice"),
      "examples/other.csv": encoder.encode("Possible sample input"),
    };
    const result = currentProject(files, template, []);
    for (const [path, bytes] of Object.entries(files)) expect(result[path]).toBe(bytes);
  },
);


test("fresh export contains only active starter dependencies and the selected example", () => {
  const selected = { csv: "examples/clients/a.csv", assignments: "examples/a.json" };
  const other = { csv: "examples/clients/b.csv", assignments: "examples/b.json" };
  const example: Example = { id: "a", label: "", description: "", payloads: {}, preparationChecks: {}, inputs: { "notice.en.typ": selected } };
  const alternative: Example = { ...example, id: "b", inputs: { "notice.en.typ": other } };
  const files: Files = {
    [template]: encoder.encode('// @immuknow-settings: settings.typ\n#import "settings.typ"\n#image("assets/used.png")'),
    "templates/settings.typ": encoder.encode('#image("assets/settings.png")'),
    "templates/other.en.typ": encoder.encode("Other starter"),
    "templates/edited.fr.typ": encoder.encode("Edited notice"),
    "templates/custom.en.typ": encoder.encode("Custom notice"),
    "templates/assets/used.png": new Uint8Array([1]),
    "templates/assets/settings.png": new Uint8Array([2]),
    "templates/assets/unused.png": new Uint8Array([3]),
    "templates/assets/custom.png": new Uint8Array([4]),
    "templates/lib/immuknow/lib.typ": encoder.encode("Shared"),
    "config/parameters.yaml": encoder.encode("Configuration"),
    [selected.csv]: encoder.encode("selected facts"),
    [selected.assignments]: encoder.encode('[{"client_id":"123","template":"notice.en.typ"}]'),
    [other.csv]: encoder.encode("other facts"),
    [other.assignments]: encoder.encode("other assignments"),
    "examples/sample/clients.csv": encoder.encode("full cohort"),
    "examples/sample/assignments.json": encoder.encode("original assignments"),
  };
  const starters = { ...files };
  delete starters["templates/assets/custom.png"];
  delete starters["templates/custom.en.typ"];
  starters["templates/edited.fr.typ"] = encoder.encode("Original notice");
  const result = currentProject(files, template, [example, alternative], example, starters);
  for (const path of [template, "templates/settings.typ", "templates/assets/used.png", "templates/assets/settings.png", "templates/assets/custom.png", "templates/edited.fr.typ", "templates/custom.en.typ", "templates/lib/immuknow/lib.typ", "config/parameters.yaml"])
    expect(result[path], path).toBe(files[path]);
  for (const path of ["templates/other.en.typ", "templates/assets/unused.png", selected.csv, selected.assignments, other.csv, other.assignments, "examples/sample/clients.csv", "examples/sample/assignments.json"])
    expect(result[path], path).toBeUndefined();
  expect(result["input/sample/sample_students.csv"]).toBe(files[selected.csv]);
  expect(result["input/sample/sample_assignments.json"]).toBe(files[selected.assignments]);
  const omitted = currentProject(result, template, [example, alternative], example, starters, false);
  expect(omitted["sample.json"]).toBeUndefined();
  expect(omitted["input/sample/sample_students.csv"]).toBeUndefined();
  expect(omitted["input/sample/sample_assignments.json"]).toBeUndefined();
});


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
