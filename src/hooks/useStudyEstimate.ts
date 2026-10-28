import { useEffect, useState, useRef, type RefObject } from 'react'
import { contentFingerprint } from '../utils/readingPosition'
import { observeParagraphs } from '../utils/paragraphObservation'
import {
  estimateStudyMinutes,
  isStudyEstimateEnabled,
  newStudyEstimate,
  restoreStudyEstimate,
  sampleVisibleStudy,
  STUDY_BINS,
  studyEstimateLabel,
  type StudyEstimateState
} from '../utils/studyEstimate'

const PREFIX = 'lezionify.study-estimate.v1:'
/** Measure both viewport edges using the same text weighting as recalculation. */
export function studyVisibleRange(root: HTMLElement): { start: number; end: number } | null {
  const body = root.querySelector<HTMLElement>('.markdown-body')
  if (!body || !root.clientHeight) return null
  const blocks = Array.from(body.children).map(element => ({
    bounds: element.getBoundingClientRect(), weight: Math.max(1, element.textContent?.length ?? 0)
  })).filter(block => block.bounds.height > 0)
  const total = blocks.reduce((sum, block) => sum + block.weight, 0)
  if (!total) return null
  const progressAt = (y: number) => blocks.reduce((sum, block) => sum + block.weight *
    Math.max(0, Math.min(1, (y - block.bounds.top) / block.bounds.height)), 0) / total * STUDY_BINS
  const top = root.getBoundingClientRect().top + root.clientTop
  return { start: progressAt(top), end: progressAt(top + root.clientHeight) }
}
/** Uses document coordinates only; neither lesson text nor questions are persisted. */
export function studyBin(root: HTMLElement): number | null {
  const body = root.querySelector<HTMLElement>('.markdown-body')
  if (!body || !root.clientHeight) return null
  if (root.scrollTop <= 1) return 0
  if (root.scrollTop + root.clientHeight >= root.scrollHeight - 2)
    return STUDY_BINS - 1
  const blocks = Array.from(body.children) as HTMLElement[]
  const weights = blocks.map((block) =>
    Math.max(1, block.textContent?.length ?? 0)
  )
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const top = root.getBoundingClientRect().top
  let passed = 0
  for (let i = 0; i < blocks.length; i++) {
    const bounds = blocks[i].getBoundingClientRect()
    if (bounds.bottom <= top) passed += weights[i]
    else {
      passed +=
        weights[i] *
        Math.max(
          0,
          Math.min(1, (top - bounds.top) / Math.max(1, bounds.height))
        )
      break
    }
  }
  return Math.min(
    STUDY_BINS - 1,
    Math.floor((passed / Math.max(1, total)) * STUDY_BINS)
  )
}
export function useStudyEstimate({
  lectureId,
  markdown,
  english,
  enabled,
  paused,
  language,
  rootRef
}: {
  lectureId: string | null
  markdown: string | null
  english?: string | null
  enabled: boolean
  paused: boolean
  language: string
  rootRef: RefObject<HTMLDivElement | null>
}) {
  const [preference, setPreference] = useState(isStudyEstimateEnabled)
  const [label, setLabel] = useState<string | null>(null)
  const recalculateRef = useRef<() => void>(() => {})
  const fingerprint = markdown ? contentFingerprint(markdown) : ''
  const englishFingerprint = english ? contentFingerprint(english) : ''
  useEffect(() => {
    const update = () => setPreference(isStudyEstimateEnabled())
    window.addEventListener('study-estimate-preference', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('study-estimate-preference', update)
      window.removeEventListener('storage', update)
    }
  }, [])
  useEffect(() => {
    setLabel(null)
    if (!lectureId || !fingerprint || !enabled || !preference) return
    const key = PREFIX + lectureId
    const paragraphs = observeParagraphs(`${lectureId}:${fingerprint}:${englishFingerprint}`, language)
    let state: StudyEstimateState
    let savedEnglish = ''
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
      savedEnglish = saved?.englishFingerprint ?? ''
      state = restoreStudyEstimate(saved, fingerprint)
      if (
        savedEnglish &&
        englishFingerprint &&
        savedEnglish !== englishFingerprint
      )
        state = newStudyEstimate(fingerprint)
    } catch {
      state = newStudyEstimate(fingerprint)
    }
    let lastTick = Date.now(),
      lastInteraction = Date.now(),
      lastDisplay = 0,
      lastSave = 0
    let documentSurface = true
    const history: number[] = []
    const persist = () => {
      paragraphs.save()
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            ...state,
            englishFingerprint: englishFingerprint || savedEnglish
          })
        )
      } catch {
        /* The estimator remains optional when storage is unavailable. */
      }
    }
    recalculateRef.current = () => {
      const bin = rootRef.current ? studyBin(rootRef.current) : null
      if (bin === null) return
      state = newStudyEstimate(fingerprint, bin)
      paragraphs.reset()
      history.length = 0
      lastDisplay = 0
      setLabel(null)
      persist()
    }
    const interaction = (event: Event) => {
      lastInteraction = Date.now()
      const target = event.target
      if (!(target instanceof Element)) return
      if (rootRef.current?.contains(target)) documentSurface = true
      else if (target.closest('.focus-qna-column, .focus-pdf-column'))
        documentSurface = false
    }
    const visibility = () => {
      lastTick = Date.now()
      setLabel(null)
      persist()
    }
    const tick = () => {
      const now = Date.now(),
        delta = (now - lastTick) / 1000
      lastTick = now
      const blocked =
        paused ||
        document.hidden ||
        !document.hasFocus() ||
        now - lastInteraction > 15 * 60_000 ||
        Boolean(
          document.querySelector(
            '.modal-overlay, .quick-capture-backdrop, [data-dictionary-overlay]'
          )
        )
      if (blocked) {
        setLabel(null)
        return
      }
      const root = rootRef.current
      if (!root || !root.getBoundingClientRect().height) return
      state = sampleVisibleStudy(state, delta, documentSurface ? studyVisibleRange(root) : null)
      const paragraphLabel = documentSurface ? paragraphs.tick(root, delta) : null
      if (paragraphLabel) { setLabel(paragraphLabel); lastDisplay = now }
      if (now - lastSave >= 10_000) {
        persist()
        lastSave = now
      }
      const minutes = estimateStudyMinutes(state)
      if (!documentSurface || minutes === null) {
        if (paragraphLabel) return
        setLabel(null)
        return
      }
      if (now - lastDisplay >= 60_000) {
        history.push(minutes)
        if (history.length > 3) history.shift()
        const median = [...history].sort((a, b) => a - b)[
          Math.floor(history.length / 2)
        ]
        setLabel(studyEstimateLabel(median))
        lastDisplay = now
      }
    }
    for (const name of ['pointerdown', 'wheel', 'keydown', 'focusin'])
      document.addEventListener(name, interaction, true)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('blur', visibility)
    const timer = setInterval(tick, 1000)
    return () => {
      clearInterval(timer)
      persist()
      recalculateRef.current = () => {}
      for (const name of ['pointerdown', 'wheel', 'keydown', 'focusin'])
        document.removeEventListener(name, interaction, true)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('blur', visibility)
    }
  }, [
    lectureId,
    fingerprint,
    englishFingerprint,
    enabled,
    preference,
    paused,
    language,
    rootRef
  ])
  return {
    label: enabled && !paused && preference ? label : null,
    preference,
    recalculate: () => recalculateRef.current()
  }
}
