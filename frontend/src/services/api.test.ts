import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { analyzeCv, getBackendHealth } from './api'
import { healthyBackend, recognitionFixture } from '../test/recognitionFixture'

const file = new File(['%PDF-test'], 'cv.pdf', { type: 'application/pdf' })

beforeEach(() => { vi.stubGlobal('window', globalThis) })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('Cliente del backend', () => {
  it('envía el archivo y force_ocr como formulario y valida la respuesta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(recognitionFixture()))
    vi.stubGlobal('fetch', fetchMock)
    const data = await analyzeCv(file, new AbortController().signal, true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/analyze')
    expect(init.body.get('file').name).toBe(file.name)
    expect(await init.body.get('file').text()).toBe(await file.text())
    expect(init.body.get('force_ocr')).toBe('true')
    expect(init.headers).toBeUndefined() // El navegador añade el boundary multipart.
    expect(data.profile.emails[0].value).toBe('ana.torres@example.com')
  })

  it('conserva el error de validación del servidor y distingue motor ocupado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: { code: 'engine_busy', message: 'Motor ocupado' } }, { status: 429 })))
    await expect(analyzeCv(file, new AbortController().signal)).rejects.toMatchObject({ status: 429, code: 'engine_busy', message: 'Motor ocupado' })
  })

  it('rechaza resultados malformados y respuestas HTML del proxy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ text: 'incompleto' })))
    await expect(analyzeCv(file, new AbortController().signal)).rejects.toMatchObject({ code: 'invalid_response' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Error</html>', { status: 502 })))
    await expect(analyzeCv(file, new AbortController().signal)).rejects.toMatchObject({ code: 'invalid_response', status: 502 })
  })

  it('distingue cancelación del usuario y tiempo de espera', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(new DOMException('Abortado', 'AbortError')))
    })))
    const controller = new AbortController()
    const cancelled = analyzeCv(file, controller.signal)
    controller.abort()
    await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
    const timedOut = expect(analyzeCv(file, new AbortController().signal)).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(300_001)
    await timedOut
  })

  it('acepta el estado 503 estructurado para indicar que los motores están caídos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...healthyBackend, status: 'unavailable', ready: false }, { status: 503 })))
    expect((await getBackendHealth(new AbortController().signal)).ready).toBe(false)
  })
})
