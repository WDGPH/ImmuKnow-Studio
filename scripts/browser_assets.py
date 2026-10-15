"""Prepare and verify reusable browser binaries and their Rust license inventory.

Only preparation needs Rust and compiler sources. Site builds verify all cached
bytes and copy metadata; npm notices are regenerated against the current lock.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from hashlib import sha256
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECORD = "vendor/compiler/prepared.json"


def inputs() -> dict[str, str]:
    paths = [
        ROOT / "compiler-pins.json",
        ROOT / "scripts/browser_assets.py",
        ROOT / "scripts/build-compiler.sh",
        ROOT / "scripts/notices.py",
        *sorted((ROOT / "scripts/patches").glob("*.patch")),
        *sorted((ROOT / "licenses").glob("*.txt")),
    ]
    return {
        path.relative_to(ROOT).as_posix(): sha256(path.read_bytes()).hexdigest()
        for path in paths
    }


def artifacts() -> dict[str, str]:
    result = {}
    for directory in ("vendor/compiler", "vendor/renderer"):
        if (ROOT / directory).is_symlink():
            raise ValueError("Browser artifact directories must not be linked")
        for path in sorted((ROOT / directory).rglob("*")):
            if path.is_symlink():
                raise ValueError("Browser artifacts must not contain linked paths")
            name = path.relative_to(ROOT).as_posix()
            if path.is_file() and name != RECORD:
                result[name] = sha256(path.read_bytes()).hexdigest()
    return result


def verify() -> None:
    record = json.loads((ROOT / RECORD).read_text(encoding="utf-8"))
    if (
        not isinstance(record, dict)
        or record.get("inputs") != inputs()
        or record.get("files") != artifacts()
    ):
        raise ValueError(
            "Prepared browser artifacts differ from their build inputs or hashes"
        )
    for name in (
        "vendor/compiler/typst_ts_web_compiler.js",
        "vendor/compiler/typst_ts_web_compiler_bg.wasm",
        "vendor/compiler/RUST_NOTICES.txt",
        "vendor/compiler/LICENSE",
        "vendor/compiler/SHA256SUMS",
        "vendor/compiler/source-revision.txt",
        "vendor/compiler/build-inputs.json",
        "vendor/compiler/typst_ts_web_compiler.d.ts",
        "vendor/renderer/typst_ts_renderer.js",
        "vendor/renderer/typst_ts_renderer_bg.wasm",
        "vendor/renderer/LICENSE",
        "vendor/renderer/SHA256SUMS",
        "vendor/renderer/build-inputs.json",
        "vendor/renderer/typst_ts_renderer.d.ts",
    ):
        if not (ROOT / name).is_file():
            raise ValueError(f"Missing prepared browser artifact: {name}")

    pins = json.loads((ROOT / "compiler-pins.json").read_text())
    for directory in ("compiler", "renderer"):
        metadata = json.loads(
            (ROOT / "vendor" / directory / "build-inputs.json").read_text()
        )
        if metadata != pins[f"browser_{directory}"]:
            raise ValueError(
                f"Prepared {directory} metadata differs from compiler pins"
            )
    revision = (ROOT / "vendor/compiler/source-revision.txt").read_text().strip()
    if revision != pins["browser_compiler"]["source_revision"]:
        raise ValueError("Prepared compiler source revision differs from compiler pins")


def prepare(source: Path) -> None:
    missing = [tool for tool in ("rustup", "cargo") if shutil.which(tool) is None]
    if missing:
        raise ValueError(f"Preparing browser artifacts requires: {', '.join(missing)}")
    subprocess.run(
        ["bash", "scripts/build-compiler.sh"],
        cwd=ROOT,
        check=True,
        env={**os.environ, "IMMUKNOW_COMPILER_BUILD_DIR": str(source.resolve())},
    )
    subprocess.run(
        [
            sys.executable,
            "-m",
            "scripts.notices",
            "--compiler-source",
            str(source.resolve()),
            "--rust-only",
        ],
        cwd=ROOT,
        check=True,
    )
    (ROOT / RECORD).write_text(
        json.dumps({"inputs": inputs(), "files": artifacts()}, indent=2) + "\n",
        encoding="utf-8",
    )
    verify()


def copy_metadata() -> None:
    for directory, names in (
        (
            "compiler",
            ("LICENSE", "SHA256SUMS", "source-revision.txt", "build-inputs.json"),
        ),
        ("renderer", ("LICENSE", "SHA256SUMS", "build-inputs.json")),
    ):
        destination = ROOT / "public/generated" / directory
        destination.mkdir(parents=True, exist_ok=True)
        for name in names:
            shutil.copyfile(ROOT / "vendor" / directory / name, destination / name)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("prepare", "verify"))
    parser.add_argument(
        "--compiler-source",
        type=Path,
        default=Path(
            os.environ.get("IMMUKNOW_COMPILER_BUILD_DIR", ROOT / ".compiler-build")
        ),
    )
    args = parser.parse_args()
    if args.operation == "prepare":
        prepare(args.compiler_source)
    else:
        verify()
    print("Verified prepared browser binaries and licences.")


if __name__ == "__main__":
    main()
