"""Prepare pinned browser assets and build Studio as a standalone static site."""

import argparse
import os
import subprocess
from pathlib import Path

from scripts.browser_assets import prepare, verify
from scripts.prepare_runtimes import prepare as prepare_runtimes
from scripts.prepare_runtimes import verify as verify_runtimes

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
        help="Require prepared browser artifacts and pinned native download archives",
    )
    args = parser.parse_args()
    if args.require_prepared_toolchain:
        verify_runtimes()
        verify()
    else:
        prepare_runtimes()
        try:
            verify()
        except (FileNotFoundError, ValueError) as exc:
            print(f"Preparing missing or stale browser artifacts: {exc}", flush=True)
            prepare(args.compiler_source)
    subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True)
    print(f"Complete static artifact: {ROOT / 'dist'}")


if __name__ == "__main__":
    main()
