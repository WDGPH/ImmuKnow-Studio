"""Retain installed dependency license and notice files in the static artifact."""

import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def license_texts(directory: Path) -> list[tuple[str, str]]:
    result = []
    for path in sorted(directory.iterdir()):
        if path.is_file() and path.name.lower().startswith(
            ("license", "licence", "copying", "notice", "copyright")
        ):
            result.append((path.name, path.read_text(errors="replace")))
    return result


def npm_notices() -> str:
    """Read current installed frontend licences for every site build."""
    chunks = []
    lock = json.loads((ROOT / "package-lock.json").read_text())
    for name, entry in sorted(lock["packages"].items()):
        if not name or entry.get("dev") or name.startswith("node_modules/@napi-rs/"):
            continue
        directory = ROOT / name
        if entry.get("optional") and not directory.exists():
            continue
        package = json.loads((directory / "package.json").read_text())
        chunks.append(
            f"\n=== {package['name']} {package['version']} ({package.get('license', '')}) ===\n{package.get('authors', [])}\n{package.get('repository', '')}\n"
        )
        texts = license_texts(directory)
        if not texts:
            raise ValueError(f"Missing license files: {name}")
        chunks.extend(f"\n--- {name} ---\n{text}" for name, text in texts)
    return "".join(chunks)


def rust_notices(compiler_source: Path) -> str:
    """Inventory the pinned compiler/renderer once when preparing their binaries."""
    build = json.loads((ROOT / "compiler-pins.json").read_text())
    compiler = build["browser_compiler"]
    revision = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=compiler_source, text=True
    ).strip()
    if revision != compiler["source_revision"]:
        raise ValueError("Compiler licence source differs from the pinned revision")
    compiler_root = compiler_source.resolve()
    chunks = []
    # Metadata includes packages beyond the targeted WASM build. Populate the
    # complete locked source cache even when the compiler artifact was reused;
    # the inventory and license-file reads below deliberately remain offline.
    subprocess.run(
        ["cargo", "+" + compiler["rust_version"], "fetch", "--locked"],
        cwd=compiler_source,
        check=True,
    )
    metadata = json.loads(
        subprocess.check_output(
            [
                "cargo",
                "+" + compiler["rust_version"],
                "metadata",
                "--locked",
                "--offline",
                "--format-version",
                "1",
                "--filter-platform",
                "wasm32-unknown-unknown",
            ],
            cwd=compiler_source,
        )
    )
    workspace_members = set(metadata["workspace_members"])
    included = set()
    for package_name, features in (
        ("typst-ts-web-compiler", compiler["features"]),
        ("typst-ts-renderer", build["browser_renderer"]["features"]),
    ):
        tree = subprocess.check_output(
            [
                "cargo",
                "+" + compiler["rust_version"],
                "tree",
                "--locked",
                "--offline",
                "--target",
                "wasm32-unknown-unknown",
                "-p",
                package_name,
                "--no-default-features",
                "--features",
                ",".join(features),
                "--edges",
                "normal",
                "--prefix",
                "none",
                "--format",
                "{p}",
            ],
            cwd=compiler_source,
            text=True,
        )
        included.update(" ".join(line.split()[:2]) for line in tree.splitlines())
    packages = {
        p["id"]: p
        for p in metadata["packages"]
        if f"{p['name']} v{p['version']}" in included
    }
    for key in sorted(packages):
        package = packages[key]
        directory = Path(package["manifest_path"]).resolve().parent
        texts = license_texts(directory)
        # Workspace members may share the pinned repository's root license.
        # Registry crates must not inherit an unrelated ancestor's license.
        if (
            not texts
            and key in workspace_members
            and directory.is_relative_to(compiler_root)
        ):
            parent = directory
            while not texts and parent != compiler_root:
                parent = parent.parent
                texts = license_texts(parent)
        if not texts and "Apache-2.0" in (package.get("license") or ""):
            texts = [
                (
                    "Apache-2.0 (selected license alternative)",
                    (compiler_source / "LICENSE").read_text(),
                )
            ]
        if not texts:
            retained = ROOT / "licenses" / f"{package['name']}.txt"
            if retained.exists():
                texts = [(retained.name, retained.read_text())]
        if not texts:
            raise ValueError(f"Missing license files: {key}")
        chunks.append(
            f"\n=== {package['name']} {package['version']} ({package.get('license', '')}) ===\n{package.get('authors', [])}\n{package.get('repository', '')}\n"
        )
        chunks.extend(f"\n--- {name} ---\n{text}" for name, text in texts)
    return "".join(chunks)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--compiler-source", type=Path)
    parser.add_argument("--rust-only", action="store_true")
    args = parser.parse_args()
    cached = ROOT / "vendor/compiler/RUST_NOTICES.txt"
    if args.compiler_source:
        cached.parent.mkdir(parents=True, exist_ok=True)
        cached.write_text(rust_notices(args.compiler_source), encoding="utf-8")
    if args.rust_only:
        if not args.compiler_source:
            parser.error("--rust-only requires --compiler-source")
        return
    output = ROOT / "public/generated/compiler/THIRD_PARTY_NOTICES.txt"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        "ImmuKnow Studio third-party notices\n\nCompiler sources are pinned in source-revision.txt. Font licences and exceptions are in ../fonts/LICENSE.\n"
        + npm_notices()
        + cached.read_text(encoding="utf-8"),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
