"""Generate browser tooling resources from locked Core and Template packages."""

import shutil
from pathlib import Path

from .native_core import resource_root
from .project_template import scaffold_files

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    scaffold = scaffold_files()
    resource_root()
    branding = ROOT / "generated/template-branding"
    if branding.exists():
        shutil.rmtree(branding)
    branding.mkdir(parents=True)
    for name in ("logo.png", "signature.png"):
        (branding / name).write_bytes(scaffold[f"templates/assets/{name}"])


if __name__ == "__main__":
    main()
