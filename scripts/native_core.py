"""Build a reviewed standalone Core and use its public commands and exports."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
import tomllib
from functools import cache
from hashlib import sha256
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INSTALL = ROOT / ".native-core"
BINARY = INSTALL / "bin/immuknow"


def revision() -> str:
    value = (ROOT / "core-revision.txt").read_text().strip()
    if len(value) != 40 or any(c not in "0123456789abcdef" for c in value):
        raise ValueError("core-revision.txt must contain an exact Core commit")
    return value


@cache
def identity() -> dict:
    """Require the recorded source build and unchanged executable bytes."""
    try:
        value = json.loads((INSTALL / "identity.json").read_text())
        matches = (
            value["core_source_revision"] == revision()
            and value["executable_sha256"] == sha256(BINARY.read_bytes()).hexdigest()
        )
    except (OSError, KeyError, ValueError):
        matches = False
    if not matches:
        raise ValueError(
            "Native Core is missing or differs from its recorded build. "
            "Run uv run --locked python -m scripts.native_core install."
        )
    return value


def command() -> str:
    identity()
    return str(BINARY)


def run(*arguments: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [command(), *arguments], cwd=cwd, check=True, capture_output=True, text=True
    )


@cache
def resource_root() -> Path:
    """Export from the verified executable; installed project packages stay read-only."""
    identity()
    destination = ROOT / "generated/core"
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent) as scratch:
        exported = Path(scratch) / "resources"
        run("resources", "--output", str(exported))
        manifest = json.loads((exported / "resource-manifest.json").read_text())
        for item in manifest["files"]:
            if (
                sha256((exported / item["path"]).read_bytes()).hexdigest()
                != item["sha256"]
            ):
                raise ValueError(f"Exported Core resource differs: {item['path']}")
        if destination.exists():
            shutil.rmtree(destination)
        shutil.move(str(exported), destination)
    return destination


def typst_library_root() -> Path:
    return resource_root() / "typst"


def prepare(*arguments: str) -> dict:
    result = json.loads(run("prepare", *arguments).stdout)
    if result.get("schema_version") != 2:
        raise ValueError("Unsupported Core preparation envelope")
    return result


def install(source: Path | None = None) -> None:
    """Build the exact pinned, clean source and retain its executable fingerprint."""
    with tempfile.TemporaryDirectory(prefix="studio-native-core-") as temporary:
        if source is None:
            source = Path(temporary) / "core"
            subprocess.run(
                [
                    "git",
                    "clone",
                    "--filter=blob:none",
                    "--no-checkout",
                    "https://github.com/WDGPH/ImmuKnow.git",
                    str(source),
                ],
                check=True,
            )
            subprocess.run(
                ["git", "checkout", "--detach", revision()], cwd=source, check=True
            )
        source = source.resolve()
        actual = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=source, text=True
        ).strip()
        dirty = subprocess.check_output(
            ["git", "status", "--porcelain"],
            cwd=source,
            text=True,
        ).strip()
        if actual != revision() or dirty:
            raise ValueError("Core source must be clean and match core-revision.txt")
        subprocess.run(
            ["cargo", "build", "--release", "--locked"], cwd=source, check=True
        )
        BINARY.parent.mkdir(parents=True, exist_ok=True)
        metadata = json.loads(
            subprocess.check_output(
                ["cargo", "metadata", "--no-deps", "--format-version", "1"],
                cwd=source,
                text=True,
            )
        )
        shutil.copy2(Path(metadata["target_directory"]) / "release/immuknow", BINARY)
        packages = tomllib.loads((source / "Cargo.lock").read_text())["package"]
        typst = next(p["version"] for p in packages if p["name"] == "typst")
        package = tomllib.loads((source / "Cargo.toml").read_text())["package"]
        (INSTALL / "identity.json").write_text(
            json.dumps(
                {
                    "core_source_revision": actual,
                    "core_source_modified": False,
                    "executable_sha256": sha256(BINARY.read_bytes()).hexdigest(),
                    "application_version": package["version"],
                    "native_typst_version": typst,
                },
                indent=2,
            )
            + "\n"
        )
    identity.cache_clear()
    resource_root.cache_clear()
    print(f"Installed reviewed native Core {actual}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["install"])
    parser.add_argument(
        "--source", type=Path, help="Use a clean checkout at the pinned commit"
    )
    args = parser.parse_args()
    install(args.source)


if __name__ == "__main__":
    main()
