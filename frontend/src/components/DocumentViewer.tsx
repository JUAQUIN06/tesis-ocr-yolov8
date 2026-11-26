import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileImage, FileText, Maximize, RotateCw, ScanLine, ZoomIn, ZoomOut } from 'lucide-react'
import type { CvDocument } from '../types'
import { formatSize } from '../services/documents'
import { DemoDocument } from './DemoDocument'
import { RotatableDocument } from './RotatableDocument'
import { Button, IconButton } from './ui'

const PdfPage = lazy(() => import('./PdfPage'))

export function DocumentViewer({ document, onChange, onExpand, page: controlledPage, onPageChange }: { document: CvDocument; onChange?: () => void; onExpand?: () => void; page?: number; onPageChange?: (page: number) => void }) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [localPage, setLocalPage] = useState(1)
  const page = controlledPage ?? localPage
  const setPage = onPageChange ?? setLocalPage
  const image = useRef<HTMLImageElement>(null)
  const download = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    if (!document.file) return
    const objectUrl = URL.createObjectURL(document.file)
    if (image.current) image.current.src = objectUrl
    if (download.current) download.current.href = objectUrl
    return () => URL.revokeObjectURL(objectUrl)
  }, [document.file])

  return <section className="document-viewer min-w-0" aria-label="Vista previa del documento">
    <div className="panel viewer-toolbar">
      <div className="flex items-center gap-2 min-w-0">
        <span className="viewer-file-icon">{document.kind === 'image' ? <FileImage size={21} /> : <FileText size={21} />}</span>
        <div className="min-w-0"><h2 className="truncate font-heading text-[14px] font-semibold" title={document.name}>{document.name}</h2>
          <p className="text-[11px] mt-0.5">{document.kind === 'demo' ? 'Ejemplo de demostración' : formatSize(document.size)} <span className="mx-1">•</span> Página {page} de {document.pages} <span className="text-success ml-2">{document.kind === 'demo' ? 'Vista ilustrativa' : 'Documento original'}</span></p>
        </div>
      </div>
      <div className="viewer-controls">
        <div className="control-group">
          <IconButton label="Reducir zoom" disabled={zoom <= 0.5} onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}><ZoomOut size={17} /></IconButton>
          <button type="button" className="zoom-value" onClick={() => setZoom(1)} title="Restablecer zoom">{Math.round(zoom * 100)}%</button>
          <IconButton label="Aumentar zoom" disabled={zoom >= 2} onClick={() => setZoom((value) => Math.min(2, value + 0.25))}><ZoomIn size={17} /></IconButton>
        </div>
        <IconButton className="tonal-button" label="Rotar documento" onClick={() => setRotation((value) => (value + 90) % 360)}><RotateCw size={17} /></IconButton>
        {onExpand && <IconButton className="tonal-button" label="Ampliar vista previa" onClick={onExpand}><Maximize size={17} /></IconButton>}
        {document.file && <a ref={download} className="icon-button tonal-button" download={document.name} aria-label="Descargar documento original" title="Descargar documento original"><Download size={17} /></a>}
        {onChange && <Button onClick={onChange} className="change-document"><ScanLine size={16} />Cambiar Documento</Button>}
      </div>
    </div>
    {document.kind === 'demo' ? <div className="annotation-legend"><strong>Marcadores del documento de ejemplo:</strong><span><i className="legend-pass" />Evidencia de requisito</span><span><i className="legend-secondary" />Habilidades complementarias</span><span><i className="legend-pending" />Observación</span></div>
      : <div className="annotation-legend">Archivo original. Tras el análisis, consulta las evidencias en la pestaña «Texto reconocido».</div>}
    <div className="document-canvas">
      {document.kind === 'demo' ? <RotatableDocument zoom={zoom} rotation={rotation}><DemoDocument /></RotatableDocument>
        : document.kind === 'image' ? <RotatableDocument zoom={zoom} rotation={rotation}><img ref={image} className="original-image" alt={`Currículum: ${document.name}`} /></RotatableDocument>
        : document.file && <Suspense fallback={<p className="viewer-feedback" role="status">Preparando visor PDF…</p>}><PdfPage file={document.file} page={page} zoom={zoom} rotation={rotation} /></Suspense>}
    </div>
    {document.pages > 1 && <div className="page-navigation">
      <Button disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Página anterior"><ChevronLeft size={17} />Anterior</Button>
      <span aria-live="polite">Página {page} de {document.pages}</span>
      <Button disabled={page >= document.pages} onClick={() => setPage(page + 1)} aria-label="Página siguiente">Siguiente<ChevronRight size={17} /></Button>
    </div>}
  </section>
}
