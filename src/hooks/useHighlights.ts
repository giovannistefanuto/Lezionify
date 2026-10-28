import { useState, useEffect, useCallback, useRef } from 'react'
import type { LectureHighlight } from '../../shared/archive'

export function useHighlights(lectureId: string | null) {
  const [isHighlightMode, setIsHighlightMode] = useState(false)
  const [annotationStyle, setAnnotationStyle] = useState<'highlight' | 'underline'>('highlight')
  const [highlights, setHighlights] = useState<LectureHighlight[]>([])
  const [loadedLectureId, setLoadedLectureId] = useState<string | null>(null)
  const [highlightError, setHighlightError] = useState<string | null>(null)
  const lectureIdRef = useRef(lectureId)
  const highlightsRef = useRef<LectureHighlight[]>([])
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  lectureIdRef.current = lectureId

  // Caricamento evidenziazioni per la lezione corrente
  useEffect(() => {
    let isMounted = true
    setLoadedLectureId(null)
    setHighlightError(null)
    if (!lectureId) {
      highlightsRef.current = []
      setHighlights([])
      return
    }
    highlightsRef.current = []
    setHighlights([])

    async function load() {
      if (window.archive?.getHighlights && lectureId) {
        try {
          await saveQueueRef.current
          const loaded = await window.archive.getHighlights(lectureId)
          if (isMounted) {
            const current = Array.isArray(loaded) ? loaded : []
            highlightsRef.current = current
            setHighlights(current)
            setLoadedLectureId(lectureId)
          }
        } catch {
          if (isMounted) {
            highlightsRef.current = []
            setHighlights([])
            setHighlightError('Annotazioni non caricate. Riapri la lezione per riprovare.')
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
        if (lectureIdRef.current === id) setHighlightError(null)
      } catch {
        if (lectureIdRef.current === id) setHighlightError('Annotazioni non salvate. Mantieni aperta la lezione e riprova.')
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
      if (!currentId || loadedLectureId !== currentId) return
      const prev = highlightsRef.current
        let mergedStart = startOffset
        let mergedEnd = endOffset
        const mergedText = text
        let candidates = [...prev]
        let expanded: boolean

        // Verifica sovrapposizioni o adiacenze immediate con intervalli preesistenti
        do {
          expanded = false
          candidates = candidates.filter(h => {
            if ((h.style ?? 'highlight') !== annotationStyle || h.startOffset > mergedEnd || h.endOffset < mergedStart) return true
            mergedStart = Math.min(mergedStart, h.startOffset)
            mergedEnd = Math.max(mergedEnd, h.endOffset)
            expanded = true
            return false
          })
        } while (expanded)

        const newHighlight: LectureHighlight = {
          id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          startOffset: mergedStart,
          endOffset: mergedEnd,
          text: mergedText,
          color: 'yellow',
          style: annotationStyle,
          createdAt: new Date().toISOString()
        }

        const updated = [...candidates, newHighlight].sort((a, b) => a.startOffset - b.startOffset)
        highlightsRef.current = updated
        setHighlights(updated)
        void persistHighlights(currentId, updated)
    },
    [persistHighlights, annotationStyle, loadedLectureId]
  )

  // Rimozione di un'evidenziazione se si clicca su di essa in modalità evidenziatore
  const removeHighlightAtOffset = useCallback(
    (offset: number): boolean => {
      const currentId = lectureIdRef.current
      if (!currentId || loadedLectureId !== currentId) return false
      let removed = false
      const prev = highlightsRef.current
        const remaining = prev.filter((h) => {
          const clickedInside = (h.style ?? 'highlight') === annotationStyle && offset >= h.startOffset && offset < h.endOffset
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
    [persistHighlights, annotationStyle, loadedLectureId]
  )

  const clearAllHighlights = useCallback(() => {
    const currentId = lectureIdRef.current
    if (!currentId || loadedLectureId !== currentId) return
    highlightsRef.current = []
    setHighlights([])
    if (currentId) void persistHighlights(currentId, [])
  }, [persistHighlights, loadedLectureId])

  return {
    isHighlightMode: isHighlightMode && loadedLectureId === lectureId,
    highlightError,
    annotationStyle,
    setAnnotationStyle,
    setIsHighlightMode,
    toggleHighlightMode,
    highlights: loadedLectureId === lectureId ? highlights : [],
    addHighlight,
    removeHighlightAtOffset,
    clearAllHighlights
  }
}
