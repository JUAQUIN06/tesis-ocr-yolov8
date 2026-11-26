import { useRef, useState } from 'react'
import { BadgeCheck, CheckCircle2, CloudUpload, Eye, FileImage, FileText, FolderOpen, LoaderCircle, ShieldCheck, Trash2 } from 'lucide-react'
import type { CvDocument } from '../types'
import { formatSize } from '../services/documents'
import { Button, IconButton } from './ui'

type Props = {
  document: CvDocument | null; loading: boolean; error: string
  onFile: (file: File) => void; onDemo: () => void; onRemove: () => void; onPreview: () => void
  onError: (message: string) => void
}

export function UploadPanel({ document, loading, error, onFile, onDemo, onRemove, onPreview, onError }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)

  function acceptFiles(files: FileList | null) {
    if (!files?.length) return
    if (files.length !== 1) { onError('Carga un solo CV a la vez.'); return }
    onFile(files[0])
  }

  return <section className="flex min-w-0 flex-col gap-4" aria-labelledby="upload-title">
    <div className="upload-heading">
      <h1 id="upload-title">Sistema de Revisión de CV</h1>
      <p>Sube un currículum vitae en formato PDF, JPG o PNG para reconocer su contenido con YOLOv8 y Tesseract y revisar los requisitos.</p>
    </div>
    <div className={`dropzone panel ${dragging ? 'is-dragging' : ''}`} aria-label="Zona de carga de CV" aria-busy={loading}
      onDragEnter={(event) => { event.preventDefault(); dragDepth.current++; setDragging(true) }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}
      onDragLeave={(event) => { event.preventDefault(); if (--dragDepth.current <= 0) setDragging(false) }}
      onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setDragging(false); acceptFiles(event.dataTransfer.files) }}>
      <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" tabIndex={-1} aria-label="Seleccionar CV"
        onChange={(event) => { acceptFiles(event.target.files); event.target.value = '' }} />
      <span className="upload-icon">{loading ? <LoaderCircle size={28} className="animate-spin" /> : <CloudUpload size={28} />}</span>
      <h2 className="heading-md">{loading ? 'Validando tu documento…' : dragging ? 'Suelta el archivo para cargarlo' : 'Arrastra y suelta tu CV aquí'}</h2>
      <p className="text-[13px] text-muted">Formatos soportados: <strong className="text-ink">.PDF, .JPG, .JPEG, .PNG</strong> (hasta 15 MB)</p>
      <div className="flex flex-wrap justify-center gap-2 mt-1">
        <Button onClick={() => input.current?.click()} disabled={loading}><FolderOpen size={17} />Seleccionar archivo desde el dispositivo</Button>
        <Button className="button-demo" onClick={onDemo}><FileText size={16} />Cargar ejemplo demo</Button>
      </div>
    </div>
    {error && <div role="alert" className="error-message">{error}</div>}
    {document ? <div className="panel file-card">
      <div className="flex items-center gap-3 min-w-0">
        <span className="file-icon">{document.kind === 'image' ? <FileImage size={23} /> : <FileText size={23} />}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-heading font-semibold truncate" title={document.name}>{document.name}</span>
            <span className="file-size">{document.kind === 'demo' ? 'DEMO' : formatSize(document.size)}</span>
          </div>
          <p className="file-status"><CheckCircle2 size={13} />{document.kind === 'demo' ? 'Ejemplo cargado • Listo para explorar el flujo' : 'Formato validado • Listo para revisión'}</p>
        </div>
        <div className="flex shrink-0">
          <IconButton label="Vista previa rápida" onClick={onPreview}><Eye size={18} /></IconButton>
          <IconButton label="Descartar archivo" className="text-error" onClick={onRemove}><Trash2 size={17} /></IconButton>
        </div>
      </div>
      <div className="file-meta"><span className="flex items-center gap-1.5"><BadgeCheck size={16} />{document.kind === 'demo' ? 'Documento ilustrativo de Stitch' : 'Documento disponible para vista previa'}</span><span>Páginas: {document.pages}</span></div>
    </div> : <div className="empty-file"><FileText size={19} /><span>Aún no has seleccionado un documento.</span></div>}
    <div className="info-strip"><ShieldCheck className="text-success shrink-0" size={20} /><span>Al evaluar, el archivo se envía al backend configurado para su reconocimiento.</span><span className="small-tag ml-auto">OCR</span></div>
  </section>
}
