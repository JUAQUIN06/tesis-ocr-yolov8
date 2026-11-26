import { expect, test } from '@playwright/test'
import { jsPDF } from 'jspdf'
import { healthyBackend, recognitionFixture } from '../../src/test/recognitionFixture'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/health', (route) => route.fulfill({ json: healthyBackend }))
  await page.goto('/')
  const pdf = new jsPDF()
  pdf.text('CV de prueba de integración de interfaz', 20, 20)
  await page.getByLabel('Seleccionar CV', { exact: true }).setInputFiles({ name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf.output('arraybuffer')) })
  await expect(page.getByText('cv.pdf', { exact: true })).toBeVisible()
})

test('consulta real de la interfaz, evidencias, JSON y reutilización al cambiar filtros', async ({ page }) => {
  let requests = 0
  await page.route('**/api/analyze', async (route) => {
    requests++
    expect(route.request().headers()['content-type']).toContain('multipart/form-data; boundary=')
    expect(route.request().postData()).toContain('name="force_ocr"')
    await route.fulfill({ json: recognitionFixture() })
  })
  await page.getByRole('button', { name: 'Evaluar CV', exact: true }).click()
  await expect(page.getByText('Reconocimiento real · Dictamen manual')).toBeVisible()
  await expect(page.getByText('ana.torres@example.com', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Ver evidencia 1: Conocimiento de Microsoft Excel' }).click()
  await expect(page.locator('.recognized-line.is-selected')).toContainText('Microsoft Excel')
  await expect(page.locator('.recognized-line.is-selected')).toBeFocused()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar JSON' }).click()
  const download = await downloaded
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
  expect(JSON.parse(Buffer.concat(chunks).toString()).document_id).toBe('recognition-fixture-1')
  await page.getByRole('button', { name: 'Modificar filtros' }).click()
  await page.getByLabel('Nuevo filtro', { exact: true }).fill('Python')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByRole('button', { name: 'Evaluar CV', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Criterios Evaluados (4)' })).toBeVisible()
  expect(requests).toBe(1)
  await page.getByRole('button', { name: 'Re-ejecutar Análisis' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(requests).toBe(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('error del backend, reintento y modo degradado sin datos ficticios', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/analyze', (route) => {
    if (++attempts === 1) return route.fulfill({ status: 429, json: { error: { code: 'engine_busy', message: 'El motor está ocupado.' } } })
    const analysis = recognitionFixture()
    analysis.engines.detector = 'ocr_fallback'
    analysis.engines.detector_model = null
    analysis.warnings = ['YOLO no disponible; se utilizó OCR global.']
    return route.fulfill({ json: analysis })
  })
  await page.getByRole('button', { name: 'Evaluar CV', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('El motor está ocupado.')
  await expect(page.getByRole('heading', { name: 'RESULTADOS DE EVALUACIÓN', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Reintentar análisis' }).click()
  await expect(page.getByText('YOLO no disponible; se utilizó OCR global.')).toBeVisible()
  await expect(page.locator('.score-ring strong')).toHaveText('0%')
  await expect(page.getByRole('heading', { name: 'CARLOS ENRIQUE MENDOZA PAREDES' })).toHaveCount(0)
})

test('cancelar una petición evita que una respuesta tardía sustituya otro documento', async ({ page }) => {
  let release: () => void = () => {}
  let requestStarted: () => void = () => {}
  const started = new Promise<void>((resolve) => { requestStarted = resolve })
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/analyze', async (route) => {
    requestStarted()
    await gate
    await route.fulfill({ json: recognitionFixture() }).catch(() => {})
  })
  await page.getByRole('button', { name: 'Evaluar CV', exact: true }).click()
  await started
  await page.getByRole('button', { name: 'Cancelar proceso' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Cargar ejemplo demo' }).click()
  release()
  await page.getByRole('link', { name: 'Resultados de Evaluación', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Aún no hay una evaluación' })).toBeVisible()
  await expect(page.getByText('ana.torres@example.com', { exact: true })).toHaveCount(0)
})

test('una caída de red muestra error recuperable y conserva el archivo', async ({ page }) => {
  await page.route('**/api/analyze', (route) => route.abort('connectionrefused'))
  await page.getByRole('button', { name: 'Evaluar CV', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('No se pudo conectar con el backend')
  await expect(page.getByText('cv.pdf', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reintentar análisis' })).toBeEnabled()
})
