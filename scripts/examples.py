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
from immuknow.assignment_manifest import load_manifest
from immuknow.data_models import CheckResult
from immuknow.generate_notices import build_notice_data, prepare_render_jobs
from immuknow.load_config import load_config
from immuknow.preprocess import prepare_clients, read_input
from immuknow.resources import typst_library_root
from immuknow.version_notices import load_catalog, template_identity
from immuknow_template.resources import example_assignments_path, example_clients_path

from .build_info import project_build
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
    config = load_config(CONFIG / "parameters.yaml")
    config.update(authored["dates"])
    catalog = load_catalog(CONFIG)
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
    config["creation_timestamp"] = authored["creationTimestamp"]
    with tempfile.TemporaryDirectory(prefix="immuknow-studio-examples-") as scratch:
        workspace = Path(scratch)
        shutil.copytree(TEMPLATES, workspace / "resources/templates")
        shutil.copytree(library, workspace / "resources/templates/lib/immuknow")
        for scenario in authored["clients"]:
            payloads, preparation_checks, inputs = {}, {}, {}
            source = by_id[scenario["client_id"]]
            csv_path = workspace / "client.csv"
            write_csv(csv_path, source)
            csv_key = f"examples/clients/{scenario['id']}.csv"
            resources[csv_key] = csv_path.read_bytes()
            for filename in authored["templates"]:
                version, language = template_identity(TEMPLATES / filename)
                assignments = [{"client_id": source["client_id"], "template": filename}]
                assignment_path = workspace / "assignment.json"
                assignment_path.write_text(
                    json.dumps(assignments, indent=2) + "\n", encoding="utf-8"
                )
                assignment_key = (
                    f"examples/assignments/{scenario['id']}.{version}.{language}.json"
                )
                resources[assignment_key] = assignment_path.read_bytes()
                manifest = load_manifest(assignment_path, TEMPLATES)
                prepared, reconciliation = prepare_clients(
                    read_input(csv_path),
                    workspace / "work",
                    config,
                    CONFIG,
                    catalog,
                    manifest,
                    None,
                )
                if (
                    len(prepared.clients) != 1
                    or any(f.status == "fail" for f in reconciliation.findings)
                    or any(
                        check.status == "fail"
                        for checks in prepared.row_checks.values()
                        for check in checks
                    )
                ):
                    raise ValueError(
                        f"Example variant is unrenderable: {scenario['id']} / {filename}"
                    )
                client = prepared.clients[0]
                (job,) = prepare_render_jobs([client], workspace, config)
                payload = json.loads(job.data.read_text(encoding="utf-8"))
                if payload != build_notice_data(client, config):
                    raise ValueError(
                        f"Staged facts disagree with native producer: {filename}"
                    )
                payloads[filename] = payload
                preparation_checks[filename] = (
                    [check.to_dict() for check in prepared.row_checks[client.sequence]]
                    + [
                        CheckResult(
                            "data.preparation_warning", "preparation", "warn", message
                        ).to_dict()
                        for message in prepared.warnings
                    ]
                    + [
                        CheckResult(
                            f"assignment.{finding.kind}",
                            "assignment",
                            finding.status,
                            finding.reason,
                        ).to_dict()
                        for finding in reconciliation.findings
                    ]
                )
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
