import { describe, expect, it } from 'vitest'
import { getSessionWeekRows, getSessionWindow, shiftSessionMonth } from '../../src/components/sessione/sessionCalendarDates'

describe('Sessione calendar', () => {
  it('builds Monday-first rows and leap days', () => {
    const weeks = getSessionWeekRows('2028-02-25')
    expect(weeks[0]).toEqual([null, '2028-02-01', '2028-02-02', '2028-02-03', '2028-02-04', '2028-02-05', '2028-02-06'])
    expect(weeks.at(-1)).toContain('2028-02-29')
    expect(getSessionWeekRows('2027-02-03').flat().filter(Boolean)).toHaveLength(28)
  })
  it('opens four months only when the fourth contains exams, and keeps out-of-window dates reachable', () => {
    expect(getSessionWindow('2026-11-29', ['2026-10-01', '2027-03-09'])).toEqual({
      months: ['2026-11-01', '2026-12-01', '2027-01-01'], earlier: '2026-10-01', later: '2027-03-09'
    })
    expect(getSessionWindow('2026-11-29', ['2027-02-12']).months.at(-1)).toBe('2027-02-01')
    expect(shiftSessionMonth('2026-12-31', 1)).toBe('2027-01-01')
  })
})
