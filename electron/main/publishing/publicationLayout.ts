import type { CourseDefinition, Lecture } from '../../../shared/archive'
import { PublishingError } from './publishGitClient'
import { sanitizeDirName } from './readmeGenerator'

/** Human-readable paths; ambiguous names fail before any output is written. */
export function publicationPaths(lectures: Lecture[], courses: Record<string, CourseDefinition>): Map<string, string> {
  const owners = new Map<string, string>()
  const days = new Map<string, Lecture[]>()
  for (const lecture of lectures) {
    const code = lecture.courseCode!
    const course = sanitizeDirName(courses[code]?.name || code)
    const key = course.toLocaleLowerCase('en-US')
    if (owners.has(key) && owners.get(key) !== code) {
      throw new PublishingError('Due corsi hanno lo stesso nome pubblico. Assegna nomi distinti ai corsi nelle Impostazioni.')
    }
    owners.set(key, code)
    const day = `${course}/${lecture.recordedAt!.slice(0, 10)}`
    days.set(day, [...(days.get(day) ?? []), lecture])
  }
  const result = new Map<string, string>()
  for (const [day, lessons] of days) {
    const names = new Set<string>()
    for (const lecture of lessons) {
      const time = /T(\d{2}):(\d{2})/.exec(lecture.recordedAt!)
      const title = sanitizeDirName(lecture.title?.trim() || (time ? `Lezione delle ${time[1]}-${time[2]}` : 'Lezione'))
      const relative = lessons.length === 1 ? day : `${day}/${title}`
      const key = relative.toLocaleLowerCase('en-US')
      if (names.has(key)) {
        throw new PublishingError('Più lezioni dello stesso corso e giorno hanno lo stesso titolo pubblico. Assegna titoli distinti alle lezioni.')
      }
      names.add(key)
      result.set(lecture.id, relative)
    }
  }
  return result
}
