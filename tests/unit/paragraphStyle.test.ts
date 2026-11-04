import { expect, test } from 'vitest'
import { paragraphModel, type ParagraphSample } from '../../src/utils/paragraphEstimate'

test('learns bold weighting across documents without changing legacy samples', () => {
  const samples: ParagraphSample[] = Array.from({ length: 32 }, (_, i) => ({
    document: `lesson-${Math.floor(i / 8)}`, day: 'old', words: 100, numbers: 0, formulas: 0,
    boldWords: i % 2 ? 100 : 0, position: 0, note: false, seconds: i % 2 ? 120 : 60
  }))
  const model = paragraphModel(samples, 'today')!
  expect(model.style.bold).toBeGreaterThan(0)
  expect(model.validationError).toBeLessThan(model.baselineError!)
  expect(model.predict({ words: 100, numbers: 0, formulas: 0, boldWords: 100 })).toBeGreaterThan(model.predict({ words: 100, numbers: 0, formulas: 0 }))
  const legacy = paragraphModel(samples.map(({ document, day, words, numbers, formulas, seconds }) => ({ document, day, words, numbers, formulas, seconds })), 'today')!
  expect(legacy.style).toEqual({ bold: 0, position: 0, note: 0 })
})

test('keeps optional style neutral without enough independent observations', () => {
  const samples: ParagraphSample[] = Array.from({ length: 24 }, () => ({ document: 'same', day: 'old', words: 100, numbers: 0, formulas: 0, seconds: 60, boldWords: 90, position: 1, note: true }))
  const model = paragraphModel(samples, 'today')!
  expect(model.style).toEqual({ bold: 0, position: 0, note: 0 })
  expect(Number.isFinite(model.predict({ words: 100, numbers: 0, formulas: 0, boldWords: NaN, position: Infinity }))).toBe(true)
})
