import { defaultRequirements } from '../data/demo'
import type { CriterionResult, CvDocument, Evaluation, Requirement, Verdict } from '../types'
import type { AnalysisResult, Evidence, SectionType } from './apiSchema'

export function normalizeRequirement(text: string) {
  return text.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
}

// Fixture del prototipo: no se infiere información de archivos subidos.
export function evaluateDocument(document: CvDocument, requirements: Requirement[]): Evaluation {
  const criteria: CriterionResult[] = requirements.map((requirement) => {
    const result: CriterionResult = {
      requirement: { ...requirement }, status: 'pending', source: 'pending',
      explanation: document.kind === 'demo'
        ? 'Este criterio personalizado no tiene evidencia predefinida en el ejemplo. Revisa el documento y registra un dictamen manual.'
        : 'Documento pendiente de reconocimiento. Inicia el análisis para consultar sus evidencias.',
    }
    if (document.kind !== 'demo') return result
    const index = defaultRequirements.findIndex((item) => normalizeRequirement(item.text) === normalizeRequirement(requirement.text))
    if (index === 0) return {
      ...result, status: 'pass', source: 'demo',
      explanation: 'El ejemplo acredita más de 3 años en atención telefónica entre Teleperformance y Konecta BPO, superando los 2 años solicitados. Evidencia ilustrativa del prototipo.',
      quote: 'Atención telefónica personalizada a clientes corporativos bilingües resolviendo incidentes técnicos y reclamos.',
    }
    if (index === 1) return {
      ...result, status: 'pass', source: 'demo',
      explanation: 'El CV de ejemplo declara educación secundaria concluida en I.E. República de Colombia (promoción 2018). No se ha consultado ningún registro externo.',
      quote: 'Certificado Oficial de Educación Básica Regular Concluida.',
    }
    if (index === 2) return {
      ...result, source: 'demo',
      explanation: 'El candidato menciona “hojas de cálculo operativas”, pero no especifica un nivel de Microsoft Excel. Se sugiere validar el dominio de esta herramienta en una prueba técnica.',
    }
    return result
  })
  return {
    documentId: document.id, documentName: document.name, createdAt: new Date().toISOString(),
    mode: document.kind === 'demo' ? 'demo' : 'manual', criteria,
  }
}

// El backend reconoce contenido, no determina el cumplimiento de requisitos.
// Este adaptador vincula fragmentos reales sin convertir una coincidencia textual en aprobación.
export function evaluationFromAnalysis(document: CvDocument, requirements: Requirement[], analysis: AnalysisResult): Evaluation {
  const stopwords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'y', 'o', 'un', 'una', 'con', 'para', 'por', 'al', 'minima', 'minimo', 'conocimiento', 'conocimientos', 'dominio', 'experiencia', 'anos', 'nivel', 'the', 'of', 'in', 'and'])
  const sectionPatterns: [RegExp, SectionType[]][] = [
    [/experiencia|experience|anos/, ['experience']],
    [/secundaria|educacion|formacion|estudios|titulo|universidad|degree|education/, ['education', 'certifications']],
    [/ingles|idioma|english|language|frances|portugues/, ['languages']],
    [/conocimiento|habilidad|dominio|skills|herramienta/, ['skills']],
  ]
  const criteria: CriterionResult[] = requirements.map((requirement) => {
    const normalized = normalizeRequirement(requirement.text)
    const tokens = [...new Set(normalized.match(/[a-z0-9+#.]+/g) || [])].filter((word) => word.length > 2 && !stopwords.has(word))
    const sections = sectionPatterns.filter(([pattern]) => pattern.test(normalized)).flatMap(([, types]) => types)
    const contextualLines = new Set(analysis.profile.sections.filter((section) => sections.includes(section.type)).flatMap((section) => section.line_ids))
    const matches = analysis.pages.flatMap((page) => page.lines.map((line) => {
      const words = new Set(normalizeRequirement(line.text).match(/[a-z0-9+#.]+/g) || [])
      const score = tokens.filter((token) => words.has(token)).length + (contextualLines.has(line.id) ? 0.25 : 0)
      return { score, evidence: { page: page.number, line_id: line.id, text: line.text, bbox: line.bbox } satisfies Evidence }
    })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3)
    const evidence = matches.map((match) => match.evidence)
    return {
      requirement: { ...requirement }, status: 'pending', source: evidence.length ? 'recognition' : 'pending', evidence,
      explanation: evidence.length
        ? 'Se encontraron fragmentos relacionados en el documento. Comprueba su contexto, fechas y nivel antes de emitir un dictamen; el OCR no acredita por sí solo este requisito.'
        : 'No se encontraron fragmentos relacionados con este criterio en el texto reconocido. La ausencia de una mención no demuestra incumplimiento: revisa el documento original.',
      quote: evidence[0]?.text,
    }
  })
  return { documentId: document.id, documentName: document.name, createdAt: new Date().toISOString(), mode: 'recognized', criteria, analysis }
}

export function summarizeEvaluation(criteria: CriterionResult[]) {
  const active = criteria.filter((item) => item.status !== 'ignored')
  const mandatory = active.filter((item) => item.requirement.required)
  const decisive = mandatory.length ? mandatory : active
  let verdict: Verdict = 'pass'
  if (!active.length || decisive.some((item) => item.status === 'pending')) verdict = 'pending'
  if (decisive.some((item) => item.status === 'fail')) verdict = 'fail'
  const passed = active.filter((item) => item.status === 'pass').length
  return {
    verdict, passed, total: active.length,
    pending: active.filter((item) => item.status === 'pending').length,
    failed: active.filter((item) => item.status === 'fail').length,
    ignored: criteria.length - active.length,
    score: active.length ? Math.round(passed / active.length * 100) : 0,
  }
}

export const verdictLabels: Record<Verdict, string> = {
  pass: 'CUMPLE CON LOS REQUISITOS', fail: 'NO CUMPLE CON LOS REQUISITOS', pending: 'ESTADO INDETERMINADO',
}

export function evaluationText(evaluation: Evaluation) {
  const summary = summarizeEvaluation(evaluation.criteria)
  return [
    'SISTEMA DE REVISIÓN DE CV',
    evaluation.mode === 'demo' ? 'DEMOSTRACIÓN · Datos de ejemplo, sin inferencia IA' : evaluation.analysis ? 'RECONOCIMIENTO REAL · Dictamen de requisitos por revisión humana' : 'REVISIÓN MANUAL · Sin reconocimiento asociado',
    `Documento: ${evaluation.documentName}`,
    `Fecha: ${new Date(evaluation.createdAt).toLocaleString('es-PE')}`,
    `Dictamen: ${verdictLabels[summary.verdict]}`,
    `Criterios acreditados: ${summary.score}% (${summary.passed}/${summary.total})`,
    'El porcentaje cuenta criterios aprobados; no representa confianza de IA.',
    ...evaluation.criteria.flatMap((item) => [
      '', `${item.requirement.text} (${item.requirement.required ? 'Obligatorio' : 'Deseable'})`,
      `Estado: ${statusLabels[item.status]} · Origen: ${item.source === 'manual' ? 'Revisión manual' : item.source === 'demo' ? 'Ejemplo' : item.source === 'recognition' ? 'Texto reconocido' : 'Pendiente'}`,
      item.explanation, ...(item.quote ? [`Cita: «${item.quote}»`] : []),
      ...(item.evidence || []).map((evidence) => `Evidencia: página ${evidence.page}, línea ${evidence.line_id}: ${evidence.text}`),
    ]),
    ...(evaluation.analysis ? [
      '', 'RECONOCIMIENTO DEL DOCUMENTO',
      `ID: ${evaluation.analysis.document_id}`,
      `Modelo: ${evaluation.analysis.engines.detector_model || 'OCR de página completa'}`,
      `Idiomas: ${evaluation.analysis.engines.languages.join(', ')}`,
      `Páginas: ${evaluation.analysis.page_count} · Tiempo: ${evaluation.analysis.processing_seconds} s`,
      ...evaluation.analysis.warnings.map((warning) => `Observación: ${warning}`),
      ...evaluation.analysis.pages.flatMap((page) => ['', `PÁGINA ${page.number} · ${page.source === 'pdf_text' ? 'Texto digital' : 'Tesseract OCR'}`, page.text]),
    ] : []),
  ].join('\n')
}

export const statusLabels = { pass: 'Cumple', fail: 'No cumple', pending: 'Requiere validación', ignored: 'Ignorado' }
