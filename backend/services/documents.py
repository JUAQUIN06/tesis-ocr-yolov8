"""Renderizado acotado de PDFs e imágenes; sin asumir una plantilla de CV."""

import io
import math
import warnings
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pymupdf
from PIL import Image, ImageOps, UnidentifiedImageError

from backend.config import Settings
from backend.schemas import TextLine
from backend.services.errors import ProcessingError


@dataclass
class DocumentPage:
    number: int
    image: np.ndarray  # RGB, nunca BGR
    native_lines: list[TextLine]


def validate_document(data: bytes, filename: str, settings: Settings) -> str:
    if not data:
        raise ProcessingError("El archivo está vacío.")
    if len(data) > settings.max_file_bytes:
        raise ProcessingError("El archivo supera el límite de 15 MB.", 413, "file_too_large")
    suffix = Path(filename).suffix.lower()
    signatures = {
        ".pdf": data[:5] == b"%PDF-",
        ".png": data[:8] == b"\x89PNG\r\n\x1a\n",
        ".jpg": data[:3] == b"\xff\xd8\xff",
        ".jpeg": data[:3] == b"\xff\xd8\xff",
    }
    if suffix not in signatures:
        raise ProcessingError("Formato no admitido. Usa PDF, JPG, JPEG o PNG.", 415)
    if not signatures[suffix]:
        raise ProcessingError("El contenido del archivo no coincide con su extensión.", 415)
    return "pdf" if suffix == ".pdf" else "image"


def _native_lines(page: pymupdf.Page, width: int, height: int) -> list[TextLine]:
    sx, sy = width / page.rect.width, height / page.rect.height
    result = []
    for block in page.get_text("dict", flags=pymupdf.TEXTFLAGS_TEXT)["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = " ".join(span["text"].strip() for span in line["spans"]).strip()
            if not text:
                continue
            box = pymupdf.Rect(line["bbox"]) * page.rotation_matrix
            result.append(TextLine(
                text=text, bbox=(box.x0 * sx, box.y0 * sy, box.x1 * sx, box.y1 * sy),
                source="pdf_text",
            ))
    return result


def usable_native_text(lines: list[TextLine]) -> bool:
    text = " ".join(line.text for line in lines)
    # Una dirección o un número de página aislado no reemplaza el OCR de un escaneo.
    return (
        len(text.split()) >= 25
        and sum(char.isalpha() for char in text) >= 80
        and text.count("\ufffd") / max(len(text), 1) < 0.01
    )


def iter_pages(data: bytes, filename: str, settings: Settings) -> Iterator[DocumentPage]:
    kind = validate_document(data, filename, settings)
    if kind == "pdf":
        try:
            document = pymupdf.open(stream=data, filetype="pdf")
        except (RuntimeError, ValueError) as exc:
            raise ProcessingError("No se pudo abrir el PDF; puede estar dañado.") from exc
        with document:
            if document.needs_pass:
                raise ProcessingError("El PDF está protegido con contraseña.")
            if not 1 <= document.page_count <= settings.max_pages:
                raise ProcessingError(f"El PDF debe contener entre 1 y {settings.max_pages} páginas.")
            for index, page in enumerate(document):
                area = page.rect.width * page.rect.height
                if not math.isfinite(area) or area <= 0:
                    raise ProcessingError("El PDF contiene una página con dimensiones inválidas.")
                scale = min(
                    settings.dpi / 72,
                    math.sqrt(settings.max_pixels / area) * 0.99,
                    6000 / max(page.rect.width, page.rect.height),
                )
                pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), colorspace=pymupdf.csRGB, alpha=False)
                image = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3).copy()
                native = _native_lines(page, pix.width, pix.height)
                # Los PDF híbridos pueden tener texto vectorial sobre una imagen escaneada.
                # En ese caso se procesa toda la página para no perder la parte rasterizada.
                image_area = sum(
                    max(0, pymupdf.Rect(info["bbox"]).get_area())
                    for info in page.get_image_info()
                )
                if image_area > area * 0.35:
                    native = []
                yield DocumentPage(index + 1, image, native)
    else:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(data)) as original:
                    if original.width * original.height > settings.max_pixels:
                        raise ProcessingError("La imagen supera el máximo de píxeles permitido.", 413)
                    original.load()
                    oriented = ImageOps.exif_transpose(original)
                    rgba = oriented.convert("RGBA")
                    background = Image.new("RGBA", rgba.size, "white")
                    rgb = Image.alpha_composite(background, rgba).convert("RGB")
                    scale = min(2, max(1, 1600 / rgb.width))
                    if rgb.width * rgb.height * scale**2 <= settings.max_pixels:
                        rgb = rgb.resize((round(rgb.width * scale), round(rgb.height * scale)), Image.Resampling.LANCZOS)
                    yield DocumentPage(1, np.array(rgb), [])
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
            raise ProcessingError("La imagen está dañada o tiene dimensiones excesivas.") from exc
