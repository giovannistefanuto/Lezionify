import { describe, expect, it } from 'vitest'
import type { LectureHighlight } from '../../shared/archive'

function mergeHighlight(
  existing: LectureHighlight[],
  newStart: number,
  newEnd: number,
  text: string
): LectureHighlight[] {
  if (newStart >= newEnd) return existing

  let mergedStart = newStart
  let mergedEnd = newEnd
  const mergedText = text
  const unaffected: LectureHighlight[] = []

  for (const h of existing) {
    if (h.startOffset <= mergedEnd && h.endOffset >= mergedStart) {
      mergedStart = Math.min(mergedStart, h.startOffset)
      mergedEnd = Math.max(mergedEnd, h.endOffset)
    } else {
      unaffected.push(h)
    }
  }

  const newHighlight: LectureHighlight = {
    id: `hl-test-${Date.now()}`,
    startOffset: mergedStart,
    endOffset: mergedEnd,
    text: mergedText,
    color: 'yellow',
    createdAt: new Date().toISOString()
  }

  return [...unaffected, newHighlight].sort((a, b) => a.startOffset - b.startOffset)
}

function removeHighlightAt(existing: LectureHighlight[], offset: number): LectureHighlight[] {
  return existing.filter((h) => !(offset >= h.startOffset && offset <= h.endOffset))
}

describe('Highlight Interval Merging Algorithm', () => {
  it('aggiunge una nuova evidenziazione disgiunta', () => {
    const list: LectureHighlight[] = []
    const updated = mergeHighlight(list, 10, 30, 'prima frase')
    expect(updated.length).toBe(1)
    expect(updated[0].startOffset).toBe(10)
    expect(updated[0].endOffset).toBe(30)
  })

  it('non duplica e non altera se si evidenzia all interno di una parte gia evidenziata', () => {
    const list: LectureHighlight[] = [
      { id: '1', startOffset: 10, endOffset: 50, text: 'frase lunga', color: 'yellow', createdAt: '' }
    ]
    // Nuova selezione interna [20, 40]
    const updated = mergeHighlight(list, 20, 40, 'frase')
    expect(updated.length).toBe(1)
    expect(updated[0].startOffset).toBe(10)
    expect(updated[0].endOffset).toBe(50)
  })

  it('collega e fonde parte A e parte B se B entra parzialmente in A', () => {
    const list: LectureHighlight[] = [
      { id: '1', startOffset: 10, endOffset: 50, text: 'parte A', color: 'yellow', createdAt: '' }
    ]
    // B entra un pochetto in A (inizia a 45 e finisce a 90)
    const updated = mergeHighlight(list, 45, 90, 'parte B')
    expect(updated.length).toBe(1)
    expect(updated[0].startOffset).toBe(10)
    expect(updated[0].endOffset).toBe(90)
  })

  it('unisce tre blocchi separati se una nuova selezione li collega tutti', () => {
    const list: LectureHighlight[] = [
      { id: '1', startOffset: 10, endOffset: 20, text: 'A', color: 'yellow', createdAt: '' },
      { id: '2', startOffset: 40, endOffset: 60, text: 'B', color: 'yellow', createdAt: '' },
      { id: '3', startOffset: 80, endOffset: 100, text: 'C', color: 'yellow', createdAt: '' }
    ]
    // Selezione ponte da 15 a 85
    const updated = mergeHighlight(list, 15, 85, 'ponte')
    expect(updated.length).toBe(1)
    expect(updated[0].startOffset).toBe(10)
    expect(updated[0].endOffset).toBe(100)
  })

  it('rimuove correttamente il blocco quando si clicca all interno del suo intervallo', () => {
    const list: LectureHighlight[] = [
      { id: '1', startOffset: 10, endOffset: 30, text: 'A', color: 'yellow', createdAt: '' },
      { id: '2', startOffset: 50, endOffset: 80, text: 'B', color: 'yellow', createdAt: '' }
    ]
    const afterClick = removeHighlightAt(list, 65) // Dentro B
    expect(afterClick.length).toBe(1)
    expect(afterClick[0].id).toBe('1')

    // Click fuori da qualsiasi intervallo: non rimuove nulla
    const noChange = removeHighlightAt(afterClick, 40)
    expect(noChange.length).toBe(1)
  })
})
