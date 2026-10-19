import { describe, expect, it } from 'vitest'
import { correspondingSection, type SectionHeading } from '../../src/utils/sectionAlignment'

const outline = (texts: string[]): SectionHeading[] => texts.map(text => ({ level: 2, text }))
describe('Corrispondenza locale dei capitoletti', () => {
  it('allinea 12 titoli tradotti per struttura, in entrambe le direzioni', () => {
    const it = outline(Array.from({ length: 12 }, (_, i) => `Capitolo ${i}`))
    const en = outline(Array.from({ length: 12 }, (_, i) => `Chapter ${i}`))
    expect(correspondingSection(it, en, 9)).toBe(9)
    expect(correspondingSection(en, it, 9)).toBe(9)
  })
  it('usa numeri univoci con sezioni aggiunte, mancanti e riordinate', () => {
    const it = outline(['1. Primo', '2. Secondo', '3. Terzo'])
    const en = outline(['Introduction', '3. Third', '1. First'])
    expect(correspondingSection(it, en, 2)).toBe(1)
    expect(correspondingSection(en, it, 1)).toBe(2)
    expect(correspondingSection(it, en, 1)).toBeNull()
  })
  it('usa titoli identici univoci ma rifiuta omonimie e strutture divergenti', () => {
    expect(correspondingSection(outline(['A', 'Fourier']), outline(['Fourier', 'B', 'C']), 1)).toBe(0)
    expect(correspondingSection(outline(['A', 'A']), outline(['B', 'B']), 1)).toBeNull()
    expect(correspondingSection(outline(['A', 'B']), outline(['C', 'C']), 1)).toBeNull()
    expect(correspondingSection(outline(['A', 'B']), outline(['C']), 0)).toBeNull()
    expect(correspondingSection(outline(['A']), [{ level: 3, text: 'B' }], 0)).toBeNull()
    expect(correspondingSection([], [], -1)).toBeNull()
  })
  it('non presume l ordine quando un altro titolo condiviso e stato spostato', () => {
    expect(correspondingSection(outline(['A', 'B', 'C']), outline(['C', 'D', 'E']), 1)).toBeNull()
    expect(correspondingSection(outline(['1. A', '2. B']), outline(['3. C', '4. D']), 1)).toBeNull()
  })
})
