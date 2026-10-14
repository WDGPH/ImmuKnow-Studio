"""Copy resources from the installed, locked Core package for browser tooling."""

import shutil
from pathlib import Path

from immuknow.resources import resource_root

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    source = resource_root()
    destination = ROOT / "generated/core"
    for name in ("schemas", "templates", "config"):
        target = destination / name
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(source / name, target)


if __name__ == "__main__":
    main()
