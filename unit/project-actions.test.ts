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
    for (const [path, bytes] of Object.entries(baseline)) expect(omitted[path]).toBe(bytes);
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
    "templates/assets/companion.bin",
  ])
    expect(selected[path]).toBe(files[path]);
});

test("legacy downloads gain the pinned scaffold without overwriting authored setup", () => {
  const files = { ...baseline, "README.md": encoder.encode("Authored instructions") };
  const starters = {
    "template-source.json": encoder.encode(
      JSON.stringify({ files: { "README.md": "hash", "scripts/run.py": "hash", "templates/other.fr.typ": "hash", "config/new.json": "hash" } }),
    ),
    "README.md": encoder.encode("Upstream instructions"),
    "scripts/run.py": encoder.encode("Upstream runner"),
    "templates/other.fr.typ": encoder.encode("Unselected starter"),
    "config/new.json": encoder.encode("{}"),
  };
  const result = currentProject(files, template, [], undefined, starters);
  expect(result["README.md"]).toBe(files["README.md"]);
  expect(result["scripts/run.py"]).toBe(starters["scripts/run.py"]);
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
    "examples/sample/clients.csv": encoder.encode("Full cohort"),
    "examples/sample/assignments.json": encoder.encode('[{"client_id":"123","template":"notice.en.typ"}]'),
  };
  const result = currentProject(files, template, [example], example, starters);
  expect(result["input/sample/sample_students.csv"]).toBe(
    files["input/sample/sample_students.csv"],
  );
  expect(result["input/sample/sample_assignments.json"]).toBe(starters["examples/sample/assignments.json"]);
  expect(result[inputs.csv]).toBe(files[inputs.csv]);
  expect(JSON.parse(new TextDecoder().decode(result["sample.json"]))).toEqual({
    csv: "input/sample/sample_students-fictional-1.csv",
    assignments: "input/sample/sample_assignments.json",
  });
  expect(result["input/sample/sample_students-fictional-1.csv"]).toBe(starters["examples/sample/clients.csv"]);
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
    "templates/helper.fr.typ": encoder.encode("Required helper"),
    "templates/unrelated.en.typ": encoder.encode("Unrelated starter"),
  };
  const result = currentProject(files, template, []);
  expect(result["templates/old.en.typ"]).toBe(files["templates/old.en.typ"]);
  expect(result["templates/helper.fr.typ"]).toBe(files["templates/helper.fr.typ"]);
  expect(result["templates/unrelated.en.typ"]).toBeUndefined();
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
