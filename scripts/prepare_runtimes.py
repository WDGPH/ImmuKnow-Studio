"""Stage reviewed native release archives for Studio's project downloads.

The checked-in pins bind official release bytes to the reviewed ImmuKnow commit.
Preparation downloads only missing or changed archives. Ordinary asset generation
verifies the prepared files without contacting GitHub.
"""

import argparse
import json
import re
import tempfile
from hashlib import sha256
from pathlib import Path
from typing import TypedDict, cast
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
PLATFORMS = {
    "windows-x86_64": "zip",
    "macos-aarch64": "tar.gz",
    "macos-x86_64": "tar.gz",
    "linux-x86_64": "tar.gz",
}
MAX_ARCHIVE = 64 * 1024 * 1024


class RuntimeAsset(TypedDict):
    id: str
    label: str
    filename: str
    size: int
    sha256: str


class RuntimePins(TypedDict):
    schemaVersion: int
    version: str
    revision: str
    platforms: list[RuntimeAsset]


def pins() -> RuntimePins:
    value = json.loads((ROOT / "native-runtimes.json").read_text(encoding="utf-8"))
    if not isinstance(value, dict) or value.get("schemaVersion") != 1:
        raise ValueError("Unsupported native runtime pin format")
    version = value.get("version")
    revision = value.get("revision")
    if not isinstance(version, str) or not re.fullmatch(
        r"[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?", version
    ):
        raise ValueError("Native runtimes must pin an exact release version")
    if (
        not isinstance(revision, str)
        or not re.fullmatch(r"[0-9a-f]{40}", revision)
        or revision != (ROOT / "immuknow-revision.txt").read_text().strip()
    ):
        raise ValueError("Native runtime revision must match immuknow-revision.txt")
    assets = value.get("platforms")
    if not isinstance(assets, list) or len(assets) != len(PLATFORMS):
        raise ValueError("Native runtimes must pin all supported platforms")
    seen = set()
    for asset in assets:
        if not isinstance(asset, dict):
            raise TypeError("Invalid native runtime asset")
        platform = asset.get("id")
        if (
            not isinstance(platform, str)
            or platform not in PLATFORMS
            or platform in seen
        ):
            raise ValueError("Native runtime platforms must be supported and unique")
        seen.add(platform)
        expected_name = f"immuknow-{version}-{platform}.{PLATFORMS[platform]}"
        if asset.get("filename") != expected_name:
            raise ValueError(f"Native runtime filename must be {expected_name}")
        size = asset.get("size")
        digest = asset.get("sha256")
        if (
            type(size) is not int
            or not 0 < size <= MAX_ARCHIVE
            or not isinstance(digest, str)
            or not re.fullmatch(r"[0-9a-f]{64}", digest)
            or not isinstance(asset.get("label"), str)
            or not asset["label"]
        ):
            raise ValueError(f"Invalid native runtime size, hash or label: {platform}")
    return cast(RuntimePins, value)


def matches(path: Path, asset: RuntimeAsset) -> bool:
    if path.is_symlink() or not path.is_file() or path.stat().st_size != asset["size"]:
        return False
    digest = sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest() == asset["sha256"]


def staged_filename(asset: RuntimeAsset) -> str:
    # Vite serves names ending in .gz as HTTP gzip content.
    return f"{asset['filename']}.bin"


def download(asset: RuntimeAsset, version: str, destination: Path) -> None:
    url = (
        "https://github.com/WDGPH/ImmuKnow/releases/download/"
        f"v{version}/{asset['filename']}"
    )
    request = Request(url, headers={"User-Agent": "ImmuKnow-Studio-build"})
    temporary: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            dir=destination.parent, delete=False
        ) as output:
            temporary = Path(output.name)
            digest = sha256()
            size = 0
            with urlopen(request, timeout=60) as response:
                while chunk := response.read(1024 * 1024):
                    size += len(chunk)
                    if size > asset["size"]:
                        raise ValueError(f"Native runtime exceeds pinned size: {url}")
                    digest.update(chunk)
                    output.write(chunk)
        if size != asset["size"] or digest.hexdigest() != asset["sha256"]:
            raise ValueError(
                f"Native runtime differs from its pinned size or hash: {url}"
            )
        temporary.replace(destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def verify() -> None:
    record = pins()
    destination = ROOT / "public/generated/runtimes"
    if destination.is_symlink():
        raise ValueError("Native runtime directory must not be linked")
    message = "Run npm run prepare:runtimes to prepare the pinned native runtimes."
    for asset in record["platforms"]:
        if not matches(destination / staged_filename(asset), asset):
            raise ValueError(
                f"Missing or changed runtime: {asset['filename']}. {message}"
            )
    manifest = destination / "manifest.json"
    if not manifest.is_file() or json.loads(manifest.read_text()) != record:
        raise ValueError(f"Missing or changed native runtime manifest. {message}")


def prepare() -> None:
    record = pins()
    destination = ROOT / "public/generated/runtimes"
    if destination.is_symlink():
        raise ValueError("Native runtime directory must not be linked")
    destination.mkdir(parents=True, exist_ok=True)
    manifest = destination / "manifest.json"
    manifest.unlink(missing_ok=True)
    for asset in record["platforms"]:
        path = destination / staged_filename(asset)
        if not matches(path, asset):
            print(f"Downloading pinned native runtime: {asset['filename']}", flush=True)
            download(asset, record["version"], path)
    expected = {staged_filename(asset) for asset in record["platforms"]}
    for path in destination.iterdir():
        if path.name not in expected:
            if path.is_dir() and not path.is_symlink():
                raise ValueError(f"Unexpected directory in prepared runtimes: {path}")
            path.unlink()
    manifest.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    verify()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "operation", choices=("prepare", "verify"), default="prepare", nargs="?"
    )
    args = parser.parse_args()
    if args.operation == "prepare":
        prepare()
    else:
        verify()
    print("Verified pinned native runtime archives.")


if __name__ == "__main__":
    main()
