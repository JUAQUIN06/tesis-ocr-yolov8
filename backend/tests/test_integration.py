import pytest
from fastapi.testclient import TestClient

from backend.config import Settings
from backend.main import create_app
from backend.services.errors import ProcessingError
from backend.services.pipeline import CvPipeline
from backend.tests.fixtures import synthetic_image, synthetic_pdf

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def pipeline():
    engine = CvPipeline(Settings(require_yolo=True))
    engine.initialize()
    return engine


@pytest.mark.parametrize(("columns", "rotation", "kind"), [
    (False, 0, "PNG"), (True, 0, "PNG"), (False, 90, "PNG"), (False, 2.5, "JPEG"),
])
def test_real_ocr_and_yolo_on_variable_layouts(pipeline, columns, rotation, kind):
    result = pipeline.analyze(synthetic_image(columns, rotation, kind), "cv.png" if kind == "PNG" else "cv.jpg")
    assert result.engines.detector == "yolov8"
    assert result.engines.languages == ["spa", "eng"]
    assert result.pages[0].source == "tesseract"
    assert result.pages[0].regions
    assert any(item.value == "ana.torres@example.com" for item in result.profile.emails)
    assert {item.value for item in result.profile.skills} >= {"Python", "SQL", "Microsoft Excel"}
    assert {section.type for section in result.profile.sections} >= {"experience", "education", "skills"}
    assert all(line.id and line.bbox[2] <= result.pages[0].width for line in result.pages[0].lines)
    if rotation == 90:
        assert result.pages[0].rotation_clockwise == 90
    if rotation == 2.5:
        assert result.pages[0].deskew_degrees != 0


def test_real_multipage_pdf_and_api_response(pipeline):
    with TestClient(create_app(pipeline=pipeline)) as client:
        assert client.get("/api/health").json()["status"] == "ok"
        response = client.post("/api/analyze", files={"file": ("cv.pdf", synthetic_pdf(columns=True, pages=2), "application/pdf")})
        assert response.status_code == 200, response.text
        result = response.json()
        assert result["page_count"] == 2
        assert all(page["source"] == "pdf_text" for page in result["pages"])
        assert result["profile"]["candidate_name"]["value"] == "ANA TORRES QUISPE"
        assert result["profile"]["emails"][0]["evidence"]["page"] == 1
        for page in result["pages"]:
            assert page["text"].index("Microsoft Excel") < page["text"].index("Analista de soporte")


def test_real_fallback_without_model(tmp_path):
    engine = CvPipeline(Settings(model_path=tmp_path / "missing.pt"))
    result = engine.analyze(synthetic_image(), "cv.png")
    assert result.engines.detector == "ocr_fallback"
    assert result.warnings
    assert result.profile.emails[0].value == "ana.torres@example.com"


def test_required_model_reports_missing_weights(tmp_path):
    engine = CvPipeline(Settings(model_path=tmp_path / "missing.pt", require_yolo=True))
    with pytest.raises(ProcessingError) as error:
        engine.initialize()
    assert error.value.status_code == 503


def test_force_ocr_for_native_pdf(pipeline):
    result = pipeline.analyze(synthetic_pdf(), "cv.pdf", force_ocr=True)
    assert result.pages[0].source == "tesseract"
    assert result.profile.emails[0].value == "ana.torres@example.com"
