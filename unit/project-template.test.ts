import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";
import { authoredTypstFiles, currentProject } from "../src/project-actions";
import { encoder } from "../src/project";
import type { Files } from "../src/types";

test("installed Template resources must select the same ImmuKnow revision as Studio", () => {
  const output = execFileSync("uv", ["run", "--locked", "python", "-c", `
import json
from unittest.mock import patch
from scripts.project_template import scaffold_files
files = scaffold_files()
assert not any(name.startswith("scripts/") for name in files)
assert not {"pyproject.toml", "uv.lock", ".python-version", ".pre-commit-config.yaml"}.intersection(files)
assert "immuknow-revision.txt" in files
assert "templates/settings.typ" in files
assert "templates/setup.typ" not in files
assert "templates/presentation.typ" not in files
assert "config/notice_versions.yaml" not in files
assert not any(name.startswith("templates/lib/") for name in files)
wrong = dict(files)
wrong["immuknow-revision.txt"] = b"0" * 40
with patch("scripts.project_template.project_files", return_value=wrong):
    try:
        scaffold_files()
    except ValueError as error:
        assert "same ImmuKnow commit" in str(error)
    else:
        raise AssertionError("Mismatched ImmuKnow pin accepted")
wrong = dict(files)
origin = json.loads(files["template-source.json"])
origin["revision"] = None
wrong["template-source.json"] = json.dumps(origin).encode()
with patch("scripts.project_template.project_files", return_value=wrong):
    try:
        scaffold_files()
    except ValueError as error:
        assert "pinned Git source" in str(error)
    else:
        raise AssertionError("Missing Template revision accepted")
print("verified")
`], { encoding: "utf8" });
  expect(output.trim()).toBe("verified");
});


test("edited installed starter retains all translation files without unrelated starter notices", () => {
  const encoded = execFileSync("uv", ["run", "--locked", "python", "-c", `
import base64, json
from immuknow_template.resources import project_files
print(json.dumps({name: base64.b64encode(data).decode("ascii") for name, data in project_files().items()}))
`], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const files: Files = Object.fromEntries(
    Object.entries(JSON.parse(encoded) as Record<string, string>).map(([path, value]) => [
      path, new Uint8Array(Buffer.from(value, "base64")),
    ]),
  );
  delete files["sample.json"];
  delete files["input/sample/sample_students.csv"];
  const template = "templates/overdue_diseases.en.typ";
  const edited = { ...files, [template]: encoder.encode(`${new TextDecoder().decode(files[template])}\n// Authored edit\n`) };
  const result = currentProject(edited, template, [], undefined, files);
  expect(Object.keys(authoredTypstFiles(edited, template)).sort()).toEqual(
    [template, "templates/settings.typ"].sort(),
  );
  for (const name of ["en_diseases_chart", "en_diseases_overdue", "fr_diseases_chart", "fr_diseases_overdue"]) {
    const path = `templates/translations/${name}.json`;
    expect(result[path], path).toBe(files[path]);
  }
  expect(result["templates/affirmative_schedule.en.typ"]).toBeUndefined();
});
