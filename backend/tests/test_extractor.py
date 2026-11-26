from backend.schemas import PageResult, TextLine
from backend.services.extractor import extract_profile, heading_type


def test_bilingual_headings_and_free_layout_sections():
    assert heading_type("FORMACIÓN ACADÉMICA:") == "education"
    assert heading_type("Work Experience") == "experience"
    assert heading_type("Education & Certifications") == "education"
    assert heading_type("Tengo experiencia en ventas") is None


def test_extraction_links_evidence_and_does_not_treat_dates_as_phones():
    texts = [
        "ANA TORRES QUISPE", "ana.torres@example.com", "+51 987 654 321", "987654321@example.com",
        "EXPERIENCIA LABORAL", "Empresa Delta, 2020 - 2024", "Atencion al cliente",
        "HABILIDADES", "Python, SQL y Microsoft Excel", "Sin conocimientos de Java",
        "IDIOMAS", "Ingles B2", "FORMATION LIBRE", "Contenido no reconocido conservado",
    ]
    lines = [TextLine(id=f"p1-l{i}", text=text, bbox=(10, i * 25, 400, i * 25 + 20), source="pdf_text") for i, text in enumerate(texts)]
    page = PageResult(number=1, width=600, height=900, source="pdf_text", regions=[], lines=lines, text="\n".join(texts))
    profile = extract_profile([page])
    assert profile.candidate_name.value == "ANA TORRES QUISPE"
    assert profile.candidate_name.inferred is True
    assert profile.emails[0].value == "ana.torres@example.com"
    assert len(profile.phones) == 1
    assert {item.value for item in profile.skills} >= {"Python", "SQL", "Microsoft Excel"}
    assert "Java" not in {item.value for item in profile.skills}
    assert profile.languages[0].value == "Inglés"
    assert any("Contenido no reconocido" in section.text for section in profile.sections)
    assert profile.emails[0].evidence.line_id == "p1-l1"


def test_section_context_does_not_leak_across_columns():
    lines = [
        TextLine(id="a", text="Skills", bbox=(0, 0, 50, 10), source="pdf_text", column="left"),
        TextLine(id="b", text="Python", bbox=(0, 20, 50, 30), source="pdf_text", column="left"),
        TextLine(id="c", text="Universidad de Lima", bbox=(300, 20, 500, 30), source="pdf_text", column="right"),
    ]
    page = PageResult(number=1, width=600, height=900, source="pdf_text", regions=[], lines=lines, text="")
    profile = extract_profile([page])
    skill_section = next(section for section in profile.sections if section.type == "skills")
    assert "Universidad" not in skill_section.text
