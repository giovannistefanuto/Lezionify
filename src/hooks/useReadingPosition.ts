import { useLayoutEffect, type RefObject } from 'react'
import { contentFingerprint, forgetPosition, readPosition, writePosition } from '../utils/readingPosition'
import { alignLanguagePoint, captureLanguagePoint, type LanguageReadingPoint } from '../utils/sectionAlignment'

/** Share a block-relative anchor between the drawer and Focus, separately per language. */
export function useReadingPosition(rootRef: RefObject<HTMLDivElement | null>, key: string | null, content: string | null, enabled: boolean, fallbackRef?: RefObject<HTMLDivElement | null>, languagePoint?: RefObject<LanguageReadingPoint | null>): void {
  useLayoutEffect(() => {
    if (languagePoint?.current && (!key || languagePoint.current.key.slice(0, -3) !== key.slice(0, -3))) languagePoint.current = null
    const root = rootRef.current
    const body = root?.querySelector<HTMLElement>('.markdown-body')
    if (!enabled || !key || !content || !root || !body) return
    const fingerprint = contentFingerprint(content)
    let anchor = readPosition(key, fingerprint)
    let restoredScroll: { element: HTMLElement; top: number } | null = null
    const fallback = fallbackRef?.current
    const scrollRoot = () => fallback && root.scrollHeight <= root.clientHeight + 1 ? fallback : root
    const blocks = () => Array.from(body.children) as HTMLElement[]
    const restore = () => {
      if (!root.clientHeight || !root.clientWidth) return
      const scroller = scrollRoot()
      const block = anchor && blocks()[anchor.page]
      if (!block) { scroller.scrollTop = 0; anchor = null; return }
      scroller.scrollTop += block.getBoundingClientRect().top - scroller.getBoundingClientRect().top + anchor!.y * block.getBoundingClientRect().height
      restoredScroll = { element: scroller, top: scroller.scrollTop }
      if (languagePoint) languagePoint.current = captureLanguagePoint(body, scroller, key)
    }
    const track = () => {
      if (!root.clientHeight || !root.clientWidth) return
      const scroller = scrollRoot()
      if (languagePoint) languagePoint.current = captureLanguagePoint(body, scroller, key)
      if (restoredScroll?.element === scroller && Math.abs(restoredScroll.top - scroller.scrollTop) < 1) return
      restoredScroll = null
      // A toolbar above the document is outside its reading coordinates.
      if (scroller.scrollTop === 0) { anchor = null; forgetPosition(key); return }
      const items = blocks()
      const top = scrollRoot().getBoundingClientRect().top
      let page = items.findIndex(block => block.getBoundingClientRect().bottom > top)
      if (page < 0) page = items.length - 1
      const bounds = items[page]?.getBoundingClientRect()
      if (!bounds?.height) return
      anchor = { page, y: Math.max(-2, Math.min(2, (top - bounds.top) / bounds.height)), x: 0 }
      writePosition(key, fingerprint, anchor)
    }
    const previous = languagePoint?.current
    if (previous && previous.key !== key && previous.key.slice(0, -3) === key.slice(0, -3)) {
      // A deliberate language switch takes priority over the destination's older bookmark.
      alignLanguagePoint(body, scrollRoot(), previous)
      track()
    }
    restore()
    if (languagePoint) languagePoint.current = captureLanguagePoint(body, scrollRoot(), key)
    root.addEventListener('scroll', track, { passive: true })
    fallback?.addEventListener('scroll', track, { passive: true })
    const observer = new ResizeObserver(restore)
    observer.observe(root)
    observer.observe(body)
    if (fallback) observer.observe(fallback)
    // Mermaid renders later; update geometry without changing the saved block.
    const mutations = new MutationObserver(restore)
    mutations.observe(body, { childList: true, subtree: true })
    return () => {
      root.removeEventListener('scroll', track)
      fallback?.removeEventListener('scroll', track)
      observer.disconnect()
      mutations.disconnect()
      if (anchor) writePosition(key, fingerprint, anchor)
    }
  }, [rootRef, key, content, enabled, fallbackRef, languagePoint])
}
