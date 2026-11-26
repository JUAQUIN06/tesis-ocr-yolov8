"""OCR bilingüe por región más recuperación global de contenido no detectado."""

import re
import shlex
from collections import defaultdict
from statistics import mean, median

import cv2
import numpy as np
import pytesseract
from pytesseract import Output

from backend.config import Settings
from backend.schemas import Region, TextLine
from backend.services.errors import ProcessingError
from backend.services.layout import deduplicate_lines


class OcrEngine:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.languages: list[str] = []
        self.warnings: list[str] = []
        self.available = False
        self.osd_available = False
        self.base_config = ""
        self.error: str | None = None
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
        if settings.tessdata_dir and settings.tessdata_dir.is_dir():
            self.base_config = f"--tessdata-dir {shlex.quote(str(settings.tessdata_dir))}"
        if not re.fullmatch(r"[a-z0-9_]+(?:\+[a-z0-9_]+)*", settings.languages):
            raise ValueError("CV_LANGUAGES no tiene un formato válido.")

    def initialize(self) -> None:
        if self.available:
            return
        try:
            installed = pytesseract.get_languages(config=self.base_config)
            self.languages = [lang for lang in self.settings.languages.split("+") if lang in installed]
            self.osd_available = "osd" in installed
            missing = set(self.settings.languages.split("+")) - set(self.languages)
            if missing:
                self.warnings = [f"Idiomas OCR no instalados: {', '.join(sorted(missing))}."]
            if not self.languages:
                raise RuntimeError("No están instalados los idiomas OCR solicitados.")
            self.available = True
            self.error = None
        except (RuntimeError, OSError, pytesseract.TesseractError) as exc:
            self.error = "Tesseract o sus idiomas no están disponibles. Instala Tesseract y ejecuta scripts/setup_resources.py."
            raise ProcessingError(self.error, 503, "ocr_unavailable") from exc

    def prepare_image(self, image: np.ndarray) -> tuple[np.ndarray, int, float]:
        self.initialize()
        rotation = 0
        if self.osd_available:
            try:
                osd = pytesseract.image_to_osd(
                    image, config=self.base_config, output_type=Output.DICT,
                    timeout=min(self.settings.ocr_timeout, 10),
                )
                if float(osd.get("orientation_conf", 0)) >= 7:
                    rotation = int(osd.get("rotate", 0)) % 360
                    image = np.ascontiguousarray(np.rot90(image, -(rotation // 90)))
            except (RuntimeError, pytesseract.TesseractError):
                # Tesseract OSD necesita suficiente texto. Un CV corto sigue siendo procesable.
                pass
        image, angle = deskew(image)
        return image, rotation, angle

    def _read(self, image: np.ndarray, psm: int, offset: tuple[int, int] = (0, 0)) -> list[TextLine]:
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY) if image.ndim == 3 else image
        if float(np.mean(gray)) < 110:
            gray = 255 - gray
        data = pytesseract.image_to_data(
            gray, lang="+".join(self.languages),
            config=f"{self.base_config} --oem 1 --psm {psm} -c preserve_interword_spaces=1",
            output_type=Output.DICT, timeout=self.settings.ocr_timeout,
        )
        grouped = defaultdict(list)
        for index, text in enumerate(data["text"]):
            text = text.strip()
            confidence = float(data["conf"][index])
            if not text or confidence < 0:
                continue
            x = int(data["left"][index]) + offset[0]
            y = int(data["top"][index]) + offset[1]
            word = (text, x, y, x + int(data["width"][index]), y + int(data["height"][index]), confidence)
            key = (data["block_num"][index], data["par_num"][index], data["line_num"][index])
            grouped[key].append(word)
        lines = []
        for words in grouped.values():
            words.sort(key=lambda word: word[1])
            # PSM 3 puede unir una misma fila de dos columnas: dividir por huecos grandes.
            threshold = max(30, median(word[4] - word[2] for word in words) * 2.8)
            chunks: list[list[tuple]] = [[]]
            for word in words:
                if chunks[-1] and word[1] - chunks[-1][-1][3] > threshold:
                    chunks.append([])
                chunks[-1].append(word)
            for chunk in chunks:
                text = " ".join(word[0] for word in chunk)
                if not any(char.isalnum() for char in text):
                    continue
                lines.append(TextLine(
                    text=text,
                    bbox=(min(w[1] for w in chunk), min(w[2] for w in chunk), max(w[3] for w in chunk), max(w[4] for w in chunk)),
                    confidence=round(mean(word[5] for word in chunk), 2), source="tesseract",
                ))
        return lines

    def recognize(self, image: np.ndarray, regions: list[Region]) -> tuple[list[TextLine], list[str]]:
        self.initialize()
        warnings = []
        lines: list[TextLine] = []
        successful_passes = 0
        try:
            lines = self._read(image, psm=3)
            successful_passes += 1
            if not lines or mean(line.confidence or 0 for line in lines) < 35:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
                binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15)
                lines.extend(self._read(binary, psm=11))
        except (RuntimeError, pytesseract.TesseractError):
            warnings.append("El OCR global no terminó correctamente; se intentaron las regiones detectadas.")
        height, width = image.shape[:2]
        candidates = [region for region in regions if region.label.lower() not in {"picture", "photo", "image", "foto"}]
        if len(candidates) > self.settings.max_regions:
            warnings.append("Se limitó el OCR por regiones; el OCR global cubre el resto de la página.")
        for region in sorted(candidates, key=lambda region: region.confidence, reverse=True)[:self.settings.max_regions]:
            x0, y0, x1, y1 = region.bbox
            x0, y0 = max(0, int(x0) - 5), max(0, int(y0) - 5)
            x1, y1 = min(width, int(x1) + 5), min(height, int(y1) + 5)
            try:
                local = self._read(image[y0:y1, x0:x1], psm=6, offset=(x0, y0))
                successful_passes += 1
                for line in local:
                    line.region_id = region.id
                lines.extend(local)
            except (RuntimeError, pytesseract.TesseractError):
                warnings.append(f"No se completó OCR en {region.id}; se conserva la lectura global disponible.")
        if not successful_passes:
            raise ProcessingError("Tesseract no pudo procesar esta página dentro del tiempo disponible.", 503, "ocr_failed")
        return deduplicate_lines(lines), warnings


def deskew(image: np.ndarray) -> tuple[np.ndarray, float]:
    """Corrección leve de inclinación por proyección horizontal, sin recortar la hoja."""
    height, width = image.shape[:2]
    ratio = min(1, 1000 / width)
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    small = cv2.resize(gray, (max(1, round(width * ratio)), max(1, round(height * ratio))))
    _, binary = cv2.threshold(small, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    # Evitar ajustar páginas casi vacías o imágenes fotográficas muy densas.
    density = np.count_nonzero(binary) / binary.size
    if not 0.005 < density < 0.30:
        return image, 0.0
    h, w = binary.shape
    baseline = float(np.square(np.sum(binary > 0, axis=1).astype(float)).sum())
    best_score, best_angle = baseline, 0.0
    for angle in np.arange(-5, 5.01, 0.5):
        matrix = cv2.getRotationMatrix2D((w / 2, h / 2), float(angle), 1)
        rotated = cv2.warpAffine(binary, matrix, (w, h), flags=cv2.INTER_NEAREST, borderValue=0)
        score = float(np.square(np.sum(rotated > 0, axis=1).astype(float)).sum())
        if score > best_score:
            best_score, best_angle = score, float(angle)
    if best_score < baseline * 1.08 or abs(best_angle) < 0.5:
        return image, 0.0
    matrix = cv2.getRotationMatrix2D((width / 2, height / 2), best_angle, 1)
    # Ampliar el lienzo evita perder letras cercanas a las esquinas.
    cosine, sine = abs(matrix[0, 0]), abs(matrix[0, 1])
    new_width = int(height * sine + width * cosine)
    new_height = int(height * cosine + width * sine)
    matrix[0, 2] += (new_width - width) / 2
    matrix[1, 2] += (new_height - height) / 2
    return cv2.warpAffine(image, matrix, (new_width, new_height), borderValue=(255, 255, 255)), best_angle
