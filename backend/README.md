# Backend de reconocimiento de CV

API Python con **FastAPI, YOLOv8, Tesseract, OpenCV y PyMuPDF** para documentos con estructuras variables. Recibe PDF, PNG, JPG o JPEG y devuelve texto ordenado, bloques, secciones y datos extraídos con evidencias.

## Inicio rápido

Las dependencias y los recursos ya se instalaron en el entorno `venv/` existente. Desde la raíz del proyecto:

```bash
cd ~/tesis-ocr-yolov8
source venv/bin/activate
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

- API interactiva: **http://localhost:8000/docs**
- Estado de motores: **http://localhost:8000/api/health**

Si estás dentro de `backend/`:

```bash
python -m uvicorn backend.main:app --app-dir .. --host 127.0.0.1 --port 8000
```

## Instalación reproducible

Requiere Python 3.12 o posterior y el ejecutable **Tesseract 5** instalado en el sistema. Se verificó en Python 3.14.8 y Tesseract 5.5.3.

```bash
cd ~/tesis-ocr-yolov8
source venv/bin/activate
python -m pip install -r backend/requirements.txt
python backend/scripts/setup_resources.py
python backend/scripts/setup_resources.py --verify
```

El instalador descarga un YOLOv8n entrenado en DocLayNet y los idiomas Tesseract `spa`, `eng` y `osd`, con revisiones y SHA-256 fijados. Guarda todo dentro de `backend/`, no sustituye archivos de otro contenido y no requiere privilegios de administrador. El binario Tesseract se instala con el gestor del sistema si no está disponible; el paquete Python `pytesseract` por sí solo no lo proporciona.

## Cómo reconoce diferentes estructuras

1. **Carga y validación:** inspección de la firma real, límite de 15 MB, hasta 10 páginas y renderizado acotado en memoria. Los PDF protegidos se rechazan con un mensaje claro.
2. **Preparación:** renderizado a 200 DPI, orientación EXIF en imágenes, corrección de rotación mediante Tesseract OSD cuando hay evidencia suficiente y corrección de inclinaciones leves con OpenCV.
3. **Detección visual:** YOLOv8 identifica bloques de texto, títulos, listas, tablas e imágenes, sin coordenadas fijas para las secciones.
4. **Reconocimiento:** Tesseract en español e inglés lee la página completa y las regiones textuales. La lectura global recupera zonas que YOLO no haya detectado. Se deduplican líneas superpuestas, sin eliminar textos repetidos en ubicaciones diferentes.
5. **PDF digital:** si contiene suficiente texto utilizable, se aprovecha directamente y se conserva su geometría. Las páginas escaneadas, híbridas o con texto insuficiente pasan por OCR. `force_ocr=true` fuerza Tesseract.
6. **Orden de lectura:** se buscan separaciones verticales y títulos que atraviesen columnas. Se ordenan las columnas por separado para evitar mezclar cada fila de la izquierda con la derecha. Las secciones se reconocen por encabezados y contenido, no por su posición.
7. **Extracción estructurada:** contacto, nombre candidato inferido, menciones de habilidades e idiomas y secciones de perfil, experiencia, formación, proyectos, certificaciones, etc. El texto sin categoría reconocida también se conserva.

La extracción de habilidades usa un catálogo ampliable en `services/extractor.py`; los textos de habilidades fuera del catálogo siguen disponibles en `sections` y `text`. Una mención no representa verificación de dominio o nivel. El nombre es una inferencia explícitamente marcada. Los títulos de secciones pueden ampliarse en `HEADINGS` para otros idiomas o vocabularios.

## API

### `POST /api/analyze`

Formulario `multipart/form-data`:

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `file` | archivo, obligatorio | PDF, PNG, JPG o JPEG |
| `force_ocr` | booleano, opcional | `false` por defecto; `true` fuerza OCR en PDF digital |

```bash
curl --fail-with-body http://localhost:8000/api/analyze \
  -F 'file=@/ruta/al/curriculum.pdf' \
  -F 'force_ocr=false' \
  -o resultado.json
```

La respuesta contiene:

```text
document_id, filename, page_count, processing_seconds
text                              Texto completo, con orden de lectura
pages[]
  number, width, height           Página y dimensiones procesadas
  rotation_clockwise             Corrección de orientación aplicada
  deskew_degrees                 Corrección fina (convención OpenCV)
  source                         tesseract o pdf_text
  regions[]                      Bloques YOLO: id, label, bbox, confidence
  lines[]                        Texto: id, bbox, source, confidence, region_id, column, order
  text, warnings
profile
  candidate_name                 Valor inferido o null
  emails[], phones[], links[]
  skills[], languages[]          Menciones con evidencia, no niveles acreditados
  sections[]                     Tipo, encabezado, texto, página, columna, line_ids
engines                          Motores y modelo utilizados, idiomas y dispositivo
warnings[]                       Lectura parcial, baja confianza o modo degradado
```

Cada dato extraído incluye `evidence` con `page`, `line_id`, `text` y `bbox`. Las cajas son `[x0, y0, x1, y1]`, en **píxeles de la imagen procesada**, después de rotación/deskew, no coordenadas del archivo original. Para resaltarlas en un visor debe reproducirse la transformación o utilizarse ese espacio de coordenadas.

`regions[].confidence` es confianza del detector entre 0 y 1. `lines[].confidence` es confianza OCR de Tesseract entre 0 y 100, o `null` en texto digital. No son porcentajes de adecuación del candidato a una vacante.

### `GET /api/health`

Muestra los motores cargados, idiomas, clases del modelo y límites. `status` puede ser `ok`, `degraded` o `unavailable`. Si no hay modelo y `CV_REQUIRE_YOLO=false`, el OCR global sigue funcionando y el estado indica degradación. Con `CV_REQUIRE_YOLO=true`, la falta del detector impide procesar.

### Errores

```json
{"error":{"code":"invalid_document","message":"Descripción del problema"}}
```

- `413`: tamaño o dimensiones excesivas.
- `415`: formato o firma incorrecta.
- `422`: PDF dañado/protegido, demasiadas páginas o ausencia de texto legible. Los errores de validación del formulario siguen el formato `detail` de FastAPI.
- `429`: el motor está ocupado; reintentar posteriormente.
- `503`: motor requerido no disponible o fallo de OCR.

Las tareas de OCR/inferencia corren fuera del event loop; `/api/health` permanece accesible. Por defecto se procesa un documento simultáneo. Los archivos subidos se cierran al terminar y el código no persiste CV ni registra su contenido.

## Uso desde Python o consola

Desde la raíz del proyecto:

```bash
python -m backend.cli /ruta/cv.pdf --output resultado.json
python -m backend.cli /ruta/cv.png --force-ocr --output resultado.json
```

```python
from pathlib import Path
from backend.services.pipeline import CvPipeline

pipeline = CvPipeline()  # Reutilizar una instancia para cargar el modelo una sola vez.
path = Path("curriculum.pdf")
result = pipeline.analyze(path.read_bytes(), path.name)
print(result.text)
print(result.profile.model_dump())
```

## Configuración

Se leen variables `CV_*`; `.env.example` documenta los valores. No se carga `.env` de forma implícita.

| Variable | Valor por defecto | Uso |
| --- | --- | --- |
| `CV_MODEL_PATH` | `models/yolov8n-doclaynet.pt` | Pesos locales; admite un modelo propio de regiones documentales |
| `CV_REQUIRE_YOLO` | `false` | Exigir detector o permitir fallback OCR |
| `CV_TESSDATA_DIR` | `.runtime/tessdata` | Idiomas locales; vacío utiliza los del sistema |
| `CV_LANGUAGES` | `spa+eng` | Idiomas instalados de Tesseract |
| `CV_TESSERACT_CMD` | `tesseract` | Ruta del ejecutable |
| `CV_DEVICE` | `cpu` | `0` para la primera GPU CUDA si está disponible |
| `CV_YOLO_CONFIDENCE` | `0.2` | Umbral del detector |
| `CV_YOLO_IMAGE_SIZE` | `1024` | Resolución de inferencia |
| `CV_DPI` | `200` | Resolución de render PDF |
| `CV_MAX_PAGES` | `10` | Páginas máximas |
| `CV_MAX_FILE_BYTES` | `15728640` | Tamaño máximo |
| `CV_MAX_PIXELS` | `20000000` | Límite de píxeles de entrada/renderizado |
| `CV_OCR_TIMEOUT` | `30` | Segundos por invocación Tesseract, no por documento completo |
| `CV_MAX_REGIONS` | `40` | Máximo de recortes OCR por página, además del OCR global |
| `CV_MAX_CONCURRENT_JOBS` | `1` | Procesamientos simultáneos |
| `CV_CORS_ORIGINS` | localhost/127.0.0.1:5173 | Orígenes React permitidos, separados por comas |

## Integración con React

El frontend está conectado a esta API mediante `FormData`. Desde `frontend/`, `npm run dev:full` inicia ambos servicios. Vite redirige `/api` a este backend:

```typescript
const body = new FormData();
body.append('file', file);
const response = await fetch('/api/analyze', {
  method: 'POST', body,
});
if (!response.ok) throw new Error('No se pudo reconocer el documento');
const result = await response.json();
console.log(result.text, result.profile.sections);
```

El frontend valida `AnalysisResult`, muestra texto/secciones/datos de contacto y vincula los requisitos con fragmentos relacionados del reconocimiento. Permite navegar desde una evidencia hasta su línea y página, consultar observaciones, exportar JSON y generar un reporte PDF con el texto reconocido. Los dictámenes de los requisitos siguen siendo manuales: el reconocimiento no acredita por sí solo una competencia o su duración.

Cancelar en el navegador aborta la espera y evita aplicar respuestas tardías; no interrumpe necesariamente un OCR ya iniciado en el servidor. Al cambiar solo los filtros se reutiliza el reconocimiento en memoria. El botón de reanálisis ejecuta otra solicitud real.

## Verificación

```bash
cd ~/tesis-ocr-yolov8/backend
../venv/bin/python -m pip install -r requirements-dev.txt
../venv/bin/python -m ruff check .
../venv/bin/python -m pytest -q
../venv/bin/python -m pytest --run-integration -v
```

Las pruebas de integración ejecutan los motores reales, no resultados simulados: CV sintéticos de una y dos columnas, PNG, JPEG inclinado, rotación de 90°, PDF multipágina, extracción digital, OCR forzado y fallback sin modelo. Las pruebas unitarias/API cubren orden de lectura, deduplicación, secciones, evidencias, documentos inválidos, límites, cifrado, CORS y concurrencia.

Los resultados sobre muestras sintéticas verifican el funcionamiento; no miden precisión sobre una colección de CV reales. Diseños muy gráficos, texto manuscrito, escaneos borrosos o vocabularios nuevos pueden requerir revisión o ajuste del modelo/encabezados. El modelo documental preentrenado no es un entrenamiento específico con el dataset de este proyecto.

## Organización y recursos

- `main.py`: API y gestión de errores/concurrencia.
- `config.py`, `schemas.py`: configuración y contrato de respuesta.
- `services/documents.py`: validación/renderizado.
- `services/detector.py`: YOLOv8.
- `services/ocr.py`: orientación, deskew y Tesseract.
- `services/layout.py`: fusión y orden de lectura.
- `services/extractor.py`: secciones y datos con evidencia.
- `services/pipeline.py`: flujo completo reutilizable.
- `scripts/setup_resources.py`: instalación verificable de pesos e idiomas.
- `tests/`: pruebas y generadores sintéticos.

Modelo: [hantian/yolo-doclaynet](https://huggingface.co/hantian/yolo-doclaynet), licencia declarada AGPL-3.0; detalles en [models/README.md](models/README.md). Idiomas: [tesseract-ocr/tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast), Apache-2.0. Las URLs, revisiones y hashes están fijados en el instalador y registrados localmente en `.runtime/resources.json`.
