# Análisis de las exportaciones de Google Stitch

## Inventario completo

Se inspeccionaron los cinco archivos, incluidos los HTML completos, sus scripts y las dos imágenes. Los nombres repetidos se resolvieron por su ruta, sin combinar ni sobrescribir originales.

| Carpeta | Archivos | Aporte a la aplicación |
| --- | --- | --- |
| `carga_de_cv_y_filtros/` | `code.html` (181 líneas), `screen.png` (1600 × 1340) | Pantalla de entrada, carga de CV, archivo seleccionado, matriz de filtros y acción de evaluación. |
| `resultados_de_evaluaci_n/` | `code.html` (583 líneas), `screen.png` (1431 × 1600) | Visor documental, evidencias resaltadas, dictamen, tarjetas por criterio y acciones de revisión. |
| `executive_talent_intelligence/` | `DESIGN.md` (259 líneas) | Sistema de diseño: colores, tipografías, espaciado, estados, componentes y adaptación por dispositivo. |

La tercera carpeta es una especificación de diseño, no una tercera pantalla HTML exportada. Se integró como lenguaje visual compartido de las dos vistas.

## 1. Carga de CV y filtros

### Composición visual

- Cabecera con insignia azul, nombre del producto, marca Talent Intelligence, navegación segmentada y ayuda.
- Fondo frío `#f8f9ff`, superficies blancas, tarjetas redondeadas y sombras suaves.
- Área central de dos columnas: documento a la izquierda; filtros y evaluación a la derecha.
- Franja superior contextual, título principal, explicación y zona de arrastre con icono de nube.
- Tarjeta del archivo con tipo, nombre, tamaño, estado, vista previa y eliminación.
- Tres requisitos iniciales: experiencia mínima de dos años en call center, secundaria completa y conocimiento de Excel. Los primeros son obligatorios y el tercero deseable.
- Campo para nuevo filtro, etiquetas de prioridad, edición/eliminación, acción secundaria para más filtros, botón azul de evaluación y tarjeta de auditoría.
- Pie de página tonal.

### Interacciones exportadas

El script original conecta selección y arrastre, muestra metadatos sin inspeccionar el contenido y utiliza un archivo demo ficticio de 1.8 MB. La vista previa es un `alert`. La evaluación es una secuencia temporizada que intenta navegar a `mesa-de-revision`, aunque esa ruta no coincide con la navegación de la misma pantalla. Los controles de filtros carecen de implementación JavaScript.

### Implementación React

`UploadPanel` valida archivos reales mediante `documents.ts`; `FilterPanel` administra todos los cambios mediante estado controlado. La vista rápida abre `DocumentViewer` dentro de un diálogo. El estado de archivo y requisitos reside en `App`, compartido con la página de resultados. El ejemplo tiene una página de extracto y no declara un tamaño de archivo inexistente.

## 2. Resultados de evaluación

### Composición visual

- Cabecera y pie compartidos, con franja contextual para la sesión y acciones de reanálisis/copia.
- Distribución aproximada 7/12 para el documento y 5/12 para los resultados.
- Visor con metadatos, zoom, rotación, ampliación, cambio de archivo y leyenda de anotaciones.
- Hoja blanca con encabezado de Carlos Mendoza, contacto, perfil profesional, experiencia, educación, herramientas y observación sobre Excel.
- Evidencias en verde menta, anotaciones complementarias en lavanda y observaciones en rosa suave.
- Panel de resultados con hora, banner de dictamen, indicador circular, selector segmentado y tarjetas de evidencia.
- Acciones finales: modificar filtros, exportar reporte y revisar otro CV.
- Modal de progreso y notificaciones flotantes.

### Interacciones exportadas

El documento es HTML estático, no un PDF renderizado. Zoom, rotación, ampliación, revisión manual y filtros no están conectados. El selector de simulación cambia únicamente el banner y porcentajes fijos de 92%, 38% y 64%, sin actualizar coherentemente todas las tarjetas. Copiar utiliza un texto fijo. Exportar solo muestra una notificación; no genera archivo. Cambiar documento y revisar otro CV muestran simulaciones de carga.

### Implementación React

- `DocumentViewer`, `PdfPage` y `RotatableDocument`: archivo real, páginas, zoom, rotación con límites desplazables correctos, ampliación y descarga.
- `DemoDocument`: reconstrucción React del documento ilustrativo con sus secciones y resaltados originales.
- `EvaluationPanel`: banner, porcentaje, filtrado por estado y tarjetas reutilizables con evidencias y dictamen manual.
- El selector conserva el estilo segmentado, pero filtra los criterios reales en lugar de simular conclusiones inconexas.
- `evaluation.ts`: cálculo determinista y resultados asociados a una instantánea de documento/requisitos.
- `report.ts`: PDF real generado bajo demanda con el dictamen actualizado. El portapapeles utiliza la misma representación textual.
- `AnalysisModal`: preparación cancelable; sus temporizadores se limpian al cancelar o desmontarse.

## 3. Executive Talent Intelligence

### Tokens y jerarquía

El front matter define una paleta Material tonal, encabezados Plus Jakarta Sans, cuerpo Inter, tamaños de 11 a 32 px, escala de espaciado de 4/8/16/24/32 px y radios progresivos. La aplicación mantiene los colores de las pantallas exportadas:

| Función | Color |
| --- | --- |
| Lienzo | `#f8f9ff` |
| Superficie | `#ffffff` |
| Superficie secundaria | `#eff4ff` |
| Contenedor tonal | `#e5eeff` |
| Fondo del visor | `#dce9ff` |
| Acción principal | `#0037b0` / `#1d4ed8` |
| Texto principal | `#0b1c30` |
| Texto secundario | `#434655` / `#565e74` |
| Etiquetas secundarias | `#dae2fd` |
| Cumplimiento | `#004f35` |
| Evidencia resaltada | `#85f8c4` |
| Observación/error | `#ffdad6` / `#ba1a1a` |

Se usan encabezados geométricos, metadatos compactos, cifras tabulares, botones de 8 px de radio, tarjetas de 12–16 px, etiquetas de píldora y foco visible. Las fuentes están instaladas localmente.

### Diferencias internas de la guía

La prosa propone una paleta slate/emerald/amber, contornos más marcados y una arquitectura de tres columnas con lista de candidatos. Los HTML y sus capturas usan la paleta tonal del front matter, sombras suaves y dos columnas. Para preservar la apariencia concreta de Stitch, se priorizaron las capturas y HTML; la guía aportó jerarquía, componentes, comportamiento adaptable y estados. No se inventó una lista de candidatos para un flujo que procesa un CV a la vez.

## Integración y decisiones compartidas

### Navegación y estado

Una aplicación React, un shell y dos rutas con `HashRouter`. Los enlaces mantienen historial sin recargar el navegador. La vista previa y la guía son diálogos. Archivo, filtros y evaluación comparten estado; los controles de zoom, páginas y filtros de estado pertenecen a sus componentes.

Modificar el documento o los requisitos invalida los resultados anteriores. La evaluación conserva una copia de los filtros usados. Un resultado vacío muestra una acción para iniciar el flujo. Una carga nueva inválida conserva el documento válido previo y muestra el motivo del rechazo.

### Estado real del prototipo

En la primera versión, el backend inspeccionado no tenía un endpoint implementado. Por ello los textos «Motor IA Activo», «OCR vectorizado», confianza del 98.4%, certificaciones ISO y cruces de registros externos se sustituyeron por estados comprobables, conservando sus posiciones y tratamiento visual. La integración posterior incorpora el estado real de YOLOv8/Tesseract, texto reconocido, secciones y evidencias mediante `/api/analyze`. El ejemplo continúa identificado como demo y los dictámenes de requisitos se registran manualmente.

El resultado inicial conserva el dictamen favorable para los dos criterios obligatorios, pero usa **67% acreditado (2/3)**, calculado a partir de los criterios, en lugar del 92% fijo. Ignorar requisitos modifica el denominador; ignorarlos todos produce un estado indeterminado. Cualquier cambio manual se refleja tanto en el banner como en la copia y el reporte.

### Adaptación y accesibilidad

La carga usa dos columnas en escritorio y una en pantallas compactas. Los resultados pasan del visor/panel paralelo a un flujo vertical con visor desplazable. La navegación sigue disponible en móvil. Los diálogos usan el elemento nativo `dialog`, contienen el foco, permiten Escape y devuelven el foco al control de origen. Hay etiquetas accesibles, estados anunciados, enlace de salto al contenido y soporte de movimiento reducido.

### Conservación de las referencias

Los cinco originales se conservaron byte por byte, verificado mediante SHA-256. Ninguno se importa en el código de ejecución. Tailwind limita el escaneo a `src/`, y el build solo publica la aplicación y sus recursos locales. Las capturas nuevas de verificación se generan en `test-results/`, fuera de `stitch-export/`.
