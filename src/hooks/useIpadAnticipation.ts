import { useEffect, type RefObject } from 'react'
import { STUDY_TICK_EVENT, studySurfaceBlocked } from '../utils/studyActivity'
import { IpadAnticipation, upcomingDiagrams, IPAD_PREFERENCE_EVENT, IPAD_EXPORT_EVENT } from '../utils/ipadAnticipation'

export function useIpadAnticipation({ lectureId, language, markdown, enabled, paused, rootRef }: {
  lectureId: string | null; language: string; markdown: string | null; enabled: boolean; paused: boolean
  rootRef: RefObject<HTMLDivElement | null>
}) {
  useEffect(() => {
    if (!lectureId || !markdown || !enabled || paused || !window.archive.ipadExportStatus) return
    let disposed = false, preference = false, surface = 'reading', pending = false
    const progressKey = `lezionify.ipad-study-seconds.v1:${lectureId}`
    let previous = 0
    try { previous = Number(localStorage.getItem(progressKey)) } catch { /* Optional progress. */ }
    const tracker = new IpadAnticipation(previous)
    const attempted = new Set<string>()
    const identities = new WeakMap<HTMLElement, string>()
    let serial = 0
    const refresh = () => { void window.archive.ipadExportStatus().then(value => { if (!disposed) preference = value.enabled }).catch(() => { preference = false }) }
    refresh()
    const interaction = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (rootRef.current?.contains(target)) surface = 'reading'
      else if (target.closest('.focus-qna-column, .focus-pdf-column')) surface = 'other'
    }
    const notice = (message: string) => { if (!disposed) window.dispatchEvent(new CustomEvent(IPAD_EXPORT_EVENT, { detail: message })) }
    const persist = () => { try { localStorage.setItem(progressKey, String(tracker.total)) } catch { /* Remains usable this session. */ } }
    const tick = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (disposed || detail?.lectureId !== lectureId || detail.seconds !== 1 || studySurfaceBlocked()) return
      const root = rootRef.current
      const upcoming = root && surface === 'reading' ? upcomingDiagrams(root) : null
      let paragraph: string | null = null
      if (upcoming) {
        paragraph = identities.get(upcoming.paragraph) ?? String(++serial)
        identities.set(upcoming.paragraph, paragraph)
      }
      const ready = tracker.tick(paragraph)
      if (tracker.total % 10 === 0) persist()
      if (!ready || !preference || pending || !upcoming?.diagrams.length) return
      const sources = upcoming.diagrams.filter(node => node.dataset.renderState === 'ready')
        .map(node => node.dataset.mermaidSource).filter((source): source is string => Boolean(source) && !attempted.has(source!))
      if (!sources.length) return
      pending = true
      void (async () => {
        for (const source of sources) {
          if (disposed || !preference) break
          attempted.add(source)
          try {
            const bytes = new TextEncoder().encode(`${lectureId}\n${language}\n${source}`)
            const digest = await crypto.subtle.digest('SHA-256', bytes)
            const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
            const { mermaidPng } = await import('../components/MermaidDiagram')
            const png = await mermaidPng(source)
            if (disposed || !preference) break
            await window.archive.exportIpadDiagram({ key, png })
            notice('Schema salvato nella cartella iCloud. La sincronizzazione con iPad può richiedere tempo.')
          } catch { notice('Schema non salvato per iPad. Controlla Foto di iCloud; riapri la lezione per riprovare.') }
        }
      })().finally(() => { pending = false })
    }
    document.addEventListener(STUDY_TICK_EVENT, tick)
    document.addEventListener('pointerdown', interaction, true)
    document.addEventListener('focusin', interaction, true)
    window.addEventListener(IPAD_PREFERENCE_EVENT, refresh)
    return () => {
      disposed = true; persist()
      document.removeEventListener(STUDY_TICK_EVENT, tick)
      document.removeEventListener('pointerdown', interaction, true)
      document.removeEventListener('focusin', interaction, true)
      window.removeEventListener(IPAD_PREFERENCE_EVENT, refresh)
    }
  }, [lectureId, language, markdown, enabled, paused, rootRef])
}
