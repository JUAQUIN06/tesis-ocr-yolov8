"""Descarga explícita, reproducible y verificada; nunca descarga al atender un CV."""

import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
YOLO_REVISION = "49b97586dbd3bdae169e8f5e165710d0facf5f1e"
TESS_REVISION = "87416418657359cb625c412a48b6e1d6d41c29bd"
RESOURCES = [
    (
        "models/yolov8n-doclaynet.pt",
        f"https://huggingface.co/hantian/yolo-doclaynet/resolve/{YOLO_REVISION}/yolov8n-doclaynet.pt",
        "2b8ac374611942ff3bb2b71aab530d9cf9c98f5febe6ed409db98248a3e00719",
    ),
    *[
        (
            f".runtime/tessdata/{lang}.traineddata",
            f"https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/{TESS_REVISION}/{lang}.traineddata",
            digest,
        )
        for lang, digest in {
            "spa": "6f2e04d02774a18f01bed44b1111f2cd7f3ba7ac9dc4373cd3f898a40ea6b464",
            "eng": "7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2",
            "osd": "9cf5d576fcc47564f11265841e5ca839001e7e6f38ff7f7aacf46d15a96b00ff",
        }.items()
    ],
]


def install_resources(verify_only: bool = False) -> None:
    manifest = []
    for relative_path, url, digest in RESOURCES:
        destination = ROOT / relative_path
        valid = destination.is_file() and hashlib.sha256(destination.read_bytes()).hexdigest() == digest
        if not valid:
            if verify_only:
                raise SystemExit(f"Recurso ausente o modificado: {relative_path}")
            if destination.exists():
                raise SystemExit(f"{relative_path} ya existe con otro contenido; no se sobrescribirá.")
            destination.parent.mkdir(parents=True, exist_ok=True)
            temporary = destination.with_suffix(destination.suffix + ".part")
            try:
                hasher = hashlib.sha256()
                with urlopen(url, timeout=120) as response, temporary.open("wb") as output:
                    while chunk := response.read(1024 * 1024):
                        hasher.update(chunk)
                        output.write(chunk)
                if hasher.hexdigest() != digest:
                    raise RuntimeError(f"SHA-256 incorrecto: {relative_path}")
                temporary.replace(destination)
            finally:
                temporary.unlink(missing_ok=True)
        print(f"OK {relative_path}")
        manifest.append({"path": relative_path, "url": url, "sha256": digest})
    if not verify_only:
        (ROOT / ".runtime").mkdir(exist_ok=True)
        (ROOT / ".runtime" / "resources.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true", help="Comprobar recursos sin descargar.")
    install_resources(parser.parse_args().verify)
