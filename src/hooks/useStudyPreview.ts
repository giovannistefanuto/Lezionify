import { useEffect, useState, type RefObject } from 'react'
import { observeParagraphs } from '../utils/paragraphObservation'
import { contentFingerprint } from '../utils/readingPosition'

/** Read-only estimate: no credited seconds, observations, forecasts or progress writes. */
export function useStudyPreview({ lectureId, markdown, english, language, enabled, rootRef, fallbackRef }: {
  lectureId: string | null; markdown: string | null; english?: string | null; language: string
  enabled: boolean; rootRef: RefObject<HTMLDivElement | null>; fallbackRef?: RefObject<HTMLDivElement | null>
}) {
  const [label, setLabel] = useState<string | null>(null)
  useEffect(() => {
    setLabel(null)
    if (!enabled || !lectureId || !markdown) return
    const observer = observeParagraphs(`${lectureId}:${contentFingerprint(markdown)}:${english ? contentFingerprint(english) : ''}`, language)
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const root = rootRef.current
        if (!root) return
        const viewport = fallbackRef?.current && root.scrollHeight <= root.clientHeight + 1 ? fallbackRef.current : root
        setLabel(observer.tick(viewport, 0, 'reading', '', true))
      })
    }
    update()
    document.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    const resize = new ResizeObserver(update)
    if (rootRef.current) resize.observe(rootRef.current)
    if (fallbackRef?.current) resize.observe(fallbackRef.current)
    return () => { cancelAnimationFrame(frame); resize.disconnect(); document.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) }
  }, [lectureId, markdown, english, language, enabled, rootRef, fallbackRef])
  return enabled ? label : null
}
