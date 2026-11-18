import type { AppSettings } from './archive'
import { calendarDayDifference, formatLocalCalendarDate } from './calendarDate'
import { resolveExamTargets, type SessionArchive } from './sessione'

export interface ExamReminderPreference { enabled: boolean; every: number; unit: 'days' | 'weeks' }
export interface ExamReminderNotice { id: string; courseCode: string; examDate: string; daysLeft: number; title: string; message: string; day: string; configuration: string }
export interface ExamReminderState {
  version: 1
  receipts: { courseCode: string; configuration: string; day: string; appointmentId?: string }[]
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
export function planExamReminders(settings: Settings, previous: ExamReminderState, now = new Date(), archive?: SessionArchive) {
  const today = formatLocalCalendarDate(now)
  const active = new Set<string>()
  const receipts = [...previous.receipts]
  const due: ExamReminderNotice[] = []
  for (const target of resolveExamTargets(archive, settings)) {
    const { course: courseCode, date: examDate } = target
    const preference = settings.courses?.[courseCode]?.examReminder
    const daysLeft = calendarDayDifference(today, examDate)
    if (!validExamReminderPreference(preference) || !preference.enabled || daysLeft === null || daysLeft < 0) continue
    const appointmentId = target.id === 'legacy' ? undefined : target.id
    const legacyConfiguration = [examDate, preference.every, preference.unit]
    const configuration = JSON.stringify([...legacyConfiguration, ...(appointmentId ? [appointmentId] : [])])
    const key = JSON.stringify([courseCode, configuration])
    active.add(key)
    let index = receipts.findIndex(row => appointmentId
      ? row.appointmentId === appointmentId && row.configuration === configuration
      : row.courseCode === courseCode && !row.appointmentId)
    if (appointmentId && index < 0) index = receipts.findIndex(row =>
      !row.appointmentId && row.courseCode === courseCode && row.configuration === JSON.stringify(legacyConfiguration))
    const last = receipts[index]
    const elapsed = last ? calendarDayDifference(last.day, today) : null
    if (last && (appointmentId || last.configuration === configuration) &&
        (elapsed === null || elapsed < preference.every * (preference.unit === 'weeks' ? 7 : 1))) {
      if (last.configuration !== configuration || last.courseCode !== courseCode)
        receipts[index] = { ...last, courseCode, configuration, appointmentId }
      continue
    }
    const receipt = { courseCode, configuration, day: today, appointmentId }
    if (index >= 0) receipts.splice(index, 1)
    receipts.push(receipt)
    due.push({ courseCode, configuration, day: today, examDate, daysLeft,
      id: JSON.stringify([courseCode, examDate, today, ...(appointmentId ? [appointmentId] : [])]),
      ...content(appointmentId ? `${courseCode} · ${target.label}` : courseCode, daysLeft) })
  }
  const noticeKey = (notice: { courseCode: string; configuration: string }) => JSON.stringify([notice.courseCode, notice.configuration])
  const targets = new Map(resolveExamTargets(archive, settings).filter(row => row.id !== 'legacy').map(row => [row.id, row.label]))
  const replaced = new Set(due.map(noticeKey))
  const notices = previous.notices.filter(notice => active.has(noticeKey(notice)) && !replaced.has(noticeKey(notice))).concat(due).map(notice => {
    const daysLeft = calendarDayDifference(today, notice.examDate)!
    const receipt = receipts.find(receipt => noticeKey(receipt) === noticeKey(notice))
    const label = receipt?.appointmentId ? targets.get(receipt.appointmentId) : undefined
    return { ...notice, daysLeft, ...content(label ? `${notice.courseCode} · ${label}` : notice.courseCode, daysLeft) }
  })
  return { state: { version: 1 as const,
    receipts: receipts.filter(row => row.appointmentId || active.has(noticeKey(row))).slice(-500),
    notices: notices.sort((a, b) => a.examDate.localeCompare(b.examDate)).slice(0, 500) }, due }
}
