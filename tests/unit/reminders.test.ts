import { beforeEach, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ArchiveService } from '../../electron/main/archive'
import type { Reminder } from '../../shared/archive'
import {
  formatReminderDuration,
  getNearestReminder,
  getReminderRemainingSeconds,
  isReminderDue
} from '../../shared/reminders'

let root = ''

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'lezionify-reminders-'))
})

function timer(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'timer-1',
    kind: 'timer',
    label: 'Pausa',
    createdAt: '2026-09-07T09:00:00.000Z',
    status: 'active',
    dueAt: '2026-09-07T09:05:00.000Z',
    durationSeconds: 300,
    ...overrides
  }
}

it('calcola il timer da un istante assoluto, anche dopo sospensione', () => {
  const reminder = timer()
  expect(
    getReminderRemainingSeconds(reminder, Date.parse('2026-09-07T09:03:01Z'))
  ).toBe(119)
  expect(isReminderDue(reminder, Date.parse('2026-09-07T09:05:00Z'))).toBe(true)
  expect(isReminderDue(reminder, Date.parse('2026-09-07T10:00:00Z'))).toBe(true)
})

it('mantiene il residuo di un timer in pausa e formatta le durate', () => {
  const paused = timer({
    status: 'paused',
    dueAt: undefined,
    remainingSeconds: 65
  })
  expect(getReminderRemainingSeconds(paused, Date.now() + 86400000)).toBe(65)
  expect(isReminderDue(paused, Date.now() + 86400000)).toBe(false)
  expect(formatReminderDuration(65)).toBe('1:05')
  expect(formatReminderDuration(3661)).toBe('1:01:01')
})

it('seleziona il promemoria attivo più vicino', () => {
  const first = timer({ id: 'first', dueAt: '2026-09-07T11:00:00.000Z' })
  const nearest = timer({ id: 'nearest', dueAt: '2026-09-07T10:00:00.000Z' })
  const paused = timer({ id: 'paused', status: 'paused', dueAt: undefined })
  expect(getNearestReminder([first, paused, nearest])?.id).toBe('nearest')
})

it('persiste i promemoria localmente e rifiuta dati non validi', async () => {
  const archive = new ArchiveService(root)
  await archive.initialize()
  const alarm: Reminder = {
    id: 'alarm-1',
    kind: 'alarm',
    label: 'Ripasso',
    createdAt: '2026-09-07T09:00:00.000Z',
    status: 'active',
    dueAt: '2026-09-07T10:00:00.000Z'
  }
  await archive.saveReminders([alarm])
  expect(await archive.getReminders()).toEqual([alarm])
  await expect(
    archive.saveReminders([{ ...alarm, kind: 'invalid' } as Reminder])
  ).rejects.toThrow('promemoria')
  await rm(root, { recursive: true, force: true })
})
