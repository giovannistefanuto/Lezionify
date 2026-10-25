import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ArchiveService } from '../../electron/main/archive'
import { formatLocalCalendarDate } from '../../shared/calendarDate'
import {
  effectiveStudySeconds,
  removeStudySeconds,
  studyTimeRemovalTargets
} from '../../shared/studyCorrections'
import type { Lecture, StudySession } from '../../shared/archive'

const today = formatLocalCalendarDate()
const makeSession = (id: string, durationSeconds = 1200): StudySession => ({
  id,
  lectureId: null,
  courseCode: 'TEST',
  durationSeconds,
  startTime: '2026-10-21T09:00:00.000Z',
  endTime: '2026-10-21T10:00:00.000Z',
  mode: 'manual',
  date: today
})

it('sottrae dalle sessioni piu recenti senza alterare durata originale e altri giorni', () => {
  const old = { ...makeSession('old'), endTime: '2026-10-21T09:10:00.000Z' }
  const sessions = [
    old,
    makeSession('new'),
    { ...makeSession('other'), date: '2026-01-01' }
  ]
  const result = removeStudySeconds(
    sessions,
    'today:TEST',
    1500,
    today,
    '2026-10-21T11:00:00.000Z'
  )
  expect(result.map(effectiveStudySeconds)).toEqual([900, 0, 1200])
  expect(result.map((session) => session.durationSeconds)).toEqual([
    1200, 1200, 1200
  ])
  expect(sessions[1].corrections).toBeUndefined()
  expect(() =>
    removeStudySeconds(result, 'today:TEST', 901, today, '')
  ).toThrow('supera')
})

it('identifica l ultima lezione e comprende le sue sessioni su piu giorni', () => {
  const sessions = [
    { ...makeSession('first'), lectureId: 'lesson', date: '2026-10-20' },
    { ...makeSession('second'), lectureId: 'lesson' },
    makeSession('manual')
  ]
  const targets = studyTimeRemovalTargets(
    sessions,
    [{ id: 'lesson', title: 'Titolo' } as Lecture],
    today
  )
  expect(
    targets.find((target) => target.id === 'today:TEST')?.availableSeconds
  ).toBe(2400)
  expect(
    targets.find((target) => target.id === 'lecture:lesson')
  ).toMatchObject({
    availableSeconds: 2400,
    label: expect.stringContaining('Titolo')
  })
  expect(
    studyTimeRemovalTargets([makeSession('manual')], [], today)
  ).toHaveLength(1)
})

describe('rettifiche persistenti con ArchiveService', () => {
  let directory: string
  let service: ArchiveService
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'lezionify-corrections-'))
    service = new ArchiveService(directory)
    await service.initialize()
  })
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  it('conserva la rettifica dopo un nuovo snapshot del timer e dopo riavvio', async () => {
    await service.saveStudySession(makeSession('active'))
    await service.removeStudyTime('today:TEST', 10)
    expect((await service.getStudyAnalytics()).todaySeconds).toBe(600)
    await service.saveStudySession(makeSession('active', 1260))
    service = new ArchiveService(directory)
    await service.initialize()
    expect((await service.getStudyAnalytics()).todaySeconds).toBe(660)
    const sessions = JSON.parse(
      await readFile(join(directory, 'study_sessions.json'), 'utf8')
    )
    expect(sessions[0].durationSeconds).toBe(1260)
    expect(sessions[0].corrections).toEqual([
      { seconds: 600, createdAt: expect.any(String) }
    ])
  })

  it('serializza due rettifiche concorrenti impedendo il totale negativo', async () => {
    await service.saveStudySession(makeSession('one', 600))
    const results = await Promise.allSettled([
      service.removeStudyTime('today:TEST', 6),
      service.removeStudyTime('today:TEST', 6)
    ])
    expect(results.map((result) => result.status).sort()).toEqual([
      'fulfilled',
      'rejected'
    ])
    expect((await service.getStudyAnalytics()).todaySeconds).toBe(240)
  })

  it('rifiuta valori o destinazioni invalidi senza scritture e ignora rettifiche fornite dal renderer', async () => {
    await service.saveStudySession({
      ...makeSession('one'),
      corrections: [{ seconds: 1000, createdAt: '' }]
    })
    expect((await service.getStudyAnalytics()).todaySeconds).toBe(1200)
    await expect(service.removeStudyTime('today:TEST', -1)).rejects.toThrow()
    await expect(service.removeStudyTime('today:TEST', 1.5)).rejects.toThrow()
    await expect(
      service.removeStudyTime('lecture:missing', 1)
    ).rejects.toThrow()
    await expect(service.removeStudyTime('today:TEST', 21)).rejects.toThrow()
    expect((await service.getStudyAnalytics()).todaySeconds).toBe(1200)
  })
})
