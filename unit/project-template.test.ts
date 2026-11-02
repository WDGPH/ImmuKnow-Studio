import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

test("Template snapshot rejects changed files and mismatched Core pins", () => {
  const output = execFileSync(
    "uv",
    [
      "run",
      "--locked",
      "python",
      "-c",
      `
import hashlib, json, shutil, tempfile
from pathlib import Path
from scripts.project_template import PROVENANCE, SNAPSHOT, scaffold_files
files = scaffold_files()
assert "scripts/run.py" in files
assert "templates/overdue_diseases_v1.en.typ" in files
assert "templates/settings.typ" in files
assert "config/notice_versions.yaml" in files
assert not any(name.startswith("templates/lib/") for name in files)
with tempfile.TemporaryDirectory() as temporary:
    snapshot = Path(temporary) / "snapshot"
    shutil.copytree(SNAPSHOT, snapshot)
    path = snapshot / "scripts/run.py"
    path.write_bytes(path.read_bytes() + b"changed")
    try:
        scaffold_files(snapshot)
    except ValueError as error:
        assert "hash differs" in str(error)
    else:
        raise AssertionError("Changed scaffold accepted")
    shutil.copytree(SNAPSHOT, snapshot, dirs_exist_ok=True)
    lock = snapshot / "uv.lock"
    data = lock.read_text()
    from immuknow.resources import rendering_build_info
    data = data.replace(rendering_build_info()["core_source_revision"], "0" * 40)
    lock.write_text(data)
    manifest_path = snapshot / PROVENANCE
    manifest = json.loads(manifest_path.read_text())
    manifest["files"]["uv.lock"] = hashlib.sha256(lock.read_bytes()).hexdigest()
    manifest_path.write_text(json.dumps(manifest))
    try:
        scaffold_files(snapshot)
    except ValueError as error:
        assert "same Core commit" in str(error)
    else:
        raise AssertionError("Mismatched Core pin accepted")
print("verified")
`,
    ],
    { encoding: "utf8" },
  );
  expect(output.trim()).toBe("verified");
});
