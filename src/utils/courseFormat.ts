import type { CourseDefinition } from '../../shared/archive'

/**
 * Formatta un identificativo o sigla di corso nel formato "(SIGLA) - Nome Del Corso".
 * - Se il codice corrisponde a una CourseDefinition con nome esteso valorizzato: restituisce "(SIGLA) - Nome Del Corso".
 * - Se la stringa è già nel formato "(SIGLA) - Nome Del Corso": restituisce il formato normalizzato.
 * - Se la stringa è nel formato "SIGLA - Nome Del Corso": la converte in "(SIGLA) - Nome Del Corso".
 * - Se il corso non ha un nome esteso configurato: restituisce "(SIGLA)" per codici/sigle brevi.
 * - Le parole riservate ("tutti", "Senza corso") vengono preservate.
 */
export function formatCourseDisplayName(
  rawCourse: string,
  courses?: CourseDefinition[] | Record<string, CourseDefinition>
): string {
  if (!rawCourse) return 'Senza corso'
  const trimmed = rawCourse.trim()
  if (!trimmed || trimmed === 'Senza corso') return 'Senza corso'
  if (trimmed === 'tutti') return 'Tutte le lezioni'

  // Se è già formattato come "(SIGLA) - Nome Del Corso"
  const alreadyFormattedMatch = trimmed.match(/^\(([^)]+)\)\s*-\s*(.+)$/)
  if (alreadyFormattedMatch) {
    const code = alreadyFormattedMatch[1].trim()
    const name = alreadyFormattedMatch[2].trim()
    return `(${code}) - ${name}`
  }

  // Se è nel formato "SIGLA - Nome Del Corso" (sigla breve <= 10 caratteri)
  const codeDashNameMatch = trimmed.match(/^([A-Za-z0-9_-]{1,10})\s*-\s*(.+)$/)
  if (codeDashNameMatch) {
    const code = codeDashNameMatch[1].trim()
    const name = codeDashNameMatch[2].trim()
    return `(${code}) - ${name}`
  }

  // Cerca la definizione del corso nella configurazione
  const courseList: CourseDefinition[] = Array.isArray(courses)
    ? courses
    : courses && typeof courses === 'object'
      ? Object.values(courses)
      : []

  const upperTrimmed = trimmed.toUpperCase()
  const def = courseList.find(
    (c) =>
      c &&
      typeof c.code === 'string' &&
      c.code.trim().toUpperCase() === upperTrimmed
  )

  if (def) {
    const code = def.code.trim()
    const name = def.name?.trim()
    if (name && name.toUpperCase() !== code.toUpperCase()) {
      return `(${code}) - ${name}`
    }
    return `(${code})`
  }

  // Se non presente nella lista corsi configurati:
  // per codici/sigle brevi (<= 8 caratteri senza spazi) formattiamo come "(SIGLA)"
  if (trimmed.length <= 8 && !trimmed.includes(' ')) {
    return `(${trimmed})`
  }

  return trimmed
}
