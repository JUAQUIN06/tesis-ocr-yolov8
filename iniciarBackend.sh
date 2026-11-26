#!/bin/bash
# Arranca la API desde la raíz del proyecto, sin importar el directorio actual.
set -e
cd "$(dirname "$0")" || exit 1

exec venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
