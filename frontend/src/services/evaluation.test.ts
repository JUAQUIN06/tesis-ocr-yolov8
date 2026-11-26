import { describe, expect, it } from 'vitest'
import { createDemoDocument, defaultRequirements } from '../data/demo'
import { evaluateDocument, evaluationFromAnalysis, evaluationText, summarizeEvaluation } from './evaluation'
import { recognitionFixture } from '../test/recognitionFixture'
import { MAX_FILE_SIZE, validateFileBasics } from './documents'
import type { CvDocument } from '../types'

describe('Coherencia de la evaluación y evidencias', () => {
  it('permite aprobar obligatorios con deseables pendientes, sin inventar confianza IA', () => {
    const evaluation = evaluateDocument(createDemoDocument(), defaultRequirements)
    expect(summarizeEvaluation(evaluation.criteria)).toMatchObject({ verdict: 'pass', score: 67, pending: 1, passed: 2 })
    expect(evaluationText(evaluation)).toContain('DEMOSTRACIÓN')
    expect(evaluationText(evaluation)).toContain('67% (2/3)')
  })

  it('no reutiliza evidencias ficticias para documentos propios ni criterios editados', () => {
    const document: CvDocument = { id: 'real', name: 'cv.pdf', kind: 'pdf', pages: 1, size: 100 }
    const evaluation = evaluateDocument(document, defaultRequirements)
    expect(evaluation.criteria.every((item) => item.status === 'pending' && !item.quote)).toBe(true)
    expect(summarizeEvaluation(evaluation.criteria).verdict).toBe('pending')
    const edited = evaluateDocument(createDemoDocument(), [{ ...defaultRequirements[0], text: 'Experiencia mínima de 20 años' }])
    expect(edited.criteria[0].status).toBe('pending')
  })

  it('prioriza un incumplimiento obligatorio sobre pendientes y recalcula el reporte', () => {
    const evaluation = evaluateDocument(createDemoDocument(), defaultRequirements)
    evaluation.criteria[0].status = 'fail'
    evaluation.criteria[1].status = 'pending'
    expect(summarizeEvaluation(evaluation.criteria)).toMatchObject({ verdict: 'fail', score: 0 })
    expect(evaluationText(evaluation)).toContain('NO CUMPLE CON LOS REQUISITOS')
  })

  it('excluye los ignorados y evita aprobación vacía', () => {
    const evaluation = evaluateDocument(createDemoDocument(), defaultRequirements)
    evaluation.criteria[2].status = 'ignored'
    expect(summarizeEvaluation(evaluation.criteria)).toMatchObject({ verdict: 'pass', score: 100, total: 2, ignored: 1 })
    evaluation.criteria.forEach((item) => { item.status = 'ignored' })
    expect(summarizeEvaluation(evaluation.criteria)).toMatchObject({ verdict: 'pending', score: 0, total: 0 })
    expect(summarizeEvaluation([]).verdict).toBe('pending')
  })

  it('considera todos los criterios cuando no hay obligatorios', () => {
    const requirements = defaultRequirements.map((item) => ({ ...item, required: false }))
    const evaluation = evaluateDocument(createDemoDocument(), requirements)
    expect(summarizeEvaluation(evaluation.criteria).verdict).toBe('pending')
    evaluation.criteria[2].status = 'pass'
    expect(summarizeEvaluation(evaluation.criteria).verdict).toBe('pass')
  })

  it('conserva una instantánea independiente de los filtros', () => {
    const requirement = { ...defaultRequirements[0] }
    const evaluation = evaluateDocument(createDemoDocument(), [requirement])
    requirement.text = 'Cambió el requisito'
    expect(evaluation.criteria[0].requirement.text).toBe(defaultRequirements[0].text)
  })
})

describe('Validación básica de archivos', () => {
  it('rechaza extensiones ajenas, archivos vacíos, MIME incoherente y más de 15 MB', () => {
    expect(() => validateFileBasics({ name: 'cv.exe', type: '', size: 100 })).toThrow('Formato no admitido')
    expect(() => validateFileBasics({ name: 'cv.pdf', type: 'application/pdf', size: 0 })).toThrow('vacío')
    expect(() => validateFileBasics({ name: 'cv.pdf', type: 'image/png', size: 100 })).toThrow('extensión')
    expect(() => validateFileBasics({ name: 'cv.pdf', type: 'application/pdf', size: MAX_FILE_SIZE + 1 })).toThrow('15 MB')
    expect(() => validateFileBasics({ name: 'CV.JPEG', type: '', size: MAX_FILE_SIZE })).not.toThrow()
  })
})

describe('Adaptación del reconocimiento real', () => {
  const document: CvDocument = { id: 'real', name: 'cv.pdf', kind: 'pdf', pages: 1, size: 100 }

  it('vincula evidencias auténticas por página/línea sin aprobar automáticamente los requisitos', () => {
    const analysis = recognitionFixture()
    const result = evaluationFromAnalysis(document, defaultRequirements, analysis)
    expect(result.mode).toBe('recognized')
    expect(result.criteria.every((item) => item.status === 'pending')).toBe(true)
    expect(result.criteria[2].source).toBe('recognition')
    expect(result.criteria[2].evidence?.[0].line_id).toBe('p1-l8')
    expect(result.criteria[2].quote).toContain('Microsoft Excel')
    expect(evaluationText(result)).toContain('yolov8n-doclaynet.pt')
    expect(evaluationText(result)).toContain('página 1, línea p1-l8')
    expect(evaluationText(result)).not.toContain('no conectado')
  })

  it('mantiene pendiente un filtro sin evidencia y no modifica la instantánea del análisis', () => {
    const analysis = recognitionFixture()
    const before = JSON.stringify(analysis)
    const result = evaluationFromAnalysis(document, [{ id: 'custom', required: true, text: 'Certificación Kubernetes' }], analysis)
    expect(result.criteria[0].status).toBe('pending')
    expect(result.criteria[0].evidence).toEqual([])
    expect(JSON.stringify(analysis)).toBe(before)
  })
})
