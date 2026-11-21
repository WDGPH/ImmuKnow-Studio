"""Generate browser project data, fonts and notices without rebuilding the compiler."""

import subprocess
import sys
from pathlib import Path

from .browser_assets import copy_metadata, verify
from .prepare_runtimes import verify as verify_runtimes

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    verify()
    verify_runtimes()
    copy_metadata()
    for module in ("scripts.notices", "scripts.examples"):
        subprocess.run([sys.executable, "-m", module], cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
