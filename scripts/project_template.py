"""Read the starter scaffold from the locked Template resource package."""

from __future__ import annotations

import json
import re

from immuknow_template.resources import project_files, resource_root

from .native_core import revision as core_revision

PROJECT_TEMPLATE = resource_root()


def scaffold_files() -> dict[str, bytes]:
    """Read Template resources and require the same locked Core revision."""
    files = project_files()
    if files["core-revision.txt"].decode().strip() != core_revision():
        raise ValueError("Template and Studio must lock the same Core commit")
    revision = json.loads(files["template-source.json"])["revision"]
    if not isinstance(revision, str) or not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError(
            "Template resources must be installed from the pinned Git source"
        )
    return files


def main() -> None:
    files = scaffold_files()
    print(f"Read {len(files) - 1} installed Template scaffold files")


if __name__ == "__main__":
    main()
