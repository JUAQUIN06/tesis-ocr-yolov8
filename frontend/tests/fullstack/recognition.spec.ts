import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { expect, test } from '@playwright/test'

const root = path.resolve('..')
const python = process.env.CV_PYTHON || path.join(root, 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
function sample(expression: string) {
  return execFileSync(python, ['-c', `import sys; from backend.tests.fixtures import synthetic_pdf, synthetic_image; sys.stdout.buffer.write(${expression})`], { cwd: root, maxBuffer: 5 * 1024 * 1024 })
}

test('CV escaneado de dos columnas: React → API → YOLOv8/Tesseract → evidencias', async ({ page, request }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  expect((await (await request.get('/api/health')).json()).status).toBe('ok')
  await page.goto('/')
  await page.getByLabel('Seleccionar CV', { exact: true }).setInputFiles({ name: 'cv-dos-columnas.png', mimeType: 'image/png', buffer: sample('synthetic_image(columns=True)') })
  await expect(page.getByText('cv-dos-columnas.png', { exact: true })).toBeVisible()
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/analyze') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Evaluar CV', exact: true }).click()
  const response = await responsePromise
  expect(response.status()).toBe(200)
  const recognized = await response.json()
  expect(recognized.engines.detector).toBe('yolov8')
  expect(recognized.pages[0].source).toBe('tesseract')
  expect(recognized.pages[0].regions.length).toBeGreaterThan(0)
  await expect(page.getByText('Reconocimiento real · Dictamen manual')).toBeVisible()
  await expect(page.getByText('ana.torres@example.com', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Ver evidencia 1: Conocimiento de Microsoft Excel' }).click()
  await expect(page.locator('.recognized-line.is-selected')).toContainText('Excel')
  await expect(page.getByRole('heading', { name: 'Texto reconocido', exact: true })).toBeVisible()
  await page.getByLabel('Dictamen de Conocimiento de Microsoft Excel').selectOption('pass')
  await expect(page.locator('.score-ring strong')).toHaveText('33%')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar Reporte' }).click()
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.pdf$/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('reconocimiento-real.png'), fullPage: true, animations: 'disabled' })
  expect(errors).toEqual([])
})

test('PDF multipágina digital y opción de forzar OCR envían datos reales', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seleccionar CV', { exact: true }).setInputFiles({ name: 'cv-digital.pdf', mimeType: 'application/pdf', buffer: sample('synthetic_pdf(columns=True, pages=2)') })
  await expect(page.getByText('Páginas: 2', { exact: true })).toBeVisible()
  const nativeResponse = page.waitForResponse((response) => response.url().endsWith('/api/analyze'))
  await page.getByRole('button', { name: 'Evaluar CV', exact: true }).click()
  const native = await (await nativeResponse).json()
  expect(native.page_count).toBe(2)
  expect(native.pages.every((item: { source: string }) => item.source === 'pdf_text')).toBe(true)
  await page.getByRole('button', { name: 'Texto reconocido', exact: true }).click()
  await page.getByLabel('Página reconocida').selectOption('2')
  await expect(page.locator('.recognized-lines')).toContainText('Microsoft Excel')
  await page.getByRole('button', { name: 'Documento original', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Página 2 del documento PDF' })).toBeVisible()
  await page.getByRole('button', { name: 'Modificar filtros' }).click()
  await page.getByLabel('Forzar OCR en PDF', { exact: false }).check()
  const ocrResponse = page.waitForResponse((response) => response.url().endsWith('/api/analyze'))
  await page.getByRole('button', { name: 'Evaluar CV', exact: true }).click()
  const ocr = await (await ocrResponse).json()
  expect(ocr.pages.every((item: { source: string }) => item.source === 'tesseract')).toBe(true)
  await expect(page.getByText('Reconocimiento real · Dictamen manual')).toBeVisible()
})
