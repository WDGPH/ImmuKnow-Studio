"""Keep the source pin and executable bytes part of Studio's native handoff."""

import json
import tempfile
import unittest
from hashlib import sha256
from pathlib import Path
from unittest.mock import patch

from scripts import native_core


class NativeIdentityTest(unittest.TestCase):
    def test_changed_executable_or_revision_requires_a_reviewed_build(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            install = root / ".native-core"
            binary = install / "bin/immuknow"
            binary.parent.mkdir(parents=True)
            binary.write_bytes(b"fictional executable")
            (root / "core-revision.txt").write_text("a" * 40)
            (install / "identity.json").write_text(
                json.dumps(
                    {
                        "core_source_revision": "a" * 40,
                        "executable_sha256": sha256(binary.read_bytes()).hexdigest(),
                    }
                )
            )
            with patch.multiple(native_core, ROOT=root, INSTALL=install, BINARY=binary):
                native_core.identity.cache_clear()
                self.assertEqual(native_core.command(), str(binary))
                binary.write_bytes(b"changed executable")
                native_core.identity.cache_clear()
                with self.assertRaisesRegex(ValueError, "recorded build"):
                    native_core.command()
                binary.write_bytes(b"fictional executable")
                (root / "core-revision.txt").write_text("b" * 40)
                native_core.identity.cache_clear()
                with self.assertRaisesRegex(ValueError, "recorded build"):
                    native_core.command()
        native_core.identity.cache_clear()

    def test_unsupported_prepare_envelope_is_rejected(self):
        with patch.object(native_core, "run") as run:
            run.return_value.stdout = '{"schema_version": 99, "entries": []}'
            with self.assertRaisesRegex(ValueError, "preparation envelope"):
                native_core.prepare("fictional.csv")
