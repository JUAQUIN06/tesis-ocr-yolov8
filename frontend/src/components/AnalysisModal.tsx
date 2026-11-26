import { useEffect, useState } from 'react'
import { Check, FileSearch, LoaderCircle } from 'lucide-react'
import { Button, Modal } from './ui'

export function AnalysisModal({ demo, onCancel }: { demo: boolean; onCancel: () => void }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  return <Modal title={demo ? 'Preparando evaluación de ejemplo' : 'Reconociendo el currículum'} onClose={onCancel}>
    <div className="analysis-content"><span className="analysis-icon"><FileSearch size={28} /></span><p>{demo ? 'Cargando las evidencias ilustrativas del prototipo.' : 'Enviando el documento y esperando la respuesta de YOLOv8 y Tesseract. El tiempo depende de sus páginas y estructura.'}</p></div>
    <ol className="analysis-steps">
      <li className="step-active"><span><Check size={16} /></span><div>Documento validado<small>Formato y vista previa disponibles</small></div></li>
      <li className="step-active"><span><LoaderCircle size={16} className="animate-spin" /></span><div>{demo ? 'Preparando datos del ejemplo' : 'Reconociendo texto y estructura'}<small>{seconds} s transcurridos</small></div></li>
      <li><span>3</span><div>Vinculando evidencias con los requisitos<small>Pendiente de respuesta</small></div></li>
    </ol>
    <progress className="analysis-progress" aria-label="Esperando el reconocimiento" />
    {!demo && <p className="text-xs text-muted mt-3">Cancelar detiene la espera en esta pantalla. El servidor puede terminar el trabajo que ya haya iniciado.</p>}
    <Button className="w-full mt-4" onClick={onCancel}>Cancelar proceso</Button>
  </Modal>
}
