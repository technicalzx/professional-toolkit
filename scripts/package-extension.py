"""Create a reproducible unpacked-extension ZIP without third-party build tooling."""
from pathlib import Path
import shutil
import zipfile

root = Path(__file__).resolve().parents[1]
extension = root / 'extension'
shutil.copyfile(root / 'hosted-app/lib/capture/snapshot.mjs', extension / 'snapshot.mjs')
shutil.copyfile(root / 'LICENSE', extension / 'LICENSE')
target = root / 'hosted-app/public/toolkit-capture-extension.zip'
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(extension.iterdir()):
        if path.is_file():
            info = zipfile.ZipInfo(path.name, date_time=(2026, 10, 16, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, path.read_bytes())
print(target)
