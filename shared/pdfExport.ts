export type PdfExportRequest =
  | { kind: 'lecture'; lectureId: string; language: 'it' | 'en' }
  | {
      kind: 'course'
      courseCode: string
      language: 'it' | 'en'
      includeLaboratory?: boolean
      lectureIds?: string[]
    }
export interface PdfExportLecture {
  id: string
  title: string
  date: string
  markdown: string | null
}
export interface PdfExportDocument {
  title: string
  language: 'it' | 'en'
  lectures: PdfExportLecture[]
}
export interface PdfExportResult {
  canceled: boolean
  missingCount: number
}

export function validatePdfExportRequest(value: unknown): PdfExportRequest {
  if (!value || typeof value !== 'object')
    throw new Error('Esportazione PDF non valida.')
  const request = value as PdfExportRequest
  if (request.language !== 'it' && request.language !== 'en')
    throw new Error('Lingua PDF non valida.')
  if (
    request.kind === 'course' &&
    request.includeLaboratory !== undefined &&
    typeof request.includeLaboratory !== 'boolean'
  )
    throw new Error('Opzione laboratorio PDF non valida.')
  if (
    request.kind === 'course' &&
    request.lectureIds !== undefined &&
    (!Array.isArray(request.lectureIds) ||
      !request.lectureIds.length ||
      request.lectureIds.length > 10000 ||
      new Set(request.lectureIds).size !== request.lectureIds.length ||
      request.lectureIds.some(
        (id) => typeof id !== 'string' || !/^[\w-]{1,160}$/.test(id)
      ))
  )
    throw new Error('Selezione delle lezioni PDF non valida.')
  if (
    request.kind === 'lecture' &&
    typeof request.lectureId === 'string' &&
    /^[\w-]{1,160}$/.test(request.lectureId)
  )
    return request
  if (
    request.kind === 'course' &&
    typeof request.courseCode === 'string' &&
    request.courseCode.trim() &&
    request.courseCode.length <= 300
  )
    return request
  throw new Error('Esportazione PDF non valida.')
}

export function pdfExportFileName(
  request: PdfExportRequest,
  document: PdfExportDocument,
  now = new Date()
): string {
  const part = (text: string) =>
    Array.from(text, (character) =>
      character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character)
        ? '_'
        : character
    )
      .join('')
      .replace(/\s+/g, '_')
      .replace(/[. _]+$/, '')
      .slice(0, 120) || 'Dispensa'
  const date =
    request.kind === 'lecture' ? new Date(document.lectures[0].date) : now
  const day = Number.isNaN(date.getTime())
    ? 'Data_non_disponibile'
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `${request.kind === 'lecture' ? 'Lezione' : 'Corso'}_${part(request.kind === 'lecture' ? document.lectures[0].title : request.courseCode)}_${request.language.toUpperCase()}_${day}.pdf`
}
