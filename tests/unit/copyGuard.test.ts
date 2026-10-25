import { expect, it } from 'vitest'
import { COPY_GUARD_DEFAULT, COPY_PHRASES, isCopyProtected, normalizeCopyPhrase } from '../../src/utils/copyGuard'

it.each([['07:59', false], ['08:00', true], ['12:30', true], ['17:29', true], ['17:30', false], ['23:00', false]])('copia protetta %s: %s', (time, expected) => {
  const [hours, minutes] = time.split(':').map(Number)
  expect(isCopyProtected(new Date(2026, 9, 22, hours, minutes), COPY_GUARD_DEFAULT)).toBe(expected)
})
it.each([['19:59', false], ['20:00', true], ['23:59', true], ['00:00', true], ['05:29', true], ['05:30', false]])('supporta fascia configurata oltre mezzanotte %s', (time, expected) => {
  const [hours, minutes] = time.split(':').map(Number)
  expect(isCopyProtected(new Date(2026, 9, 22, hours, minutes), { start: '20:00', end: '05:30' })).toBe(expected)
})
it('normalizza maiuscole e spazi senza accettare parole diverse', () => {
  expect(normalizeCopyPhrase('  È  IL\nMIO momento ')).toBe(normalizeCopyPhrase('È il mio momento'))
  expect(normalizeCopyPhrase('e il mio momento')).not.toBe(normalizeCopyPhrase('è il mio momento'))
  expect(COPY_PHRASES.every(phrase => phrase.split(/\s+/).length >= 15 && phrase.split(/\s+/).length <= 25)).toBe(true)
})
