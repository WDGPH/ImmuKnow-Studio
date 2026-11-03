"""Read the verified starter scaffold from the locked Template resource package."""

from __future__ import annotations

import json
import re
import tomllib

from immuknow.resources import rendering_build_info
from immuknow_template.resources import project_files, resource_root

PROJECT_TEMPLATE = resource_root()


def scaffold_files() -> dict[str, bytes]:
    """Require Template's complete package payload and the same locked Core revision."""
    files = project_files()
    lock = tomllib.loads(files["uv.lock"].decode())
    (core,) = [package for package in lock["package"] if package["name"] == "immuknow"]
    if (
        core["source"]["git"].split("#")[-1]
        != rendering_build_info()["core_source_revision"]
    ):
        raise ValueError("Template and Studio must lock the same Core commit")
    revision = json.loads(files["template-source.json"])["revision"]
    if not isinstance(revision, str) or not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError(
            "Template resources must be installed from the pinned Git source"
        )
    return files


def main() -> None:
    files = scaffold_files()
    print(f"Verified {len(files) - 1} installed Template scaffold files")


if __name__ == "__main__":
    main()
