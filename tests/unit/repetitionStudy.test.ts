import { expect, test } from 'vitest'
import { repetitionRecordingCredits } from '../../shared/repetitionStudy'

test('splits actual recorder duration across local midnight without losing seconds', () => {
  const sessions = repetitionRecordingCredits('a'.repeat(64), '2026-11-04T23:59:30', 120)
  expect(sessions.map(item => [item.date, item.durationSeconds])).toEqual([['2026-11-04', 30], ['2026-11-05', 90]])
  expect(sessions[0].endTime).toBe(sessions[1].startTime)
  expect(sessions[0].id).not.toBe(sessions[1].id)
})

test('retains total duration at calendar boundaries and rejects invalid metadata', () => {
  for (const start of ['2026-03-29T00:00:00', '2026-10-25T00:00:00', '2026-12-31T23:59:59']) {
    const sessions = repetitionRecordingCredits('b'.repeat(64), start, 90000)
    expect(sessions.reduce((sum, item) => sum + item.durationSeconds, 0)).toBe(90000)
    expect(sessions.every(item => item.durationSeconds > 0)).toBe(true)
  }
  expect(() => repetitionRecordingCredits('x', '2026-11-04', 20)).toThrow()
  expect(() => repetitionRecordingCredits('a'.repeat(64), 'invalid', 20)).toThrow()
  expect(() => repetitionRecordingCredits('a'.repeat(64), '2026-11-04', Infinity)).toThrow()
})
