import { useState } from 'react'
import { ArrowRight, Check, CheckCircle2, CircleHelp, Clock3, Download, ListFilter, ShieldCheck, SlidersHorizontal, Sparkles, X, XCircle } from 'lucide-react'
import type { CriterionResult, CriterionStatus, Evaluation } from '../types'
import { statusLabels, summarizeEvaluation, verdictLabels } from '../services/evaluation'
import { Button } from './ui'
import type { Evidence } from '../services/apiSchema'

function CriterionCard({ item, onDecision, onEvidence }: { item: CriterionResult; onDecision: (status: CriterionStatus) => void; onEvidence: (evidence: Evidence) => void }) {
  const Icon = item.status === 'pass' ? Check : item.status === 'fail' ? X : CircleHelp
  return <article className="panel criterion-card">
    <div className="criterion-heading">
      <span className={`criterion-icon badge-${item.status}`}><Icon size={16} /></span>
      <div className="flex-1 min-w-0"><h3 className="font-heading font-semibold text-[14px]">{item.requirement.text}</h3>
        <p className="criterion-subtitle">Criterio {item.requirement.required ? 'obligatorio' : 'deseable'} <span>• {item.source === 'manual' ? 'Validación manual' : item.source === 'demo' ? 'Evidencia demo' : item.source === 'recognition' ? 'Texto reconocido' : 'Por revisar'}</span></p>
      </div>
      <span className={`badge badge-${item.status}`}><Icon size={12} />{statusLabels[item.status]}</span>
    </div>
    <details className="criterion-evidence" open>
      <summary><Sparkles size={14} />{item.source === 'manual' ? 'Justificación de la revisión' : item.status === 'pass' ? 'Evidencia disponible en el CV' : 'Validación del criterio'}</summary>
      <p>{item.explanation}</p>
      {item.evidence?.length ? <div className="criterion-quotes">{item.evidence.map((evidence, index) => <blockquote key={evidence.line_id}><p>“{evidence.text}”</p><button type="button" onClick={() => onEvidence(evidence)} aria-label={`Ver evidencia ${index + 1}: ${item.requirement.text}`}>Página {evidence.page} · Ver en texto reconocido</button></blockquote>)}</div> : item.quote && <blockquote>“{item.quote}”</blockquote>}
      <div className="criterion-actions">
        <label className="sr-only" htmlFor={`decision-${item.requirement.id}`}>Dictamen de {item.requirement.text}</label>
        <select id={`decision-${item.requirement.id}`} value={item.status} onChange={(event) => onDecision(event.target.value as CriterionStatus)}>
          <option value="pending">Pendiente de revisión</option><option value="pass">Cumple</option><option value="fail">No cumple</option><option value="ignored">Ignorado</option>
        </select>
        {item.status === 'pending' && <div className="flex gap-1 flex-wrap">
          <Button className="compact-button" onClick={() => onDecision('ignored')}>Ignorar Criterio</Button>
          <Button variant="primary" className="compact-button" onClick={() => onDecision('pass')}>Aprobar Manualmente</Button>
        </div>}
      </div>
    </details>
  </article>
}

type Props = {
  evaluation: Evaluation; onDecision: (id: string, status: CriterionStatus) => void
  onFilters: () => void; onNext: () => void; onExport: () => void; exporting: boolean
  onEvidence: (evidence: Evidence) => void
}

export function EvaluationPanel({ evaluation, onDecision, onFilters, onNext, onExport, exporting, onEvidence }: Props) {
  const [filter, setFilter] = useState<'all' | CriterionStatus>('all')
  const summary = summarizeEvaluation(evaluation.criteria)
  const visible = evaluation.criteria.filter((item) => filter === 'all' || item.status === filter)
  const StatusIcon = summary.verdict === 'pass' ? CheckCircle2 : summary.verdict === 'fail' ? XCircle : CircleHelp
  const descriptions = {
    pass: 'El perfil satisface los criterios obligatorios activos. Consulta las observaciones de los requisitos deseables.',
    fail: 'Uno o más criterios decisivos fueron marcados como no cumplidos. Consulta la justificación de cada requisito.',
    pending: 'No hay evidencia suficiente para concluir. Revisa el documento y completa los criterios pendientes.',
  }

  return <section className="evaluation-panel" aria-labelledby="evaluation-title">
    <div className="panel evaluation-heading">
      <div className="flex items-center justify-between gap-2"><span className="eyebrow">{evaluation.mode === 'demo' ? 'Evaluación de demostración' : 'Revisión del documento'}</span><span className="time-badge"><Clock3 size={12} />{new Date(evaluation.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span></div>
      <h1 id="evaluation-title">RESULTADOS DE EVALUACIÓN</h1>
      <div className="flex items-center justify-between gap-2 text-xs text-muted"><span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-primary" />{evaluation.mode === 'demo' ? 'Datos ilustrativos · Sin inferencia IA' : evaluation.mode === 'recognized' ? 'Reconocimiento real · Dictamen manual' : 'Validación manual'}</span><span className="small-tag">{evaluation.criteria.length} filtros</span></div>
    </div>
    <div className={`verdict-banner verdict-${summary.verdict}`} aria-live="polite">
      <div className="min-w-0"><p className="eyebrow mb-2">Dictamen final del perfil</p><div className="flex items-center gap-2.5"><StatusIcon size={29} className="shrink-0" /><h2>{verdictLabels[summary.verdict]}</h2></div><p className="verdict-description">{descriptions[summary.verdict]}</p></div>
      <div className="score-badge"><div className="score-ring"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" opacity=".2" strokeWidth="3.5" /><circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3.5" pathLength="100" strokeDasharray={`${summary.score} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" /></svg><strong>{summary.score}%</strong></div><span>Acreditado</span></div>
    </div>
    <div className="panel result-filter">
      <div className="flex justify-between items-center gap-2 mb-2"><span className="eyebrow flex items-center gap-1.5"><ListFilter size={14} />Filtrar criterios</span><span className="text-[11px] text-muted">{summary.passed} de {summary.total} acreditados</span></div>
      <div className="result-tabs" role="group" aria-label="Filtrar resultados por estado">
        {(['all', 'pass', 'fail', 'pending'] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} className={filter === value ? `selected selected-${value}` : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Todos' : value === 'pass' ? 'Cumple' : value === 'fail' ? 'No cumple' : 'Pendiente'}</button>)}
      </div>
    </div>
    <div className="criteria-summary"><h2>Criterios Evaluados ({evaluation.criteria.length})</h2><span>{summary.passed} aprobados • {summary.pending} pendientes{summary.ignored > 0 ? ` • ${summary.ignored} ignorados` : ''}</span></div>
    <div className="flex flex-col gap-3">
      {visible.map((item) => <CriterionCard key={item.requirement.id} item={item} onDecision={(status) => onDecision(item.requirement.id, status)} onEvidence={onEvidence} />)}
      {!visible.length && <p className="panel p-5 text-muted text-center">No hay criterios en este estado.</p>}
    </div>
    <p className="score-explanation">El porcentaje representa criterios aprobados, no confianza de IA. Los criterios ignorados no se cuentan.</p>
    <div className="panel results-actions">
      <Button onClick={onFilters}><SlidersHorizontal size={17} />Modificar filtros</Button>
      <Button onClick={onExport} disabled={exporting}><Download size={17} />{exporting ? 'Exportando…' : 'Exportar Reporte'}</Button>
      <Button variant="primary" onClick={onNext}>Revisar otro CV<ArrowRight size={18} /></Button>
    </div>
  </section>
}
