import type { Evaluation } from '../types'
import { evaluationText } from './evaluation'

export async function exportReport(evaluation: Evaluation) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF()
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor('#0b1c30')
  const text = evaluationText(evaluation).replaceAll('·', ' | ').replaceAll('“', '"').replaceAll('”', '"')
  const lines = pdf.splitTextToSize(text, 174) as string[]
  let y = 22
  for (const line of lines) {
    if (y > 275) { pdf.addPage(); y = 22 }
    pdf.text(line, 18, y)
    y += 6
  }
  const total = pdf.getNumberOfPages()
  for (let page = 1; page <= total; page++) {
    pdf.setPage(page)
    pdf.setFontSize(9)
    pdf.setTextColor('#565e74')
    pdf.text(`Talent Intelligence | ${page} / ${total}`, 18, 288)
  }
  pdf.save(`Dictamen_${evaluation.documentName.replace(/\.[^.]+$/, '')}.pdf`)
}
