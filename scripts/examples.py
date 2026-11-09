"""Generate Studio examples and project files from the authored client records.

Run ``uv run --locked python -m scripts.examples`` to write ignored browser
assets under public/generated. Clinical facts never change to fit a notice.
"""

from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import yaml
from immuknow_template.resources import example_assignments_path, example_clients_path

from .build_info import project_build
from .native_core import prepare, typst_library_root
from .project_template import PROJECT_TEMPLATE, scaffold_files

ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / "examples"
CONFIG = PROJECT_TEMPLATE / "config"
TEMPLATES = PROJECT_TEMPLATE / "templates"


def write_csv(path: Path, source: dict[str, str]) -> None:
    """Save authored source values, preserving leading-zero identifiers and punctuation."""
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(source))
        writer.writeheader()
        writer.writerow(source)


def generate() -> tuple[dict[str, Any], dict[str, bytes]]:
    """Prepare each shared client for every maintained notice and return export files."""
    resources = scaffold_files()
    resources["examples/sample/clients.csv"] = example_clients_path().read_bytes()
    resources["examples/sample/assignments.json"] = (
        example_assignments_path().read_bytes()
    )
    authored = json.loads((EXAMPLES / "previews.json").read_text(encoding="utf-8"))
    with example_clients_path().open(encoding="utf-8-sig", newline="") as stream:
        sources = list(csv.DictReader(stream))
    by_id = {source["client_id"]: source for source in sources}
    if (
        len(by_id) != len(sources)
        or len(by_id) != len(authored["clients"])
        or set(by_id) != {c["client_id"] for c in authored["clients"]}
    ):
        raise ValueError(
            "Studio's example list must match the clients supplied by Template"
        )
    config = yaml.safe_load((CONFIG / "parameters.yaml").read_text())
    config.update(authored["dates"])
    examples = []
    library = typst_library_root()
    resources.update(
        {
            "templates/lib/immuknow/"
            + path.relative_to(library).as_posix(): path.read_bytes()
            for path in sorted(library.rglob("*"))
            if path.is_file()
        }
    )
    resources["config/parameters.yaml"] = yaml.safe_dump(
        config, sort_keys=True, allow_unicode=True
    ).encode("utf-8")
    with tempfile.TemporaryDirectory(prefix="immuknow-studio-examples-") as scratch:
        workspace = Path(scratch)
        shutil.copytree(TEMPLATES, workspace / "resources/templates")
        shutil.copytree(library, workspace / "resources/templates/lib/immuknow")
        shutil.copytree(CONFIG, workspace / "config")
        (workspace / "config/parameters.yaml").write_bytes(
            resources["config/parameters.yaml"]
        )
        for scenario in authored["clients"]:
            payloads, preparation_checks, deferred_checks, blocked_checks, inputs = (
                {},
                {},
                {},
                {},
                {},
            )
            source = by_id[scenario["client_id"]]
            csv_path = workspace / "client.csv"
            write_csv(csv_path, source)
            csv_key = f"examples/clients/{scenario['id']}.csv"
            resources[csv_key] = csv_path.read_bytes()
            for filename in authored["templates"]:
                version, language = filename.removesuffix(".typ").rsplit(".", 1)
                assignments = [{"client_id": source["client_id"], "template": filename}]
                assignment_path = workspace / "assignment.json"
                assignment_path.write_text(
                    json.dumps(assignments, indent=2) + "\n", encoding="utf-8"
                )
                assignment_key = (
                    f"examples/assignments/{scenario['id']}.{version}.{language}.json"
                )
                resources[assignment_key] = assignment_path.read_bytes()
                result = prepare(
                    str(csv_path),
                    "--notice-assignments",
                    str(assignment_path),
                    "--templates",
                    str(workspace / "resources/templates"),
                    "--config",
                    str(workspace / "config"),
                )
                if len(result["entries"]) != 1:
                    raise ValueError(f"Expected one prepared example: {filename}")
                entry = result["entries"][0]
                if any(check["status"] == "fail" for check in entry["checks"]):
                    raise ValueError(
                        f"Example variant is unrenderable: {scenario['id']} / {filename}"
                    )
                payloads[filename] = entry["notice"]
                preparation_checks[filename] = entry["checks"]
                deferred_checks[filename] = entry["deferred_checks"]
                blocked_checks[filename] = entry["blocked_checks"]
                inputs[filename] = {"csv": csv_key, "assignments": assignment_key}
            examples.append(
                {
                    "id": scenario["id"],
                    "label": f"{source['first_name']} {source['last_name']}",
                    "description": scenario["description"],
                }
                | {
                    "payloads": payloads,
                    "preparationChecks": preparation_checks,
                    "deferredChecks": deferred_checks,
                    "blockedChecks": blocked_checks,
                    "inputs": inputs,
                }
            )
    resources["examples/README.md"] = (EXAMPLES / "README.md").read_bytes()
    resources["build.json"] = (json.dumps(project_build(), indent=2) + "\n").encode()
    prepared = {
        "schemaVersion": 1,
        "synthetic": True,
        "creationTimestamp": authored["creationTimestamp"],
        "examples": examples,
    }
    return prepared, resources


def assemble(
    prepared: dict[str, Any], resources: dict[str, bytes], destination: Path
) -> None:
    """Write verified project bytes and central provenance without embedding font binaries."""
    destination.mkdir(parents=True, exist_ok=True)
    bundle = {
        **prepared,
        "build": json.loads(resources["build.json"]),
        "files": {
            key: base64.b64encode(value).decode("ascii")
            for key, value in sorted(resources.items())
        },
        "hashes": {
            key: hashlib.sha256(value).hexdigest()
            for key, value in sorted(resources.items())
        },
    }
    (destination / "project.json").write_text(
        json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    (destination / "build.json").write_bytes(resources["build.json"])
    subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts/prepare-fonts.py"),
            "--destination",
            str(destination / "fonts"),
        ],
        check=True,
        cwd=ROOT,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destination", type=Path, default=ROOT / "public/generated")
    args = parser.parse_args()
    prepared, resources = generate()
    assemble(prepared, resources, args.destination)
    count = sum(len(example["payloads"]) for example in prepared["examples"])
    print(
        f"Prepared {len(prepared['examples'])} example clients and {count} notice views"
    )


if __name__ == "__main__":
    main()
