import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { atomicWrite, readRecoverable } from './atomicFile'
import { AsyncMutex } from './asyncMutex'
import { parseLocalCalendarDate } from '../../shared/calendarDate'
import type { AppSettings } from '../../shared/archive'
import type { SessionArchive } from '../../shared/sessione'
import { emptyExamReminderState, planExamReminders, type ExamReminderNotice, type ExamReminderState } from '../../shared/examReminders'

export class ExamReminderService {
  private mutex = new AsyncMutex()
  constructor(private file: string, private settings: () => Promise<AppSettings>, private notify: (notice: ExamReminderNotice) => void,
    private now = () => new Date(), private sessione?: () => Promise<SessionArchive>) {}
  private async read(): Promise<ExamReminderState> {
    try {
      const state = JSON.parse(await readRecoverable(this.file)) as ExamReminderState
      if (state.version !== 1 || !Array.isArray(state.receipts) || !Array.isArray(state.notices) || state.receipts.length > 500 || state.notices.length > 500 ||
        state.receipts.some(row => !row || typeof row.courseCode !== 'string' || typeof row.configuration !== 'string' || typeof row.day !== 'string' || !parseLocalCalendarDate(row.day)) ||
        state.notices.some(row => !row || typeof row.id !== 'string' || typeof row.title !== 'string' || typeof row.message !== 'string' || typeof row.courseCode !== 'string' || typeof row.configuration !== 'string' || typeof row.examDate !== 'string' || !parseLocalCalendarDate(row.examDate))) throw new Error('Registro promemoria non valido.')
      return state
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyExamReminderState()
      throw error
    }
  }
  async poll() {
    return this.mutex.runExclusive(async () => {
      const previous = await this.read()
      const [settings, sessione] = await Promise.all([this.settings(), this.sessione?.()])
      const result = planExamReminders(settings, previous, this.now(), sessione)
      if (JSON.stringify(previous) !== JSON.stringify(result.state)) {
        await mkdir(dirname(this.file), { recursive: true })
        // Persist before delivery: restart cannot produce a storm of duplicate notifications.
        await atomicWrite(this.file, JSON.stringify(result.state))
      }
      for (const notice of result.due) { try { this.notify(notice) } catch { /* The same notice remains available in the app. */ } }
      return result.state.notices
    })
  }
  async dismiss(id: unknown) {
    if (typeof id !== 'string' || id.length > 1000) throw new Error('Promemoria non valido.')
    await this.mutex.runExclusive(async () => {
      const state = await this.read()
      state.notices = state.notices.filter(notice => notice.id !== id)
      await mkdir(dirname(this.file), { recursive: true })
      await atomicWrite(this.file, JSON.stringify(state))
    })
  }
}
