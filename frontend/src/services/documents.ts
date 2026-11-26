import type { CvDocument } from '../types'

export const MAX_FILE_SIZE = 15 * 1024 * 1024

export function validateFileBasics(file: Pick<File, 'name' | 'size' | 'type'>) {
  if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) throw new Error('Formato no admitido. Selecciona un PDF, JPG, JPEG o PNG.')
  if (file.size === 0) throw new Error('El archivo está vacío. Selecciona otro documento.')
  if (file.size > MAX_FILE_SIZE) throw new Error('El archivo supera el límite de 15 MB.')
  const extension = file.name.split('.').pop()?.toLowerCase()
  const expected = extension === 'pdf' ? 'application/pdf' : extension === 'png' ? 'image/png' : 'image/jpeg'
  if (file.type && file.type !== expected) throw new Error('El contenido del archivo no corresponde a su extensión.')
}

export async function prepareDocument(file: File): Promise<CvDocument> {
  validateFileBasics(file)
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const pdf = /\.pdf$/i.test(file.name)
  let pages = 1
  if (pdf) {
    if (String.fromCharCode(...header.slice(0, 5)) !== '%PDF-') throw new Error('El archivo no contiene un PDF válido.')
    const { openPdf } = await import('./pdf')
    const task = openPdf(await file.arrayBuffer())
    try {
      const document = await task.promise
      pages = document.numPages
    } catch {
      throw new Error('No se pudo abrir el PDF. Comprueba que no esté dañado ni protegido con contraseña.')
    } finally { await task.destroy() }
  } else {
    const isPng = header[0] === 137 && header[1] === 80 && header[2] === 78 && header[3] === 71
    const isJpeg = header[0] === 255 && header[1] === 216 && header[2] === 255
    if (/\.png$/i.test(file.name) ? !isPng : !isJpeg) throw new Error('La imagen no corresponde al formato indicado.')
    try {
      const bitmap = await createImageBitmap(file)
      bitmap.close()
    } catch { throw new Error('La imagen está dañada o no se puede abrir.') }
  }
  return { id: crypto.randomUUID(), name: file.name, size: file.size, kind: pdf ? 'pdf' : 'image', pages, file }
}

export function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
