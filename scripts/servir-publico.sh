#!/bin/bash
# Expone el backend local en internet mediante un túnel rápido de Cloudflare.
# Uso: ./scripts/servir-publico.sh
#
# Variables opcionales:
#   PORT            puerto del backend (8000)
#   VERCEL_ORIGIN   origen permitido por CORS (https://tesis-ocr-yolov8.vercel.app)
#   LOG_DIR         carpeta de registros (~/.cache/tesis-ocr)
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

PORT="${PORT:-8000}"
VERCEL_ORIGIN="${VERCEL_ORIGIN:-https://tesis-ocr-yolov8.vercel.app}"
LOG_DIR="${LOG_DIR:-$HOME/.cache/tesis-ocr}"
mkdir -p "$LOG_DIR"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "ERROR: falta cloudflared. Instálalo en ~/.local/bin (ver docs/DESPLIEGUE.md)." >&2
  exit 1
fi

# 1. Backend
if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
  echo "Backend ya activo en el puerto $PORT."
else
  echo "Iniciando backend..."
  CV_CORS_ORIGINS="$VERCEL_ORIGIN,http://localhost:5173,http://127.0.0.1:5173" \
    nohup venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port "$PORT" \
    > "$LOG_DIR/backend.log" 2>&1 &
  for _ in $(seq 1 30); do
    curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null || {
    echo "ERROR: el backend no arrancó. Revisa $LOG_DIR/backend.log" >&2
    exit 1
  }
fi

# 2. Túnel
echo "Iniciando túnel de Cloudflare..."
: > "$LOG_DIR/tunnel.log"
nohup cloudflared tunnel --url "http://127.0.0.1:$PORT" --no-autoupdate \
  > "$LOG_DIR/tunnel.log" 2>&1 &

URL=""
for _ in $(seq 1 40); do
  URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$LOG_DIR/tunnel.log" | head -1 || true)
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "ERROR: no se obtuvo la URL del túnel. Revisa $LOG_DIR/tunnel.log" >&2
  exit 1
fi

echo "$URL" > "$LOG_DIR/url.txt"

# 3. Comprobación
echo
echo "API pública:      $URL"
echo "Documentación:    $URL/docs"
echo "Estado:           $URL/api/health"
echo
if curl -sf --max-time 20 "$URL/api/health" >/dev/null 2>&1; then
  echo "Túnel verificado correctamente."
else
  echo "ADVERTENCIA: el túnel responde todavía con error; espera unos segundos."
fi

echo
echo "Configura en Vercel (Settings > Environment Variables) y vuelve a desplegar:"
echo "  VITE_API_BASE_URL=$URL/api"
echo
echo "Registros: $LOG_DIR"
