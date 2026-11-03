"""Generate browser tooling resources from locked Core and Template packages."""

import shutil
from pathlib import Path

from immuknow.resources import resource_root

from .project_template import scaffold_files

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    scaffold = scaffold_files()
    source = resource_root()
    destination = ROOT / "generated/core"
    if destination.exists():
        shutil.rmtree(destination)
    for name in ("schemas", "typst"):
        target = destination / name
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(source / name, target)

    branding = ROOT / "generated/template-branding"
    if branding.exists():
        shutil.rmtree(branding)
    branding.mkdir(parents=True)
    for name in ("logo.png", "signature.png"):
        (branding / name).write_bytes(scaffold[f"templates/assets/{name}"])


if __name__ == "__main__":
    main()
