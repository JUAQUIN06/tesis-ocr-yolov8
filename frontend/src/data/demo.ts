import type { CvDocument, Requirement } from '../types'

export const defaultRequirements: Requirement[] = [
  { id: 'EXP-01', text: 'Experiencia mínima de 2 años en call center', required: true },
  { id: 'EDU-01', text: 'Secundaria completa', required: true },
  { id: 'TOOL-03', text: 'Conocimiento de Microsoft Excel', required: false },
]

export function createDemoDocument(): CvDocument {
  return {
    id: crypto.randomUUID(),
    name: 'Curriculum_Vitae_Carlos_Mendoza_2025.pdf',
    size: 0,
    kind: 'demo',
    pages: 1,
  }
}

export const demoProfile = {
  name: 'CARLOS ENRIQUE MENDOZA PAREDES',
  title: 'Especialista en Atención al Cliente & Operaciones Call Center',
  summary: 'Profesional con sólida trayectoria en gestión de llamadas entrantes y salientes, resolución de reclamos en primer contacto (FCR) y soporte de servicios financieros. Orientado al cumplimiento de métricas NPS y CSAT bajo entornos de alta exigencia operativa.',
  experience: [
    {
      company: 'Teleperformance Perú', role: 'Agente Senior de Contact Center',
      period: 'Marzo 2023 – Febrero 2025 (1 año 11 meses)',
      quote: 'Atención telefónica personalizada a clientes corporativos',
      detail: 'bilingües resolviendo incidentes técnicos y reclamos de facturación en línea telefónica ininterrumpida.',
      achievement: 'Cumplimiento sostenido del 94% en Adherencia Operativa y 88% de FCR mensual.',
    },
    {
      company: 'Konecta BPO', role: 'Representante de Servicio al Cliente',
      period: 'Enero 2022 – Febrero 2023 (1 año 2 meses)',
      quote: 'Gestión omnicanal en campaña de telecomunicaciones (Call Center voz y mensajería en vivo)',
      detail: 'con promedio de 85 interacciones diarias.',
      achievement: 'Reconocido en el cuadro de honor Q3 2022 por calidad en llamadas monitoreadas.',
    },
  ],
}
