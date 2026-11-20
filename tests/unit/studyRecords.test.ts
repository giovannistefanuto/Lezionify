import { describe, expect, it } from 'vitest'
import { studyRecords } from '../../shared/studyRecords'

describe('record di studio dal calendario locale', () => {
  it('richiede 10 minuti, conserva ieri finché oggi è incompleto e ignora il futuro', () => {
    const totals = new Map([['2026-11-17', 600], ['2026-11-18', 601], ['2026-11-19', 600], ['2026-11-20', 599], ['2026-11-21', 99999]])
    const result = studyRecords(totals, '2026-11-20')
    expect(result.currentStreakDays).toBe(3)
    expect(result.records.bestStreak).toEqual({ start: '2026-11-17', end: '2026-11-19', days: 3 })
    expect(result.records.bestDay).toEqual({ date: '2026-11-18', seconds: 601 })
    totals.set('2026-11-20', 600)
    expect(studyRecords(totals, '2026-11-20').currentStreakDays).toBe(4)
    totals.set('2026-11-19', 599)
    expect(studyRecords(totals, '2026-11-20').currentStreakDays).toBe(1)
  })
  it('usa settimane lunedì-domenica e giorni consecutivi durante il cambio ora', () => {
    const result = studyRecords(new Map([['2026-10-24',600], ['2026-10-25',600], ['2026-10-26',601]]), '2026-10-26')
    expect(result.currentStreakDays).toBe(3)
    expect(result.records.bestWeek).toEqual({ date: '2026-10-19', seconds: 1200 })
  })
  it('interrompe la serie nei giorni mancanti e mantiene la prima data in parità', () => {
    const result = studyRecords(new Map([['2026-11-01',600], ['2026-11-03',600]]), '2026-11-04')
    expect(result.currentStreakDays).toBe(1)
    expect(result.records.bestDay?.date).toBe('2026-11-01')
    expect(result.records.bestStreak?.days).toBe(1)
    expect(studyRecords(new Map(), '2026-11-20').records.bestDay).toBeNull()
  })
})
