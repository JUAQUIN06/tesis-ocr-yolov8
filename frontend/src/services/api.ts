import { analysisSchema, healthSchema } from './apiSchema'
import type { AnalysisResult, BackendHealth } from './apiSchema'

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
const configuredTimeout = Number(import.meta.env.VITE_ANALYSIS_TIMEOUT_MS)
const analysisTimeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 300_000

export class ApiError extends Error {
  constructor(message: string, public readonly status = 0, public readonly code = 'network_error') {
    super(message)
    this.name = 'ApiError'
  }
}

async function request(path: string, init: RequestInit, timeout: number): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController()
  const abort = () => controller.abort(init.signal?.reason)
  if (init.signal?.aborted) abort()
  init.signal?.addEventListener('abort', abort, { once: true })
  let timedOut = false
  const timer = window.setTimeout(() => { timedOut = true; controller.abort() }, timeout)
  try {
    const response = await fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal })
    let body: unknown
    try { body = await response.json() }
    catch {
      if (controller.signal.aborted) throw new DOMException('Solicitud cancelada', 'AbortError')
      throw new ApiError(response.ok ? 'El backend devolvió una respuesta inválida.' : 'El backend no respondió correctamente. Comprueba que esté iniciado.', response.status, 'invalid_response')
    }
    return { response, body }
  } catch (error) {
    if (init.signal?.aborted) throw new DOMException('Solicitud cancelada', 'AbortError')
    if (timedOut) throw new ApiError('El reconocimiento excedió el tiempo de espera. Intenta con menos páginas o vuelve a intentarlo.', 0, 'timeout')
    if (error instanceof ApiError) throw error
    throw new ApiError('No se pudo conectar con el backend. Inicia la API en el puerto 8000 y vuelve a intentarlo.')
  } finally {
    clearTimeout(timer)
    init.signal?.removeEventListener('abort', abort)
  }
}

function responseError(status: number, body: unknown): ApiError {
  const fallback = status === 429 ? 'El motor está ocupado. Intenta nuevamente en unos segundos.'
    : status === 413 ? 'El documento supera el límite permitido por el backend.'
      : status === 503 ? 'Los motores de reconocimiento no están disponibles. Revisa el estado del backend.'
        : status === 422 ? 'No se pudo reconocer el documento. Revisa su formato y legibilidad.'
          : 'No se pudo procesar el documento. Inténtalo de nuevo.'
  if (body && typeof body === 'object' && 'error' in body && body.error && typeof body.error === 'object') {
    const error = body.error
    return new ApiError('message' in error && typeof error.message === 'string' ? error.message : fallback, status,
      'code' in error && typeof error.code === 'string' ? error.code : 'server_error')
  }
  return new ApiError(fallback, status, 'server_error')
}

export async function analyzeCv(file: File, signal: AbortSignal, forceOcr = false): Promise<AnalysisResult> {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('force_ocr', String(forceOcr))
  const { response, body } = await request('/analyze', { method: 'POST', body: form, signal }, analysisTimeout)
  if (!response.ok) throw responseError(response.status, body)
  const parsed = analysisSchema.safeParse(body)
  if (!parsed.success) throw new ApiError('La respuesta de reconocimiento no coincide con el contrato esperado.', response.status, 'invalid_response')
  return parsed.data
}

export async function getBackendHealth(signal: AbortSignal): Promise<BackendHealth> {
  const { response, body } = await request('/health', { signal }, 5000)
  const parsed = healthSchema.safeParse(body)
  if (parsed.success) return parsed.data // Un estado 503 también describe motores no disponibles.
  throw responseError(response.status, body)
}
