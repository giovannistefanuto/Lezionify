import { expect, it } from 'vitest'
import { studyDurationLabel } from '../../src/components/LectureStudyTime'
it('distingue assenza, secondi, singolari e tempo effettivo in ore e minuti', () => {
  expect(studyDurationLabel(0)).toBe('Nessun tempo registrato')
  expect(studyDurationLabel(59)).toBe('Meno di un minuto')
  expect(studyDurationLabel(60)).toBe('1 minuto')
  expect(studyDurationLabel(5160)).toBe('1 ora e 26 minuti')
  expect(studyDurationLabel(7200)).toBe('2 ore')
})
