import { describe, expect, it } from 'vitest'
import { formatExamPace } from '../../src/utils/examPace'

describe('ritmo di studio leggibile', () => {
  it('mantiene visibile un carico piccolo e non nullo', () => {
    expect(formatExamPace(2, 86)).toBe('2 lezioni in 86 giorni')
    expect(formatExamPace(1, 86)).toBe('1 lezione in 86 giorni')
    expect(formatExamPace(2, 4)).toBe('2 lezioni in 4 giorni')
  })
  it('distingue completamento, carichi giornalieri e scadenze raggiunte', () => {
    expect(formatExamPace(0, 86)).toBe('Lezioni completate')
    expect(formatExamPace(-1, 86)).toBe('Lezioni completate')
    expect(formatExamPace(4, 2)).toBe('2 lez/giorno')
    expect(formatExamPace(5, 2)).toBe('2,5 lez/giorno')
    expect(formatExamPace(2, 0)).toBe('2 lez/giorno')
  })
})
