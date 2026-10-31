"""Verify the bundled Template scaffold, or refresh it from a local Git checkout.

Normal builds read only the reviewed snapshot; no private repository access is
needed. Refresh explicitly with --source and --revision (a full commit SHA).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
import tomllib
from pathlib import Path, PurePosixPath

from immuknow.resources import rendering_build_info

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "assets/project-template"
PROVENANCE = "template-source.json"
REPOSITORY = "https://github.com/WDGPH/ImmuKnow-Template"


def safe_path(value: str) -> str:
    if (
        not value
        or "\\" in value
        or ":" in value
        or PurePosixPath(value).is_absolute()
        or any(part in {"", ".", ".."} for part in value.split("/"))
    ):
        raise ValueError(f"Unsafe scaffold path: {value!r}")
    return value


def scaffold_files(snapshot: Path = SNAPSHOT) -> dict[str, bytes]:
    """Load intact upstream files and their original source identity."""
    provenance = (snapshot / PROVENANCE).read_bytes()
    manifest = json.loads(provenance)
    if manifest["repository"] != REPOSITORY or not re.fullmatch(
        r"[0-9a-f]{40}", manifest["revision"]
    ):
        raise ValueError("Invalid Template source identity")
    hashes = manifest["files"]
    actual = {
        path.relative_to(snapshot).as_posix()
        for path in snapshot.rglob("*")
        if path.is_file() and path.name != PROVENANCE
    }
    if actual != set(hashes):
        raise ValueError("Template snapshot files differ from the source manifest")
    files = {}
    for name, expected in hashes.items():
        path = snapshot / safe_path(name)
        if path.is_symlink():
            raise ValueError(f"Template snapshot contains a symlink: {name}")
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != expected:
            raise ValueError(f"Template snapshot hash differs: {name}")
        files[name] = data
    lock = tomllib.loads(files["uv.lock"].decode())
    (core,) = [package for package in lock["package"] if package["name"] == "immuknow"]
    if (
        core["source"]["git"].split("#")[-1]
        != rendering_build_info()["core_source_revision"]
    ):
        raise ValueError("Template and Studio must lock the same Core commit")
    return files | {PROVENANCE: provenance}


def refresh(source: Path, revision: str) -> None:
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("Use a full Template commit SHA for --revision")

    def blob(path: str) -> bytes:
        return subprocess.check_output(
            ["git", "show", f"{revision}:{safe_path(path)}"], cwd=source
        )

    names = json.loads(blob("studio-scaffold.json"))["files"]
    if len(names) != len(set(names)) or PROVENANCE in names:
        raise ValueError("Duplicate or reserved path in Template scaffold list")
    with tempfile.TemporaryDirectory(prefix="studio-scaffold-") as temporary:
        staging = Path(temporary) / "snapshot"
        staging.mkdir()
        hashes = {}
        for name in names:
            data = blob(name)
            target = staging / safe_path(name)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            hashes[name] = hashlib.sha256(data).hexdigest()
        (staging / PROVENANCE).write_text(
            json.dumps(
                {"repository": REPOSITORY, "revision": revision, "files": hashes},
                indent=2,
                sort_keys=True,
            )
            + "\n"
        )
        scaffold_files(staging)
        if SNAPSHOT.exists():
            shutil.rmtree(SNAPSHOT)
        shutil.copytree(staging, SNAPSHOT)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path)
    parser.add_argument("--revision")
    args = parser.parse_args()
    if bool(args.source) != bool(args.revision):
        parser.error("provide --source and --revision together")
    if args.source:
        refresh(args.source, args.revision)
    files = scaffold_files()
    print(f"Verified {len(files) - 1} Template scaffold files")


if __name__ == "__main__":
    main()
