import { describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { makeMobileStatistics } from '../../shared/mobileStatistics'
import { decryptMobileStatistics, encryptMobileStatistics } from '../../electron/main/mobileStatisticsCrypto'

describe('Statistiche per telefono', () => {
  it('limita lo storico, mantiene giorni della settimana precedente e conta anche le lezioni in corso', () => {
    const snapshot = makeMobileStatistics({
      streamId: 'a'.repeat(32), revision: 1, generatedAt: '2026-03-02T12:00:00Z', timeZone: 'Europe/Rome', today: '2026-03-02',
      courses: [{ code: 'A' }, { code: 'B' }, { code: 'archived', archived: true }],
      lectures: [
        { courseCode: 'A', studyStatus: 'in-corso' }, { courseCode: 'A', studyStatus: 'da-studiare' },
        { courseCode: 'A', studyStatus: 'completata' }, { courseCode: 'archived', studyStatus: 'da-studiare' }
      ],
      dailyHistory: [
        { date: '2026-02-23', totalSeconds: 100 }, { date: '2026-02-24', totalSeconds: 60 },
        { date: '2026-03-01', totalSeconds: 120 }, { date: '2026-03-02', totalSeconds: 300 },
        { date: '2026-03-03', totalSeconds: 100 }
      ]
    })
    expect(snapshot.courses).toEqual([{ code: 'A', remaining: 2 }, { code: 'B', remaining: 0 }])
    expect(snapshot.days).toEqual([
      { date: '2026-02-24', seconds: 60 }, { date: '2026-03-01', seconds: 120 }, { date: '2026-03-02', seconds: 300 }
    ])
  })

  it('rifiuta dati ambigui o non validi', () => {
    const base = { streamId: 'a'.repeat(32), revision: 1, generatedAt: '2026-11-17T00:00:00Z', timeZone: 'Europe/Rome', today: '2026-11-17', courses: [], lectures: [], dailyHistory: [] }
    expect(() => makeMobileStatistics({ ...base, today: '2026-02-30' })).toThrow()
    expect(() => makeMobileStatistics({ ...base, generatedAt: '2026-11-17T23:30:00Z' })).toThrow('Giorno')
    expect(() => makeMobileStatistics({ ...base, dailyHistory: [{ date: '2026-11-17', totalSeconds: -1 }] })).toThrow()
    expect(() => makeMobileStatistics({ ...base, dailyHistory: [{ date: '2026-11-17', totalSeconds: 10 }, { date: '2026-11-17', totalSeconds: 20 }] })).toThrow()
  })

  it('cifra con nonce nuovo e rileva chiave errata o manomissione', () => {
    const key = randomBytes(32), text = '{"courses":[{"code":"A","remaining":3}]}'
    const first = encryptMobileStatistics(text, key), second = encryptMobileStatistics(text, key)
    expect(first.nonce).not.toEqual(second.nonce)
    expect(JSON.stringify(first)).not.toContain('remaining')
    expect(decryptMobileStatistics(first, key)).toBe(text)
    expect(() => decryptMobileStatistics(first, randomBytes(32))).toThrow()
    const changed = Buffer.from(first.ciphertext, 'base64'); changed[0] ^= 1
    expect(() => decryptMobileStatistics({ ...first, ciphertext: changed.toString('base64') }, key)).toThrow()
  })
})
