import { describe, expect, it } from 'vitest'
import {
  estimateStudyMinutes,
  newStudyEstimate,
  restoreStudyEstimate,
  sampleStudy,
  studyEstimateLabel
} from '../../src/utils/studyEstimate'

function studyBins(count: number, seconds = 60) {
  let state = newStudyEstimate('source')
  for (let bin = 0; bin < count; bin++)
    for (let second = 0; second < seconds; second++)
      state = sampleStudy(state, 1, bin)
  return state
}
describe('stima dello studio basata su avanzamento consolidato', () => {
  it('ignora una scorsa in cinque secondi anche se arriva al fondo', () => {
    let state = newStudyEstimate('source')
    for (let bin = 0; bin < 20; bin++) state = sampleStudy(state, 0.25, bin)
    for (let second = 0; second < 900; second++)
      state = sampleStudy(state, 1, 19)
    expect(estimateStudyMinutes(state)).toBeNull()
  })
  it('richiede dieci minuti e almeno il sessanta per cento senza buchi', () => {
    expect(estimateStudyMinutes(studyBins(12, 45))).toBeNull()
    expect(estimateStudyMinutes(studyBins(11))).toBeNull()
    expect(estimateStudyMinutes(studyBins(12))).toBe(8)
    const skipped = studyBins(11)
    skipped.dwell[15] = 120
    expect(estimateStudyMinutes(skipped)).toBeNull()
  })
  it('include domande e riletture nel tempo senza inventare avanzamento', () => {
    let state = studyBins(12)
    for (let second = 0; second < 600; second++)
      state = sampleStudy(state, 1, null)
    expect(state.dwell.filter((value) => value >= 45)).toHaveLength(12)
    expect(estimateStudyMinutes(state)).toBeCloseTo(14.6667, 3)
    for (let second = 0; second < 600; second++)
      state = sampleStudy(state, 1, 2)
    expect(estimateStudyMinutes(state)).toBeCloseTo(21.3333, 3)
    for (let second = 0; second < 900; second++)
      state = sampleStudy(state, 1, null)
    expect(estimateStudyMinutes(state)).toBeNull()
  })
  it('scarta intervalli da sospensione e dati corrotti, riprende e invalida rigenerazioni', () => {
    const state = studyBins(12)
    expect(sampleStudy(state, 1800, 12)).toBe(state)
    expect(sampleStudy(state, -1, 12)).toBe(state)
    expect(
      restoreStudyEstimate(JSON.parse(JSON.stringify(state)), 'source')
    ).toEqual(state)
    expect(restoreStudyEstimate(state, 'regenerated').seconds).toBe(0)
    expect(
      restoreStudyEstimate({ ...state, dwell: [NaN] }, 'source').seconds
    ).toBe(0)
  })
  it('riparte dal punto corretto e usa fasce di cinque minuti senza dichiarare completamento', () => {
    let state = newStudyEstimate('source', 10)
    for (let bin = 10; bin < 16; bin++)
      for (let second = 0; second < 100; second++)
        state = sampleStudy(state, 1, bin)
    expect(estimateStudyMinutes(state)).toBeCloseTo(6.6667, 3)
    expect(studyEstimateLabel(22)).toBe('Studio restante: circa 20–25 min')
    expect(studyEstimateLabel(2)).toBe('Studio restante: circa meno di 5 min')
    state.dwell.fill(60)
    expect(estimateStudyMinutes(state)).toBeNull()
  })
})
