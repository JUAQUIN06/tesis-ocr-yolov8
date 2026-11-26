from backend.schemas import Region, TextLine
from backend.services.layout import attach_regions, deduplicate_lines, reading_order


def line(text, box, confidence=90):
    return TextLine(text=text, bbox=box, source="tesseract", confidence=confidence)


def test_two_columns_with_spanning_header_and_different_section_positions():
    lines = [line("NOMBRE APELLIDO", (30, 5, 900, 30))]
    lines += [line(f"izquierda {index}", (30, 80 + index * 35, 350, 100 + index * 35)) for index in range(6)]
    lines += [line(f"derecha {index}", (600, 80 + index * 35, 950, 100 + index * 35)) for index in range(6)]
    ordered = reading_order(list(reversed(lines)), 1000, 1)
    assert ordered[0].text == "NOMBRE APELLIDO"
    assert [item.text for item in ordered[1:7]] == [f"izquierda {index}" for index in range(6)]
    assert all(item.column == "main.1" for item in ordered[7:])
    assert len({item.id for item in ordered}) == len(lines)


def test_single_column_is_not_split_by_ragged_line_endings():
    lines = [line(f"linea {index}", (30, index * 30, 200 + index * 100, index * 30 + 20)) for index in range(8)]
    ordered = reading_order(lines[::-1], 1000, 2)
    assert [item.text for item in ordered] == [f"linea {index}" for index in range(8)]
    assert {item.column for item in ordered} == {"main"}


def test_deduplication_preserves_uncovered_text_and_repeated_text_elsewhere():
    lines = [
        line("Python SQL Excel", (10, 10, 250, 30)),
        line("Python SQL Excel", (11, 11, 249, 29), 70),
        line("SQL", (95, 12, 135, 28)),
        line("Python SQL Excel", (10, 150, 250, 170)),
        line("Texto que YOLO no detecto", (400, 90, 700, 120)),
    ]
    kept = deduplicate_lines(lines)
    assert len(kept) == 3
    assert any("no detecto" in item.text for item in kept)


def test_region_confidence_is_separate_from_ocr_confidence():
    item = line("HABILIDADES", (20, 25, 180, 45), 85)
    attach_regions([item], [Region(id="r1", bbox=(10, 10, 200, 80), label="Section-header", confidence=0.6)])
    assert item.region_id == "r1"
    assert item.confidence == 85
