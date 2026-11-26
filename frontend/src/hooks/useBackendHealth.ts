import { useEffect, useState } from 'react'
import { getBackendHealth } from '../services/api'
import type { BackendHealth } from '../services/apiSchema'

export type Connection = { status: 'checking' | 'ok' | 'degraded' | 'offline'; health?: BackendHealth; message: string }

export function useBackendHealth() {
  const [connection, setConnection] = useState<Connection>({ status: 'checking', message: 'Comprobando conexión con los motores…' })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function check() {
      try {
        const health = await getBackendHealth(controller.signal)
        if (controller.signal.aborted) return
        setConnection({
          status: health.ready ? health.status === 'ok' ? 'ok' : 'degraded' : 'offline', health,
          message: !health.ready ? 'El backend responde, pero sus motores no están disponibles.'
            : health.status === 'degraded' ? 'Tesseract disponible. YOLO no está disponible; se utilizará OCR de página completa.'
              : `YOLOv8 y Tesseract disponibles · Idiomas: ${health.ocr.languages.join(', ')}`,
        })
      } catch (error) {
        if (!controller.signal.aborted) setConnection({ status: 'offline', message: error instanceof Error ? error.message : 'Backend no disponible.' })
      }
    }
    void check()
    const timer = window.setInterval(() => void check(), 30_000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [revision])
  function refresh() {
    setConnection((current) => ({ ...current, status: 'checking', message: 'Comprobando conexión con los motores…' }))
    setRevision((value) => value + 1)
  }
  return { connection, refresh }
}
