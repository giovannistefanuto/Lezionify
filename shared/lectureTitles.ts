import type { Lecture, LectureTitleUpdates } from './archive'

function headingLine(markdown: string): { start: number; end: number; text: string } | null {
  let offset = 0
  let fence: { marker: string; length: number } | null = null
  for (const line of markdown.split(/\n/)) {
    const clean = line.replace(/\r$/, '')
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(clean)
    if (marker) {
      if (!fence) fence = { marker: marker[1][0], length: marker[1].length }
      else if (marker[1][0] === fence.marker && marker[1].length >= fence.length && !marker[2].trim()) fence = null
    } else if (!fence) {
      const heading = /^ {0,3}#[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(clean)
      if (heading) return { start: offset, end: offset + clean.length, text: heading[1] }
    }
    offset += line.length + 1
  }
  return null
}

export function extractLectureTitle(markdown: string | null | undefined): string | null {
  if (!markdown) return null
  const heading = headingLine(markdown)
  return heading?.text.replace(/(?<!\\)[*_`]/g, '').replace(/\\([\\`*_{}[\]()<>#!|~])/g, '$1').trim() || null
}

/** Edit only the first real H1; leave all other content and line endings intact. */
export function replaceLectureTitle(markdown: string, title: string): string {
  const escaped = title.replace(/[\\`*_{}[\]()<>#!|~]/g, '\\$&')
  const heading = headingLine(markdown)
  if (heading) return markdown.slice(0, heading.start) + '# ' + escaped + markdown.slice(heading.end)
  const newline = markdown.includes('\r\n') ? '\r\n' : '\n'
  return '# ' + escaped + newline + newline + markdown
}

export function lectureTitle(lecture: Lecture, language: 'it' | 'en', markdown?: string | null): string | null {
  return lecture.titleOverrides?.[language] ||
    (language === 'en' ? extractLectureTitle(markdown) : lecture.title?.trim()) ||
    extractLectureTitle(markdown) || lecture.title?.trim() || null
}

export function validateLectureTitles(value: unknown): asserts value is LectureTitleUpdates {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.keys(value).length ||
    Object.entries(value).some(([key, title]) => !['it', 'en'].includes(key) || typeof title !== 'string' ||
      !title.trim() || title.length > 500 || Array.from(title).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) {
    throw new Error('Titoli lezione non validi. Usa da 1 a 500 caratteri su una sola riga.')
  }
}
