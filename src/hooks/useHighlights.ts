import { useState, useEffect, useCallback, useRef } from 'react'
import type { LectureHighlight } from '../../shared/archive'

export function useHighlights(lectureId: string | null) {
  const [isHighlightMode, setIsHighlightMode] = useState(false)
  const [highlights, setHighlights] = useState<LectureHighlight[]>([])
  const lectureIdRef = useRef(lectureId)
  const highlightsRef = useRef<LectureHighlight[]>([])
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  lectureIdRef.current = lectureId

  // Caricamento evidenziazioni per la lezione corrente
  useEffect(() => {
    let isMounted = true
    if (!lectureId) {
      highlightsRef.current = []
      setHighlights([])
      return
    }

    async function load() {
      if (window.archive?.getHighlights && lectureId) {
        try {
          const loaded = await window.archive.getHighlights(lectureId)
          if (isMounted) {
            const current = Array.isArray(loaded) ? loaded : []
            highlightsRef.current = current
            setHighlights(current)
          }
        } catch (err) {
          console.error('Errore nel caricamento delle evidenziazioni:', err)
          if (isMounted) {
            highlightsRef.current = []
            setHighlights([])
          }
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [lectureId])

  // Salvataggio su disco
  const persistHighlights = useCallback(async (id: string, data: LectureHighlight[]) => {
    if (!window.archive?.saveHighlights) return
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      try {
        await window.archive.saveHighlights(id, data)
      } catch (err) {
        console.error('Errore nel salvataggio delle evidenziazioni:', err)
      }
    })
    await saveQueueRef.current
  }, [])

  const toggleHighlightMode = useCallback(() => {
    setIsHighlightMode((prev) => !prev)
  }, [])

  // Aggiunta evidenziazione con algoritmo matematico di Interval Merging
  const addHighlight = useCallback(
    (startOffset: number, endOffset: number, text: string) => {
      if (startOffset >= endOffset) return

      const currentId = lectureIdRef.current
      if (!currentId) return
      const prev = highlightsRef.current
        let mergedStart = startOffset
        let mergedEnd = endOffset
        const mergedText = text
        const unaffected: LectureHighlight[] = []

        // Verifica sovrapposizioni o adiacenze immediate con intervalli preesistenti
        for (const h of prev) {
          if (h.startOffset <= mergedEnd && h.endOffset >= mergedStart) {
            // C'è intersezione parziale o totale: unisci gli estremi
            mergedStart = Math.min(mergedStart, h.startOffset)
            mergedEnd = Math.max(mergedEnd, h.endOffset)
          } else {
            unaffected.push(h)
          }
        }

        const newHighlight: LectureHighlight = {
          id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          startOffset: mergedStart,
          endOffset: mergedEnd,
          text: mergedText,
          color: 'yellow',
          createdAt: new Date().toISOString()
        }

        const updated = [...unaffected, newHighlight].sort((a, b) => a.startOffset - b.startOffset)
        highlightsRef.current = updated
        setHighlights(updated)
        void persistHighlights(currentId, updated)
    },
    [persistHighlights]
  )

  // Rimozione di un'evidenziazione se si clicca su di essa in modalità evidenziatore
  const removeHighlightAtOffset = useCallback(
    (offset: number): boolean => {
      const currentId = lectureIdRef.current
      if (!currentId) return false
      let removed = false
      const prev = highlightsRef.current
        const remaining = prev.filter((h) => {
          const clickedInside = offset >= h.startOffset && offset <= h.endOffset
          if (clickedInside) removed = true
          return !clickedInside
        })

        if (removed) {
          highlightsRef.current = remaining
          setHighlights(remaining)
          void persistHighlights(currentId, remaining)
        }
      return removed
    },
    [persistHighlights]
  )

  const clearAllHighlights = useCallback(() => {
    const currentId = lectureIdRef.current
    highlightsRef.current = []
    setHighlights([])
    if (currentId) void persistHighlights(currentId, [])
  }, [persistHighlights])

  return {
    isHighlightMode,
    setIsHighlightMode,
    toggleHighlightMode,
    highlights,
    addHighlight,
    removeHighlightAtOffset,
    clearAllHighlights
  }
}
