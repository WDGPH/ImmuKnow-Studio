import { expect, test } from "vitest";
import { currentProject, resetProject } from "../src/project-actions";
import { encoder } from "../src/project";
import type { Example, Files } from "../src/types";

test("a new preview client after scoped import fills only missing selected inputs", () => {
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
  expect(result["examples/selected.json"]).toBe(starters["examples/selected.json"]);
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
  const selected = currentProject(files, template, [example, other], example);
  expect(Object.keys(selected)).not.toContain("templates/unrelated.en.typ");
  expect(Object.keys(selected)).not.toContain("examples/other.csv");
  expect(Object.keys(selected)).not.toContain("examples/other.json");
  for (const path of [
    template,
    "templates/nested/helper.typ",
    "templates/notice.fr.typ",
    "templates/extra.en.typ",
    "examples/selected.csv",
    "examples/selected.json",
    "templates/assets/companion.bin",
  ])
    expect(selected[path]).toBe(files[path]);
});
