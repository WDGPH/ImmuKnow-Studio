"""Keep downloaded runtime archives tied to the reviewed source and release bytes."""

import io
import json
import tempfile
import unittest
from hashlib import sha256
from pathlib import Path
from unittest.mock import patch

from scripts import prepare_runtimes


class RuntimePreparationTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.output = self.root / "public/generated/runtimes"
        self.payload = b"reviewed release archive"
        self.record: prepare_runtimes.RuntimePins = {
            "schemaVersion": 1,
            "version": "2.0.0",
            "revision": "a" * 40,
            "platforms": [
                {
                    "id": platform,
                    "label": platform,
                    "filename": f"immuknow-2.0.0-{platform}.{extension}",
                    "size": len(self.payload),
                    "sha256": sha256(self.payload).hexdigest(),
                }
                for platform, extension in prepare_runtimes.PLATFORMS.items()
            ],
        }
        (self.root / "immuknow-revision.txt").write_text("a" * 40)
        self.write_pins()
        root_patch = patch.object(prepare_runtimes, "ROOT", self.root)
        root_patch.start()
        self.addCleanup(root_patch.stop)

    def write_pins(self):
        (self.root / "native-runtimes.json").write_text(json.dumps(self.record))

    def test_preparation_verifies_bytes_and_reuses_only_unchanged_archives(self):
        with patch.object(
            prepare_runtimes,
            "urlopen",
            side_effect=lambda *_a, **_kw: io.BytesIO(self.payload),
        ) as fetch:
            prepare_runtimes.prepare()
            self.assertEqual(fetch.call_count, 4)
            self.assertEqual(
                {path.name for path in self.output.iterdir()},
                {f"{asset['filename']}.bin" for asset in self.record["platforms"]}
                | {"manifest.json"},
            )
            self.assertTrue(
                all(
                    call.args[0].full_url.startswith(
                        "https://github.com/WDGPH/ImmuKnow/releases/download/v2.0.0/"
                    )
                    for call in fetch.call_args_list
                )
            )
            fetch.reset_mock()
            prepare_runtimes.verify()
            prepare_runtimes.prepare()
            fetch.assert_not_called()
            path = self.output / f"{self.record['platforms'][0]['filename']}.bin"
            path.write_bytes(b"x" * len(self.payload))
            with self.assertRaisesRegex(ValueError, "Missing or changed runtime"):
                prepare_runtimes.verify()
            stale = self.output / "immuknow-old.zip"
            stale.write_bytes(b"old release")
            prepare_runtimes.prepare()
            self.assertEqual(fetch.call_count, 1)
            self.assertFalse(stale.exists())
            self.assertEqual(path.read_bytes(), self.payload)
            self.assertEqual(
                json.loads((self.output / "manifest.json").read_text()), self.record
            )

    def test_failed_download_does_not_publish_an_archive_or_manifest(self):
        for payload in (
            self.payload[:-1],
            self.payload + b"x",
            b"x" * len(self.payload),
        ):
            with self.subTest(payload=payload):
                with (
                    patch.object(
                        prepare_runtimes, "urlopen", return_value=io.BytesIO(payload)
                    ),
                    self.assertRaisesRegex(
                        ValueError, "pinned size|pinned size or hash"
                    ),
                ):
                    prepare_runtimes.prepare()
                self.assertEqual(list(self.output.iterdir()), [])

    def test_source_mismatch_or_unsafe_filename_is_rejected_before_download(self):
        with patch.object(prepare_runtimes, "urlopen") as fetch:
            (self.root / "immuknow-revision.txt").write_text("b" * 40)
            with self.assertRaisesRegex(ValueError, "revision must match"):
                prepare_runtimes.prepare()
            (self.root / "immuknow-revision.txt").write_text("a" * 40)
            self.record["platforms"][0]["filename"] = "../other.zip"
            self.write_pins()
            with self.assertRaisesRegex(ValueError, "filename must be"):
                prepare_runtimes.prepare()
            fetch.assert_not_called()


if __name__ == "__main__":
    unittest.main()
