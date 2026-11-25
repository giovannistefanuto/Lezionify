import type { CourseDefinition } from '../../shared/archive'
import { describe, expect, it } from 'vitest'
import { formatExamPace, futureExamLectures } from '../../src/utils/examPace'

describe('ritmo di studio leggibile', () => {
  it('mantiene visibile un carico piccolo e non nullo', () => {
    expect(formatExamPace(2, 86)).toBe('0,0233 lez/giorno')
    expect(formatExamPace(1, 86)).toBe('0,0116 lez/giorno')
    expect(formatExamPace(2, 4)).toBe('0,5 lez/giorno')
  })
  it('distingue completamento, carichi giornalieri e scadenze raggiunte', () => {
    expect(formatExamPace(0, 86)).toBe('Lezioni completate')
    expect(formatExamPace(-1, 86)).toBe('Lezioni completate')
    expect(formatExamPace(4, 2)).toBe('2 lez/giorno')
    expect(formatExamPace(5, 2)).toBe('2,5 lez/giorno')
    expect(formatExamPace(2, 0)).toBe('2 lez/giorno')
  })
})

it('conta orario futuro e laboratori entro il corso e prima dell’esame senza duplicati', () => {
  const course = { startDate: '2026-11-01', endDate: '2026-12-02', schedule: [
    { dayOfWeek: 3, startTime: '10:00' }, { dayOfWeek: 5, startTime: '10:00' }
  ], laboratorySchedule: { dates: [
    { date: '2026-11-27', startTime: '10:00' }, { date: '2026-11-27', startTime: '14:00' },
    { date: '2026-12-10', startTime: '10:00' }
  ] } } as CourseDefinition
  expect(futureExamLectures(course, '2026-11-25', '2026-12-02')).toBe(2)
  expect(futureExamLectures(course, '2026-11-25', '2026-12-20')).toBe(3)
  expect(futureExamLectures(course, '2026-12-03', '2026-12-20')).toBe(0)
  expect(futureExamLectures(undefined, '2026-11-25', '2026-12-20')).toBe(0)
})
it('mantiene la precisione richiesta e non mostra zero per un rapporto positivo', () => {
  expect(formatExamPace(1, 10000)).toBe('0,0001 lez/giorno')
  expect(formatExamPace(1, 100000)).toBe('< 0,0001 lez/giorno')
  expect(formatExamPace(5, 3)).toBe('1,6667 lez/giorno')
})
