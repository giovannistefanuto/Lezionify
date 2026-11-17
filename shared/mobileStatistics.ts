/** Portable, minimal statistics exchanged with the Android companion. */
export interface MobileStatistics {
  version: 1
  streamId: string
  revision: number
  generatedAt: string
  timeZone: string
  /** Calendar days in the desktop time zone; absent days carry no recorded study. */
  days: Array<{ date: string; seconds: number }>
  courses: Array<{ code: string; remaining: number }>
}

type CourseInput = { code: string; archived?: boolean }
type LectureInput = { courseCode: string | null; studyStatus: string }
type DayInput = { date: string; totalSeconds: number }

function calendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** The window includes the whole current month and the preceding seven days. */
export function makeMobileStatistics(input: {
  streamId: string
  revision: number
  generatedAt: string
  timeZone: string
  today: string
  courses: CourseInput[]
  lectures: LectureInput[]
  dailyHistory: DayInput[]
}): MobileStatistics {
  if (!/^[a-f0-9]{32}$/.test(input.streamId) || !Number.isSafeInteger(input.revision) || input.revision < 1) throw new Error('Identita non valida')
  if (!calendarDate(input.today) || !Number.isFinite(Date.parse(input.generatedAt))) throw new Error('Data non valida')
  let generatedDay: string
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: input.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    const parts = formatter.formatToParts(new Date(input.generatedAt))
    generatedDay = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-')
  } catch { throw new Error('Fuso non valido') }
  if (generatedDay !== input.today) throw new Error('Giorno di riferimento non coerente')
  const firstOfMonth = `${input.today.slice(0, 7)}-01`
  const sevenDaysAgo = new Date(`${input.today}T00:00:00Z`)
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)
  const earliest = [firstOfMonth, sevenDaysAgo.toISOString().slice(0, 10)].sort()[0]
  const seen = new Set<string>()
  const days = input.dailyHistory.filter(day => day.date >= earliest && day.date <= input.today).map(day => {
    if (!calendarDate(day.date) || !Number.isSafeInteger(day.totalSeconds) || day.totalSeconds < 0 || seen.has(day.date)) throw new Error('Storico non valido')
    seen.add(day.date)
    return { date: day.date, seconds: day.totalSeconds }
  }).sort((a, b) => a.date.localeCompare(b.date))
  const codes = new Set<string>()
  if (input.courses.filter(course => !course.archived).length > 200) throw new Error('Troppi corsi')
  const courses = input.courses.filter(course => !course.archived).map(course => {
    if (!course.code || course.code.length > 200 || codes.has(course.code)) throw new Error('Corso non valido')
    codes.add(course.code)
    return { code: course.code, remaining: input.lectures.filter(lecture => lecture.courseCode === course.code && lecture.studyStatus !== 'completata').length }
  })
  return { version: 1, streamId: input.streamId, revision: input.revision, generatedAt: new Date(input.generatedAt).toISOString(), timeZone: input.timeZone, days, courses }
}
