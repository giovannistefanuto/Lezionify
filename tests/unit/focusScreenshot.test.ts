import { expect, it } from 'vitest'
import { screenshotRect } from '../../shared/focusScreenshot'
import { documentStudyEstimate } from '../../src/utils/documentStudyEstimate'

it('normalizes reverse drags and preserves pixel edges at fractional zoom', () => {
  expect(screenshotRect({ x: 100.5, y: 200.2, width: -40.2, height: -50.1 }, 400, 400)).toEqual({ x: 60, y: 150, width: 41, height: 51 })
  for (const rect of [{ x: -1, y: 0, width: 2, height: 2 }, { x: 0, y: 0, width: NaN, height: 10 }, { x: 390, y: 0, width: 11, height: 10 }, { x: 0, y: 0, width: 0, height: 0 }]) {
    expect(() => screenshotRect(rect, 400, 400)).toThrow()
  }
})
it('previews a whole lesson from learned study time and never invents a cold estimate', () => {
  const markdown = 'Parole per una dispensa sintetica di studio. '.repeat(20)
  expect(documentStudyEstimate(markdown, [])).toBeNull()
  const samples = ['a', 'b'].map(document => ({ document, day: '2026-11-27', words: 100, numbers: 0, formulas: 0, seconds: 120 }))
  expect(documentStudyEstimate(markdown, samples)).toMatch(/Studio totale: circa 3 min · provvisorio/)
  expect(documentStudyEstimate('```mermaid\ngraph TD; A-->B\n```', samples)).toBeNull()
})
