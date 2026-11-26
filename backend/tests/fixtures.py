"""CV sintéticos de prueba; no son un dataset de entrenamiento."""

import io

import pymupdf
from PIL import Image


def synthetic_pdf(columns: bool = False, pages: int = 1) -> bytes:
    document = pymupdf.open()
    for _ in range(pages):
        page = document.new_page(width=595, height=842)
        page.insert_text((35, 45), "ANA TORRES QUISPE", fontsize=24, fontname="hebo")
        page.insert_text((35, 70), "Especialista en soporte y operaciones", fontsize=13)
        if columns:
            page.draw_rect(pymupdf.Rect(22, 95, 215, 740), color=None, fill=(0.92, 0.95, 0.99))
            groups = [
                (35, 125, "CONTACTO", ["ana.torres@example.com", "+51 987 654 321", "Lima, Peru"]),
                (35, 260, "HABILIDADES", ["Python y SQL", "Microsoft Excel", "Salesforce y Zendesk"]),
                (35, 400, "IDIOMAS", ["Espanol nativo", "Ingles B2"]),
                (250, 125, "EXPERIENCIA LABORAL", [
                    "Analista de soporte - Empresa Delta", "Enero 2021 - Diciembre 2024",
                    "Atencion al cliente y soporte tecnico.", "Resolucion de incidentes y reclamos.",
                    "Gestion de reportes y bases de datos.", "Colaboracion con equipos de operaciones.",
                ]),
                (250, 340, "FORMACION ACADEMICA", [
                    "Universidad de Lima", "Ingenieria de Sistemas, 2015 - 2020",
                    "Estudios universitarios completos.", "Curso de analisis de datos aplicado.",
                ]),
                (250, 530, "PROYECTOS", [
                    "Automatizacion de reportes con Python.", "Paneles de indicadores en SQL y Excel.",
                ]),
            ]
        else:
            groups = [
                (35, 112, "CONTACTO", ["ana.torres@example.com", "+51 987 654 321"]),
                (35, 200, "PERFIL PROFESIONAL", [
                    "Profesional dedicada al soporte tecnico y atencion al cliente.",
                    "Experiencia en gestion de reportes y resolucion de incidentes.",
                ]),
                (35, 300, "EXPERIENCIA LABORAL", [
                    "Analista de soporte - Empresa Delta", "Enero 2021 - Diciembre 2024",
                    "Atencion al cliente y soporte tecnico en operaciones.",
                    "Resolucion de incidentes y colaboracion con equipos de trabajo.",
                ]),
                (35, 460, "FORMACION ACADEMICA", [
                    "Universidad de Lima", "Ingenieria de Sistemas, 2015 - 2020",
                    "Estudios universitarios completos.",
                ]),
                (35, 590, "HABILIDADES", ["Python, SQL y Microsoft Excel", "Salesforce y Zendesk"]),
                (35, 690, "IDIOMAS", ["Espanol nativo e Ingles B2"]),
            ]
        for x, y, title, lines in groups:
            page.insert_text((x, y), title, fontsize=13, fontname="hebo", color=(0, 0.15, 0.35))
            for index, line in enumerate(lines):
                page.insert_text((x, y + 25 + index * 19), line, fontsize=10.5)
    data = document.tobytes()
    document.close()
    return data


def synthetic_image(columns: bool = False, rotation: float = 0, kind: str = "PNG") -> bytes:
    with pymupdf.open(stream=synthetic_pdf(columns=columns), filetype="pdf") as document:
        pixmap = document[0].get_pixmap(dpi=170)
        image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
    if rotation:
        image = image.rotate(rotation, expand=True, fillcolor="white", resample=Image.Resampling.BICUBIC)
    output = io.BytesIO()
    image.save(output, format=kind)
    return output.getvalue()
