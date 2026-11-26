# Modelos de detección de estructura

El detector usa **YOLOv8n preentrenado en DocLayNet**, no un detector de objetos COCO. Sus clases incluyen `Text`, `Title`, `Section-header`, `List-item`, `Table` y `Picture`. Las etiquetas de experiencia, estudios e idiomas se asignan después por el contenido textual.

## Recurso instalado

- Archivo: `yolov8n-doclaynet.pt` (6 336 089 bytes).
- Repositorio: [hantian/yolo-doclaynet](https://huggingface.co/hantian/yolo-doclaynet).
- Revisión: `49b97586dbd3bdae169e8f5e165710d0facf5f1e`.
- SHA-256: `2b8ac374611942ff3bb2b71aab530d9cf9c98f5febe6ed409db98248a3e00719`.
- Licencia declarada por el repositorio del modelo: AGPL-3.0.
- Documentación del entrenamiento original: [ppaanngggg/yolo-doclaynet](https://github.com/ppaanngggg/yolo-doclaynet).

La descarga se realiza explícitamente mediante `scripts/setup_resources.py`. El servidor solo carga archivos locales. `--verify` comprueba las sumas sin descargar.

## Pesos propios

El archivo `best.pt` que ya existía estaba vacío; se conserva como tal. Para usar un modelo propio entrenado sobre bloques de CV:

```bash
export CV_MODEL_PATH=/ruta/a/pesos_cv.pt
export CV_REQUIRE_YOLO=true
```

El modelo debe ser compatible con Ultralytics y detectar regiones documentales. Los pesos estándar `yolov8n.pt` de COCO no sirven para detectar secciones del currículum y se rechazan. Las clases personalizadas se conservan en la respuesta; por defecto se aplica OCR a todas salvo las etiquetas de imágenes/fotos.

La disponibilidad de este modelo documental permite trabajar con layouts diferentes, pero no constituye una validación de precisión sobre CV reales ni un entrenamiento específico de este proyecto.
