import type { AnalysisResult, BackendHealth } from '../services/apiSchema'

export const healthyBackend: BackendHealth = {
  status: 'ok', ready: true,
  ocr: { available: true, languages: ['spa', 'eng'], error: null },
  detector: { available: true, model: 'yolov8n-doclaynet.pt', classes: ['Text', 'Section-header'], error: null },
  limits: { file_bytes: 15 * 1024 * 1024, pages: 10 },
}

export function recognitionFixture(pageCount = 1): AnalysisResult {
  const pages: AnalysisResult['pages'] = Array.from({ length: pageCount }, (_, pageIndex) => {
    const number = pageIndex + 1
    const texts = ['ANA TORRES QUISPE', 'ana.torres@example.com', 'EXPERIENCIA LABORAL', 'Atención al cliente en call center.', 'EDUCACIÓN', 'Secundaria completa.', 'HABILIDADES', 'Python, SQL y Microsoft Excel.']
    return {
      number, width: 1600, height: 2200, coordinate_space: 'processed_image_pixels', source: 'tesseract', rotation_clockwise: 0, deskew_degrees: 0,
      text: texts.join('\n'), warnings: [], regions: [{ id: `p${number}-r1`, label: 'Text', bbox: [20, 20, 900, 500], confidence: 0.8 }],
      lines: texts.map((text, index) => ({ id: `p${number}-l${index + 1}`, text, bbox: [30, index * 50 + 30, 800, index * 50 + 60], source: 'tesseract', confidence: 94, region_id: `p${number}-r1`, column: 'main', order: index })),
    }
  })
  const evidence = (index: number) => ({ page: 1, line_id: pages[0].lines[index].id, text: pages[0].lines[index].text, bbox: pages[0].lines[index].bbox })
  return {
    document_id: 'recognition-fixture-1', filename: 'cv-real.pdf', page_count: pageCount, text: pages.map((page) => page.text).join('\n\n'), pages,
    profile: {
      candidate_name: { value: 'ANA TORRES QUISPE', inferred: true, evidence: evidence(0) },
      emails: [{ value: 'ana.torres@example.com', inferred: false, evidence: evidence(1) }], phones: [], links: [],
      skills: [{ value: 'Microsoft Excel', inferred: false, evidence: evidence(7) }], languages: [],
      sections: [
        { type: 'experience', heading: 'EXPERIENCIA LABORAL', page: 1, column: 'main', text: pages[0].lines[3].text, line_ids: ['p1-l3', 'p1-l4'] },
        { type: 'education', heading: 'EDUCACIÓN', page: 1, column: 'main', text: pages[0].lines[5].text, line_ids: ['p1-l5', 'p1-l6'] },
        { type: 'skills', heading: 'HABILIDADES', page: 1, column: 'main', text: pages[0].lines[7].text, line_ids: ['p1-l7', 'p1-l8'] },
      ],
    },
    engines: { detector: 'yolov8', detector_model: 'yolov8n-doclaynet.pt', ocr: 'tesseract', languages: ['spa', 'eng'], device: 'cpu' },
    warnings: [], processing_seconds: 3.2,
  }
}
