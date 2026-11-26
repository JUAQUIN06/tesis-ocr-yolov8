import pytest


def pytest_addoption(parser):
    parser.addoption("--run-integration", action="store_true", help="Ejecutar YOLO y Tesseract reales.")


def pytest_collection_modifyitems(config, items):
    if config.getoption("--run-integration"):
        return
    for item in items:
        if "integration" in item.keywords:
            item.add_marker(pytest.mark.skip(reason="Requiere --run-integration y recursos OCR/YOLO."))
