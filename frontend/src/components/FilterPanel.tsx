import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Check, CheckCircle2, Pencil, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react'
import type { Requirement } from '../types'
import { normalizeRequirement } from '../services/evaluation'
import { Button, IconButton } from './ui'

type Props = { requirements: Requirement[]; onChange: (items: Requirement[]) => void; onEvaluate: () => void; canEvaluate: boolean }
const suggestions = ['Inglés nivel B2', 'Conocimiento de SQL', 'Disponibilidad para turnos rotativos']

export function FilterPanel({ requirements, onChange, onEvaluate, canEvaluate }: Props) {
  const [text, setText] = useState('')
  const [required, setRequired] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [error, setError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  function valid(value: string, id?: string) {
    if (!value.trim()) { setError('Escribe el requisito que deseas evaluar.'); return false }
    if (value.trim().length > 160) { setError('El filtro admite hasta 160 caracteres.'); return false }
    if (requirements.some((item) => item.id !== id && normalizeRequirement(item.text) === normalizeRequirement(value))) {
      setError('Este criterio ya está en la lista.'); return false
    }
    setError('')
    return true
  }

  function add(event: FormEvent) {
    event.preventDefault()
    if (requirements.length >= 20) { setError('Puedes configurar hasta 20 filtros.'); return }
    if (!valid(text)) return
    onChange([...requirements, { id: crypto.randomUUID(), text: text.trim(), required }])
    setText('')
    input.current?.focus()
  }

  function save(event: FormEvent, id: string) {
    event.preventDefault()
    if (!valid(editText, id)) return
    onChange(requirements.map((item) => item.id === id ? { ...item, text: editText.trim() } : item))
    setEditing(null)
  }

  return <section className="panel filter-panel" aria-labelledby="filters-title">
    <div className="section-heading">
      <span className="section-icon"><SlidersHorizontal size={20} /></span>
      <div className="flex-1 min-w-0"><h2 id="filters-title" className="heading-md">Filtros de preselección</h2><p className="text-muted text-[13px]">Criterios que se evaluarán sobre el CV</p></div>
      <span className="badge filter-count" aria-live="polite">{requirements.length} filtros definidos</span>
    </div>
    <form onSubmit={add} className="filter-form">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="new-filter">Nuevo filtro</label>
        <input ref={input} id="new-filter" value={text} onChange={(event) => setText(event.target.value)} maxLength={160} placeholder="Agregar filtro (ej. Conocimiento de SQL, Inglés B2)" className="input min-w-0 flex-1" aria-describedby={error ? 'filter-error' : undefined} />
        <Button variant="primary" type="submit"><Plus size={17} />Agregar</Button>
      </div>
      <label className="new-priority">Prioridad del nuevo filtro
        <select aria-label="Prioridad del nuevo filtro" value={required ? 'required' : 'optional'} onChange={(event) => setRequired(event.target.value === 'required')}>
          <option value="required">Obligatorio</option><option value="optional">Deseable</option>
        </select>
      </label>
    </form>
    {error && <p id="filter-error" role="alert" className="error-message">{error}</p>}
    <ul className="filter-list">
      {requirements.map((item) => <li key={item.id} className="filter-row">
        {editing === item.id ? <form className="flex w-full gap-1 items-center" onSubmit={(event) => save(event, item.id)}>
          <label className="sr-only" htmlFor={`edit-${item.id}`}>Editar criterio</label>
          <input id={`edit-${item.id}`} autoFocus value={editText} onChange={(event) => setEditText(event.target.value)} className="input min-w-0 flex-1" maxLength={160}
            onKeyDown={(event) => { if (event.key === 'Escape') { setEditing(null); setError('') } }} />
          <button type="submit" className="icon-button text-success" aria-label="Guardar filtro"><Check size={18} /></button>
          <IconButton label="Cancelar edición" onClick={() => { setEditing(null); setError('') }}><X size={18} /></IconButton>
        </form> : <>
          <CheckCircle2 size={18} className="text-primary shrink-0" />
          <div className="filter-content"><span>{item.text}</span>
            <button type="button" className={`badge priority-badge ${item.required ? 'required' : ''}`} title="Cambiar prioridad" aria-label={`Cambiar prioridad de ${item.text}: ${item.required ? 'Obligatorio' : 'Deseable'}`}
              onClick={() => onChange(requirements.map((criterion) => criterion.id === item.id ? { ...criterion, required: !criterion.required } : criterion))}>{item.required ? 'Obligatorio' : 'Deseable'}</button>
          </div>
          <div className="flex shrink-0 ml-auto">
            <IconButton label={`Editar filtro: ${item.text}`} onClick={() => { setEditing(item.id); setEditText(item.text); setError('') }}><Pencil size={16} /></IconButton>
            <IconButton label={`Eliminar filtro: ${item.text}`} className="text-error" onClick={() => { onChange(requirements.filter((criterion) => criterion.id !== item.id)); setError('') }}><Trash2 size={16} /></IconButton>
          </div>
        </>}
      </li>)}
    </ul>
    {!requirements.length && <p className="empty-file">Agrega al menos un criterio para evaluar el CV.</p>}
    <Button className="add-more" aria-expanded={showSuggestions} onClick={() => { setShowSuggestions(!showSuggestions); input.current?.focus() }}><Plus size={18} />Agregar más filtros</Button>
    {showSuggestions && <div className="suggestions"><p className="text-muted text-xs w-full">Selecciona una sugerencia y pulsa Agregar:</p>{suggestions.map((item) => <button key={item} onClick={() => { setText(item); input.current?.focus() }} type="button" className="badge">{item}</button>)}</div>}
    <div className="evaluate-action">
      <Button variant="primary" className="evaluate-button" disabled={!canEvaluate || !requirements.length || editing !== null} onClick={onEvaluate}>Evaluar CV<ArrowRight size={21} /></Button>
      <p>{!canEvaluate ? 'Carga un documento para iniciar la evaluación.' : 'Revisa el CV contra los criterios configurados.'}</p>
    </div>
  </section>
}
