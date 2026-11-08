"""Keep shared example identities and downloaded source inputs in step."""

import csv
import io
import json
import tempfile
import unittest
from hashlib import sha256
from pathlib import Path

from immuknow_template.resources import example_clients_path

from scripts.examples import EXAMPLES, generate
from scripts.native_core import prepare, typst_library_root


class SharedClientsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.prepared, cls.resources = generate()
        cls.authored = json.loads((EXAMPLES / "previews.json").read_text())
        with example_clients_path().open(encoding="utf-8-sig", newline="") as stream:
            cls.sources = {row["client_id"]: row for row in csv.DictReader(stream)}

    def test_library_identity_uses_project_paths_and_actual_library_bytes(self) -> None:
        build = json.loads(self.resources["build.json"])
        entries = build["shared_resources"]["files"]
        library = {
            item["path"]: item["sha256"]
            for item in entries
            if item["path"].startswith("templates/lib/immuknow/")
        }
        self.assertIn("templates/lib/immuknow/lib.typ", library)
        self.assertFalse(any(item["path"].startswith("typst/") for item in entries))
        actual = {
            "templates/lib/immuknow/"
            + path.relative_to(typst_library_root()).as_posix(): sha256(
                path.read_bytes()
            ).hexdigest()
            for path in typst_library_root().rglob("*")
            if path.is_file()
        }
        self.assertEqual(library, actual)
        for name, expected in library.items():
            self.assertEqual(sha256(self.resources[name]).hexdigest(), expected)

    def test_every_notice_uses_the_same_client_source_and_facts(self) -> None:
        expected = {
            client["id"]: self.sources[client["client_id"]]
            for client in self.authored["clients"]
        }
        for example in self.prepared["examples"]:
            with self.subTest(client=example["id"]):
                self.assertEqual(
                    set(example["payloads"]), set(self.authored["templates"])
                )
                csv_paths = {inputs["csv"] for inputs in example["inputs"].values()}
                self.assertEqual(len(csv_paths), 1)
                (path,) = csv_paths
                rows = list(csv.DictReader(io.StringIO(self.resources[path].decode())))
                self.assertEqual(rows, [expected[example["id"]]])
                facts = [
                    {
                        key: value
                        for key, value in payload.items()
                        if key not in {"template", "version_id", "language"}
                    }
                    for payload in example["payloads"].values()
                ]
                self.assertTrue(all(fact == facts[0] for fact in facts))
                source = expected[example["id"]]
                for part in ("first", "last"):
                    self.assertEqual(
                        facts[0]["client_data"][f"{part}_initial"],
                        source[f"{part}_name"].strip()[:1],
                    )

    def test_downloaded_inputs_reproduce_each_preview(self) -> None:
        with tempfile.TemporaryDirectory(prefix="studio-shared-clients-") as scratch:
            project = Path(scratch)
            for name, data in self.resources.items():
                path = project / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
            for example in self.prepared["examples"]:
                for filename, payload in example["payloads"].items():
                    inputs = example["inputs"][filename]
                    for selector in (
                        [
                            "--notice-assignments",
                            str(project / inputs["assignments"]),
                            "--templates",
                            str(project / "templates"),
                        ],
                        ["--template", str(project / "templates" / filename)],
                    ):
                        with self.subTest(
                            client=example["id"], notice=filename, selector=selector[0]
                        ):
                            result = prepare(
                                str(project / inputs["csv"]),
                                "--config",
                                str(project / "config"),
                                *selector,
                            )
                            self.assertEqual(len(result["entries"]), 1)
                            self.assertEqual(result["entries"][0]["notice"], payload)


if __name__ == "__main__":
    unittest.main()
