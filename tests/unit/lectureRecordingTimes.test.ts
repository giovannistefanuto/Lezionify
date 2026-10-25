import { describe, expect, it } from 'vitest'
import { lectureRecordingTimes } from '../../src/utils/lectureRecordingTimes'

describe('recording times shown in lecture info', () => {
  it('calculates actual audio end from start and duration', () => {
    const times = lectureRecordingTimes({
      recordedAt: '2026-10-21T10:32:00',
      durationSeconds: 6360
    })
    expect(times.startLabel).toBe('10:32')
    expect(times.endLabel).toBe('12:18')
  })
  it('shows the end date when audio crosses midnight', () => {
    const times = lectureRecordingTimes({
      recordedAt: '2026-10-21T23:40:00',
      durationSeconds: 2400
    })
    expect(times.endLabel).toBe('00:20 · 22/10/2026')
  })
  it.each([null, 'invalid', '2026-10-21'])(
    'does not invent start or end for %s',
    (recordedAt) => {
      const times = lectureRecordingTimes({ recordedAt, durationSeconds: 1800 })
      expect(times.startLabel).toBe('Non disponibile')
      expect(times.endLabel).toBe('Non disponibile')
    }
  )
  it.each([undefined, -1, NaN, Infinity, Number.MAX_VALUE])(
    'keeps start but no end for unusable duration %s',
    (durationSeconds) => {
      const times = lectureRecordingTimes({
        recordedAt: '2026-10-21T10:32:00',
        durationSeconds
      })
      expect(times.startLabel).toBe('10:32')
      expect(times.endLabel).toBe('Non disponibile')
    }
  )
  it('accepts an explicitly known zero duration', () => {
    const times = lectureRecordingTimes({
      recordedAt: '2026-10-21T10:32:00',
      durationSeconds: 0
    })
    expect(times.endLabel).toBe('10:32')
  })
})
