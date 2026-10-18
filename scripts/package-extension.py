"""Build and verify the downloadable extension without third-party tooling."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = Path("hosted-app/public")
ZIP_NAME = "toolkit-capture-extension.zip"
METADATA_NAME = "extension-release.json"
# An explicit release inventory prevents local snapshots, credentials and editor
# files from entering a download when they happen to exist beside the sources.
RELEASE_FILES = (
    "LICENSE", "README.md", "capture-page.mjs", "connection.mjs",
    "manifest.json", "popup.css", "popup.html", "popup.mjs", "snapshot.mjs",
)
SHARED_SOURCES = {
    "LICENSE": Path("LICENSE"),
    "snapshot.mjs": Path("hosted-app/lib/capture/snapshot.mjs"),
}


def canonical_bytes(path):
    """Normalize checkout line endings so Windows and Linux publish one ZIP."""
    if path.is_symlink():
        raise ValueError(f"Release source must not be a symlink: {path.name}")
    return path.read_text(encoding="utf-8").encode("utf-8")


def source_files(root):
    return {
        name: canonical_bytes(root / SHARED_SOURCES.get(name, Path("extension") / name))
        for name in sorted(RELEASE_FILES)
    }


def build_release(root):
    files = source_files(root)
    manifest = json.loads(files["manifest.json"])
    buffer = io.BytesIO()
    # These files total only a few dozen KB. Stored entries also avoid zlib
    # version differences, keeping the published checksum platform-independent.
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_STORED) as archive:
        for name, content in files.items():
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_STORED
            archive.writestr(info, content)
    package = buffer.getvalue()
    metadata = {
        "schemaVersion": 1,
        "name": manifest["name"],
        "version": manifest["version"],
        "downloadUrl": "/" + ZIP_NAME,
        "sourceUrl": "https://github.com/technicalzx/professional-toolkit/tree/main/extension",
        "installUrl": "/extension",
        "sha256": hashlib.sha256(package).hexdigest(),
        "sizeBytes": len(package),
        "license": "MIT",
        "distribution": "unpacked",
        "files": list(files),
    }
    return package, metadata


def metadata_bytes(metadata):
    return (json.dumps(metadata, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def outdated_artifacts(root):
    package, metadata = build_release(root)
    outdated = []
    for name, source in SHARED_SOURCES.items():
        destination = root / "extension" / name
        if not destination.is_file() or canonical_bytes(destination) != canonical_bytes(root / source):
            outdated.append("extension/" + name)
    target = root / PUBLIC / ZIP_NAME
    if not target.is_file() or target.read_bytes() != package:
        outdated.append((PUBLIC / ZIP_NAME).as_posix())
    target = root / PUBLIC / METADATA_NAME
    if not target.is_file() or canonical_bytes(target) != metadata_bytes(metadata):
        outdated.append((PUBLIC / METADATA_NAME).as_posix())
    return outdated


def write_release(root):
    package, metadata = build_release(root)
    for name, source in SHARED_SOURCES.items():
        (root / "extension" / name).write_bytes((root / source).read_bytes())
    (root / PUBLIC).mkdir(parents=True, exist_ok=True)
    (root / PUBLIC / ZIP_NAME).write_bytes(package)
    (root / PUBLIC / METADATA_NAME).write_bytes(metadata_bytes(metadata))
    return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if the committed release is stale; do not modify files.")
    args = parser.parse_args()
    if args.check:
        outdated = outdated_artifacts(ROOT)
        if outdated:
            parser.exit(1, "Outdated extension artifacts: " + ", ".join(outdated)
                        + ". Run python scripts/package-extension.py.\n")
        print("Extension sources, ZIP and release metadata match.")
    else:
        metadata = write_release(ROOT)
        print(f"Built extension {metadata['version']}: {ZIP_NAME} ({metadata['sizeBytes']} bytes)")
        print(f"SHA-256: {metadata['sha256']}")


if __name__ == "__main__":
    main()
