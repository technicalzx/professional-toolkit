import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
import zipfile


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("package_extension", ROOT / "scripts/package-extension.py")
PACKAGER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PACKAGER)


class ExtensionPackageTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix=".extension-package-test-", dir=ROOT / "tests")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        for name in PACKAGER.RELEASE_FILES:
            relative = PACKAGER.SHARED_SOURCES.get(name, Path("extension") / name)
            target = self.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(PACKAGER.canonical_bytes(ROOT / relative))
        (self.root / "extension/LICENSE").write_bytes(b"stale license")
        (self.root / "extension/snapshot.mjs").write_bytes(b"stale snapshot")

    def test_download_contains_only_release_sources_and_licenses(self):
        (self.root / "extension/.env").write_text("PRIVATE_FIXTURE=must-not-ship", encoding="utf-8")
        (self.root / "extension/private-capture.json").write_text("{}", encoding="utf-8")
        package, metadata = PACKAGER.build_release(self.root)
        with zipfile.ZipFile(io.BytesIO(package)) as archive:
            self.assertEqual(archive.namelist(), sorted(PACKAGER.RELEASE_FILES))
            self.assertIn("README.md", archive.namelist())
            self.assertEqual(archive.read("LICENSE"), PACKAGER.canonical_bytes(self.root / "LICENSE"))
            for name, source in PACKAGER.source_files(self.root).items():
                self.assertEqual(archive.read(name), source, name)
            manifest = json.loads(archive.read("manifest.json"))
        self.assertEqual(metadata["version"], manifest["version"])
        self.assertEqual(metadata["sha256"], hashlib.sha256(package).hexdigest())
        self.assertEqual(metadata["sizeBytes"], len(package))
        self.assertEqual(metadata["distribution"], "unpacked")
        self.assertEqual(metadata["files"], sorted(PACKAGER.RELEASE_FILES))

    def test_release_bytes_do_not_depend_on_checkout_line_endings_or_file_times(self):
        expected = PACKAGER.build_release(self.root)
        for path in self.root.rglob("*"):
            if path.is_file():
                path.write_bytes(PACKAGER.canonical_bytes(path).replace(b"\n", b"\r\n"))
                os.utime(path, (1_700_000_000, 1_700_000_000))
        self.assertEqual(PACKAGER.build_release(self.root), expected)

    def test_check_detects_stale_shared_sources_zip_and_manifest_metadata(self):
        self.assertIn("extension/snapshot.mjs", PACKAGER.outdated_artifacts(self.root))
        PACKAGER.write_release(self.root)
        self.assertEqual(PACKAGER.outdated_artifacts(self.root), [])
        manifest_path = self.root / "extension/manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["version"] = "0.1.4"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        self.assertEqual(PACKAGER.outdated_artifacts(self.root), [
            "hosted-app/public/toolkit-capture-extension.zip",
            "hosted-app/public/extension-release.json",
        ])
        metadata = PACKAGER.write_release(self.root)
        self.assertEqual(metadata["version"], "0.1.4")
        self.assertEqual(PACKAGER.outdated_artifacts(self.root), [])
        with (self.root / PACKAGER.PUBLIC / PACKAGER.ZIP_NAME).open("ab") as archive:
            archive.write(b"tampered")
        self.assertEqual(PACKAGER.outdated_artifacts(self.root), ["hosted-app/public/toolkit-capture-extension.zip"])

    def test_committed_download_and_metadata_match_authoritative_source(self):
        self.assertEqual(PACKAGER.outdated_artifacts(ROOT), [], "Run python scripts/package-extension.py")


if __name__ == "__main__":
    unittest.main()
