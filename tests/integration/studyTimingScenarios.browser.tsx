import React, { act, useRef } from 'react'
import type { Root } from 'react-dom/client'
import { observeParagraphs } from '../../src/utils/paragraphObservation'
import { useStudyTracker } from '../../src/hooks/useStudyTracker'
import { useStudyEstimate } from '../../src/hooks/useStudyEstimate'
import { StudyEstimateDetails } from '../../src/components/StudyEstimateDetails'
import { FORECAST_RUN_PREFIX, readForecastHistory } from '../../src/utils/studyForecast'
import { LectureDrawer } from '../../src/components/LectureDrawer'
import { contentFingerprint } from '../../src/utils/readingPosition'

declare const require: any
export async function runStudyTimingScenarios(root: Root, api: any) {
  const ipc = require('electron').ipcRenderer
  const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
  const render = async (node: React.ReactNode) => act(async () => root.render(node))
  const stored = { ...localStorage }
  const previousApi = { ...api }
  const originalNow = Date.now, originalInterval = window.setInterval, originalClear = window.clearInterval, originalFocus = document.hasFocus
  const style = document.createElement('style')
  style.textContent = await ipc.invoke('video-import-styles'); document.head.append(style)
  let now = Date.now(), next = 0, focused = true
  const timers = new Map<number, () => void>()
  let tracker: any, estimate: any
  function Harness({ memo = false }: { memo?: boolean }) {
    const ref = useRef<HTMLDivElement>(null)
    tracker = useStudyTracker({ activeLectureId: 'timing', courseCode: 'TEST', isFocusMode: true, activeTab: 'markdown', isEnabled: true, suspended: memo })
    estimate = useStudyEstimate({ lectureId: 'timing', markdown: 'timing-source', rootRef: ref, language: 'it', enabled: true, paused: tracker.trackingPaused, managedActivity: true })
    return <><div ref={ref} style={{ height: 200, overflow: 'auto' }} data-timing-root><div className="markdown-body">{Array.from({ length: 12 }, (_, i) => <p key={i} style={{ height: 200, margin: 0 }}>Blocco {i}. {'Studio sintetico di parole e concetti. '.repeat(10)}</p>)}</div></div><div className="focus-qna-column" tabIndex={0}>Domande</div></>
  }
  const tick = async (count: number) => {
    for (let i = 0; i < count; i++) await act(async () => { now += 1000; for (const cb of [...timers.values()]) cb() })
  }
  try {
    localStorage.clear()
    await render(<div data-observer-root style={{ height: 200, overflow: 'auto' }}><div className="markdown-body">{Array.from({ length: 12 }, (_, i) => <p key={i} style={{ height: 200, margin: 0 }}>Blocco {i}. {'Studio sintetico di parole e concetti. '.repeat(10)}</p>)}</div></div>)
    const scroller = document.querySelector<HTMLElement>('[data-observer-root]')!
    const observation = observeParagraphs('qna-assignment', 'it')
    for (let i = 0; i < 20; i++) observation.tick(scroller, 1, 'qna', 'Blocco 0.')
    scroller.scrollTop = 200; observation.tick(scroller, 1); observation.save()
    check(JSON.parse(localStorage.getItem('lezionify.paragraph-samples.v1') ?? '[]').length === 0, 'Q&A invented reading coverage')
    scroller.scrollTop = 0
    for (let i = 0; i < 30; i++) observation.tick(scroller, 1)
    scroller.scrollTop = 200; observation.tick(scroller, 1); observation.save()
    let samples = JSON.parse(localStorage.getItem('lezionify.paragraph-samples.v1')!)
    check(samples.length === 1 && samples[0].seconds === 50, 'Q&A was not included exactly once in its block')
    for (let i = 0; i < 10; i++) observation.tick(scroller, 1, 'qna', 'Blocco 0.')
    observation.save(); samples = JSON.parse(localStorage.getItem('lezionify.paragraph-samples.v1')!)
    check(samples.length === 1 && samples[0].seconds === 60, 'Q&A on an already passed paragraph lost time or duplicated samples')
    const restarted = observeParagraphs('qna-assignment', 'it')
    restarted.tick(scroller, 1, 'qna', 'Blocco 0.'); restarted.save()
    check(JSON.parse(localStorage.getItem('lezionify.paragraph-samples.v1')!)[0].seconds === 61, 'Restart lost Q&A paragraph attribution')
    for (let i = 0; i < 30; i++) restarted.tick(scroller, 1)
    scroller.scrollTop = 400; restarted.tick(scroller, 1)
    const normalPosition = restarted.prediction()!.position
    scroller.querySelector<HTMLElement>('.markdown-body')!.style.zoom = '2'
    scroller.scrollTop = 800; restarted.tick(scroller, 1)
    check(Math.abs(restarted.prediction()!.position - normalPosition) < 0.001, 'Text zoom changes the statistical phase of the same paragraph')
    await render(null)

    Date.now = () => now
    document.hasFocus = () => focused
    window.setInterval = ((cb: () => void) => { timers.set(++next, cb); return next }) as typeof window.setInterval
    window.clearInterval = id => { timers.delete(id) }
    api.saveStudySession = async () => {}
    api.getLectureStudySeconds = async () => 0
    await render(<React.StrictMode><Harness /></React.StrictMode>)
    await tick(10)
    estimate.persist()
    const state = () => JSON.parse(localStorage.getItem('lezionify.study-estimate.v1:timing')!)
    check(tracker.activeSeconds === 10 && state().seconds === 10, 'Clock and estimator disagree on active study')
    await render(<React.StrictMode><Harness memo /></React.StrictMode>)
    await tick(10); estimate.persist()
    check(tracker.activeSeconds === 10 && state().seconds === 10, 'Memo contaminated clock or estimate')
    await render(<React.StrictMode><Harness /></React.StrictMode>)
    const overlay = document.createElement('div'); overlay.setAttribute('data-dictionary-overlay', ''); document.body.append(overlay)
    await tick(10); estimate.persist()
    check(tracker.activeSeconds === 10 && state().seconds === 10, 'Translator contaminated clock or estimate')
    overlay.remove()
    await tick(1); estimate.persist()
    check(tracker.activeSeconds === 11 && state().seconds === 11, 'Closing translator lost or added a second between clock and estimator')
    focused = false
    await act(async () => window.dispatchEvent(new Event('blur')))
    await tick(10); estimate.persist()
    check(tracker.activeSeconds === 11 && state().seconds === 11, 'Other window contaminated clock or estimate')
    focused = true
    await act(async () => window.dispatchEvent(new Event('focus')))
    const dwell = [...state().dwell]
    await act(async () => document.querySelector('.focus-qna-column')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })))
    await tick(20); estimate.persist()
    check(tracker.activeSeconds === 31 && state().seconds === 31 && JSON.stringify(state().dwell) === JSON.stringify(dwell), 'Q&A duplicated seconds or invented document progress')
    const run = JSON.parse(localStorage.getItem(FORECAST_RUN_PREFIX + 'timing')!)
    check(run.elapsed === 31, 'Forecast outcomes use a different active-time clock')
    await render(null)
    Date.now = originalNow; window.setInterval = originalInterval; window.clearInterval = originalClear

    // Real drawer completion path: failed persistence cannot create an outcome.
    const source = '# Lezione\n\n' + 'Studio sintetico.\n\n'.repeat(30)
    const fingerprint = `${contentFingerprint(source)}:`
    const lesson = { id: 'timing-completion', courseCode: 'TEST', sourceAudioFileName: 'test.mp3', studyStatus: 'in-corso' }
    localStorage.setItem(FORECAST_RUN_PREFIX + lesson.id, JSON.stringify({ fingerprint, elapsed: 300, furthest: 0.99, points: [{ elapsed: 100, predicted: 180, method: 'paragraph-v2', phase: 2, language: 'it' }] }))
    let succeeds = false
    const noop = () => {}
    const props: any = { selectedLecture: lesson, allLectures: [lesson], onClose: noop, activeTab: 'markdown', setActiveTab: noop, markdownText: source,
      isGeneratingStudySet: false, onGenerateStudySet: noop, isLoadingContent: false, isGenerating: false, isTranscribing: false,
      setIsEditingMetadata: noop, setEditCourseCode: noop, setEditRecordedAt: noop, setShowDeleteConfirm: noop, existingCourses: [],
      onStudyStatusChange: async () => succeeds, onGenerateLectureNotes: noop, onPrintNotes: noop, onCopyMarkdown: noop, onCopyTranscript: noop,
      onAttachTranscript: noop, onTranscribeAudio: noop, onPasteFromClipboard: noop, onSaveMetadata: noop, onDeleteLecture: noop, onOpenSettings: noop,
      formatDate: () => '', formatFileSize: () => '', studyStatusLabels: Object.fromEntries(['da-studiare', 'in-corso', 'completata'].map(status => [status, { label: status, icon: '', className: '' }])) }
    api.loadQnaThreads = async () => []; api.getHighlights = async () => []; api.getReminders = async () => []; api.getLectureWordCounts = async () => ({})
    await render(<LectureDrawer {...props} />)
    const complete = [...document.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === 'completata')!
    check(complete, 'Study completion status control missing from real drawer')
    await act(async () => complete.click())
    check(readForecastHistory().length === 0, 'Failed study-status save created a statistical outcome')
    succeeds = true
    await act(async () => complete.click())
    check(readForecastHistory().length === 1 && readForecastHistory()[0].actual === 200, 'Successful drawer completion did not finish forecast history')
    await render(null)

    let recalculations = 0
    await render(<div className="focus-mode-overlay"><div className="focus-mode-toolbar"><span>Lezione sintetica · Focus</span><div className="focus-toolbar-right"><StudyEstimateDetails label="Paragrafo: circa 3 min · Studio restante: circa 195 min · Totale: circa 210 min" uncertainty="Studio restante: circa 195 ± 20 min (175–215 min). Intervallo empirico al 90% su 24 lezioni confrontabili. Copertura successiva osservata: 90% su 10 lezioni." paused={false} onRecalculate={() => { recalculations++ }} /></div></div><main style={{ padding: 32 }}><h1>Studio senza distrazioni</h1><p>La stima rimane disponibile su richiesta.</p></main></div>)
    const trigger = document.querySelector<HTMLButtonElement>('.study-estimate-trigger')!
    check(!document.querySelector('.study-estimate-panel') && !document.body.textContent?.includes('195'), 'Remaining minutes distract in the closed toolbar')
    await act(async () => trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
    check(document.querySelector('.study-estimate-panel'), 'Hover does not reveal estimate')
    await act(async () => trigger.focus())
    const panel = () => document.querySelector<HTMLElement>('.study-estimate-panel')!
    check(trigger.getAttribute('aria-expanded') === 'true' && panel().textContent?.includes('± 20'), 'Keyboard focus did not expose estimate and uncertainty')
    await ipc.invoke('capture-video-import', 'oct28-estimate-light')
    document.documentElement.setAttribute('data-theme', 'dark')
    await ipc.invoke('capture-video-import', 'oct28-estimate-dark')
    await act(async () => trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
    check(!document.querySelector('.study-estimate-panel') && document.activeElement === trigger, 'Escape failed to dismiss estimate and restore focus')
    await act(async () => trigger.click())
    check(panel(), 'Click did not pin estimate')
    await act(async () => panel().querySelector<HTMLButtonElement>('button')!.click())
    check(recalculations === 1, 'Recalculation command is missing from detail')
    await ipc.invoke('feature-test-window-size', { width: 390, height: 700 })
    await act(async () => { window.dispatchEvent(new Event('resize')); await new Promise(resolve => setTimeout(resolve, 100)) })
    let bounds = panel().getBoundingClientRect()
    check(bounds.left >= 0 && bounds.right <= window.innerWidth && bounds.bottom <= window.innerHeight, 'Estimate overflows narrow window')
    await ipc.invoke('capture-video-import', 'oct28-estimate-narrow')
    await ipc.invoke('feature-test-window-size', { width: 1240, height: 820 })
    await ipc.invoke('feature-test-zoom', 2)
    await act(async () => { window.dispatchEvent(new Event('resize')); await new Promise(resolve => setTimeout(resolve, 100)) })
    bounds = panel().getBoundingClientRect()
    check(bounds.left >= 0 && bounds.right <= window.innerWidth && bounds.bottom <= window.innerHeight,
      `Estimate overflows at 200% zoom: ${JSON.stringify({ left: bounds.left, right: bounds.right, bottom: bounds.bottom, width: window.innerWidth, height: window.innerHeight })}`)
    await ipc.invoke('capture-video-import', 'oct28-estimate-zoom')
  } finally {
    await render(null)
    Date.now = originalNow; window.setInterval = originalInterval; window.clearInterval = originalClear; document.hasFocus = originalFocus
    Object.assign(api, previousApi)
    localStorage.clear(); for (const [key, value] of Object.entries(stored)) localStorage.setItem(key, value)
    document.documentElement.removeAttribute('data-theme'); style.remove()
    await ipc.invoke('feature-test-zoom', 1); await ipc.invoke('feature-test-window-size', false)
  }
}
