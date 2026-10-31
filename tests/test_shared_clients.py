"""Keep shared example identities and downloaded source inputs in step."""

import csv
import io
import json
import tempfile
import unittest
from pathlib import Path

from immuknow.assignment_manifest import load_manifest
from immuknow.generate_notices import build_notice_data
from immuknow.load_config import load_config
from immuknow.preprocess import prepare_clients, read_input
from immuknow.version_notices import load_catalog, template_identity

from scripts.examples import EXAMPLES, generate


class SharedClientsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.prepared, cls.resources = generate()
        cls.authored = json.loads((EXAMPLES / "scenarios.json").read_text())

    def test_every_notice_uses_the_same_client_source_and_facts(self) -> None:
        expected = {client["id"]: client for client in self.authored["clients"]}
        for example in self.prepared["examples"]:
            with self.subTest(client=example["id"]):
                self.assertEqual(
                    set(example["payloads"]), set(self.authored["templates"])
                )
                csv_paths = {inputs["csv"] for inputs in example["inputs"].values()}
                self.assertEqual(len(csv_paths), 1)
                (path,) = csv_paths
                rows = list(csv.DictReader(io.StringIO(self.resources[path].decode())))
                self.assertEqual(rows, [expected[example["id"]]["source"]])
                facts = [
                    {
                        key: value
                        for key, value in payload.items()
                        if key not in {"template", "version_id", "language"}
                    }
                    for payload in example["payloads"].values()
                ]
                self.assertTrue(all(fact == facts[0] for fact in facts))

    def test_downloaded_inputs_reproduce_each_preview(self) -> None:
        with tempfile.TemporaryDirectory(prefix="studio-shared-clients-") as scratch:
            project = Path(scratch)
            for name, data in self.resources.items():
                path = project / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
            config_dir = project / "config"
            config = load_config(config_dir / "parameters.yaml")
            config["creation_timestamp"] = self.prepared["creationTimestamp"]
            catalog = load_catalog(config_dir)
            for example in self.prepared["examples"]:
                for filename, payload in example["payloads"].items():
                    inputs = example["inputs"][filename]
                    manifest = load_manifest(
                        project / inputs["assignments"], project / "templates"
                    )
                    for selected in (
                        None,
                        template_identity(project / "templates" / filename),
                    ):
                        with self.subTest(
                            client=example["id"], notice=filename, selector=selected
                        ):
                            result, _ = prepare_clients(
                                read_input(project / inputs["csv"]),
                                project / "work",
                                config,
                                config_dir,
                                catalog,
                                manifest if selected is None else {},
                                selected,
                            )
                            self.assertEqual(len(result.clients), 1)
                            self.assertEqual(
                                build_notice_data(result.clients[0], config), payload
                            )


if __name__ == "__main__":
    unittest.main()
