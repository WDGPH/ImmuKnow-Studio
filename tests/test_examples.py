"""Verify that exported source inputs reproduce every prepared preview variant."""

import tempfile
import unittest
from pathlib import Path

from immuknow.assignment_manifest import load_manifest
from immuknow.generate_notices import build_notice_data
from immuknow.load_config import load_config
from immuknow.preprocess import prepare_clients, read_input
from immuknow.version_notices import load_catalog, template_identity

from scripts.examples import generate


class ExportedExamplesTest(unittest.TestCase):
    def test_exported_inputs_reproduce_every_payload(self) -> None:
        prepared, resources = generate()
        with tempfile.TemporaryDirectory(prefix="immuknow-example-export-") as scratch:
            project = Path(scratch)
            for name, data in resources.items():
                path = project / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
            config_dir = project / "config"
            config = load_config(config_dir / "parameters.yaml")
            config["creation_timestamp"] = prepared["creationTimestamp"]
            catalog = load_catalog(config_dir)
            for example in prepared["examples"]:
                for filename, payload in example["payloads"].items():
                    inputs = example["inputs"][filename]
                    manifest = load_manifest(
                        project / inputs["assignments"], project / "templates"
                    )
                    selectors = (
                        None,
                        template_identity(project / "templates" / filename),
                    )
                    for selected_notice in selectors:
                        with self.subTest(
                            scenario=example["id"],
                            filename=filename,
                            selector="manifest"
                            if selected_notice is None
                            else "template",
                        ):
                            result, _ = prepare_clients(
                                read_input(project / inputs["csv"]),
                                project / "work",
                                config,
                                config_dir,
                                catalog,
                                manifest if selected_notice is None else {},
                                selected_notice,
                            )
                            self.assertEqual(len(result.clients), 1)
                            self.assertEqual(
                                build_notice_data(result.clients[0], config), payload
                            )


if __name__ == "__main__":
    unittest.main()
