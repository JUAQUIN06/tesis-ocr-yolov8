"""Uso: python -m backend.cli documento.pdf --output resultado.json."""

import argparse
import sys
from pathlib import Path

from backend.services.errors import ProcessingError
from backend.services.pipeline import CvPipeline


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("document", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--force-ocr", action="store_true")
    args = parser.parse_args()
    try:
        pipeline = CvPipeline()
        if args.document.stat().st_size > pipeline.settings.max_file_bytes:
            raise ProcessingError("El documento supera el límite de tamaño.")
        result = pipeline.analyze(args.document.read_bytes(), args.document.name, force_ocr=args.force_ocr)
        text = result.model_dump_json(indent=2)
        if args.output:
            args.output.write_text(text, encoding="utf-8")
        else:
            print(text)
        return 0
    except (ProcessingError, OSError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
