import { expect, it } from 'vitest'
import { courseAnswerSections } from '../../src/utils/courseAnswerSections'
it('distingue solo le sezioni esplicite senza alterare formule o codice', () => {
  const text = '# Dalle fonti del corso\nFormula $x^2$.\n## Deduzione\nPassaggio.\n## Integrazione generale\n```text\n# Deduzione\n```'
  const sections = courseAnswerSections(text)
  expect(sections.map(item => item.kind)).toEqual(['sources', 'deduction', 'general'])
  expect(sections.map(item => item.markdown).join('').trimEnd()).toBe(text)
  expect(courseAnswerSections('Prosa senza attribuzione.')[0].kind).toBe('other')
})
it('recognizes explicit plain labels returned by real models without classifying incidental words', () => {
  expect(courseAnswerSections('Dalle fonti del corso: fatto.\n\nDeduzione: motivo.\n\nIntegrazione generale: contesto.').map(section => section.kind)).toEqual(['sources', 'deduction', 'general'])
  expect(courseAnswerSections('La Deduzione non è una citazione.')[0].kind).toBe('other')
})
