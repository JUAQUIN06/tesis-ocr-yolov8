import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BadgeCheck, CheckCircle2, Copy, FileSearch, LockKeyhole, RefreshCw, SlidersHorizontal, X } from 'lucide-react'
import type { CriterionStatus, CvDocument, Evaluation, Requirement } from './types'
import type { AnalysisResult, Evidence } from './services/apiSchema'
import { createDemoDocument, defaultRequirements } from './data/demo'
import { prepareDocument } from './services/documents'
import { evaluateDocument, evaluationFromAnalysis, evaluationText } from './services/evaluation'
import { analyzeCv } from './services/api'
import { exportReport } from './services/report'
import { useBackendHealth } from './hooks/useBackendHealth'
import { Layout } from './components/Layout'
import { UploadPanel } from './components/UploadPanel'
import { FilterPanel } from './components/FilterPanel'
import { DocumentViewer } from './components/DocumentViewer'
import { ReviewWorkspace } from './components/ReviewWorkspace'
import { EvaluationPanel } from './components/EvaluationPanel'
import { AnalysisModal } from './components/AnalysisModal'
import { BackendStatus } from './components/BackendStatus'
import { Button, IconButton, Modal } from './components/ui'

function demoDelay(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelado', 'AbortError')) }
    const timer = window.setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, 1400)
    signal.addEventListener('abort', abort, { once: true })
  })
}

export default function App() {
  const [document, setDocument] = useState<CvDocument | null>(createDemoDocument)
  const [requirements, setRequirements] = useState<Requirement[]>(() => defaultRequirements.map((item) => ({ ...item })))
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [recognition, setRecognition] = useState<{ documentId: string; forceOcr: boolean; data: AnalysisResult } | null>(null)
  const [forceOcr, setForceOcr] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analysisError, setAnalysisError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [preview, setPreview] = useState(false)
  const [help, setHelp] = useState(false)
  const [toast, setToast] = useState('')
  const [exporting, setExporting] = useState(false)
  const [evidenceTarget, setEvidenceTarget] = useState<{ evidence: Evidence; id: number } | null>(null)
  const uploadOperation = useRef(0)
  const analysisOperation = useRef(0)
  const analysisController = useRef<AbortController | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { connection, refresh } = useBackendHealth()

  useEffect(() => {
    window.scrollTo({ top: 0 })
    window.document.getElementById('main-content')?.focus({ preventScroll: true })
    return () => analysisController.current?.abort()
  }, [location.pathname])

  useEffect(() => () => {
    analysisOperation.current++
    uploadOperation.current++
    analysisController.current?.abort()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 4500)
    return () => clearTimeout(timeout)
  }, [toast])

  function cancelAnalysis() {
    analysisOperation.current++
    analysisController.current?.abort()
    analysisController.current = null
    setProcessing(false)
  }

  async function loadFile(file: File) {
    cancelAnalysis()
    const operation = ++uploadOperation.current
    setLoading(true)
    setError('')
    setAnalysisError('')
    try {
      const prepared = await prepareDocument(file)
      if (operation !== uploadOperation.current) return
      setDocument(prepared)
      setEvaluation(null)
      setRecognition(null)
      setEvidenceTarget(null)
      setForceOcr(false)
      setToast('Documento validado. Pulsa Evaluar CV para reconocer su contenido.')
    } catch (reason) {
      if (operation === uploadOperation.current) setError(reason instanceof Error ? reason.message : 'No se pudo cargar el archivo.')
    } finally { if (operation === uploadOperation.current) setLoading(false) }
  }

  function replaceDocument(next: CvDocument | null) {
    cancelAnalysis()
    uploadOperation.current++
    setDocument(next)
    setEvaluation(null)
    setRecognition(null)
    setEvidenceTarget(null)
    setForceOcr(false)
    setLoading(false)
    setError('')
    setAnalysisError('')
    setPreview(false)
  }

  function changeRequirements(next: Requirement[]) {
    cancelAnalysis()
    setRequirements(next)
    setEvaluation(null)
    setAnalysisError('')
  }

  async function startEvaluation(rerun = false) {
    if (!document || !requirements.length || loading || processing) return
    const operation = ++analysisOperation.current
    const controller = new AbortController()
    analysisController.current = controller
    setProcessing(true)
    setAnalysisError('')
    try {
      let result: Evaluation
      if (document.kind === 'demo') {
        await demoDelay(controller.signal)
        result = evaluateDocument(document, requirements)
      } else {
        if (!document.file) throw new Error('Vuelve a cargar el documento para reconocer su contenido.')
        const cached = !rerun && recognition?.documentId === document.id && recognition.forceOcr === forceOcr ? recognition.data : null
        const data = cached || await analyzeCv(document.file, controller.signal, forceOcr)
        if (controller.signal.aborted || operation !== analysisOperation.current) return
        if (data.page_count !== document.pages) throw new Error('El número de páginas reconocido no coincide con el documento cargado. Intenta analizarlo nuevamente.')
        setRecognition({ documentId: document.id, forceOcr, data })
        result = evaluationFromAnalysis(document, requirements, data)
      }
      if (controller.signal.aborted || operation !== analysisOperation.current) return
      setEvaluation(result)
      setEvidenceTarget(null)
      analysisController.current = null
      navigate('/resultados-de-evaluacion')
    } catch (reason) {
      if (!controller.signal.aborted && operation === analysisOperation.current) {
        setAnalysisError(reason instanceof Error ? reason.message : 'No se pudo reconocer el documento.')
        refresh()
      }
    } finally {
      if (operation === analysisOperation.current) {
        analysisController.current = null
        setProcessing(false)
      }
    }
  }

  function decide(id: string, status: CriterionStatus) {
    const explanations = {
      pass: 'Requisito aprobado manualmente por la persona revisora tras consultar el documento.',
      fail: 'La persona revisora ha marcado este requisito como no cumplido.',
      pending: 'Criterio devuelto a revisión. Se necesita evidencia adicional para emitir un dictamen.',
      ignored: 'Criterio excluido manualmente del dictamen y del cálculo de acreditación.',
    }
    setEvaluation((current) => current && ({
      ...current,
      criteria: current.criteria.map((item) => item.requirement.id === id ? { ...item, status, source: 'manual', explanation: explanations[status] } : item),
    }))
  }

  async function copySummary() {
    if (!evaluation) return
    try { await navigator.clipboard.writeText(evaluationText(evaluation)); setToast('Dictamen actualizado copiado al portapapeles.') }
    catch { setToast('No se pudo acceder al portapapeles. Puedes exportar el reporte en PDF.') }
  }

  async function downloadReport() {
    if (!evaluation) return
    setExporting(true)
    try { await exportReport(evaluation); setToast('Reporte PDF generado correctamente.') }
    catch { setToast('No se pudo generar el reporte. Inténtalo de nuevo.') }
    finally { setExporting(false) }
  }

  function nextDocument() { replaceDocument(null); navigate('/carga-y-filtros') }

  return <Layout onHelp={() => setHelp(true)} connection={connection}>
    {analysisError && <div className="analysis-error-bar" role="alert"><div><strong>No se completó el reconocimiento</strong><p>{analysisError}</p>{evaluation && <p>Se conserva el resultado anterior.</p>}</div><Button onClick={() => void startEvaluation(true)} disabled={!document || loading || processing || !requirements.length}><RefreshCw size={16} />Reintentar análisis</Button></div>}
    <Routes>
      <Route path="/carga-y-filtros" element={<div className="upload-page">
        <div className="module-bar"><span className="module-badge"><span className="status-dot" />Módulo Unificado de Carga y Preselección</span><span className="local-note"><LockKeyhole size={16} />{document?.kind === 'demo' ? 'Ejemplo de demostración' : 'Reconocimiento de documentos'}</span></div>
        <div className="upload-grid">
          <div className="flex flex-col gap-4 min-w-0">
            <UploadPanel document={document} loading={loading} error={error} onFile={(file) => void loadFile(file)} onDemo={() => replaceDocument(createDemoDocument())} onRemove={() => replaceDocument(null)} onPreview={() => setPreview(true)} onError={setError} />
            <BackendStatus connection={connection} onRefresh={refresh} />
            {document?.kind === 'pdf' && <label className="ocr-option"><input type="checkbox" checked={forceOcr} onChange={(event) => { setForceOcr(event.target.checked); setEvaluation(null); setAnalysisError('') }} />Forzar OCR en PDF<span>Útil si el texto digital está incompleto.</span></label>}
          </div>
          <div className="flex flex-col gap-4 min-w-0">
            <FilterPanel requirements={requirements} onChange={changeRequirements} onEvaluate={() => void startEvaluation()} canEvaluate={!!document && !loading} />
            <div className="audit-strip"><span className="audit-icon"><SlidersHorizontal size={19} /></span><div><h3>Auditoría de criterios</h3><p>Evidencias y decisiones visibles en cada evaluación</p></div><span className="small-tag">Trazable</span></div>
          </div>
        </div>
      </div>} />
      <Route path="/resultados-de-evaluacion" element={evaluation && document ? <>
        <div className="session-bar"><div className="flex items-center gap-2 min-w-0"><span className="session-check"><CheckCircle2 size={18} /></span><span>Sesión activa: {evaluation.mode === 'demo' ? 'Convocatoria Operadores Bilingües' : 'Revisión de currículum'}</span><span className="session-mode">• {evaluation.mode === 'demo' ? 'Datos de ejemplo de Stitch' : 'Reconocimiento real'}</span></div><div className="flex gap-2 flex-wrap"><Button onClick={() => void startEvaluation(true)}><RefreshCw size={15} />Re-ejecutar Análisis</Button><Button onClick={() => void copySummary()}><Copy size={15} />Copiar Dictamen</Button></div></div>
        <div className="results-grid"><ReviewWorkspace key={`${document.id}-${evidenceTarget?.id || 0}`} document={document} analysis={evaluation.analysis} target={evidenceTarget?.evidence} onChange={() => navigate('/carga-y-filtros')} onExpand={() => setPreview(true)} /><EvaluationPanel key={evaluation.createdAt} evaluation={evaluation} onDecision={decide} onFilters={() => navigate('/carga-y-filtros')} onNext={nextDocument} onExport={() => void downloadReport()} exporting={exporting} onEvidence={(evidence) => setEvidenceTarget((current) => ({ evidence, id: (current?.id || 0) + 1 }))} /></div>
      </> : <div className="empty-results"><span className="upload-icon"><FileSearch size={32} /></span><h1>Aún no hay una evaluación</h1><p>Carga un CV, configura los requisitos y pulsa «Evaluar CV» para ver los resultados.</p><Button variant="primary" onClick={() => navigate('/carga-y-filtros')}>Ir a Carga y Filtros</Button></div>} />
      <Route path="*" element={<Navigate to="/carga-y-filtros" replace />} />
    </Routes>
    {preview && document && <Modal title="Vista previa del documento" wide onClose={() => setPreview(false)}><DocumentViewer key={document.id} document={document} /></Modal>}
    {processing && document && <AnalysisModal demo={document.kind === 'demo'} onCancel={cancelAnalysis} />}
    {help && <Modal title="Guía y Criterios" onClose={() => setHelp(false)}><div className="help-content">
      <div className="help-intro"><BadgeCheck size={25} /><p>Un espacio unificado para revisar cada CV con criterios claros.</p></div>
      <ol><li><strong>Carga tu documento.</strong> Arrastra un PDF, JPG o PNG de hasta 15 MB, o explora el ejemplo de Carlos Mendoza.</li><li><strong>Define los filtros.</strong> Agrega, edita o elimina requisitos. Pulsa su etiqueta para cambiar entre obligatorio y deseable.</li><li><strong>Reconoce y revisa.</strong> «Evaluar CV» envía el archivo al backend. Consulta el texto, las secciones y las evidencias relacionadas; emite un dictamen por requisito.</li><li><strong>Comparte el resultado.</strong> Copia el dictamen, descarga el reporte PDF o exporta el reconocimiento en JSON.</li></ol>
      <h3>¿Cómo se calcula el resultado?</h3><p>Los requisitos obligatorios determinan el dictamen. Si no hay obligatorios, se consideran todos los activos. Un incumplimiento decisivo produce «No cumple»; la evidencia pendiente produce «Indeterminado». El porcentaje es la proporción de criterios aprobados entre los no ignorados.</p>
      <div className="help-note"><strong>Reconocimiento y revisión</strong><p>YOLOv8 identifica la estructura y Tesseract reconoce el texto; los PDF digitales pueden leerse directamente. Las coincidencias con requisitos son fragmentos relacionados, no acreditaciones automáticas. El ejemplo demo sigue utilizando datos ilustrativos y funciona sin conexión.</p><p className="mt-2">Los archivos se envían al backend configurado y se procesan sin guardarse permanentemente. Los resultados de la sesión se mantienen en memoria. Cambiar filtros reutiliza el reconocimiento del mismo archivo; re-ejecutar vuelve a llamar al backend y reinicia las decisiones manuales. Cancelar detiene la espera, aunque el servidor puede completar el trabajo iniciado.</p></div>
    </div></Modal>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={19} /><span>{toast}</span><IconButton label="Cerrar notificación" onClick={() => setToast('')}><X size={16} /></IconButton></div>}
  </Layout>
}
