"""Configuración independiente del directorio desde el que se ejecuta el API."""

import os
from pathlib import Path

from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseModel):
    model_path: Path = BASE_DIR / "models" / "yolov8n-doclaynet.pt"
    tessdata_dir: Path | None = BASE_DIR / ".runtime" / "tessdata"
    tesseract_cmd: str = "tesseract"
    languages: str = "spa+eng"
    device: str = "cpu"
    yolo_confidence: float = Field(default=0.2, ge=0.05, le=0.95)
    yolo_image_size: int = Field(default=1024, ge=320, le=2048)
    require_yolo: bool = False
    max_file_bytes: int = Field(default=15 * 1024 * 1024, ge=1024)
    max_pages: int = Field(default=10, ge=1, le=100)
    max_pixels: int = Field(default=20_000_000, ge=1_000_000)
    dpi: int = Field(default=200, ge=100, le=300)
    ocr_timeout: int = Field(default=30, ge=1, le=120)
    max_regions: int = Field(default=40, ge=1, le=100)
    max_concurrent_jobs: int = Field(default=1, ge=1, le=8)
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @classmethod
    def from_env(cls) -> "Settings":
        values = {}
        for field in cls.model_fields:
            value = os.getenv(f"CV_{field.upper()}")
            if value is not None:
                values[field] = value.split(",") if field == "cors_origins" else value
        if values.get("tessdata_dir") == "":
            values["tessdata_dir"] = None
        for field in ("model_path", "tessdata_dir"):
            if values.get(field):
                path = Path(values[field]).expanduser()
                values[field] = path if path.is_absolute() else BASE_DIR / path
        return cls(**values)
