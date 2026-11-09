import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  completeStudyForecast, discardStudyForecast, forecastBand, forecastBandLabel, forecastPhase, forecastSession,
  FORECAST_HISTORY_KEY, FORECAST_RUN_PREFIX, readForecastHistory, type ForecastCase
} from '../../src/utils/studyForecast'

let storage: Map<string, string>
beforeEach(() => {
  storage = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  })
})
afterEach(() => vi.unstubAllGlobals())
const point = { predicted: 600, phase: 0 as const, language: 'it', method: 'paragraph-v2' as const }
const cases = (count = 20, error = 120): ForecastCase[] => Array.from({ length: count }, (_, index) => ({
  ...point, lesson: `lesson-${index}`, elapsed: 20, actual: point.predicted + error
}))

test('requires distinct completed lessons and excludes current lesson, other language, phase and method', () => {
  expect(forecastBand(cases(19), 'new', point).margin).toBeNull()
  expect(forecastBand(cases(), 'lesson-0', point).lessons).toBe(19)
  expect(forecastBand(Array(100).fill(cases(1)[0]), 'new', point).lessons).toBe(1)
  const history = [...cases(), ...cases().map(item => ({ ...item, phase: 2 as const, actual: 630 }))]
  expect(forecastBand(history, 'new', point).margin).toBe(120)
  expect(forecastBand(history, 'new', { ...point, phase: 2 }).margin).toBe(30)
  expect(forecastBand(history, 'new', { ...point, language: 'en' }).margin).toBeNull()
  expect(forecastBand(history, 'new', { ...point, method: 'viewport-v2' }).margin).toBeNull()
  expect([forecastPhase(0), forecastPhase(0.34), forecastPhase(1)]).toEqual([0, 1, 2])
})

test('uses the finite-sample empirical quantile, scales residuals and never manufactures a narrowing by position', () => {
  const history = cases().map((item, index) => ({ ...item, actual: item.predicted + index * 60 }))
  const band = forecastBand(history, 'new', point)
  expect(band.margin).toBe(18 * 60) // ceil((20+1)*.9) = 19th order statistic
  expect(band.lower).toBe(0)
  expect(band.upper).toBe(1680)
  expect(forecastBand(history.map(item => ({ ...item, phase: 2 })), 'new', { ...point, phase: 2 }).margin).toBe(band.margin)
  expect(forecastBand(cases(), 'new', { ...point, predicted: 1200 }).margin).toBe(240)
  expect(forecastBand(cases(), 'new', { ...point, predicted: 30 }).margin).toBe(12)
})

test('records prospective points once per phase, survives restart and uses only qualified active seconds until completion', () => {
  let session = forecastSession('new', 'source')
  session.tick(30, 0) // rejected suspension, no active study
  for (let i = 0; i < 20; i++) session.tick(1, 0.1)
  session.predict(600, 0.1, 'it', 'paragraph-v2')
  session.predict(300, 0.1, 'it', 'paragraph-v2')
  session.save()
  session = forecastSession('new', 'source')
  for (let i = 0; i < 120; i++) session.tick(1, 0.5)
  session.predict(300, 0.5, 'it', 'paragraph-v2')
  for (let i = 0; i < 60; i++) session.tick(1, 0.95)
  session.save()
  expect(readForecastHistory()).toEqual([]) // interrupted != completed
  expect(completeStudyForecast('new', 'source')).toBe(true)
  const history = readForecastHistory()
  expect(history.map(item => [item.predicted, item.actual])).toEqual([[600, 180], [300, 60]])
  session.save() // stale hook cleanup after a completion cannot resurrect its run
  expect(storage.has(FORECAST_RUN_PREFIX + 'new')).toBe(false)
  completeStudyForecast('new', 'source')
  expect(readForecastHistory()).toEqual(history)
  expect(history.every(item => !('text' in item) && !('timestamp' in item))).toBe(true)
})

test('reports actual subsequent coverage rather than presenting the target 90% as measured accuracy', () => {
  storage.set(FORECAST_HISTORY_KEY, JSON.stringify(cases()))
  const session = forecastSession('future', 'source')
  const band = session.predict(600, 0.1, 'it', 'paragraph-v2')
  expect(band.margin).toBe(120)
  expect(band.checked).toBe(0)
  for (let i = 0; i < 800; i++) session.tick(1, 0.99)
  session.save()
  completeStudyForecast('future', 'source')
  const evaluated = forecastBand(readForecastHistory(), 'another', point)
  expect(evaluated.checked).toBe(1)
  expect(evaluated.covered).toBe(0)
  expect(forecastBandLabel(600, evaluated)).toContain('0% su 1 lezione')
  expect(forecastBandLabel(600, forecastBand([], 'new', point))).not.toContain('90%')
})

test('does not turn regeneration, recalculation, early completion or repeated study into independent lessons', () => {
  const session = forecastSession('new', 'source')
  session.tick(1, 0.99); session.predict(600, 0.1, 'it', 'paragraph-v2'); session.save()
  completeStudyForecast('new', 'regenerated')
  expect(readForecastHistory()).toEqual([])
  const second = forecastSession('new', 'regenerated')
  second.tick(1, 0.99); second.predict(600, 0.1, 'it', 'paragraph-v2'); second.reset(); second.save()
  completeStudyForecast('new', 'regenerated')
  expect(readForecastHistory()).toEqual([])
  const early = forecastSession('early', 'source')
  early.tick(1, 0.2); early.predict(600, 0.2, 'it', 'paragraph-v2'); early.save()
  completeStudyForecast('early', 'source')
  expect(readForecastHistory()).toEqual([])
  storage.set(FORECAST_HISTORY_KEY, JSON.stringify(cases()))
  const repeat = forecastSession('lesson-0', 'new-source')
  repeat.predict(600, 0.1, 'it', 'paragraph-v2'); repeat.tick(1, 0.99); repeat.save()
  completeStudyForecast('lesson-0', 'new-source')
  expect(readForecastHistory()).toHaveLength(20)
})

test('ignores malformed storage and handles quota failures without blocking study', () => {
  storage.set(FORECAST_HISTORY_KEY, '[null,{}, {"predicted":-1}]')
  expect(readForecastHistory()).toEqual([])
  storage.set(FORECAST_RUN_PREFIX + 'new', '{bad json')
  const session = forecastSession('new', 'source')
  session.tick(1, 0.99); session.predict(600, 0.1, 'it', 'paragraph-v2')
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('quota') } })
  expect(session.save()).toBe(false)
  expect(completeStudyForecast('new', 'source')).toBe(false)
  expect(readForecastHistory()).toEqual([])
})

test('discarding an untracked segment invalidates stale writers and preserves completed history', () => {
  storage.set(FORECAST_HISTORY_KEY, JSON.stringify(cases()))
  const session = forecastSession('new', 'source')
  session.tick(1, 0.99); session.predict(600, 0.1, 'it', 'paragraph-v2'); session.save()
  discardStudyForecast('new')
  expect(session.save()).toBe(false)
  completeStudyForecast('new', 'source')
  expect(readForecastHistory()).toHaveLength(20)
  expect(forecastSession('new', 'source').save()).toBe(true)
})

test('collects both forecasting methods within the same phase and language', () => {
  const session = forecastSession('methods', 'source')
  session.predict(600, .5, 'it', 'viewport-v2')
  session.predict(500, .5, 'it', 'paragraph-v2')
  session.tick(1, .99); session.save(); completeStudyForecast('methods', 'source')
  expect(readForecastHistory().map(item => item.method)).toEqual(['viewport-v2', 'paragraph-v2'])
})

test('never completes using a stale counter after the final run write fails', () => {
  const session = forecastSession('failed-final-write', 'source')
  session.tick(1, .99); session.predict(60, .7, 'it', 'paragraph-v2'); session.save()
  for (let i = 0; i < 30; i++) session.tick(1, .99)
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (key === FORECAST_RUN_PREFIX + 'failed-final-write') throw new Error('write failed')
      storage.set(key, value)
    }, removeItem: (key: string) => storage.delete(key)
  })
  expect(session.save()).toBe(false)
  expect(completeStudyForecast('failed-final-write', 'source')).toBe(false)
  expect(readForecastHistory()).toHaveLength(0)
})

test('Wilson coverage expresses finite-sample uncertainty without a personal certainty score', async () => {
  const { coverageWilson } = await import('../../shared/studyForecast')
  expect(coverageWilson(0,0)).toBeNull()
  expect(coverageWilson(.5,1)).toBeNull()
  expect(coverageWilson(9,10)![0]).toBeCloseTo(.596,2)
  expect(coverageWilson(9,10)![1]).toBeCloseTo(.982,2)
})
