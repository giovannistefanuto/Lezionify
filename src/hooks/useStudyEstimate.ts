import { useEffect, useMemo, useState, useRef, type RefObject } from 'react'
import { contentFingerprint } from '../utils/readingPosition'
import { observeParagraphs } from '../utils/paragraphObservation'
import { STUDY_TICK_EVENT, studySurfaceBlocked } from '../utils/studyActivity'
import { forecastSession, forecastBandLabel, discardStudyForecast } from '../utils/studyForecast'
import { getStudyHistoryClient, preserveLegacyStudyForecast, STUDY_HISTORY_STATUS } from '../utils/studyHistoryClient'
import type { ForecastMethod } from '../../shared/studyForecast'
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
  rootRef,
  qnaAnchor = '',
  collecting = true,
  managedActivity = false
}: {
  lectureId: string | null
  markdown: string | null
  english?: string | null
  enabled: boolean
  paused: boolean
  language: string
  rootRef: RefObject<HTMLDivElement | null>
  qnaAnchor?: string
  collecting?: boolean
  managedActivity?: boolean
}) {
  const [preference, setPreference] = useState(isStudyEstimateEnabled)
  const [label, setLabel] = useState<string | null>(null)
  const [uncertainty, setUncertainty] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const recalculateRef = useRef<() => void>(() => {})
  const persistRef = useRef<() => void>(() => {})
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const anchorRef = useRef(qnaAnchor)
  anchorRef.current = qnaAnchor
  const fingerprint = useMemo(() => markdown ? contentFingerprint(markdown) : '', [markdown])
  const englishFingerprint = useMemo(() => english ? contentFingerprint(english) : '', [english])
  useEffect(() => {
    if (!preference && lectureId) {
      discardStudyForecast(lectureId)
      void getStudyHistoryClient(lectureId)?.reset().catch(() => setHistoryError('Raccolta non salvata. Riprova.'))
    }
  }, [preference, lectureId])
  useEffect(() => {
    preserveLegacyStudyForecast()
    const update = (event: Event) => { const detail = (event as CustomEvent).detail; if (detail?.lectureId === lectureId) setHistoryError(detail.error) }
    window.addEventListener(STUDY_HISTORY_STATUS, update)
    return () => window.removeEventListener(STUDY_HISTORY_STATUS, update)
  }, [lectureId])
  useEffect(() => {
    if (paused) persistRef.current()
  }, [paused])
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
    setUncertainty(null)
    const client = getStudyHistoryClient(lectureId)
    client?.setSource(`${fingerprint}:${englishFingerprint}`, collecting && enabled && preference)
    if (!lectureId || !fingerprint || !enabled || !preference) return
    const key = PREFIX + lectureId
    const paragraphs = observeParagraphs(`${lectureId}:${fingerprint}:${englishFingerprint}`, language)
    const forecast = forecastSession(lectureId, `${fingerprint}:${englishFingerprint}`)
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
    let disposed = false, lastPrediction = 0, predictionGroup = '', pendingPrediction = false
    const uncertaintyFor = (predicted: number, position: number, method: ForecastMethod) => {
      if (!client) { setUncertainty(forecastBandLabel(predicted, forecast.predict(predicted, position, language, method))); return }
      if (!collecting || pendingPrediction || (Date.now() - lastPrediction < 10_000 && predictionGroup === `${method}:${Math.floor(position * 3)}`)) return
      pendingPrediction = true; lastPrediction = Date.now(); predictionGroup = `${method}:${Math.floor(position * 3)}`
      void client.predict({ predicted, position, method, language: language === 'en' ? 'en' : 'it' }).then(result => {
        if (result && !disposed) { setUncertainty(forecastBandLabel(predicted, result.band)); setHistoryError(null) }
      }).catch(() => { if (!disposed) setHistoryError('Previsione non salvata. La calibrazione è sospesa; riprova.') })
        .finally(() => { pendingPrediction = false })
    }
    let lastTick = Date.now(),
      lastInteraction = Date.now(),
      lastDisplay = 0,
      lastSave = 0
    let surface: 'reading' | 'qna' | 'pdf' = document.activeElement?.closest('.focus-qna-column') ? 'qna'
      : document.activeElement?.closest('.focus-pdf-column') ? 'pdf' : 'reading'
    const history: number[] = []
    const persist = () => {
      paragraphs.save()
      if (collecting && !client) forecast.save()
      if (client) void client.flush().catch(() => {})
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
    persistRef.current = persist
    recalculateRef.current = () => {
      const bin = rootRef.current ? studyBin(rootRef.current) : null
      if (bin === null) return
      state = newStudyEstimate(fingerprint, bin)
      paragraphs.reset()
      forecast.reset()
      void client?.reset().catch(() => setHistoryError('Ricalcolo non salvato. Riprova.'))
      history.length = 0
      lastDisplay = 0
      setLabel(null)
      setUncertainty(null)
      persist()
    }
    const interaction = (event: Event) => {
      lastInteraction = Date.now()
      const target = event.target
      if (!(target instanceof Element)) return
      if (rootRef.current?.contains(target)) surface = 'reading'
      else if (target.closest('.focus-qna-column')) surface = 'qna'
      else if (target.closest('.focus-pdf-column')) surface = 'pdf'
      client?.setContext(surface === 'pdf' ? 'slides' : surface)
    }
    const visibility = () => {
      lastTick = Date.now()
      setLabel(null)
      persist()
    }
    const tick = (creditedSeconds?: number) => {
      const now = Date.now(),
        delta = creditedSeconds ?? (now - lastTick) / 1000
      lastTick = now
      const blocked =
        pausedRef.current ||
        studySurfaceBlocked() ||
        (!managedActivity && now - lastInteraction > 15 * 60_000) ||
        delta <= 0 || delta > 3
      if (blocked) {
        setLabel(null)
        return
      }
      const root = rootRef.current
      if (!root || !root.getBoundingClientRect().height) return
      if (surface === 'qna' && !document.querySelector('.focus-qna-column')) surface = 'reading'
      if (surface === 'pdf' && !document.querySelector('.focus-pdf-column')?.getBoundingClientRect().height) surface = 'reading'
      const visibleRange = studyVisibleRange(root)
      state = sampleVisibleStudy(state, delta, surface === 'reading' ? visibleRange : null)
      if (collecting && !client) forecast.tick(delta, surface === 'reading' && visibleRange ? visibleRange.end / STUDY_BINS : null)
      client?.setContext(surface === 'pdf' ? 'slides' : surface, surface === 'reading' && visibleRange ? visibleRange.end / STUDY_BINS : undefined)
      const paragraphLabel = surface !== 'pdf' ? paragraphs.tick(root, delta, surface, surface === 'qna' ? anchorRef.current : '') : null
      const prediction = paragraphs.prediction()
      if (prediction && paragraphLabel) {
        uncertaintyFor(prediction.remaining, prediction.position, 'paragraph-v2')
      }
      if (paragraphLabel) { setLabel(paragraphLabel); lastDisplay = now }
      if (now - lastSave >= 10_000) {
        persist()
        lastSave = now
      }
      const minutes = estimateStudyMinutes(state)
      if (surface !== 'reading' || minutes === null) {
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
        const position = visibleRange ? visibleRange.start / STUDY_BINS : 0
        uncertaintyFor(median * 60, position, 'viewport-v2')
        lastDisplay = now
      }
    }
    for (const name of ['pointerdown', 'wheel', 'keydown', 'focusin'])
      document.addEventListener(name, interaction, true)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('blur', visibility)
    const credited = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail?.lectureId === lectureId && detail.seconds === 1) tick(1)
    }
    if (managedActivity) document.addEventListener(STUDY_TICK_EVENT, credited)
    const timer = managedActivity ? null : setInterval(tick, 1000)
    return () => {
      disposed = true
      if (timer !== null) clearInterval(timer)
      document.removeEventListener(STUDY_TICK_EVENT, credited)
      persist()
      recalculateRef.current = () => {}
      persistRef.current = () => {}
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
    language,
    rootRef,
    collecting,
    managedActivity
  ])
  return {
    label: enabled && !paused && preference ? label : null,
    uncertainty,
    historyError,
    preference,
    recalculate: () => recalculateRef.current(),
    persist: () => persistRef.current()
  }
}
