
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar Tesseract y dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-spa \
    tesseract-ocr-eng \
    tesseract-ocr-osd \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependencias
COPY requirements.txt .
COPY backend ./backend

# Instalar dependencias Python
RUN pip install --no-cache-dir -r requirements.txt

# Descargar el modelo YOLO y recursos OCR
RUN python backend/scripts/setup_resources.py \
    && python backend/scripts/setup_resources.py --verify

# Puerto del servicio
EXPOSE 10000

# Iniciar FastAPI
CMD sh -c "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}"
