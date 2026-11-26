import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Braces, FileText, ScanText } from 'lucide-react'
import type { CvDocument } from '../types'
import type { AnalysisResult, Evidence, SectionType } from '../services/apiSchema'
import { DocumentViewer } from './DocumentViewer'
import { Button } from './ui'

const sectionLabels: Record<SectionType, string> = {
  profile: 'Perfil', experience: 'Experiencia', education: 'Formación', skills: 'Habilidades', languages: 'Idiomas',
  certifications: 'Certificaciones', projects: 'Proyectos', contact: 'Contacto', references: 'Referencias', other: 'Otros datos',
}

type Props = { document: CvDocument; analysis?: AnalysisResult; target?: Evidence; onChange: () => void; onExpand: () => void }

export function ReviewWorkspace({ document, analysis, target, onChange, onExpand }: Props) {
  const [view, setView] = useState<'original' | 'text'>(target ? 'text' : 'original')
  const [page, setPage] = useState(target?.page || 1)
  const focusedLine = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (focusedLine.current) {
      focusedLine.current.scrollIntoView({ block: 'center', behavior: 'instant' })
      focusedLine.current.focus({ preventScroll: true })
    }
  }, [])
  const recognizedPage = analysis?.pages.find((item) => item.number === page)

  function downloadJson() {
    if (!analysis) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' }))
    const link = window.document.createElement('a')
    link.href = url
    link.download = `Reconocimiento_${document.name.replace(/\.[^.]+$/, '')}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <div className="review-workspace">
    {analysis && <div className="workspace-tabs" role="group" aria-label="Vista del documento">
      <button type="button" aria-pressed={view === 'original'} onClick={() => setView('original')}><FileText size={16} />Documento original</button>
      <button type="button" aria-pressed={view === 'text'} onClick={() => setView('text')}><ScanText size={16} />Texto reconocido</button>
    </div>}
    <div hidden={view !== 'original'}><DocumentViewer document={document} page={page} onPageChange={setPage} onChange={onChange} onExpand={onExpand} /></div>
    {analysis && recognizedPage && view === 'text' && <section className="panel recognized-document" aria-label="Texto reconocido del CV">
      <div className="recognized-toolbar">
        <div><h2 className="heading-md">Texto reconocido</h2><p>{recognizedPage.source === 'tesseract' ? 'Tesseract OCR' : 'Texto digital del PDF'} · {recognizedPage.lines.length} líneas · {recognizedPage.regions.length} bloques detectados</p></div>
        <label>Página<select aria-label="Página reconocida" value={page} onChange={(event) => setPage(Number(event.target.value))}>{analysis.pages.map((item) => <option key={item.number} value={item.number}>{item.number} de {analysis.page_count}</option>)}</select></label>
      </div>
      <div className="recognized-lines">
        {recognizedPage.lines.map((line) => <p key={line.id} ref={target?.line_id === line.id ? focusedLine : undefined} tabIndex={-1}
          className={`recognized-line ${target?.line_id === line.id ? 'is-selected' : ''}`}>
          <span>{line.text}</span><small>{line.id}{line.confidence === null ? ' · texto digital' : ` · OCR ${Math.round(line.confidence)}%`}</small>
        </p>)}
        {!recognizedPage.lines.length && <p className="empty-file">No se reconoció texto en esta página.</p>}
      </div>
      <div className="recognition-coordinate-note">Las evidencias corresponden a la imagen procesada{recognizedPage.rotation_clockwise ? ` · Rotación: ${recognizedPage.rotation_clockwise}°` : ''}{recognizedPage.deskew_degrees ? ` · Ajuste: ${recognizedPage.deskew_degrees}°` : ''}. Consulta el documento original para comprobar la transcripción.</div>
    </section>}
    {analysis && <section className="panel recognition-summary" aria-labelledby="recognition-title">
      <div className="flex items-center justify-between gap-3 flex-wrap"><h2 id="recognition-title" className="heading-md">Contenido del CV</h2><Button onClick={downloadJson} className="compact-button"><Braces size={15} />Descargar JSON</Button></div>
      <p className="recognition-engine">{analysis.engines.detector === 'yolov8' ? 'YOLOv8' : 'OCR de página completa'} · {analysis.engines.languages.join(' + ')} · {analysis.processing_seconds.toFixed(1)} s · {analysis.page_count} página(s)</p>
      {analysis.profile.candidate_name && <p className="candidate-name">{analysis.profile.candidate_name.value}<small>{analysis.profile.candidate_name.inferred ? 'Nombre inferido del documento' : 'Nombre reconocido'}</small></p>}
      <div className="recognized-contacts">{[...analysis.profile.emails, ...analysis.profile.phones, ...analysis.profile.links].map((item) => <span key={`${item.evidence.line_id}-${item.value}`}>{item.value}</span>)}</div>
      {(analysis.profile.skills.length > 0 || analysis.profile.languages.length > 0) && <div className="recognized-tags">{[...analysis.profile.skills, ...analysis.profile.languages].map((item) => <span key={item.value} className="badge" title={`Página ${item.evidence.page}: ${item.evidence.text}`}>{item.value}</span>)}</div>}
      {analysis.warnings.length > 0 && <div className="recognition-warnings" role="status"><strong><AlertTriangle size={16} />Observaciones del reconocimiento</strong><ul>{analysis.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
      <div className="recognized-sections">{analysis.profile.sections.map((section, index) => <details key={`${section.page}-${index}`}>
        <summary>{section.heading || sectionLabels[section.type]}<span>Pág. {section.page}</span></summary>
        <p>{section.text || 'Encabezado identificado; sin texto adicional en esta sección.'}</p>
      </details>)}</div>
    </section>}
  </div>
}
