"""Keep the source pin and executable bytes part of Studio's native handoff."""

import json
import tempfile
import unittest
from hashlib import sha256
from pathlib import Path
from unittest.mock import patch

from scripts import immuknow


class NativeIdentityTest(unittest.TestCase):
    def test_changed_executable_or_revision_requires_a_reviewed_build(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            install = root / ".immuknow"
            binary = install / "bin/immuknow"
            binary.parent.mkdir(parents=True)
            binary.write_bytes(b"fictional executable")
            (root / "immuknow-revision.txt").write_text("a" * 40)
            (install / "identity.json").write_text(
                json.dumps(
                    {
                        "immuknow_source_revision": "a" * 40,
                        "executable_sha256": sha256(binary.read_bytes()).hexdigest(),
                    }
                )
            )
            with patch.multiple(immuknow, ROOT=root, INSTALL=install, BINARY=binary):
                immuknow.identity.cache_clear()
                self.assertEqual(immuknow.command(), str(binary))
                binary.write_bytes(b"changed executable")
                immuknow.identity.cache_clear()
                with self.assertRaisesRegex(ValueError, "recorded build"):
                    immuknow.command()
                binary.write_bytes(b"fictional executable")
                (root / "immuknow-revision.txt").write_text("b" * 40)
                immuknow.identity.cache_clear()
                with self.assertRaisesRegex(ValueError, "recorded build"):
                    immuknow.command()
        immuknow.identity.cache_clear()

    def test_unsupported_prepare_envelope_is_rejected(self):
        with patch.object(immuknow, "run") as run:
            run.return_value.stdout = '{"schema_version": 99, "entries": []}'
            with self.assertRaisesRegex(ValueError, "preparation envelope"):
                immuknow.prepare("fictional.csv")
