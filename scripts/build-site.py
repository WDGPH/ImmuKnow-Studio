"""Prepare pinned browser assets and build Studio as a standalone static site."""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

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
    args = parser.parse_args()
    missing = [tool for tool in ("rustup", "cargo") if shutil.which(tool) is None]
    if missing:
        raise SystemExit(
            f"Studio build prerequisites missing: {', '.join(missing)}. "
            "See README.md for the pinned build tools."
        )
    subprocess.run(
        ["bash", "scripts/build-compiler.sh"],
        cwd=ROOT,
        check=True,
        env={
            **os.environ,
            "IMMUKNOW_COMPILER_BUILD_DIR": str(args.compiler_source.resolve()),
        },
    )
    for command in (
        [
            sys.executable,
            "-m",
            "scripts.notices",
            "--compiler-source",
            str(args.compiler_source.resolve()),
        ],
        [sys.executable, "-m", "scripts.examples", "--check"],
        ["npm", "run", "build"],
    ):
        subprocess.run(command, cwd=ROOT, check=True)
    print(f"Complete static artifact: {ROOT / 'dist'}")


if __name__ == "__main__":
    main()
