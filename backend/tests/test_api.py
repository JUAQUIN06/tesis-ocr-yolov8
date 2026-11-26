import threading
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from backend.config import Settings
from backend.main import create_app
from backend.services.errors import ProcessingError


class UnavailablePipeline:
    def initialize(self):
        raise ProcessingError("Motor no disponible", 503)

    def health(self):
        return {"ready": False, "status": "unavailable"}

    def analyze(self, data, filename, *, force_ocr=False):
        raise ProcessingError("Formato no admitido", 415, "invalid_document")


def test_health_remains_available_when_engine_is_missing():
    with TestClient(create_app(pipeline=UnavailablePipeline())) as client:
        response = client.get("/api/health")
        assert response.status_code == 503
        assert response.json()["ready"] is False
        assert client.get("/docs").status_code == 200


def test_api_errors_size_limit_and_file_required():
    app = create_app(settings=Settings(max_file_bytes=1024), pipeline=UnavailablePipeline())
    with TestClient(app) as client:
        assert client.post("/api/analyze").status_code == 422
        response = client.post("/api/analyze", files={"file": ("cv.pdf", b"invalid", "application/pdf")})
        assert response.status_code == 415
        assert response.json()["error"]["code"] == "invalid_document"
        response = client.post("/api/analyze", files={"file": ("cv.pdf", bytes(1025), "application/pdf")})
        assert response.status_code == 413
        assert app.state.slots._value == 1


def test_cors_for_existing_frontend():
    with TestClient(create_app(pipeline=UnavailablePipeline())) as client:
        response = client.options("/api/analyze", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})
        assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_busy_engine_does_not_block_health_and_releases_slot():
    started = threading.Event()
    release = threading.Event()

    class BusyPipeline(UnavailablePipeline):
        def initialize(self):
            pass

        def health(self):
            return {"ready": True, "status": "ok"}

        def analyze(self, data, filename, *, force_ocr=False):
            started.set()
            release.wait(timeout=5)
            raise ProcessingError("Documento de prueba", 422)

    with TestClient(create_app(pipeline=BusyPipeline())) as client, ThreadPoolExecutor(1) as pool:
        pending = pool.submit(client.post, "/api/analyze", files={"file": ("a.pdf", b"test")})
        try:
            assert started.wait(timeout=3)
            response = client.post("/api/analyze", files={"file": ("b.pdf", b"test")})
            assert response.status_code == 429
            assert client.get("/api/health").status_code == 200
        finally:
            release.set()
        assert pending.result(timeout=3).status_code == 422
