import { describe, it, expect } from 'vitest'
import { calculateStudyPeriods } from '../../src/utils/studyPeriods'
import type { StudyDay } from '../../shared/studyHistory'

describe('fasce di studio', () => {
  const day = { timeZone: 'Europe/Rome', segments: [{ start: '2026-11-13T11:30:00Z', end: '2026-11-13T12:30:00Z', creditedSeconds: 3600 }], credits: [] } as unknown as StudyDay
  it('ripartisce una sessione a cavallo delle 13 locali', () => {
    expect(calculateStudyPeriods(day, '2026-11-13', '13:00')).toEqual({ morning: 1800, afternoon: 1800 })
    expect(calculateStudyPeriods(day, '2026-11-13', '14:00')).toEqual({ morning: 3600, afternoon: 0 })
  })
  it('non colloca arbitrariamente una rettifica', () => {
    expect(calculateStudyPeriods({ ...day, credits: [{ correctionSeconds: 20 }] } as StudyDay, '2026-11-13', '13:00')).toBeNull()
  })
})
