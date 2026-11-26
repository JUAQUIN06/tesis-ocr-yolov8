import io

import pymupdf
import pytest
from PIL import Image

from backend.config import Settings
from backend.services.documents import iter_pages, usable_native_text, validate_document
from backend.services.errors import ProcessingError
from backend.tests.fixtures import synthetic_pdf


@pytest.mark.parametrize(("data", "name", "status"), [
    (b"", "cv.pdf", 422), (b"nada", "cv.pdf", 415), (b"nada", "cv.docx", 415),
])
def test_invalid_documents(data, name, status):
    with pytest.raises(ProcessingError) as error:
        validate_document(data, name, Settings())
    assert error.value.status_code == status


def test_size_and_page_limits():
    with pytest.raises(ProcessingError, match="15 MB"):
        validate_document(b"%PDF-" + bytes(2000), "cv.pdf", Settings(max_file_bytes=1024))
    with pytest.raises(ProcessingError, match="páginas"):
        list(iter_pages(synthetic_pdf(pages=2), "cv.pdf", Settings(max_pages=1)))


def test_native_pdf_coordinates_and_text():
    pages = list(iter_pages(synthetic_pdf(columns=True, pages=2), "cv.pdf", Settings()))
    assert len(pages) == 2
    assert usable_native_text(pages[0].native_lines)
    height, width = pages[0].image.shape[:2]
    for line in pages[0].native_lines:
        assert 0 <= line.bbox[0] < line.bbox[2] <= width
        assert 0 <= line.bbox[1] < line.bbox[3] <= height


def test_encrypted_pdf_is_rejected():
    with pymupdf.open(stream=synthetic_pdf(), filetype="pdf") as document:
        data = document.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, owner_pw="owner", user_pw="secret")
    with pytest.raises(ProcessingError, match="contraseña"):
        list(iter_pages(data, "cv.pdf", Settings()))


def test_transparent_png_has_white_background():
    output = io.BytesIO()
    Image.new("RGBA", (200, 200), (0, 0, 0, 0)).save(output, format="PNG")
    page = next(iter_pages(output.getvalue(), "cv.png", Settings()))
    assert page.image.min() == 255


def test_hybrid_pdf_does_not_discard_raster_text():
    image = io.BytesIO()
    Image.new("RGB", (600, 800), "white").save(image, format="PNG")
    with pymupdf.open(stream=synthetic_pdf(), filetype="pdf") as document:
        document[0].insert_image(document[0].rect, stream=image.getvalue(), overlay=False)
        data = document.tobytes()
    page = next(iter_pages(data, "hybrid.pdf", Settings()))
    assert page.native_lines == []
