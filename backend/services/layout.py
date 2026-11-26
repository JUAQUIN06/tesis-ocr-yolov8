"""Orden de lectura por columnas y bandas; no presupone coordenadas de secciones."""

import re
import unicodedata
from difflib import SequenceMatcher

from backend.schemas import Box, Region, TextLine


def normalize(text: str) -> str:
    return " ".join(
        "".join(char for char in unicodedata.normalize("NFKD", text.casefold()) if not unicodedata.combining(char)).split()
    )


def coverage(box: Box, container: Box) -> float:
    x0, y0 = max(box[0], container[0]), max(box[1], container[1])
    x1, y1 = min(box[2], container[2]), min(box[3], container[3])
    area = max(1, (box[2] - box[0]) * (box[3] - box[1]))
    return max(0, x1 - x0) * max(0, y1 - y0) / area


def deduplicate_lines(lines: list[TextLine]) -> list[TextLine]:
    # Preferir líneas completas/confidentes, no eliminar frases iguales en lugares distintos.
    ranked = sorted(lines, key=lambda line: (len(line.text.split()), line.confidence or 0), reverse=True)
    result: list[TextLine] = []
    for line in ranked:
        text = normalize(re.sub(r"[^\w\s@.+-]", "", line.text))
        duplicate = False
        for kept in result:
            if coverage(line.bbox, kept.bbox) < 0.65:
                continue
            other = normalize(re.sub(r"[^\w\s@.+-]", "", kept.text))
            if text in other or SequenceMatcher(None, text, other).ratio() >= 0.65:
                duplicate = True
                break
        if not duplicate:
            result.append(line)
    return result


def attach_regions(lines: list[TextLine], regions: list[Region]) -> None:
    for line in lines:
        matches = [(coverage(line.bbox, region.bbox), region) for region in regions]
        if matches:
            score, region = max(matches, key=lambda match: match[0])
            if score > 0.45:
                line.region_id = region.id


def _find_gutter(lines: list[TextLine], left: float, right: float) -> float | None:
    if len(lines) < 6:
        return None
    width = right - left
    valid = []
    # Buscar una franja casi vacía incluso si un título común cruza ambas columnas.
    for step in range(20, 81):
        x = left + width * step / 100
        crossing = sum(line.bbox[0] < x - width * 0.012 and line.bbox[2] > x + width * 0.012 for line in lines)
        before = sum(line.bbox[2] <= x + width * 0.012 for line in lines)
        after = sum(line.bbox[0] >= x - width * 0.012 for line in lines)
        if before >= 3 and after >= 3 and crossing <= max(1, len(lines) * 0.10):
            valid.append((step, crossing))
    if not valid:
        return None
    best_crossing = min(count for _, count in valid)
    candidates = [step for step, count in valid if count == best_crossing]
    runs: list[list[int]] = []
    for value in candidates:
        if not runs or value != runs[-1][-1] + 1:
            runs.append([])
        runs[-1].append(value)
    best = max(runs, key=len)
    if len(best) < 2:
        return None
    return left + width * ((best[0] + best[-1]) / 2) / 100


def reading_order(lines: list[TextLine], width: int, page_number: int) -> list[TextLine]:
    def order(items: list[TextLine], left: float, right: float, column: str, depth: int = 0):
        split = _find_gutter(items, left, right) if depth < 2 else None
        if split is None:
            for line in items:
                line.column = column
            return sorted(items, key=lambda line: (line.bbox[1], line.bbox[0]))
        margin = (right - left) * 0.012
        spanning = sorted(
            [line for line in items if line.bbox[0] < split - margin and line.bbox[2] > split + margin],
            key=lambda line: line.bbox[1],
        )
        remaining = [line for line in items if line not in spanning]
        result = []
        for anchor in [*spanning, None]:
            limit = anchor.bbox[1] if anchor else float("inf")
            band = [line for line in remaining if (line.bbox[1] + line.bbox[3]) / 2 < limit]
            remaining = [line for line in remaining if line not in band]
            lhs = [line for line in band if (line.bbox[0] + line.bbox[2]) / 2 < split]
            rhs = [line for line in band if line not in lhs]
            result.extend(order(lhs, left, split, f"{column}.0", depth + 1))
            result.extend(order(rhs, split, right, f"{column}.1", depth + 1))
            if anchor:
                anchor.column = "spanning"
                result.append(anchor)
        return result

    result = order(lines, 0, width, "main")
    for index, line in enumerate(result):
        line.id = f"p{page_number}-l{index + 1}"
        line.order = index
    return result
