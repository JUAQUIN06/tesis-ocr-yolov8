import time
import uuid

from backend.config import Settings
from backend.schemas import AnalysisResult, EngineInfo, PageResult
from backend.services.detector import LayoutDetector
from backend.services.documents import iter_pages, usable_native_text
from backend.services.errors import ProcessingError
from backend.services.extractor import extract_profile
from backend.services.layout import attach_regions, reading_order
from backend.services.ocr import OcrEngine


class CvPipeline:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings.from_env()
        self.detector = LayoutDetector(self.settings)
        self.ocr = OcrEngine(self.settings)

    def initialize(self) -> None:
        self.ocr.initialize()
        self.detector.load()

    def analyze(self, data: bytes, filename: str, *, force_ocr: bool = False) -> AnalysisResult:
        started = time.monotonic()
        self.initialize()
        pages = []
        warnings = list(self.ocr.warnings)
        for source in iter_pages(data, filename, self.settings):
            image = source.image
            rotation, angle = 0, 0.0
            native = not force_ocr and usable_native_text(source.native_lines)
            if not native:
                image, rotation, angle = self.ocr.prepare_image(image)
            regions, page_warnings = self.detector.detect(image, source.number)
            if native:
                lines = source.native_lines
            else:
                lines, ocr_warnings = self.ocr.recognize(image, regions)
                page_warnings.extend(ocr_warnings)
            attach_regions(lines, regions)
            lines = reading_order(lines, image.shape[1], source.number)
            if not lines:
                page_warnings.append("No se detectó texto legible en esta página.")
            elif not native and sum((line.confidence or 0) < 50 for line in lines) > len(lines) / 3:
                page_warnings.append("Varias líneas tienen baja confianza OCR; conviene revisar la imagen original.")
            pages.append(PageResult(
                number=source.number, width=image.shape[1], height=image.shape[0],
                source="pdf_text" if native else "tesseract", rotation_clockwise=rotation,
                deskew_degrees=angle, regions=regions, lines=lines,
                text="\n".join(line.text for line in lines), warnings=page_warnings,
            ))
            warnings.extend(f"Página {source.number}: {message}" for message in page_warnings)
        if not any(page.lines for page in pages):
            raise ProcessingError("No se encontró texto legible. Usa un documento con mayor resolución.", 422, "no_text_detected")
        return AnalysisResult(
            document_id=str(uuid.uuid4()), filename=filename, page_count=len(pages),
            text="\n\n".join(page.text for page in pages), pages=pages,
            profile=extract_profile(pages), warnings=list(dict.fromkeys(warnings)),
            engines=EngineInfo(
                detector="yolov8" if self.detector.model is not None else "ocr_fallback",
                detector_model=self.settings.model_path.name if self.detector.model is not None else None,
                languages=self.ocr.languages, device=self.settings.device,
            ),
            processing_seconds=round(time.monotonic() - started, 3),
        )

    def health(self) -> dict:
        ready = self.ocr.available and (self.detector.model is not None or not self.settings.require_yolo)
        return {
            "status": "ok" if ready and self.detector.model is not None else "degraded" if ready else "unavailable",
            "ready": ready,
            "ocr": {"available": self.ocr.available, "languages": self.ocr.languages, "error": self.ocr.error},
            "detector": self.detector.status(),
            "limits": {"file_bytes": self.settings.max_file_bytes, "pages": self.settings.max_pages},
        }
