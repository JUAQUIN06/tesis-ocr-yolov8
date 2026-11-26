"""API: ejecutar desde el proyecto con `uvicorn backend.main:app`.

Desde backend/: `uvicorn backend.main:app --app-dir .. --port 8000`.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import Settings
from backend.schemas import AnalysisResult
from backend.services.errors import ProcessingError
from backend.services.pipeline import CvPipeline

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None, pipeline: CvPipeline | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    pipeline = pipeline or CvPipeline(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.slots = asyncio.Semaphore(settings.max_concurrent_jobs)
        try:
            await run_in_threadpool(pipeline.initialize)
        except ProcessingError as exc:
            logger.error("Motor no disponible: %s", exc)
        yield

    app = FastAPI(
        title="Reconocimiento de CV · Tesseract + YOLOv8", version="1.0.0", lifespan=lifespan,
        description="Extracción de texto y estructura documental sin plantilla fija. No emite decisiones de contratación.",
    )
    app.add_middleware(
        CORSMiddleware, allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"], allow_headers=["Content-Type"],
    )

    @app.exception_handler(ProcessingError)
    async def processing_error(_request: Request, exc: ProcessingError):
        return JSONResponse(status_code=exc.status_code, content={"error": {"code": exc.code, "message": str(exc)}})

    @app.get("/api/health", tags=["Estado"])
    async def health():
        state = pipeline.health()
        return JSONResponse(state, status_code=200 if state["ready"] else 503)

    @app.post("/api/analyze", response_model=AnalysisResult, tags=["Reconocimiento"])
    async def analyze(
        request: Request,
        file: Annotated[UploadFile, File(description="CV en PDF, PNG, JPG o JPEG; máximo 15 MB.")],
        force_ocr: Annotated[bool, Form(description="Forzar Tesseract incluso si el PDF contiene texto seleccionable.")] = False,
    ):
        acquired = False
        try:
            try:
                await asyncio.wait_for(request.app.state.slots.acquire(), timeout=0.1)
                acquired = True
            except TimeoutError as exc:
                raise ProcessingError("El motor está ocupado. Intenta nuevamente en unos segundos.", 429, "engine_busy") from exc
            content = bytearray()
            while chunk := await file.read(1024 * 1024):
                content.extend(chunk)
                if len(content) > settings.max_file_bytes:
                    raise ProcessingError("El archivo supera el tamaño máximo permitido.", 413, "file_too_large")
            # El nombre solo es metadato; nunca se usa como ruta de escritura.
            filename = (file.filename or "documento").replace("\\", "/").rsplit("/", 1)[-1][:255]
            return await run_in_threadpool(pipeline.analyze, bytes(content), filename, force_ocr=force_ocr)
        except ProcessingError:
            raise
        except Exception as exc:
            # No registrar ni conservar contenido del CV en los logs.
            logger.error("Fallo de procesamiento: %s", type(exc).__name__)
            raise ProcessingError("No se pudo procesar el documento.", 500, "processing_failed") from exc
        finally:
            await file.close()
            if acquired:
                request.app.state.slots.release()

    return app


app = create_app()
