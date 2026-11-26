"""Detección de bloques documentales con pesos YOLOv8 DocLayNet o propios."""

import os
import threading

import numpy as np

from backend.config import BASE_DIR, Settings
from backend.schemas import Region
from backend.services.errors import ProcessingError


class LayoutDetector:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.model = None
        self.error: str | None = None
        self._lock = threading.Lock()

    def load(self) -> None:
        with self._lock:
            if self.model is not None:
                return
            path = self.settings.model_path
            if not path.is_file() or path.stat().st_size == 0:
                self.error = "No hay pesos YOLO válidos. Ejecuta scripts/setup_resources.py."
            else:
                try:
                    os.environ.setdefault("YOLO_CONFIG_DIR", str(BASE_DIR / ".runtime" / "ultralytics"))
                    from ultralytics import YOLO

                    model = YOLO(str(path), task="detect")
                    names = {str(name).lower().replace("_", "-") for name in model.names.values()}
                    if names & {"person", "car", "dog"} and not names & {"text", "section-header", "title"}:
                        raise ValueError("Los pesos COCO no detectan estructura documental.")
                    self.model = model
                    self.error = None
                except Exception as exc:
                    self.error = f"No se pudo cargar el modelo de layout: {type(exc).__name__}."
            if self.error and self.settings.require_yolo:
                raise ProcessingError(self.error, 503, "detector_unavailable")

    def detect(self, image: np.ndarray, page_number: int) -> tuple[list[Region], list[str]]:
        self.load()
        if self.model is None:
            return [], [self.error or "YOLO no disponible; se utiliza OCR de página completa."]
        height, width = image.shape[:2]
        try:
            with self._lock:
                prediction = self.model.predict(
                    source=np.ascontiguousarray(image[:, :, ::-1]),  # Ultralytics espera BGR
                    conf=self.settings.yolo_confidence, imgsz=self.settings.yolo_image_size,
                    device=self.settings.device, verbose=False, save=False,
                    max_det=self.settings.max_regions * 2,
                )[0]
            regions = []
            for box in prediction.boxes:
                x0, y0, x1, y1 = box.xyxy[0].tolist()
                bounds = (max(0.0, x0), max(0.0, y0), min(float(width), x1), min(float(height), y1))
                if bounds[2] - bounds[0] < 4 or bounds[3] - bounds[1] < 4:
                    continue
                regions.append(Region(
                    id=f"p{page_number}-r{len(regions) + 1}",
                    label=prediction.names[int(box.cls.item())], bbox=bounds,
                    confidence=round(float(box.conf.item()), 4),
                ))
            return regions, []
        except Exception as exc:
            if self.settings.require_yolo:
                raise ProcessingError("Falló la inferencia YOLO.", 503, "detector_failed") from exc
            return [], ["Falló la detección de layout; se conserva el OCR de página completa."]

    def status(self) -> dict:
        return {
            "available": self.model is not None,
            "model": self.settings.model_path.name,
            "classes": list(self.model.names.values()) if self.model is not None else [],
            "error": self.error,
        }
