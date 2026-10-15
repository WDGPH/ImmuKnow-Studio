"""Prepare pinned browser assets and build Studio as a standalone static site."""

import argparse
import os
import subprocess
import sys
from pathlib import Path

from scripts.browser_assets import copy_metadata, prepare, verify

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--compiler-source",
        type=Path,
        default=Path(
            os.environ.get("IMMUKNOW_COMPILER_BUILD_DIR", ROOT / ".compiler-build")
        ),
    )
    parser.add_argument(
        "--require-prepared-toolchain",
        action="store_true",
        help="Fail on missing or stale browser artifacts instead of compiling Rust",
    )
    args = parser.parse_args()
    if args.require_prepared_toolchain:
        verify()
    else:
        try:
            verify()
        except (FileNotFoundError, ValueError) as exc:
            print(f"Preparing missing or stale browser artifacts: {exc}", flush=True)
            prepare(args.compiler_source)
    copy_metadata()
    for command in (
        [sys.executable, "-m", "scripts.notices"],
        [sys.executable, "-m", "scripts.examples", "--check"],
        ["npm", "run", "build"],
    ):
        subprocess.run(command, cwd=ROOT, check=True)
    print(f"Complete static artifact: {ROOT / 'dist'}")


if __name__ == "__main__":
    main()
