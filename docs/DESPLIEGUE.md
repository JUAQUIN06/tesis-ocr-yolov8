# Despliegue: frontend en Vercel + backend en equipo propio

Vercel solo aloja archivos estáticos. El backend (YOLOv8 + Tesseract) corre en este equipo y se publica a internet con un túnel de Cloudflare. El navegador llama directamente a esa URL pública.

```text
Navegador ──► Vercel (frontend estático)
    │
    └──► https://algo.trycloudflare.com/api ──► cloudflared ──► 127.0.0.1:8000
                                                                 (FastAPI + YOLO + Tesseract)
```

## 1. Variables en Vercel

En **Project → Settings → Environment Variables**:

| Variable | Valor |
| --- | --- |
| `VITE_API_BASE_URL` | `https://<tu-tunel>.trycloudflare.com/api` |

Notas:

- Incluye el sufijo `/api`: el cliente concatena `/analyze` y `/health`.
- Se incorpora **en tiempo de compilación**. Después de cambiarla hay que hacer **Redeploy** (no basta con guardar).
- Aplica a Production (y Preview si lo usas).
- `BACKEND_PROXY_TARGET` **no** sirve en Vercel: solo lo usa el proxy de Vite en desarrollo.

Configuración del proyecto en Vercel:

| Ajuste | Valor |
| --- | --- |
| Root Directory | `frontend` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

`HashRouter` evita necesitar reglas de reescritura.

## 2. Backend con CORS

El backend debe permitir el origen exacto de Vercel:

```bash
cd ~/tesis-ocr-yolov8
CV_CORS_ORIGINS="https://tesis-ocr-yolov8.vercel.app" \
  venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

El script `scripts/servir-publico.sh` ya lo hace y añade también `localhost:5173` para desarrollo.

## 3. Túnel de Cloudflare

Instalación sin privilegios de administrador:

```bash
mkdir -p ~/.local/bin
curl -fsSL -o /tmp/cloudflared \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
install -m 755 /tmp/cloudflared ~/.local/bin/cloudflared
cloudflared --version
```

Arranque conjunto:

```bash
./scripts/servir-publico.sh
```

El script:

1. Inicia el backend si no está activo, con el CORS configurado.
2. Abre el túnel y espera la URL pública.
3. Comprueba `/api/health` a través del túnel.
4. Imprime la URL y el valor de `VITE_API_BASE_URL`.
5. Guarda registros y la URL en `~/.cache/tesis-ocr/`.

```bash
# Ver la URL actual del túnel
cat ~/.cache/tesis-ocr/url.txt

# Registros
tail -f ~/.cache/tesis-ocr/backend.log
tail -f ~/.cache/tesis-ocr/tunnel.log

# Detener todo
pkill -f "uvicorn backend.main:app"
pkill -f "cloudflared tunnel"
```

## 4. Limitaciones importantes

| Límite | Detalle |
| --- | --- |
| URL del túnel | Los túneles rápidos cambian de URL al reiniciarse. Hay que actualizar `VITE_API_BASE_URL` y redesplegar. |
| Tiempo de petición | Cloudflare corta a los **100 s** (error 524). Un OCR de muchas páginas puede superarlo: reduce `CV_MAX_PAGES`. |
| Equipo encendido | Si el equipo se suspende, se apaga o pierde internet, la API deja de responder. |
| Sin autenticación | La API no pide credenciales: cualquiera con la URL puede subir documentos y consumir CPU/GPU. |
| Subida de archivos | Límite propio de 15 MB por documento. |

## 5. Seguridad

Antes de dejar esto publicado de forma permanente:

1. **No publiques la URL del túnel** en el repositorio ni en redes.
2. **Limita el consumo**: `CV_MAX_PAGES=3`, `CV_MAX_CONCURRENT_JOBS=1`.
3. **Añade autenticación** (token compartido o Cloudflare Access) si va a estar accesible mucho tiempo.
4. **Túnel nombrado + dominio propio** en lugar de túnel rápido: URL fija, sin cambios, y permite aplicar reglas de Cloudflare (WAF, rate limiting).
5. Revisa el uso de la GPU: `CV_DEVICE=0` acelera la inferencia, pero multiplica el consumo si alguien abusa del endpoint.

## 6. Mantenerlo tras cerrar sesión

El script usa `nohup`, así que sobrevive al cierre de la terminal, pero no a un reinicio del equipo. Para arranque automático conviene un servicio de usuario de systemd:

```ini
# ~/.config/systemd/user/tesis-ocr.service
[Unit]
Description=API OCR de tesis
After=network-online.target

[Service]
WorkingDirectory=%h/tesis-ocr-yolov8
Environment=CV_CORS_ORIGINS=https://tesis-ocr-yolov8.vercel.app
ExecStart=%h/tesis-ocr-yolov8/venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
Restart=on-failure

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now tesis-ocr.service
sudo loginctl enable-linger "$USER"   # arranca sin iniciar sesión
```

El túnel puede ir en otro servicio equivalente usando `cloudflared tunnel --url http://127.0.0.1:8000`.

## 7. Diagnóstico rápido

| Síntoma | Causa probable |
| --- | --- |
| El sitio carga pero «No se pudo conectar con el backend» | `VITE_API_BASE_URL` mal, sin `/api`, o no se redesplegó. |
| Error de CORS en la consola | El origen de Vercel no está en `CV_CORS_ORIGINS`. |
| 502/1033 del túnel | Backend caído o `cloudflared` detenido. |
| 524 | OCR superó los 100 s. |
| 404 en `/api/...` sobre el dominio de Vercel | La variable no se aplicó al build o falta `/api`. |
