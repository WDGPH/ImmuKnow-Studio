"""Combine installed Core identity with Studio's own source and browser pins."""

import json
import subprocess
from hashlib import sha256
from pathlib import Path

from immuknow.resources import rendering_build_info

ROOT = Path(__file__).resolve().parents[1]


def project_build() -> dict:
    pins = json.loads((ROOT / "compiler-pins.json").read_text(encoding="utf-8"))
    revision = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    modified = bool(
        subprocess.check_output(
            ["git", "status", "--porcelain"], cwd=ROOT, text=True
        ).strip()
    )
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    core = rendering_build_info()
    # Project compatibility follows authored paths and bytes, not package layout.
    shared = [
        {
            **item,
            "path": "templates/lib/immuknow/" + item["path"].removeprefix("typst/"),
        }
        if item["path"].startswith("typst/")
        else item
        for item in core["shared_resources"]["files"]
    ]
    core["shared_resources"] = {
        "sha256": sha256(json.dumps(shared, sort_keys=True).encode()).hexdigest(),
        "files": shared,
    }
    return {
        **core,
        **pins,
        "studio_version": package["version"],
        "compiler_build_sha256": sha256(
            json.dumps(pins["browser_compiler"], sort_keys=True).encode()
        ).hexdigest(),
        "source_revision": revision,
        "source_modified": modified,
    }
