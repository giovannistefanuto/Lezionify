import { expect, it } from 'vitest'
import { needsCharging } from '../../shared/battery'
import { relatedQnaContext } from '../../shared/qnaContext'
import type { QnaThread } from '../../shared/archive'
const thread = (
  id: string,
  quote: string,
  answer = 'Risposta precedente'
): QnaThread => ({
  id,
  quote,
  contextHeading: null,
  createdAt: '',
  updatedAt: '',
  messages: [
    { role: 'user', text: quote, timestamp: '' },
    { role: 'ai', text: answer, timestamp: '' }
  ]
})
it('mostra il richiamo soltanto sotto il 20%, a batteria e con lettura valida', () => {
  expect(needsCharging({ percent: 19, onBattery: true })).toBe(true)
  expect(needsCharging({ percent: 0, onBattery: true })).toBe(true)
  for (const percent of [20, 100, null, NaN, -1])
    expect(needsCharging({ percent, onBattery: true })).toBe(false)
  expect(needsCharging({ percent: 3, onBattery: false })).toBe(false)
  expect(needsCharging(null)).toBe(false)
})
it('seleziona scambi completati pertinenti, senza duplicare la conversazione corrente', () => {
  const current = thread('current', 'Equilibrio strategico')
  const related = thread('related', 'Equilibrio di Nash')
  const other = thread('unrelated', 'Fotosintesi clorofilliana')
  expect(relatedQnaContext(current, [current, related, other])).toContain(
    'Equilibrio di Nash'
  )
  expect(relatedQnaContext(current, [current, related, other])).not.toContain(
    'Fotosintesi'
  )
  expect(relatedQnaContext(current, [current])).toBe('')
  expect(
    relatedQnaContext(current, [thread('unfinished', 'Equilibrio', '')])
  ).toBe('')
})
it('limita le altre discussioni a cinque e il testo a 12000 caratteri', () => {
  const current = thread('current', 'Equilibrio')
  const context = relatedQnaContext(
    current,
    Array.from({ length: 10 }, (_, n) =>
      thread(String(n), 'Equilibrio ' + n, 'x'.repeat(10000))
    )
  )
  expect(context.length).toBeLessThanOrEqual(12000)
  expect(context.match(/PASSAGGIO:/g)).toHaveLength(5)
})
