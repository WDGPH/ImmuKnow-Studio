import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

test("installed Template resources must select the same Core revision as Studio", () => {
  const output = execFileSync("uv", ["run", "--locked", "python", "-c", `
from unittest.mock import patch
from immuknow.resources import rendering_build_info
from scripts.project_template import scaffold_files
files = scaffold_files()
assert "scripts/run.py" in files
assert "templates/setup.typ" in files
assert "config/notice_versions.yaml" in files
assert not any(name.startswith("templates/lib/") for name in files)
wrong = dict(files)
wrong["uv.lock"] = files["uv.lock"].replace(rendering_build_info()["core_source_revision"].encode(), b"0" * 40)
with patch("scripts.project_template.project_files", return_value=wrong):
    try:
        scaffold_files()
    except ValueError as error:
        assert "same Core commit" in str(error)
    else:
        raise AssertionError("Mismatched Core pin accepted")
print("verified")
`], { encoding: "utf8" });
  expect(output.trim()).toBe("verified");
});
