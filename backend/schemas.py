from typing import Literal

from pydantic import BaseModel, Field

Box = tuple[float, float, float, float]
SectionType = Literal[
    "profile", "experience", "education", "skills", "languages", "certifications",
    "projects", "contact", "references", "other",
]


class Region(BaseModel):
    id: str
    label: str
    bbox: Box
    confidence: float = Field(ge=0, le=1)


class TextLine(BaseModel):
    id: str = ""
    text: str
    bbox: Box
    source: Literal["tesseract", "pdf_text"]
    confidence: float | None = Field(default=None, ge=0, le=100)
    region_id: str | None = None
    column: str = "main"
    order: int = 0


class PageResult(BaseModel):
    number: int
    width: int
    height: int
    coordinate_space: str = "processed_image_pixels"
    source: Literal["tesseract", "pdf_text"]
    rotation_clockwise: int = 0
    deskew_degrees: float = 0
    regions: list[Region]
    lines: list[TextLine]
    text: str
    warnings: list[str] = Field(default_factory=list)


class Evidence(BaseModel):
    page: int
    line_id: str
    text: str
    bbox: Box


class ExtractedValue(BaseModel):
    value: str
    evidence: Evidence
    inferred: bool = False


class CvSection(BaseModel):
    type: SectionType
    heading: str | None = None
    page: int
    column: str
    text: str
    line_ids: list[str]


class CvProfile(BaseModel):
    candidate_name: ExtractedValue | None = None
    emails: list[ExtractedValue] = Field(default_factory=list)
    phones: list[ExtractedValue] = Field(default_factory=list)
    links: list[ExtractedValue] = Field(default_factory=list)
    skills: list[ExtractedValue] = Field(default_factory=list)
    languages: list[ExtractedValue] = Field(default_factory=list)
    sections: list[CvSection] = Field(default_factory=list)


class EngineInfo(BaseModel):
    detector: str
    detector_model: str | None
    ocr: str = "tesseract"
    languages: list[str]
    device: str


class AnalysisResult(BaseModel):
    document_id: str
    filename: str
    page_count: int
    text: str
    pages: list[PageResult]
    profile: CvProfile
    engines: EngineInfo
    warnings: list[str]
    processing_seconds: float
