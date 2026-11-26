"""Secciones y datos explícitos a partir del contenido, no de una plantilla espacial."""

import re

from backend.schemas import (
    CvProfile,
    CvSection,
    Evidence,
    ExtractedValue,
    PageResult,
    SectionType,
    TextLine,
)
from backend.services.layout import normalize

HEADINGS: dict[SectionType, tuple[str, ...]] = {
    "profile": ("perfil", "perfil profesional", "resumen", "resumen profesional", "sobre mi", "objetivo", "professional summary", "summary", "about me", "profile"),
    "experience": ("experiencia", "experiencia laboral", "experiencia profesional", "trayectoria profesional", "historial laboral", "work experience", "professional experience", "employment history", "experience"),
    "education": ("educacion", "formacion", "formacion academica", "estudios", "estudios realizados", "education", "academic background", "academic qualifications"),
    "skills": ("habilidades", "habilidades tecnicas", "competencias", "conocimientos", "herramientas", "herramientas y software", "aptitudes", "skills", "technical skills", "core competencies", "technologies"),
    "languages": ("idiomas", "idiomas y niveles", "languages", "language skills"),
    "certifications": ("certificaciones", "certificados", "cursos", "cursos y certificaciones", "certifications", "certificates", "training"),
    "projects": ("proyectos", "proyectos personales", "proyectos destacados", "projects", "personal projects"),
    "contact": ("contacto", "datos personales", "datos de contacto", "informacion personal", "contact", "contact information", "personal details"),
    "references": ("referencias", "referencias laborales", "references"),
    "other": (),
}

SKILLS = {
    "Python": (r"\bpython\b",), "SQL": (r"\bsql\b", r"\bmysql\b", r"\bpostgresql\b"),
    "Microsoft Excel": (r"\bexcel\b",), "JavaScript": (r"\bjavascript\b",),
    "TypeScript": (r"\btypescript\b",), "React": (r"\breact(?:js|\.js)?\b",),
    "Java": (r"\bjava\b",), "Power BI": (r"\bpower\s*bi\b",),
    "Salesforce": (r"\bsalesforce\b",), "Zendesk": (r"\bzendesk\b",),
    "Atención al cliente": (r"\batencion (?:al cliente|telefonica)\b", r"\bcustomer (?:service|support)\b"),
    "Call center": (r"\b(?:call|contact)\s*center\b",),
    "Git": (r"\bgit\b",), "Docker": (r"\bdocker\b",),
    "HTML": (r"\bhtml5?\b",), "CSS": (r"\bcss3?\b",),
}
LANGUAGES = {
    "Español": r"\b(?:espanol|spanish|castellano)\b",
    "Inglés": r"\b(?:ingles|english)\b", "Portugués": r"\b(?:portugues|portuguese)\b",
    "Francés": r"\b(?:frances|french)\b", "Alemán": r"\b(?:aleman|german)\b",
}
EMAIL = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")
PHONE = re.compile(r"(?<!\w)(?:\+\d{1,3}[ .-]?)?(?:\(?\d{2,4}\)?[ .-]?){2,4}\d{2,4}(?!\w)")
LINK = re.compile(r"(?:https?://|www\.|(?:linkedin\.com|github\.com)/)[^\s<>]+", re.I)


def heading_type(text: str) -> SectionType | None:
    clean = normalize(text).strip(" :.-•|_—–")
    if len(clean) > 65:
        return None
    for section, aliases in HEADINGS.items():
        if clean in aliases:
            return section
    # Encabezados compuestos mantienen el texto completo aunque se agrupan por su primer tema.
    for section, aliases in HEADINGS.items():
        if any(clean.startswith(alias + " y ") or clean.startswith(alias + " & ") for alias in aliases):
            return section
    return None


def _inline_heading(text: str) -> tuple[SectionType | None, str | None]:
    if ":" in text:
        prefix, rest = text.split(":", 1)
        kind = heading_type(prefix)
        if kind and rest.strip():
            return kind, prefix.strip()
    return heading_type(text), None


def evidence(page: PageResult, line: TextLine) -> Evidence:
    return Evidence(page=page.number, line_id=line.id, text=line.text, bbox=line.bbox)


def extract_profile(pages: list[PageResult]) -> CvProfile:
    profile = CvProfile()
    seen: dict[str, set[str]] = {key: set() for key in ("emails", "phones", "links", "skills", "languages")}
    for page in pages:
        # Cada columna conserva su encabezado, incluso si otro bloque se intercala.
        current: dict[str, CvSection] = {}
        for line in page.lines:
            text = line.text
            item_evidence = evidence(page, line)
            kind, prefix = _inline_heading(text)
            if kind:
                section = CvSection(
                    type=kind, heading=prefix or text, page=page.number, column=line.column,
                    text=text if prefix else "", line_ids=[line.id],
                )
                profile.sections.append(section)
                current[line.column] = section
            else:
                section = current.get(line.column)
                if section is None:
                    section = CvSection(type="other", page=page.number, column=line.column, text="", line_ids=[])
                    profile.sections.append(section)
                    current[line.column] = section
                section.text = "\n".join(filter(None, [section.text, text]))
                section.line_ids.append(line.id)

            def add(field: str, value: str, source: Evidence = item_evidence) -> None:
                key = normalize(value)
                if key not in seen[field]:
                    seen[field].add(key)
                    getattr(profile, field).append(ExtractedValue(value=value, evidence=source))

            for match in EMAIL.finditer(text):
                add("emails", match.group().rstrip(".,;"))
            non_phone_spans = [match.span() for pattern in (EMAIL, LINK) for match in pattern.finditer(text)]
            for match in PHONE.finditer(text):
                if any(start < match.end() and end > match.start() for start, end in non_phone_spans):
                    continue
                value = match.group().strip()
                digits = re.sub(r"\D", "", value)
                if 9 <= len(digits) <= 15 and not re.search(r"(?:19|20)\d{2}\s*[-–/]\s*(?:19|20)\d{2}", value):
                    add("phones", value)
            for match in LINK.finditer(text):
                add("links", match.group().rstrip(".,;:)"))
            normalized = normalize(text)
            for skill, patterns in SKILLS.items():
                if any(re.search(pattern, normalized) for pattern in patterns):
                    # Una mención negada no acredita la habilidad.
                    if not re.search(r"\b(?:sin|no|not|without)\b.{0,35}" + patterns[0], normalized):
                        add("skills", skill)
            for language, pattern in LANGUAGES.items():
                if re.search(pattern, normalized):
                    add("languages", language)
            if profile.candidate_name is None and page.number == 1 and line.bbox[1] < page.height * 0.22:
                words = text.split()
                excluded = re.search(r"\b(?:curriculum|vitae|resume|ingenier[oa]|engineer|developer|especialista|desarrollador|licenciad[oa])\b", normalized)
                if (
                    not kind and not excluded and 2 <= len(words) <= 6
                    and all(word.replace("-", "").replace("'", "").isalpha() for word in words)
                    and all(word[0].isupper() or word.lower() in {"de", "del", "la", "los"} for word in words)
                ):
                    profile.candidate_name = ExtractedValue(value=text, evidence=item_evidence, inferred=True)
    return profile
