# Sistema de Revisión de CV

Aplicación SPA en **React 19 + TypeScript + Vite + Tailwind CSS 4**, desarrollada a partir de las exportaciones de Google Stitch.

## Ejecutar

Requiere Node.js 22.12 o superior. El proyecto incluye `.nvmrc` y `package-lock.json`.

```bash
cd /home/juaquin_1001/tesis-ocr-yolov8/frontend
source "$HOME/.nvm/nvm.sh"  # Si usas nvm y npm no está en el PATH
nvm use
npm ci                    # Las dependencias ya están instaladas en esta entrega
npm run dev:full           # Inicia frontend y backend juntos
```

Abrir **http://localhost:5173**. La API queda en **http://localhost:8000/docs**. `dev:full` utiliza el Python de `../venv/` y detiene ambos procesos al pulsar Ctrl+C. Puedes indicar otro intérprete con `CV_PYTHON=/ruta/a/python`.

El backend debe tener instaladas sus dependencias y recursos (ver `../backend/README.md`). Ya están preparados en esta entrega. Para iniciar los servicios por separado:

```bash
# Terminal 1, desde la raíz del proyecto
source venv/bin/activate
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# Terminal 2, desde frontend/
npm run dev
```

```bash
npm run build             # TypeScript + compilación de producción en dist/
npm run preview           # Vista de producción en http://localhost:4173
npm run lint
npm test                  # Pruebas de lógica y validación
npx playwright install chromium  # Una vez, para las pruebas de navegador
npm run test:e2e           # Interfaz en escritorio y móvil; API controlada en pruebas
npm run test:integration   # Navegador + backend real + YOLOv8/Tesseract
```

## Funcionalidades

- Carga por selección o arrastre: PDF, JPG, JPEG y PNG, máximo 15 MB. Se validan extensión, MIME, tamaño y apertura real del documento.
- Visor local con PDF.js: páginas, zoom, rotación, vista ampliada y descarga del archivo original. Las imágenes también admiten zoom y rotación.
- Ejemplo inicial de Carlos Mendoza, identificado como demostración, con el documento anotado del diseño original.
- Filtros dinámicos: agregar, editar, eliminar, cambiar prioridad, sugerencias y detección de duplicados. Máximo 20 requisitos de 160 caracteres.
- Reconocimiento real mediante `POST /api/analyze`: texto digital u OCR, detección de bloques, datos de contacto, habilidades, idiomas y secciones.
- Pestañas de documento original/texto reconocido, navegación por páginas y enlaces desde los criterios a las líneas de evidencia.
- Estado del backend, modo OCR degradado, observaciones de reconocimiento, errores recuperables y opción «Forzar OCR en PDF».
- Resultados por requisito, evidencias desplegables, filtro por estado, dictamen manual y porcentaje calculado.
- Copia del dictamen, reporte PDF con texto reconocido y descarga del JSON de extracción.
- Navegación sin recargas, historial atrás/adelante, estados vacíos, mensajes de error y proceso cancelable.
- Diseño adaptable, navegación por teclado, diálogos con foco contenido y restaurado, y soporte de movimiento reducido.

## Estado de la evaluación

El frontend consume el contrato `AnalysisResult` del backend y lo adapta a una revisión de requisitos:

- **Ejemplo demo:** se utilizan evidencias predefinidas para los tres criterios originales. Un criterio personalizado queda pendiente.
- **Documento propio:** se envía al backend al pulsar «Evaluar CV». La respuesta se valida con Zod y se vinculan fragmentos reales con los filtros mediante palabras y secciones relacionadas. Los criterios comienzan pendientes: reconocer una mención no acredita años de experiencia, grados o nivel de dominio. Las decisiones manuales conservan sus evidencias.
- Los requisitos obligatorios determinan el dictamen. Si no hay obligatorios, se consideran todos los activos. Un incumplimiento decisivo produce «No cumple» y los criterios decisivos pendientes producen «Indeterminado».
- El porcentaje es `aprobados / criterios no ignorados`, no una confianza de IA. Dos criterios aprobados y uno pendiente producen **67%**. Si todos se ignoran, el resultado es indeterminado.
- Cambiar documento invalida reconocimiento y evaluación. Cambiar filtros invalida las decisiones, pero reutiliza el reconocimiento del mismo archivo. Cambiar «Forzar OCR» obliga a reconocerlo nuevamente. Re-ejecutar hace otra petición y restablece las decisiones manuales.
- Un error de red, validación, servidor ocupado o tiempo de espera no produce una evaluación ficticia; se muestra el motivo y un botón de reintento. Si falló un reanálisis, se conserva y se identifica el resultado anterior.
- Cancelar aborta la petición y descarta respuestas tardías. El servidor puede completar un trabajo que ya haya iniciado; la API actual no expone cancelación de trabajos.

`src/services/api.ts` administra `FormData`, errores y cancelación. `apiSchema.ts` valida el contrato del backend. `evaluationFromAnalysis` en `evaluation.ts` relaciona evidencias con requisitos sin emitir aprobaciones automáticas.

## Conexión y despliegue

Por defecto, las peticiones del navegador usan `/api`. Vite las redirige a `http://127.0.0.1:8000` en desarrollo y en `npm run preview`. La configuración está documentada en `.env.example`:

- `BACKEND_PROXY_TARGET`: destino de ese proxy (solo procesos Vite).
- `VITE_API_BASE_URL`: URL pública de la API, incluyendo `/api`, si se aloja en otro origen. Se incorpora al compilar. En ese caso configura `CV_CORS_ORIGINS` en el backend.
- `VITE_ANALYSIS_TIMEOUT_MS`: tiempo de espera del reconocimiento; 300000 ms por defecto. El indicador de carga es indeterminado, porque la API no transmite porcentajes de progreso.

Al publicar `dist/` en un servidor estático, configura allí un reverse proxy para `/api` o compila con `VITE_API_BASE_URL`. El proxy de Vite no se incluye en los archivos estáticos. `HashRouter` resuelve la navegación interna sin reglas adicionales de reescritura.

## Datos y recursos

La vista previa se prepara localmente. Al evaluar un archivo propio se envía al backend configurado, que lo procesa sin guardarlo permanentemente. El frontend mantiene el reconocimiento y las decisiones en memoria, sin almacenamiento local; recargar restablece la sesión. Las URLs de archivos y los recursos del visor se liberan al desmontar sus componentes.

Las coordenadas del backend pertenecen a la imagen procesada, que puede estar girada o corregida. Los enlaces de evidencia resaltan la línea exacta en «Texto reconocido»; no se dibujan cajas incorrectas sobre el documento original.

Las tipografías Inter y Plus Jakarta Sans, los iconos SVG, el worker de PDF.js y sus fuentes/CMaps/WASM se sirven localmente. La aplicación no depende del CDN de Tailwind ni de Google Fonts en tiempo de ejecución.

## Estructura

```text
frontend/
├── stitch-export/          # Referencias originales; no se importan ni se modifican
├── docs/STITCH_ANALYSIS.md  # Análisis de cada exportación y decisiones de integración
├── public/                 # Favicon
├── src/
│   ├── components/         # Layout, carga, filtros, visor, resultados, diálogos
│   ├── data/demo.ts        # Documento y requisitos del ejemplo
│   ├── services/           # Cliente API, contrato, archivos, PDF, evaluación y exportación
│   ├── hooks/              # Estado de conexión con el backend
│   ├── App.tsx             # Estado compartido y rutas
│   ├── types.ts            # Contratos TypeScript
│   └── styles.css          # Tokens Stitch, Tailwind y estilos adaptables
├── tests/e2e/              # Pruebas Playwright de interfaz y fallos de red
├── tests/fullstack/        # Integración con motores reales
├── scripts/dev-full.mjs    # Arranque conjunto de frontend y backend
└── vite.config.ts          # React, Tailwind, proxy API y recursos locales de PDF.js
```

Rutas: `#/carga-y-filtros` y `#/resultados-de-evaluacion`. `HashRouter` permite publicar `dist/` en un servidor estático sin reglas de reescritura.

## Verificaciones

- Compilación TypeScript y producción.
- ESLint.
- 14 pruebas unitarias de contrato HTTP, errores, cancelación, timeout, evidencias, evaluación y archivos.
- 20 pruebas de interfaz en escritorio/móvil, incluyendo caché por archivo, reanálisis, respuestas tardías, exportación y fallos de red. Estas pruebas controlan las respuestas de la API.
- 4 pruebas full-stack en escritorio/móvil con el backend real: CV escaneado de dos columnas, YOLOv8, Tesseract, PDF multipágina, OCR forzado, evidencias y reporte. También pueden ejecutarse contra producción con `npm run build` y `E2E_PREVIEW=1 npm run test:integration`.
- Capturas generadas en `test-results/` durante las pruebas visuales de escritorio/móvil.
- Integridad de los cinco archivos originales de Stitch comprobada con SHA-256.

El análisis de las referencias está en [docs/STITCH_ANALYSIS.md](docs/STITCH_ANALYSIS.md).
