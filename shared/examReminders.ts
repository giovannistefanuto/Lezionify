import type { AppSettings } from './archive'
import { calendarDayDifference, formatLocalCalendarDate } from './calendarDate'

export interface ExamReminderPreference { enabled: boolean; every: number; unit: 'days' | 'weeks' }
export interface ExamReminderNotice { id: string; courseCode: string; examDate: string; daysLeft: number; title: string; message: string; day: string; configuration: string }
export interface ExamReminderState {
  version: 1
  receipts: { courseCode: string; configuration: string; day: string }[]
  notices: ExamReminderNotice[]
}
export const emptyExamReminderState = (): ExamReminderState => ({ version: 1, receipts: [], notices: [] })
export function validExamReminderPreference(value: unknown): value is ExamReminderPreference {
  if (!value || typeof value !== 'object') return false
  const p = value as ExamReminderPreference
  return typeof p.enabled === 'boolean' && (p.unit === 'days' || p.unit === 'weeks') &&
    Number.isInteger(p.every) && p.every >= 1 && p.every <= (p.unit === 'weeks' ? 52 : 365)
}
type Settings = Pick<AppSettings, 'courses' | 'courseConfigs' | 'archivedCourseCodes'>
function content(courseCode: string, daysLeft: number) {
  return {
    title: daysLeft === 0 ? `Oggi: esame di ${courseCode}` : `Esame di ${courseCode}: ${daysLeft} ${daysLeft === 1 ? 'giorno' : 'giorni'}`,
    message: daysLeft === 0 ? 'Il tuo esame è oggi. Rivedi con calma i punti essenziali e prepara ciò che ti serve.' : `Mancano ${daysLeft} ${daysLeft === 1 ? 'giorno' : 'giorni'} all’esame. Scegli un prossimo passo concreto per il ripasso, un argomento alla volta.`
  }
}
/** Calendar days rather than elapsed milliseconds keep the cadence stable across DST. */
export function planExamReminders(settings: Settings, previous: ExamReminderState, now = new Date()) {
  const today = formatLocalCalendarDate(now)
  const archived = new Set(settings.archivedCourseCodes ?? [])
  const active = new Map<string, string>()
  const receipts = [...previous.receipts]
  const due: ExamReminderNotice[] = []
  for (const course of Object.values(settings.courses ?? {})) {
    const preference = course.examReminder
    const examDate = course.examDate || settings.courseConfigs?.[course.code]?.examDate
    const daysLeft = examDate ? calendarDayDifference(today, examDate) : null
    if (archived.has(course.code) || !validExamReminderPreference(preference) || !preference.enabled || daysLeft === null || daysLeft < 0 || !examDate) continue
    const configuration = JSON.stringify([examDate, preference.every, preference.unit])
    active.set(course.code, configuration)
    const index = receipts.findIndex(row => row.courseCode === course.code)
    const last = receipts[index]
    const elapsed = last ? calendarDayDifference(last.day, today) : null
    if (last?.configuration === configuration && (elapsed === null || elapsed < preference.every * (preference.unit === 'weeks' ? 7 : 1))) continue
    const receipt = { courseCode: course.code, configuration, day: today }
    if (index < 0) receipts.push(receipt); else receipts[index] = receipt
    due.push({ ...receipt, examDate, daysLeft, id: JSON.stringify([course.code, examDate, today]), ...content(course.code, daysLeft) })
  }
  const replaced = new Set(due.map(notice => notice.courseCode))
  const notices = previous.notices.filter(notice => active.get(notice.courseCode) === notice.configuration && !replaced.has(notice.courseCode)).concat(due).map(notice => {
    const daysLeft = calendarDayDifference(today, notice.examDate)!
    return { ...notice, daysLeft, ...content(notice.courseCode, daysLeft) }
  })
  return { state: { version: 1 as const, receipts: receipts.filter(row => active.has(row.courseCode)), notices }, due }
}
