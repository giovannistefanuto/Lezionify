import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AppSettings, CourseDefinition } from '../../shared/archive'
import { emptyExamReminderState, planExamReminders, validExamReminderPreference } from '../../shared/examReminders'
import { ExamReminderService } from '../../electron/main/examReminders'

const course = (overrides: Partial<CourseDefinition> = {}): CourseDefinition => ({ code: 'TEST', cfu: 6, lectureHours: 42, individualStudyHours: 108, totalHours: 150, startDate: '2026-09-01', endDate: '2026-12-31', schedule: [], examDate: '2026-12-20', examReminder: { enabled: true, every: 1, unit: 'weeks' }, ...overrides })
const settings = (courses = [course()]): AppSettings => ({ courses: Object.fromEntries(courses.map(c => [c.code, c])), archivedCourseCodes: [] }) as unknown as AppSettings
const now = (day: string) => new Date(day + 'T10:00:00')
const directories: string[] = []
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

describe('exam reminder calendar policy', () => {
  it('opts in per course and does not activate legacy courses', () => {
    expect(planExamReminders(settings([course({ examReminder: undefined })]), emptyExamReminderState(), now('2026-11-17')).due).toEqual([])
    const result = planExamReminders(settings(), emptyExamReminderState(), now('2026-11-17'))
    expect(result.due[0].daysLeft).toBe(33)
    expect(result.due[0].message).toContain('Mancano 33 giorni')
  })
  it('deduplicates same day and weeks, catches up once after absence', () => {
    const first = planExamReminders(settings(), emptyExamReminderState(), now('2026-11-17'))
    expect(planExamReminders(settings(), first.state, now('2026-11-17')).due).toEqual([])
    expect(planExamReminders(settings(), first.state, now('2026-11-23')).due).toEqual([])
    expect(planExamReminders(settings(), first.state, now('2026-11-24')).due).toHaveLength(1)
    expect(planExamReminders(settings(), first.state, now('2026-12-15')).due).toHaveLength(1)
  })
  it('uses calendar days across DST, and refreshes pending countdown without notification', () => {
    const config = settings([course({ examReminder: { enabled: true, every: 3, unit: 'days' } })])
    const first = planExamReminders(config, emptyExamReminderState(), now('2026-10-24'))
    const second = planExamReminders(config, first.state, now('2026-10-25'))
    expect(second.due).toEqual([])
    expect(second.state.notices[0].daysLeft).toBe(first.due[0].daysLeft - 1)
    expect(planExamReminders(config, first.state, now('2026-10-27')).due).toHaveLength(1)
  })
  it('keeps two exams independent and suppresses archived, disabled and past courses', () => {
    const config = settings([course(), course({ code: 'SECOND' })])
    expect(planExamReminders(config, emptyExamReminderState(), now('2026-11-17')).due).toHaveLength(2)
    config.archivedCourseCodes = ['TEST']
    config.courses!.SECOND.examReminder!.enabled = false
    expect(planExamReminders(config, emptyExamReminderState(), now('2026-11-17')).due).toEqual([])
    expect(planExamReminders(settings(), emptyExamReminderState(), now('2026-12-21')).due).toEqual([])
  })
  it('handles today, changed date, deleted course and reactivation without stale notices', () => {
    expect(planExamReminders(settings(), emptyExamReminderState(), now('2026-12-20')).due[0].title).toContain('Oggi')
    const first = planExamReminders(settings(), emptyExamReminderState(), now('2026-11-17'))
    const changed = planExamReminders(settings([course({ examDate: '2026-12-21' })]), first.state, now('2026-11-18'))
    expect(changed.due).toHaveLength(1)
    expect(changed.state.notices[0].examDate).toBe('2026-12-21')
    expect(planExamReminders(settings([]), first.state, now('2026-11-18')).state).toEqual(emptyExamReminderState())
    const disabled = planExamReminders(settings([course({ examReminder: { enabled: false, every: 1, unit: 'weeks' } })]), first.state, now('2026-11-18'))
    expect(disabled.state).toEqual(emptyExamReminderState())
    expect(planExamReminders(settings(), disabled.state, now('2026-11-18')).due).toHaveLength(1)
  })
  it('rejects impossible dates, invalid frequencies and backwards-clock replays', () => {
    for (const value of [null, { enabled: true, every: 0, unit: 'days' }, { enabled: true, every: 1.5, unit: 'days' }, { enabled: true, every: 53, unit: 'weeks' }, { enabled: true, every: Infinity, unit: 'days' }]) expect(validExamReminderPreference(value)).toBe(false)
    expect(planExamReminders(settings([course({ examDate: '2026-02-30' })]), emptyExamReminderState(), now('2026-01-01')).due).toEqual([])
    const first = planExamReminders(settings(), emptyExamReminderState(), now('2026-11-17'))
    expect(planExamReminders(settings(), first.state, now('2026-11-16')).due).toEqual([])
  })
})

describe('durable notification delivery', () => {
  async function fixture() { const root = await mkdtemp(join(tmpdir(), 'exam-reminders-')); directories.push(root); return join(root, 'reminders.json') }
  it('serializes concurrent polls, survives restart and dismisses without new notifications', async () => {
    const file = await fixture(), notify = vi.fn()
    const service = new ExamReminderService(file, async () => settings(), notify, () => now('2026-11-17'))
    await Promise.all([service.poll(), service.poll(), service.poll()])
    expect(notify).toHaveBeenCalledTimes(1)
    const restarted = new ExamReminderService(file, async () => settings(), notify, () => now('2026-11-17'))
    const notices = await restarted.poll()
    await restarted.dismiss(notices[0].id)
    expect(await restarted.poll()).toEqual([])
    expect(notify).toHaveBeenCalledTimes(1)
    expect(JSON.parse(await readFile(file, 'utf8')).receipts).toHaveLength(1)
  })
  it('keeps an in-app notice if desktop notifications are unavailable', async () => {
    const file = await fixture()
    const service = new ExamReminderService(file, async () => settings(), () => { throw new Error('OS unavailable') }, () => now('2026-11-17'))
    expect(await service.poll()).toHaveLength(1)
    expect(await service.poll()).toHaveLength(1)
  })
  it('does not notify when storage is corrupt or cannot be persisted', async () => {
    const file = await fixture(), notify = vi.fn()
    await writeFile(file, '{invalid')
    const service = new ExamReminderService(file, async () => settings(), notify, () => now('2026-11-17'))
    await expect(service.poll()).rejects.toThrow()
    expect(notify).not.toHaveBeenCalled()
  })
  it('preserves the no-delivery guarantee when its directory is not writable as a directory', async () => {
    const file = await fixture(), notify = vi.fn()
    await writeFile(file, 'This is a file, not a directory')
    const service = new ExamReminderService(join(file, 'nested.json'), async () => settings(), notify, () => now('2026-11-17'))
    await expect(service.poll()).rejects.toThrow()
    expect(notify).not.toHaveBeenCalled()
  })
})
