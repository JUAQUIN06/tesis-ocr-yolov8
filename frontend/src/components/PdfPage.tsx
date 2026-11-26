import { useEffect, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { openPdf } from '../services/pdf'

export default function PdfPage({ file, page, zoom, rotation }: { file: File; page: number; zoom: number; rotation: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let task: ReturnType<typeof openPdf> | undefined
    async function load() {
      try {
        const data = await file.arrayBuffer()
        if (!active) return
        task = openPdf(data)
        const document = await task.promise
        if (active) setPdf(document)
      } catch { if (active) { setError('No se pudo abrir el documento.'); setLoading(false) } }
    }
    void load()
    return () => { active = false; void task?.destroy() }
  }, [file])

  useEffect(() => {
    if (!pdf) return
    let active = true
    let render: RenderTask | undefined
    async function draw() {
      try {
        const pdfPage = await pdf!.getPage(page)
        if (!active || !canvas.current) return
        setLoading(true)
        setError('')
        const viewport = pdfPage.getViewport({ scale: zoom, rotation: (pdfPage.rotate + rotation) % 360 })
        const ratio = Math.min(window.devicePixelRatio || 1, 2)
        const element = canvas.current
        element.width = Math.floor(viewport.width * ratio)
        element.height = Math.floor(viewport.height * ratio)
        element.style.width = `${viewport.width}px`
        element.style.height = `${viewport.height}px`
        render = pdfPage.render({ canvas: element, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] })
        await render.promise
        if (active) setLoading(false)
      } catch (reason) {
        if (active && !(reason instanceof Error && reason.name === 'RenderingCancelledException')) {
          setError('No se pudo mostrar la página.'); setLoading(false)
        }
      }
    }
    void draw()
    return () => { active = false; render?.cancel() }
  }, [pdf, page, zoom, rotation])

  return <div className="pdf-page">
    {loading && !error && <p className="viewer-feedback" role="status"><LoaderCircle size={18} className="animate-spin" />Cargando página…</p>}
    {error && <p className="error-message" role="alert">No se pudo mostrar el PDF. Intenta cargarlo nuevamente.</p>}
    <canvas ref={canvas} aria-label={`Página ${page} del documento PDF`} role="img" hidden={!!error} />
  </div>
}
