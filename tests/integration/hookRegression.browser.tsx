import { runOctober22Scenarios } from './october22Scenarios.browser'
import { runInterfacePolishScenarios } from './interfacePolishScenarios.browser'
import { runTodayScenarios } from './todayScenarios.browser'
import { runMemoLogsExportScenarios } from './memoLogsExportScenarios.browser'
import { runCourseChatScenarios } from './courseChatScenarios.browser'
import { runStudyToolsScenarios } from './studyToolsScenarios.browser'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useQna } from '../../src/hooks/useQna'
import { useArchivePipeline } from '../../src/hooks/useArchivePipeline'
import { useGeminiGeneration } from '../../src/hooks/useGeminiGeneration'
import {
  invalidateLectureContentCache,
  useLectureContent
} from '../../src/hooks/useLectureContent'
import { useStudyTracker } from '../../src/hooks/useStudyTracker'
import { useFocusStudyStatus } from '../../src/hooks/useFocusStudyStatus'
import { useFinalLectureReturn } from '../../src/hooks/useFinalLectureReturn'
import { runLanguageShortcutScenarios } from './languageShortcutScenarios.browser'
import { useLectures } from '../../src/hooks/useLectures'
import { useSettings } from '../../src/hooks/useSettings'
import { SettingsModal } from '../../src/components/SettingsModal'
import { useQuickCapture } from '../../src/hooks/useQuickCapture'
import { useHighlights } from '../../src/hooks/useHighlights'
import { LectureList } from '../../src/components/LectureList'
import { Sidebar } from '../../src/components/Sidebar'
import { FocusReminders } from '../../src/components/FocusReminders'
import { MarkdownViewer } from '../../src/components/MarkdownViewer'
import { FocusLockModal } from '../../src/components/FocusLockModal'
import { PauseTimerOverlay } from '../../src/components/PauseTimerOverlay'
import { Dashboard } from '../../src/components/Dashboard'
import { CourseManagementModal } from '../../src/components/CourseManagementModal'
import { LectureDrawer } from '../../src/components/LectureDrawer'
import { StudySetTab } from '../../src/components/StudySetTab'
import { runVideoImportScenarios } from './videoImportScenarios.browser'
import { runLectureListScenarios } from './lectureListScenarios.browser'
import { runFocusPdfScenarios } from './focusPdfScenarios.browser'
import { runDiscussionDiagnosticsScenarios } from './discussionDiagnosticsScenarios.browser'
import { runDictionaryScenarios } from './dictionaryScenarios.browser'
import { runReadingPositionScenarios } from './readingPositionScenarios.browser'
import { runReadingRestart } from './readingRestart.browser'
import { runQnaImageScenarios } from './qnaImageScenarios.browser'
import { runMusicTranslationScenarios } from './musicTranslationScenarios.browser'
import { captureLanguagePoint } from '../../src/utils/sectionAlignment'

declare const require: any
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
const root = createRoot(document.getElementById('root')!)
let output: any
let props: any
let hook: (p: any) => any
function Harness() {
  output = hook(props)
  return null
}
async function render(next: any) {
  props = next
  await act(async () => {
    root.render(
      <React.StrictMode>
        <Harness />
      </React.StrictMode>
    )
  })
}
async function reset(nextHook: any, nextProps: any) {
  await act(async () => {
    root.render(null)
  })
  hook = nextHook
  await render(nextProps)
}
function check(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}
function deferred() {
  let resolve!: (value: any) => void
  const promise = new Promise<any>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
const saved: { id: string; data: any }[] = []
let chunk: (data: any) => void = () => {}
let request: any
let generation = deferred()
let generationProgress: (data: any) => void = () => {}
let requestedGenerationJobId = ''
const thread = {
  id: 't1',
  quote: 'test',
  messages: [],
  createdAt: '',
  updatedAt: ''
}
const api: any = {
  spotifyConnection: async () => ({ clientId: '', connected: false, callback: 'http://127.0.0.1:43821/callback' }),
  loadQnaThreads: async (id: string) => (id === 'A' ? [thread] : []),
  saveQnaThreads: async (id: string, data: any) => {
    saved.push({ id, data: structuredClone(data) })
  },
  onQnaChunk: (cb: any) => {
    chunk = cb
    return () => {}
  },
  onQnaStatus: () => () => {},
  generateQnaResponse: (_id: string, value: any) => {
    request = value
    return generation.promise
  },
  onGenerationProgress: (cb: any) => {
    generationProgress = cb
    return () => {}
  },
  generateLectureNotes: (_id: string, jobId: string) => {
    requestedGenerationJobId = jobId
    return generation.promise
  },
  translateLectureNotes: (_id: string, jobId: string) => {
    requestedGenerationJobId = jobId
    return generation.promise
  },
  transcribeAudio: (_id: string, jobId: string) => {
    requestedGenerationJobId = jobId
    return generation.promise
  },
  generateStudySet: () => generation.promise,
  readStudySet: async () => null,
  readMarkdown: async () => null,
  readMarkdownEn: async () => null,
  readTranscript: async () => null,
  getLectureStudySeconds: async () => 0
}
;(window as any).archive = api

async function runExpiredPauseScenario() {
  const performanceNowDescriptor = Object.getOwnPropertyDescriptor(performance, 'now')
  const originalNow = Date.now
  const originalInterval = window.setInterval
  const originalClearInterval = window.clearInterval
  const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
  const originalSave = api.saveStudySession
  const originalTotal = api.getLectureStudySeconds
  const callbacks = new Map<number, () => void>()
  const persisted = new Map<string, any>()
  let now = originalNow()
  let nextId = 0
  let hidden = false
  let exited = false
  let memoOpen = false
  Date.now = () => now
  Object.defineProperty(performance, 'now', { configurable: true, value: () => now })
  window.setInterval = ((callback: () => void) => {
    callbacks.set(++nextId, callback)
    return nextId
  }) as typeof window.setInterval
  window.clearInterval = id => { callbacks.delete(id) }
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  api.saveStudySession = async (session: any) => { persisted.set(session.id, session) }
  api.getLectureStudySeconds = async () => 120
  function PauseHarness() {
    output = useStudyTracker({ activeLectureId: 'pause-synthetic', courseCode: 'TEST', isFocusMode: true, activeTab: 'markdown', isEnabled: true, suspended: memoOpen })
    return <PauseTimerOverlay show={output.pauseTimerActive} minutes={output.pauseMinutes}
      onReturnToStudy={output.resumeFromPause} onQuit={output.exitFromPause} />
  }
  async function tick(milliseconds = 1000) {
    await act(async () => {
      now += milliseconds
      for (const callback of [...callbacks.values()]) callback()
    })
  }
  async function visibility(value: boolean) {
    await act(async () => {
      hidden = value
      document.dispatchEvent(new Event('visibilitychange'))
    })
  }
  try {
    await act(async () => root.render(<React.StrictMode><PauseHarness /></React.StrictMode>))
    let quickExits = 0
    await act(async () => output.requestExitFocus(() => { quickExits++ }))
    check(quickExits === 1 && !output.showFocusLock, 'Fresh Focus entry must exit immediately')
    now += 299999
    await act(async () => output.requestExitFocus(() => { quickExits++ }))
    check(quickExits === 2 && !output.showFocusLock, 'Focus exit must remain immediate before five minutes')
    now++
    await act(async () => output.requestExitFocus(() => { quickExits++ }))
    check(quickExits === 2 && output.showFocusLock && output.isPaused, 'Five-minute boundary must activate Focus Lock')
    await act(async () => output.handleContinueFocus())
    await act(async () => output.requestExitFocus(() => { quickExits++ }))
    check(output.showFocusLock && quickExits === 2, 'Continuing Focus must not reset the grace period')
    await act(async () => root.render(null))
    await act(async () => root.render(<React.StrictMode><PauseHarness /></React.StrictMode>))
    await act(async () => output.requestExitFocus(() => { quickExits++ }))
    check(quickExits === 3 && !output.showFocusLock, 'Reentering Focus must start a new grace period')
    for (let second = 0; second < 60; second++) await tick()
    check(output.activeSeconds === 60 && output.lectureTotalSeconds === 180, 'Study baseline or lesson total incorrect')
    memoOpen = true
    await act(async () => root.render(<React.StrictMode><PauseHarness /></React.StrictMode>))
    for (let second = 0; second < 10; second++) {
      await act(async () => window.dispatchEvent(new MouseEvent('mousemove')))
      await tick()
    }
    check(output.activeSeconds === 60 && output.isPaused, 'Memo counted study time or its interactions resumed tracking')
    memoOpen = false
    await act(async () => root.render(<React.StrictMode><PauseHarness /></React.StrictMode>))
    check(output.activeSeconds === 60 && !output.isPaused, 'Closing Memo reset or failed to resume the session')
    await act(async () => output.startPauseTimer(5))
    memoOpen = true
    await act(async () => root.render(<React.StrictMode><PauseHarness /></React.StrictMode>))
    memoOpen = false
    await act(async () => root.render(<React.StrictMode><PauseHarness /></React.StrictMode>))
    check(output.pauseTimerActive && output.isPaused, 'Closing Memo resumed an explicit pause')
    const resumeButton = document.querySelector('.pause-timer-resume-btn') as HTMLButtonElement
    resumeButton.focus()
    await tick(5 * 60 * 1000)
    check(document.querySelector('.pause-timer-title')?.textContent === 'Pausa terminata', 'Five-minute pause did not expire')
    check(document.activeElement === resumeButton && resumeButton.isConnected, 'Expiry replaced the focused resume button')
    check(!document.querySelector('.pause-timer-subtext'), 'Expired pause must omit the removed paragraph')
    // Another 25 minutes away, including PC suspension and a return to the app.
    await visibility(true)
    await tick(25 * 60 * 1000)
    await visibility(false)
    await act(async () => {
      window.dispatchEvent(new MouseEvent('mousemove'))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
      window.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new MouseEvent('click'))
    })
    await tick()
    await act(async () => output.flushCurrentSession())
    check(output.pauseTimerActive && output.isPaused && output.activeSeconds === 60 && output.lectureTotalSeconds === 180,
      'Expired pause or window return automatically resumed study')
    check([...persisted.values()].reduce((sum, session) => sum + session.durationSeconds, 0) === 60,
      'Saved study statistics contain the thirty-minute pause')
    await act(async () => resumeButton.click())
    for (let second = 0; second < 10; second++) await tick()
    check(!output.pauseTimerActive && output.activeSeconds === 70 && output.lectureTotalSeconds === 190,
      'Explicit resume included elapsed pause or failed to resume')
    await act(async () => output.startPauseTimer(5))
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
    await tick()
    check(output.activeSeconds === 71 && !output.pauseTimerActive, 'Escape did not explicitly resume the pause')
    await tick(30 * 60 * 1000)
    await tick()
    check(output.activeSeconds === 71 && output.isPaused, 'Suspension during active study counted time away')
    await act(async () => window.dispatchEvent(new MouseEvent('mousemove')))
    await tick()
    check(output.activeSeconds === 72, 'Return after suspension failed to resume from a fresh tick')
    await act(async () => {
      output.requestExitFocus(() => { exited = true })
      output.startPauseTimer(5)
    })
    await tick(30 * 60 * 1000)
    await act(async () => (document.querySelector('.pause-timer-quit-btn') as HTMLButtonElement).click())
    await act(async () => output.flushCurrentSession())
    check(exited && [...persisted.values()].reduce((sum, session) => sum + session.durationSeconds, 0) === 72,
      'Quit from expired pause lost active study or persisted pause time')
  } finally {
    await act(async () => root.render(null))
    Date.now = originalNow
    if (performanceNowDescriptor) Object.defineProperty(performance, 'now', performanceNowDescriptor)
    else Reflect.deleteProperty(performance, 'now')
    window.setInterval = originalInterval
    window.clearInterval = originalClearInterval
    if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor)
    else Reflect.deleteProperty(document, 'hidden')
    api.saveStudySession = originalSave
    api.getLectureStudySeconds = originalTotal
  }
}

async function runMathRenderingScenario() {
  const source = '# Lezione sintetica\n\nSostituendo iterativamente:\n\n' + String.raw`$$\begin{aligned}
x &= 1 \\
&= 2
\end{aligned}$$` + '\n\nIl testo continua.\n\n## Ultimo capitolo\n\nFine della lezione.'
  for (const className of ['markdown-view-container', 'fullscreen-content']) {
    await act(async () => root.render(<div className={className}><MarkdownViewer content={source} /></div>))
    check(document.querySelector('.katex-display .katex'), 'Multiline aligned formula must render in both reading views')
    check(!document.querySelector('.katex-error'), 'Formula delimiters must not produce a KaTeX error')
    check(document.querySelector('.markdown-body h2')?.textContent === 'Ultimo capitolo', 'Formula must not swallow later headings')
    check(document.querySelector('.markdown-body > p:last-child')?.textContent === 'Fine della lezione.', 'Lecture ending must remain a paragraph')
    check(!document.querySelector('.markdown-body')!.textContent!.includes('undefined'), 'Rendering must not introduce undefined')
  }
  await act(async () => root.render(null))
}

async function runFinalLectureScenario() {
  const nativeTimeout = window.setTimeout, nativeClear = window.clearTimeout
  let now = 0, timerId = 700000, returns = 0, saves = 0
  const timers = new Map<number, { at: number; callback: () => void }>()
  window.setTimeout = ((callback: () => void, ms: number, ...args: any[]) => {
    if (ms !== 2000) return nativeTimeout(callback, ms, ...args)
    timers.set(++timerId, { at: now + ms, callback }); return timerId
  }) as typeof window.setTimeout
  window.clearTimeout = ((id: number) => { if (!timers.delete(id)) nativeClear(id) }) as typeof window.clearTimeout
  const lecture: any = { id: 'final-A', courseCode: 'A', studyStatus: 'da-studiare' }
  const done = { ...lecture, studyStatus: 'completata' }
  const gate = deferred()
  const base = { lecture, lectures: [lecture], saveStatus: async () => { saves++; return gate.promise }, onReturn: () => { returns++ } }
  const advance = async (ms: number) => {
    now += ms
    await act(async () => { for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback() } })
  }
  try {
    await reset(useFinalLectureReturn, base)
    let saving!: Promise<boolean>
    await act(async () => { saving = output.changeStatus('completata') })
    await act(async () => { check(await output.changeStatus('completata') === false, 'Duplicate completion must not save twice') })
    await render({ ...base, lecture: done, lectures: [done] })
    check(saves === 1 && !output.isReturning && timers.size === 0, 'Optimistic completion must wait for persistence')
    await act(async () => { gate.resolve(true); await saving })
    check(output.isReturning && timers.size === 1, 'Successful last completion must arm one timer')
    await advance(1999); check(returns === 0, 'Last lecture must remain visible for two seconds')
    await render({ ...props, onReturn: () => { returns++ } })
    await advance(1); check(returns === 1 && !output.isReturning, 'Callback refresh must not restart timer or close twice')
    await advance(4000); check(returns === 1, 'Return must happen once')
    await reset(useFinalLectureReturn, { ...base, lecture: done, lectures: [done] })
    check(!output.isReturning && timers.size === 0, 'Reopening completed lecture must remain readable')

    const complete = async (extra: any[] = [], success = true) => {
      const completion = deferred()
      const options = { ...base, lectures: [lecture, ...extra], saveStatus: () => completion.promise }
      await reset(useFinalLectureReturn, options)
      await act(async () => { saving = output.changeStatus('completata') })
      await render({ ...options, lecture: done, lectures: [done, ...extra] })
      await act(async () => { completion.resolve(success); await saving })
    }
    await complete([], false)
    check(!output.isReturning && timers.size === 0, 'Failed save must never close the lesson')
    await complete([{ id: 'earlier', courseCode: 'A', studyStatus: 'in-corso' }])
    check(!output.isReturning && timers.size === 0, 'An earlier unfinished lecture prevents final return')
    await complete([{ id: 'later', courseCode: 'A', studyStatus: 'completata' }, { id: 'other', courseCode: 'B', studyStatus: 'da-studiare' }])
    check(output.isReturning, 'Completed later lessons and other courses must not block final return')
    await render({ ...props, lecture: { ...done, id: 'another' } })
    await advance(2000); check(returns === 1 && timers.size === 0, 'Changing selected lecture must cancel return')
    await complete()
    await render({ ...props, lecture: { ...done, studyStatus: 'in-corso' } })
    await advance(2000); check(returns === 1, 'Reverting completion must cancel timer')
    await complete()
    await act(async () => root.render(null))
    await advance(2000); check(returns === 1 && timers.size === 0, 'Unmount must cancel pending return')
    const slow = deferred()
    await reset(useFinalLectureReturn, { ...base, saveStatus: () => slow.promise })
    await act(async () => { saving = output.changeStatus('completata') })
    await render({ ...props, lecture: { ...lecture, id: 'new-selection' } })
    await act(async () => { slow.resolve(true); await saving })
    check(!output.isReturning && timers.size === 0, 'Late persistence from previous selection must not arm return')
  } finally {
    await act(async () => root.render(null))
    window.setTimeout = nativeTimeout; window.clearTimeout = nativeClear
  }
}

async function run() {
  if (new URLSearchParams(location.search).has('october22-only')) {
    await runOctober22Scenarios(root, api)
    require('electron').ipcRenderer.send('done', 'PASS: October22 accessibility, copy guard, Q&A Medium, course consent and long chat')
    return
  }
  if (new URLSearchParams(location.search).has('interface-polish-only')) {
    await runInterfacePolishScenarios(root, api)
    require('electron').ipcRenderer.send('done', 'PASS interface polish')
    return
  }
  if (new URLSearchParams(location.search).has('today-only')) {
    await runTodayScenarios(root, api)
    require('electron').ipcRenderer.send('done', 'PASS: today Q&A zoom, context, resize, Memo, battery, downloads and Mermaid')
    return
  }
  if (new URLSearchParams(location.search).has('lecture-list-only')) {
    await runLectureListScenarios(root)
    require('electron').ipcRenderer.send('done', 'PASS: lecture list and two-step course PDF export with optional laboratory')
    return
  }
  if (new URLSearchParams(location.search).has('course-rag-only')) {
    await runCourseChatScenarios(root, api)
    require('electron').ipcRenderer.send('done', 'PASS: course chat, PDF citations, explicit visual send, drafts, counts and course isolation')
    return
  }
  if (new URLSearchParams(location.search).has('memo-logs-export-only')) {
    await runMemoLogsExportScenarios(root, api)
    require('electron').ipcRenderer.send('done', 'PASS memo, logs and export')
    return
  }
  if (new URLSearchParams(location.search).has('study-tools-only')) {
    await runStudyToolsScenarios(root, api)
    require('electron').ipcRenderer.send('done', 'PASS: grouped captures and study remaining time')
    return
  }
  if (new URLSearchParams(window.location.search).has('languageShortcutOnly')) {
    require('electron').ipcRenderer.send('test-checkpoint', 'runLanguageShortcutScenarios')
    await runLanguageShortcutScenarios(root)
    require('electron').ipcRenderer.send('done', 'PASS: native Ctrl+L and language button in ordinary and Focus reading')
    return
  }
  if (new URLSearchParams(window.location.search).has('focusPdfOnly')) {
    require('electron').ipcRenderer.send('test-checkpoint', 'runFocusPdfScenarios')
    await runFocusPdfScenarios(root, api)
    require('electron').ipcRenderer.send('done', 'PASS: Focus PDF composition, selection, keyboard and reading regressions')
    return
  }
  if (new URLSearchParams(window.location.search).has('musicOnly')) {
    require('electron').ipcRenderer.send('test-checkpoint', 'runMusicTranslationScenarios')
    await runMusicTranslationScenarios(root, api)
    require('electron').ipcRenderer.send('done', 'PASS: music artwork, automatic PC selection, consent, player commands and YouTube cards')
    return
  }
  if (new URLSearchParams(window.location.search).has('mathRenderingOnly')) {
    require('electron').ipcRenderer.send('test-checkpoint', 'runMathRenderingScenario')
    await runMathRenderingScenario()
    require('electron').ipcRenderer.send('done', 'PASS: multiline display math and lecture continuation in ordinary and Focus reading')
    return
  }
  if (new URLSearchParams(window.location.search).has('dictionaryOnly')) {
    require('electron').ipcRenderer.send('test-checkpoint', 'runDictionaryScenarios')
    await runDictionaryScenarios(root, api)
    require('electron').ipcRenderer.send('done', 'PASS: offline dictionary automatic IT/EN, manual direction, ambiguity, Focus, stale responses and retry')
    return
  }
  if (new URLSearchParams(window.location.search).has('studyPauseOnly')) {
    require('electron').ipcRenderer.send('test-checkpoint', 'runFinalLectureScenario')
    await runFinalLectureScenario()
    require('electron').ipcRenderer.send('test-checkpoint', 'runExpiredPauseScenario')
    await runExpiredPauseScenario()
    require('electron').ipcRenderer.send('done', 'PASS: final lecture persisted completion, two-second return, cancellation, study pause and saved totals')
    return
  }
  if (new URLSearchParams(window.location.search).has('readingPositionOnly')) {
    require('electron').ipcRenderer.send('test-checkpoint', 'runReadingPositionScenarios')
    await runReadingPositionScenarios(root)
    require('electron').ipcRenderer.send('done', 'PASS: Markdown reading positions and Focus Mermaid folding')
    return
  }
  if (new URLSearchParams(window.location.search).has('readingRestartOnly')) {
    require('electron').ipcRenderer.send('test-checkpoint', 'runReadingRestart')
    await runReadingRestart(root, false)
    require('electron').ipcRenderer.send('done', 'PASS reading restart initial process')
    return
  }
  if (new URLSearchParams(window.location.search).has('resumeReading')) {
    require('electron').ipcRenderer.send('test-checkpoint', 'runReadingRestart')
    await runReadingRestart(root, true)
    require('electron').ipcRenderer.send('done', 'PASS: Markdown and PDF reading coordinates restored after a full Electron process restart')
    return
  }
  require('electron').ipcRenderer.send('test-checkpoint', 'runFinalLectureScenario')
  await runFinalLectureScenario()
  require('electron').ipcRenderer.send('test-checkpoint', 'runExpiredPauseScenario')
  await runExpiredPauseScenario()
  const originalTimeout = window.setTimeout
  const originalClearTimeout = window.clearTimeout
  let focusClock = 0
  let timerId = 0
  const focusTimers = new Map<number, { at: number; callback: () => void }>()
  const statusChanges: string[] = []
  const focusProps = {
    lectureId: 'focus-A', studyStatus: 'da-studiare', isFocusMode: false,
    onStudyStatusChange: (status: string) => statusChanges.push(status)
  }
  window.setTimeout = ((callback: () => void, delay: number) => {
    const id = ++timerId
    focusTimers.set(id, { at: focusClock + delay, callback })
    return id
  }) as typeof window.setTimeout
  window.clearTimeout = (id) => { focusTimers.delete(id) }
  const advanceFocus = async (milliseconds: number) => {
    focusClock += milliseconds
    await act(async () => {
      for (const [id, timer] of focusTimers) {
        if (timer.at <= focusClock) {
          focusTimers.delete(id)
          timer.callback()
        }
      }
    })
  }
  try {
    await reset(useFocusStudyStatus, focusProps)
    await advanceFocus(900001)
    check(statusChanges.length === 0, 'Normal drawer must not promote study status')
    await render({ ...focusProps, isFocusMode: true })
    await advanceFocus(900000)
    check(statusChanges.length === 0, 'Focus must exceed fifteen minutes')
    await render({ ...focusProps, isFocusMode: true,
      onStudyStatusChange: (status: string) => statusChanges.push(`latest:${status}`) })
    await advanceFocus(1)
    check(statusChanges.join() === 'latest:in-corso', 'Re-render reset timer or used stale callback')
    await advanceFocus(900001)
    check(statusChanges.length === 1, 'Focus must promote only once')
    await render(focusProps)
    await render({ ...focusProps, isFocusMode: true })
    await advanceFocus(600000)
    await render({ ...focusProps, lectureId: 'focus-B', isFocusMode: true })
    await advanceFocus(300001)
    check(statusChanges.length === 1, 'Lecture change must reset focus time')
    await render(focusProps)
    await advanceFocus(900001)
    check(statusChanges.length === 1, 'Leaving focus must cancel promotion')
    for (const studyStatus of ['in-corso', 'completata']) {
      await render({ ...focusProps, studyStatus, isFocusMode: true })
      await advanceFocus(900001)
    }
    check(statusChanges.length === 1, 'Existing progress must be preserved')
    await render({ ...focusProps, isFocusMode: true })
    await advanceFocus(600000)
    await render({ ...focusProps, studyStatus: 'completata', isFocusMode: true })
    await advanceFocus(300001)
    check(statusChanges.length === 1, 'Manual completion must cancel promotion')
    await render({ ...focusProps, isFocusMode: true })
    await act(async () => { root.render(null) })
    check(focusTimers.size === 0, 'Unmount must clear focus timer')
  } finally {
    window.setTimeout = originalTimeout
    window.clearTimeout = originalClearTimeout
  }
  const settingsNotice: string[] = []
  const savedSettings: any[] = []
  let publishingConfigured = false
  let settingsData: any = { apiKey: '', apiKeys: [], activeKeyIndex: 0, autoRotateOnQuota: true,
    model: 'gemini-3.6-flash', publishing: { enabled: false, repoUrl: '', branch: 'main', autoPublishOnStartup: true } }
  api.getSettings = async () => settingsData
  api.getPublishingStatus = async () => ({ configured: publishingConfigured, enabled: publishingConfigured,
    unpublishedCount: 0, lastPublishAt: null, lastError: null, connection: 'online', phase: 'synced' })
  api.saveSettings = async (updates: any) => {
    savedSettings.push(updates)
    const configuration = { ...updates.publishing }
    delete configuration.githubToken
    publishingConfigured = true
    settingsData = { ...settingsData, ...updates, publishing: configuration }
    return settingsData
  }
  await reset(() => useSettings((message: string) => settingsNotice.push(message)), undefined)
  await act(async () => { await output.loadSettings(); output.openSettingsModal() })
  await act(async () => {
    output.setPublishingEnabled(true)
    output.setPublishingRepoUrl('https://github.com/synthetic/notes')
    output.setPublishingToken('synthetic-test-token')
  })
  await act(async () => { await output.handleSaveSettings() })
  check(savedSettings[0].publishing.githubToken === 'synthetic-test-token', 'PAT was not passed to settings write')
  check(savedSettings[0].publishing.autoPublishOnStartup === true, 'UI did not force automatic startup publication')
  check(output.publishingToken === '' && !output.settings.publishing.githubToken, 'PAT retained after a successful save')
  check(!settingsNotice.join('').includes('synthetic-test-token'), 'PAT leaked in settings notices')
  await act(async () => output.openSettingsModal())
  await act(async () => { await output.handleSaveSettings() })
  check(!('githubToken' in savedSettings[1].publishing), 'Empty PAT field overwrote saved credentials')
  await act(async () => { output.setPublishingToken('replacement'); output.setShowSettingsModal(false) })
  check(output.publishingToken === '', 'Closing the settings modal did not discard the typed PAT')

  const settingsProps: any = {
    show: true, onClose: () => {}, inputApiKeys: [], inputApiKeyQuotaGroups: [], setQuotaGroupForKey: () => {},
    activeKeyIdx: 0, setActiveKeyIdx: () => {}, autoRotate: true, setAutoRotate: () => {},
    autoProcessOnImport: false, setAutoProcessOnImport: () => {}, inputModel: 'gemini-3.6-flash', setInputModel: () => {},
    newKeyInput: '', setNewKeyInput: () => {}, keyTestStates: {}, isSaving: false, onAddKey: () => {},
    onRemoveKey: () => {}, onTestKey: () => {}, onSave: () => {},
    publishingEnabled: true, setPublishingEnabled: () => {}, publishingRepoUrl: 'https://github.com/synthetic/notes',
    setPublishingRepoUrl: () => {}, publishingToken: '', setPublishingToken: () => {},
    publishingStatus: { configured: true, enabled: true, connection: 'offline', phase: 'error',
      unpublishedCount: 2, lastPublishAt: null, lastError: 'Offline' }
  }
  await act(async () => root.render(<SettingsModal {...settingsProps} />))
  check(Boolean(document.querySelector('input[type="password"]')), 'PAT input is not a password field')
  check(!Array.from(document.querySelectorAll('button')).some(button => /pubblica/i.test(button.textContent || '')),
    'Settings introduced a manual publish button')
  check(document.querySelector('[role="status"]')?.textContent?.includes('automaticamente'), 'Offline feedback omits automatic retry')

  await reset(useQna, 'A')
  let job: Promise<void>
  await act(async () => {
    job = output.sendMessage('t1', 'Domanda reale?', false)
    await Promise.resolve()
  })
  check(
    request.messages.at(-1).text === 'Domanda reale?',
    'Q&A request includes placeholder'
  )
  check(saved[0].data[0].messages.length === 1, 'Q&A persists placeholder')
  await act(async () => {
    chunk({ threadId: 't1', chunk: 'parziale' })
  })
  await render('B')
  await act(async () => {
    generation.resolve({ success: true, text: 'Risposta completa' })
    await job!
  })
  check(output.threads.length === 0, 'Q&A leaked into another lecture')
  check(
    saved.at(-1)!.id === 'A' &&
      saved.at(-1)!.data[0].messages.at(-1).text === 'Risposta completa',
    'Q&A saved incomplete stream'
  )

  generation = deferred()
  await render('A')
  await act(async () => {
    job = output.sendMessage('t1', 'Seconda domanda', false)
    await Promise.resolve()
  })
  await act(async () => {
    chunk({ threadId: 't1', chunk: 'risposta parziale fallita' })
    generation.resolve({ success: false, error: 'test error' })
    await job!
  })
  check(
    output.threads[0].messages.at(-1).role === 'user',
    'Q&A did not remove failed placeholder'
  )
  check(
    saved.at(-1)!.data[0].messages.at(-1).role === 'user',
    'Q&A rollback was not persisted'
  )
  check(!JSON.stringify(saved.at(-1)!.data).includes('risposta parziale fallita'),
    'Q&A persisted partial answer after failure')
  check(!JSON.stringify(output.threads).includes('risposta parziale fallita'),
    'Q&A retained partial answer in UI')
  generation = deferred()
  await act(async () => { job = output.sendMessage('t1', 'Seconda domanda', false); await Promise.resolve() })
  check(!JSON.stringify(request).includes('risposta parziale fallita'), 'Q&A retry used failed partial history')
  check(request.messages.filter((message: any) => message.role === 'user' && message.text === 'Seconda domanda').length === 1, 'Q&A retry duplicated the unanswered question')
  await act(async () => {
    chunk({ threadId: 't1', chunk: 'nuova risposta' })
    generation.resolve({ success: true, text: 'nuova risposta' })
    await job!
  })
  check(output.threads[0].messages.at(-1).text === 'nuova risposta', 'Q&A retry concatenated failed partial')

  let pipelineProgress: (value: any) => void = () => {}
  const pipelineSnapshot = { runId: 'synthetic-run', status: 'idle', tasks: [], stageSummaries: {} }
  let refreshes = 0
  let visibleMarkdown: string | null = null
  api.getArchivePipelineStatus = async () => pipelineSnapshot
  api.onArchivePipelineProgress = (cb: any) => { pipelineProgress = cb; return () => {} }
  api.readMarkdown = async () => '# Output già salvato'
  await reset(useArchivePipeline, { onNotice: () => {}, onRefreshLibrary: async () => {
    refreshes++; visibleMarkdown = await api.readMarkdown()
  } })
  await act(async () => {
    pipelineProgress({ ...pipelineSnapshot, status: 'running' })
    pipelineProgress({ ...pipelineSnapshot, status: 'paused', message: 'Accesso negato' })
    pipelineProgress({ ...pipelineSnapshot, status: 'paused', message: 'Accesso negato' })
  })
  check(refreshes === 1 && visibleMarkdown === '# Output già salvato', 'Pipeline pause did not refresh saved output exactly once')
  await act(async () => {
    pipelineProgress({ ...pipelineSnapshot, status: 'running' })
    pipelineProgress({ ...pipelineSnapshot, status: 'paused' })
  })
  check(refreshes === 2, 'Pipeline did not refresh on a new pause after resume')
  const delayedStart = deferred()
  api.startArchivePipeline = () => delayedStart.promise
  let startCommand!: Promise<void>
  await act(async () => { startCommand = output.startPipeline() })
  await act(async () => {
    pipelineProgress({ ...pipelineSnapshot, status: 'paused', message: 'Errore successivo all avvio' })
    delayedStart.resolve({ started: true, status: { ...pipelineSnapshot, status: 'running' } })
    await startCommand
  })
  check(output.pipelineStatus.status === 'paused', 'Late start IPC result overwrote newer pipeline progress')
  const delayedStop = deferred()
  api.requestArchivePipelineStop = () => delayedStop.promise
  let stopCommand!: Promise<void>
  await act(async () => { stopCommand = output.stopPipeline() })
  await act(async () => {
    pipelineProgress({ ...pipelineSnapshot, status: 'stopped' })
    delayedStop.resolve({ ...pipelineSnapshot, status: 'running', stopRequested: true })
    await stopCommand
  })
  check(output.pipelineStatus.status === 'stopped', 'Late stop IPC result overwrote final pipeline status')
  api.readMarkdown = async () => null

  const loaded = deferred()
  api.loadQnaThreads = (id: string) =>
    id === 'A' ? loaded.promise : Promise.resolve([])
  await reset(useQna, 'A')
  await render('B')
  await act(async () => {
    loaded.resolve([thread])
  })
  check(output.threads.length === 0, 'Old Q&A load overwrote new selection')

  for (const operation of [
    'handleGenerateLectureNotes',
    'handleTranslateLectureNotes',
    'handleTranscribeAudio'
  ]) {
    generation = deferred()
    const applied: any[] = []
    const common = {
      candidateLectures: [],
      settings: { apiKey: 'test', apiKeys: [] },
      onOpenSettingsModal() {},
      onNotice() {},
      onRefreshLibrary: async () => {},
      onSyncAndRefreshLibrary: async () => {},
      onSetMarkdownText: (v: any) => applied.push(v),
      onSetMarkdownEnText: (v: any) => applied.push(v),
      onSetTranscriptText: (v: any) => applied.push(v),
      onSetActiveTab: (v: any) => applied.push(v)
    }
    await reset(useGeminiGeneration, {
      ...common,
      selectedLecture: { id: 'A' }
    })
    await act(async () => {
      job = output[operation]()
    })
    await act(async () => {
      generationProgress({
        jobId: 'un-altro-job',
        lectureId: 'A',
        phase: 'sections',
        message: 'evento obsoleto',
        percent: 50
      })
    })
    check(
      output.generationProgress === null,
      `${operation} accepted progress from another job`
    )
    await act(async () => {
      generationProgress({
        jobId: requestedGenerationJobId,
        lectureId: 'A',
        phase: 'sections',
        message: 'evento corrente',
        percent: 50
      })
    })
    check(
      output.generationProgress?.message === 'evento corrente',
      `${operation} ignored progress from its own job`
    )
    await render({ ...common, selectedLecture: { id: 'B' } })
    await act(async () => {
      generation.resolve({ success: true, markdown: 'old', transcript: 'old' })
      await job!
    })
    check(applied.length === 0, `${operation} applied stale content`)
  }

  const translationProps = {
    candidateLectures: [],
    settings: { apiKey: 'test', apiKeys: [] },
    onOpenSettingsModal() {},
    onNotice() {},
    onRefreshLibrary: async () => {},
    onSyncAndRefreshLibrary: async () => {},
    onSetMarkdownText() {},
    onSetMarkdownEnText() {},
    onSetTranscriptText() {},
    onSetActiveTab() {},
    selectedLecture: { id: 'A' }
  }
  for (const expectedError of [
    'Errore di rete',
    'Chiave non valida',
    'Risposta vuota'
  ]) {
    generation = deferred()
    await reset(useGeminiGeneration, translationProps)
    await act(async () => {
      job = output.handleTranslateLectureNotes()
    })
    await act(async () => {
      generation.resolve({ success: false, error: expectedError })
      await job!
    })
    check(
      output.translationError === expectedError,
      `Translation error is invisible to the UI: ${expectedError}`
    )
  }

  generation = deferred()
  const contentProps = {
    onRefreshLibrary: async () => {},
    onUpdateLectureInState() {},
    onNotice() {},
    onClearSelectedLecture() {}
  }
  await reset(useLectureContent, {
    ...contentProps,
    selectedLecture: { id: 'A' }
  })
  await act(async () => {
    job = output.handleGenerateStudySet()
  })
  await render({ ...contentProps, selectedLecture: { id: 'B' } })
  await act(async () => {
    generation.resolve({ success: true, studySet: { lectureId: 'A' } })
    await job!
  })
  check(output.studySet === null, 'Study set leaked into another lecture')

  invalidateLectureContentCache()
  const reads = new Map<string, number>()
  api.readStudySet = async (id: string) => {
    reads.set(id, (reads.get(id) ?? 0) + 1)
    return null
  }
  for (let index = 0; index < 21; index++) {
    await render({
      ...contentProps,
      selectedLecture: { id: `LRU-${index}`, status: 'audio-only' }
    })
  }
  const beforeReload = reads.get('LRU-0') ?? 0
  await render({
    ...contentProps,
    selectedLecture: { id: 'LRU-0', status: 'audio-only' }
  })
  check(
    (reads.get('LRU-0') ?? 0) > beforeReload,
    'Lecture content cache did not evict its oldest item'
  )

  let importCalls = 0
  await act(async () => {
    root.render(
      <LectureList
        selectedCourse="tutti"
        isBatchGenerating={false}
        isImporting={false}
        onOpenSelectionModal={() => {}}
        onManualSync={() => {}}
        onImportFiles={() => {
          importCalls++
        }}
        onImportFolder={() => {}}
        notice={null}
        onDismissNotice={() => {}}
        visibleLectures={[]}
        selectedLectureId={null}
        onSelectLecture={() => {}}
        isLoading={false}
        selectedStudyStatus="tutti"
        formatDate={() => ''}
        hasAnyLectures={false}
        hasConfiguredKey={true}
        onOpenSettings={() => {}}
      />
    )
  })
  await act(async () =>
    document
      .querySelector('.content')
      ?.dispatchEvent(new DragEvent('drop', { bubbles: true }))
  )
  check(
    importCalls === 0 && !document.querySelector('.drag-overlay'),
    'Drag/drop still opens a misleading picker'
  )

  const oldSearch = deferred()
  api.scanAndSyncLibrary = async () => []
  api.getArchivedCourseCodes = async () => []
  api.getCourseStats = async () => []
  api.searchFullText = (query: string) =>
    query === 'old' ? oldSearch.promise : Promise.resolve(['new'])
  await reset(useLectures, {})
  await act(async () => output.setSearchQuery('old'))
  await act(async () => {
    await new Promise((r) => setTimeout(r, 180))
  })
  await act(async () => output.setSearchQuery('new'))
  await act(async () => {
    await new Promise((r) => setTimeout(r, 180))
  })
  await act(async () => oldSearch.resolve(['old']))
  check(
    output.searchMatchIds[0] === 'new',
    'Obsolete search replaced the current results'
  )

  const archiveFixtures = [
    ...['da-studiare', 'in-corso', 'completata'].map((studyStatus, index) => ({
      id: `archived-${index}`, courseCode: 'A', studyStatus
    })),
    ...['B', 'C', 'D'].map((courseCode, index) => ({
      id: `active-${index}`, courseCode, studyStatus: ['da-studiare', 'in-corso', 'completata'][index]
    })),
    { id: 'unassigned', courseCode: null, studyStatus: 'da-studiare' }
  ].map(lecture => ({ ...lecture, sourceAudioFileName: 'synthetic.mp3', status: 'audio-only' }))
  let archivedCodes = ['A']
  api.scanAndSyncLibrary = api.listLectures = async () => archiveFixtures
  api.getArchivedCourseCodes = async () => [...archivedCodes]
  api.setCourseArchived = async (code: string, archived: boolean) => {
    archivedCodes = archived ? [...new Set([...archivedCodes, code])] : archivedCodes.filter(c => c !== code)
    return [...archivedCodes]
  }
  api.searchFullText = async () => archiveFixtures.map(lecture => lecture.id)
  await reset(useLectures, {})
  check(output.activeLectures.length === 4 && output.visibleLectures.length === 4,
    'Archived lessons leaked into general list or count')
  check(output.visibleLectures.map((lecture: any) => lecture.id).join(',') === 'active-1,active-0,unassigned,active-2',
    'All lectures should put in progress first, to study second and completed last, preserving order within groups')
  check(archiveFixtures[0].id === 'archived-0', 'Display sorting mutated the source collection')
  await act(async () => output.setLectures((current: any[]) => current.map(lecture =>
    lecture.id === 'active-2' ? { ...lecture, studyStatus: 'in-corso' } : lecture)))
  check(output.visibleLectures.map((lecture: any) => lecture.id).join(',') === 'active-1,active-2,active-0,unassigned',
    'Changed study status did not reorder all lectures')
  await act(async () => output.setLectures(archiveFixtures))

  for (const status of ['tutti', 'da-studiare', 'in-corso', 'completata']) {
    await act(async () => output.setSelectedStudyStatus(status))
    check(output.visibleLectures.every((lecture: any) => lecture.courseCode !== 'A'),
      `Archived lessons leaked into study filter ${status}`)
  }
  await act(async () => {
    output.setSelectedStudyStatus('tutti')
    output.setSearchQuery('synthetic')
  })
  check(output.visibleLectures.length === 4, 'Archived lessons leaked into search fallback')
  await act(async () => new Promise(r => setTimeout(r, 180)))
  check(output.visibleLectures.length === 4, 'Archived full-text hits leaked into general search')
  await act(async () => output.setSelectedCourse('A'))
  check(output.visibleLectures.length === 3, 'Archived course cannot be consulted or searched explicitly')
  await act(async () => output.setSelectedStudyStatus('completata'))
  check(output.visibleLectures.length === 0, 'Archived course leaked into study filter')
  await act(async () => {
    output.setSelectedStudyStatus('tutti')
    output.setSearchQuery('')
  })
  const savedArchiveAction = api.setCourseArchived
  api.setCourseArchived = async () => { throw new Error('synthetic persistence failure') }
  await act(async () => {
    check(!(await output.handleCourseArchive('A', false)), 'Failed save reported success')
  })
  check(output.isSelectedCourseArchived && output.visibleLectures.length === 3,
    'Failed save moved course or changed selection')
  const archiveSave = deferred()
  api.setCourseArchived = () => archiveSave.promise
  let archiveJob: Promise<boolean>
  await act(async () => { archiveJob = output.handleCourseArchive('A', false) })
  await act(async () => {
    check(!(await output.handleCourseArchive('B', true)), 'Duplicate archive mutation was admitted')
    archiveSave.resolve([])
    await archiveJob!
  })
  check(!output.isSelectedCourseArchived && output.activeLectures.length === 7,
    'Restored course did not return to active lessons')
  api.setCourseArchived = savedArchiveAction
  const staleArchive = deferred()
  api.getArchivedCourseCodes = () => staleArchive.promise
  let archiveRefresh: Promise<void>
  await act(async () => { archiveRefresh = output.refreshLibrary() })
  await act(async () => { await output.handleCourseArchive('A', true) })
  await act(async () => {
    staleArchive.resolve([])
    await archiveRefresh!
  })
  check(output.archivedCourseCodes.includes('A') && output.selectedCourse === 'tutti' &&
    output.visibleLectures.length === 4, 'Late refresh reverted archive state or selection')
  api.getArchivedCourseCodes = async () => [...archivedCodes]

  function CourseArchiveHarness() {
    output = useLectures()
    return <Sidebar
      mainView="archive" setMainView={() => {}}
      selectedCourse={output.selectedCourse} setSelectedCourse={output.setSelectedCourse}
      selectedStudyStatus={output.selectedStudyStatus} setSelectedStudyStatus={output.setSelectedStudyStatus}
      totalLecturesCount={output.activeLectures.length} coursesWithCounts={output.coursesWithCounts}
      getCourseLecturesCount={code => archiveFixtures.filter(lecture => (lecture.courseCode || 'Senza corso') === code).length}
      archivedCourseCodes={output.archivedCourseCodes} isSavingCourseArchive={output.isSavingCourseArchive}
      onCourseArchive={(code, archived) => { void output.handleCourseArchive(code, archived) }}
      onOpenSettings={() => {}} hasConfiguredKey searchQuery={output.searchQuery} setSearchQuery={output.setSearchQuery}
      onRefreshStats={() => {}} isCollapsed={false} onToggleCollapse={() => {}}
      theme="light" onToggleTheme={() => {}} onOpenCourseManagement={() => {}}
    />
  }
  await act(async () => root.render(<CourseArchiveHarness />))
  const folder = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('.folder-toggle')]
    .find(button => button.textContent?.includes(label))!
  const courseButton = (code: string) => document.querySelector<HTMLButtonElement>(`[title="(${code})"]`)!
  const inFolder = (label: string, code: string) => folder(label).parentElement!.contains(courseButton(code))
  check(inFolder('Corsi attivi', 'B') && inFolder('Corsi archiviati', 'A'), 'Course folders are not separated')
  await act(async () => folder('Corsi attivi').click())
  check(!courseButton('B') && Boolean(courseButton('A')), 'Closing active folder affected archived folder')
  await act(async () => folder('Corsi attivi').click())
  await act(async () => folder('Corsi archiviati').click())
  check(Boolean(courseButton('B')) && !courseButton('A'), 'Closing archived folder affected active folder')
  await act(async () => folder('Corsi archiviati').click())
  await act(async () => courseButton('B').dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true, cancelable: true, clientX: window.innerWidth - 1, clientY: window.innerHeight - 1
  })))
  check(document.querySelector('[role="menuitem"]')?.textContent === 'Archivia corso', 'Right click did not open archive action')
  const menuRect = document.querySelector('[role="menu"]')!.getBoundingClientRect()
  check(menuRect.right <= window.innerWidth && menuRect.bottom <= window.innerHeight, 'Course menu overflows viewport')
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  check(!document.querySelector('[role="menu"]') && document.activeElement === courseButton('B'), 'Escape did not close menu and restore focus')
  await act(async () => courseButton('B').dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true })))
  await act(async () => (document.querySelector('[role="menuitem"]') as HTMLButtonElement).click())
  check(inFolder('Corsi archiviati', 'B') && output.activeLectures.length === 3, 'Archiving did not move course or update count')
  await act(async () => {
    output.setSelectedStudyStatus('completata')
  })
  await act(async () => courseButton('A').click())
  check(output.selectedStudyStatus === 'tutti' && output.visibleLectures.length === 3, 'Selecting archived course retained active status filter')
  await act(async () => (document.querySelectorAll('.study-filter-btn')[1] as HTMLButtonElement).click())
  check(output.selectedCourse === 'tutti' && output.visibleLectures.every((lecture: any) => !archivedCodes.includes(lecture.courseCode)),
    'Study filter did not return to active courses')
  await act(async () => courseButton('B').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })))
  check(document.querySelector('[role="menuitem"]')?.textContent === 'Ripristina corso', 'Archived menu has wrong action')
  await act(async () => (document.querySelector('[role="menuitem"]') as HTMLButtonElement).click())
  check(inFolder('Corsi attivi', 'B') && output.activeLectures.length === 4, 'Restore did not return course to active folder')
  await act(async () => courseButton('B').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })))
  await act(async () => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })))
  check(!document.querySelector('[role="menu"]'), 'Outside click did not close course menu')
  await act(async () => document.querySelector('[title="Senza corso"]')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })))
  check(!document.querySelector('[role="menu"]'), 'Unassigned lessons offered course archive action')

  // Trigger real hook intervals without waiting wall-clock seconds.
  const originalInterval = window.setInterval
  const originalClear = window.clearInterval
  const intervals = new Map<number, () => void>()
  let intervalId = 0
  window.setInterval = ((cb: () => void) => {
    intervals.set(++intervalId, cb)
    return intervalId
  }) as any
  window.clearInterval = (id: number) => {
    intervals.delete(id)
  }
  const slowSave = deferred()
  const sessions: any[] = []
  api.saveStudySession = async (session: any) => {
    sessions.push(session)
    if (sessions.length === 1) await slowSave.promise
  }
  api.getLectureStudySeconds = async (lectureId: string) => lectureId === 'A' ? 3600 : 5400
  await reset(useStudyTracker, {
    activeLectureId: 'A',
    courseCode: 'RC',
    isFocusMode: true,
    activeTab: 'markdown',
    isEnabled: true
  })
  await act(async () => {
    for (const cb of intervals.values()) cb()
  })
  check(output.lectureTotalSeconds === 3601, 'Lecture total omitted previous study or current unsaved second')
  let first: Promise<void>
  await act(async () => {
    first = output.flushCurrentSession()
    await Promise.resolve()
  })
  await act(async () => {
    for (const cb of intervals.values()) cb()
  })
  await render({
    activeLectureId: 'B',
    courseCode: 'NEW',
    isFocusMode: true,
    activeTab: 'markdown',
    isEnabled: true
  })
  await act(async () => {
    slowSave.resolve(undefined)
    await first!
    await output.flushCurrentSession()
  })
  check(
    sessions.some(
      (s) =>
        s.lectureId === 'A' && s.courseCode === 'RC' && s.durationSeconds === 2
    ),
    'Overlapping flush lost seconds or source lecture'
  )
  check(output.lectureTotalSeconds === 5400, 'Changing lecture retained previous lecture study time')
  const closingSave = deferred()
  api.saveStudySession = () => closingSave.promise
  const originalClose = window.close
  let closed = false
  window.close = () => {
    closed = true
  }
  await act(async () => {
    for (const cb of intervals.values()) cb()
  })
  const closeEvent = new Event('beforeunload', { cancelable: true })
  await act(async () => window.dispatchEvent(closeEvent))
  check(
    closeEvent.defaultPrevented && !closed,
    'Window closed before timer persistence'
  )
  await act(async () => {
    closingSave.resolve(undefined)
    await output.flushCurrentSession()
  })
  check(closed, 'Window did not close after successful persistence')
  window.close = originalClose

  const persistedStudy = new Map<string, any>()
  const oldTotal = deferred()
  let delayOldTotal = true
  api.getLectureStudySeconds = async (lectureId: string, excludedSessionId: string) => {
    if (lectureId === 'slow' && delayOldTotal) return oldTotal.promise
    return (lectureId === 'A' ? 7200 : 600) + Array.from(persistedStudy.values())
      .filter(session => session.lectureId === lectureId && session.id !== excludedSessionId)
      .reduce((total, session) => total + session.durationSeconds, 0)
  }
  api.saveStudySession = async (session: any) => { persistedStudy.set(session.id, session) }
  const studyProps = { activeLectureId: 'slow', courseCode: 'RC', isFocusMode: true, activeTab: 'markdown', isEnabled: true }
  await reset(useStudyTracker, studyProps)
  await render({ ...studyProps, activeLectureId: 'A' })
  await act(async () => { oldTotal.resolve(99999) })
  check(output.lectureTotalSeconds === 7200, 'Late total for old lecture overwrote current lecture')
  delayOldTotal = false
  await act(async () => {
    for (let tick = 0; tick < 65; tick++) for (const callback of intervals.values()) callback()
    await output.flushCurrentSession()
  })
  check(output.activeSeconds === 65 && output.lectureTotalSeconds === 7265, 'Periodic checkpoints doubled lecture total')
  const focusPerformanceDescriptor = Object.getOwnPropertyDescriptor(performance, 'now')
  const focusPerformanceNow = performance.now.bind(performance)
  Object.defineProperty(performance, 'now', { configurable: true, value: () => focusPerformanceNow() + 300_000 })
  await act(async () => output.requestExitFocus(() => {}))
  if (focusPerformanceDescriptor) Object.defineProperty(performance, 'now', focusPerformanceDescriptor)
  else Reflect.deleteProperty(performance, 'now')
  const frozenTotal = output.lectureTotalSeconds
  await act(async () => { for (let tick = 0; tick < 15; tick++) for (const callback of intervals.values()) callback() })
  check(output.activeSeconds === 65 && output.lectureTotalSeconds === frozenTotal, 'Focus Lock countdown increased study time')
  await act(async () => output.startPauseTimer(5))
  await act(async () => { for (const callback of intervals.values()) callback() })
  check(output.activeSeconds === 65, 'Scheduled pause increased study time')
  await render({ ...studyProps, activeLectureId: 'A', isEnabled: false })
  await render({ ...studyProps, activeLectureId: 'A' })
  check(output.activeSeconds === 0 && output.lectureTotalSeconds === 7265, 'Reentering focus lost completed session time')
  api.getLectureStudySeconds = async () => { throw new Error('Synthetic read failure') }
  await render({ ...studyProps, activeLectureId: 'B' })
  check(output.lectureTotalSeconds === null, 'Failed total read was shown as zero')
  api.getLectureStudySeconds = async () => 0

  const scratchpadSaves: any[] = []
  api.getScratchpad = async () => ({ todos: [], notes: '', updatedAt: '' })
  api.saveScratchpad = async (data: any) => {
    scratchpadSaves.push(structuredClone(data))
  }
  await reset(useQuickCapture, undefined)
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
  await act(async () => {
    output.updateNotes('ultima modifica')
    output.closeOverlay()
    await Promise.resolve()
    await Promise.resolve()
  })
  check(
    scratchpadSaves.at(-1)?.notes === 'ultima modifica',
    'Quick Capture immediate close saved stale notes'
  )

  const highlightSaves: any[] = []
  api.getHighlights = async () => []
  api.saveHighlights = async (id: string, data: any[]) => {
    highlightSaves.push({ id, data: structuredClone(data) })
  }
  await reset(useHighlights, 'A')
  await act(async () => {
    await Promise.resolve()
    output.addHighlight(0, 5, 'testo')
    output.clearAllHighlights()
    await Promise.resolve()
    await Promise.resolve()
  })
  check(
    highlightSaves.at(-1)?.id === 'A' && highlightSaves.at(-1)?.data.length === 0,
    'Highlight writes completed out of order'
  )

  const savedReminders: any[] = []
  api.getReminders = async () => [
    {
      id: 'due-reminder',
      kind: 'timer',
      label: 'Pausa',
      createdAt: new Date(Date.now() - 60_000).toISOString(),
      status: 'active',
      dueAt: new Date(Date.now() - 1_000).toISOString(),
      durationSeconds: 60
    }
  ]
  api.saveReminders = async (reminders: any[]) => {
    savedReminders.push(structuredClone(reminders))
  }
  await act(async () => {
    root.render(<FocusReminders />)
    await Promise.resolve()
    await Promise.resolve()
  })
  await act(async () => {
    for (const callback of intervals.values()) callback()
  })
  check(
    document.body.textContent?.includes('Timer concluso') &&
      savedReminders.some((items) => items[0]?.status === 'completed'),
    'Expired reminder did not show a dismissible notification'
  )
  await act(async () => {
    ;(
      document.querySelector(
        '[aria-label="Timer e sveglie"]'
      ) as HTMLButtonElement
    )?.click()
  })
  check(
    document.body.textContent?.includes('Avvia timer'),
    'Reminder menu did not open'
  )

  api.getStudyAnalytics = async () => ({
    todaySeconds: 0,
    todayByCourse: {},
    weekDays: [],
    weekAvgDailySeconds: 0,
    monthAvgDailySeconds: 0,
    totalSemesterSeconds: 0,
    currentStreakDays: 0,
    courseBreakdown: []
  })
  const dashboardProps = {
    courseStats: [],
    selectedCourseInfo: null,
    setSelectedCourseInfo() {},
    onOpenCourseInfo() {},
    formatDuration: () => '',
    settings: {
      apiKey: '',
      apiKeys: [],
      activeKeyIndex: 0,
      autoRotateOnQuota: true,
      model: 'gemini-3.6-flash'
    },
    saveCourseConfig: async () => {},
    scratchpadData: {
      todos: [
        {
          id: 'dashboard-todo',
          text: 'Nuova attività',
          completed: false,
          createdAt: new Date().toISOString()
        }
      ],
      notes: 'prima versione',
      updatedAt: new Date().toISOString()
    }
  }
  await act(async () => root.render(<Dashboard {...(dashboardProps as any)} />))
  check(
    document.body.textContent?.includes('prima versione'),
    'Dashboard did not render the shared Quick Capture state'
  )
  await act(async () =>
    root.render(
      <Dashboard
        {...(dashboardProps as any)}
        scratchpadData={{
          todos: [
            {
              id: 'dashboard-todo',
              text: 'Attività modificata',
              completed: true,
              createdAt: new Date().toISOString()
            }
          ],
          notes: 'seconda versione',
          updatedAt: new Date().toISOString()
        }}
      />
    )
  )
  check(
    document.body.textContent?.includes('seconda versione') &&
      document.body.textContent?.includes('Attività modificata') &&
      !document.body.textContent?.includes('prima versione'),
    'Dashboard did not update Quick Capture without remounting'
  )
  await act(async () =>
    root.render(
      <Dashboard
        {...(dashboardProps as any)}
        scratchpadData={{
          todos: [],
          notes: '',
          updatedAt: new Date().toISOString()
        }}
      />
    )
  )
  check(
    !document.body.textContent?.includes('Attività modificata') &&
      !document.body.textContent?.includes('seconda versione'),
    'Dashboard did not remove deleted Quick Capture content'
  )

  const dashboardStats = ['ACTIVE', 'ARCHIVED', 'EMPTY'].map(courseCode => ({
    courseCode, totalLectures: 3, completedLectures: 2, inProgressLectures: 1,
    toStudyLectures: 0, totalAudioSeconds: 7200,
    pipelineStatus: { audioOnly: 0, transcriptAvailable: 0, markdownReady: 3 }
  }))
  const dashboardAnalytics = {
    todaySeconds: 3600, todayByCourse: { ACTIVE: 3600 }, weekDays: [], weekAvgDailySeconds: 514,
    monthAvgDailySeconds: 120, totalSemesterSeconds: 3600, currentStreakDays: 1,
    courseBreakdown: [{ courseCode: 'ACTIVE', totalSeconds: 3600, percentage: 100 }],
    courseLectureAverages: [
      { courseCode: 'ACTIVE', timedCompletedLectures: 2, averageStudySeconds: 2700 },
      { courseCode: 'EMPTY', timedCompletedLectures: 0, averageStudySeconds: null }
    ]
  }
  api.getStudyAnalytics = async () => dashboardAnalytics
  const renderStudyDashboard = async (stats: any[], archived: string[]) => act(async () => root.render(
    <Dashboard {...(dashboardProps as any)} courseStats={stats} archivedCourseCodes={archived}
      scratchpadData={{ todos: [], notes: '', updatedAt: '' }} />))
  await renderStudyDashboard(dashboardStats, ['ARCHIVED'])
  check(document.querySelectorAll('.course-stat-card').length === 2 &&
    !document.querySelector('[aria-label="Visualizza logistica corso ARCHIVED"]'), 'Archived course leaked into dashboard cards')
  const dashboardStyle = document.createElement('style')
  dashboardStyle.textContent = await require('electron').ipcRenderer.invoke('video-import-styles')
  document.head.appendChild(dashboardStyle)
  const averageCard = document.querySelector('[aria-label="Visualizza logistica corso ACTIVE"]')!
  check(averageCard.querySelector('.lecture-study-average')?.textContent?.includes('45 min') &&
    averageCard.textContent?.includes('2 lezioni completate con tempo registrato'), 'Study average or sample size missing')
  check(document.querySelector('[aria-label="Visualizza logistica corso EMPTY"]')?.textContent?.includes('Dati insufficienti'),
    'Missing study data should not appear as zero time')
  averageCard.scrollIntoView({ block: 'center', behavior: 'instant' })
  const averageBounds = averageCard.querySelector('.lecture-study-average')!.getBoundingClientRect()
  check(averageBounds.top >= 0 && averageBounds.bottom <= innerHeight, 'Study average is outside the visible card area')
  await require('electron').ipcRenderer.invoke('capture-video-import', 'dashboard-light')
  document.documentElement.setAttribute('data-theme', 'dark')
  await require('electron').ipcRenderer.invoke('capture-video-import', 'dashboard-dark')
  document.documentElement.removeAttribute('data-theme')
  dashboardStyle.remove()
  await act(async () => (document.querySelector('.add-manual-btn') as HTMLButtonElement).click())
  check(![...document.querySelectorAll('.manual-study-form option')].some(option => option.textContent === 'ARCHIVED'),
    'Archived course leaked into manual study options')
  await act(async () => (document.querySelector('.modal-content .modal-close') as HTMLButtonElement).click())
  check(!document.querySelector('.manual-study-form'), 'Manual study dialog did not close')
  await renderStudyDashboard(dashboardStats, ['ARCHIVED'])
  const oldAnalytics = deferred()
  api.getStudyAnalytics = () => oldAnalytics.promise
  await renderStudyDashboard([...dashboardStats], ['ARCHIVED'])
  api.getStudyAnalytics = async () => ({ ...dashboardAnalytics, todaySeconds: 0, courseBreakdown: [], courseLectureAverages: [] })
  await renderStudyDashboard(dashboardStats, ['ACTIVE', 'ARCHIVED'])
  await act(async () => oldAnalytics.resolve({ ...dashboardAnalytics, todaySeconds: 999 * 3600 }))
  check(document.querySelectorAll('.course-stat-card').length === 1 && !document.body.textContent?.includes('999h'),
    'Late analytics response restored excluded study totals')
  await act(async () => root.render(null))

  const zeroCourse = {
    code: 'ZERO',
    cfu: 0,
    lectureHours: 0,
    individualStudyHours: 0,
    totalHours: 0,
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    examDate: '2027-01-15',
    schedule: [
      {
        id: 'zero-slot',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '11:00'
      }
    ]
  }
  api.getCourses = async () => [zeroCourse]
  const savedCourses: any[] = []
  api.saveCourse = async (course: any, oldCode?: string) => {
    savedCourses.push({ course: structuredClone(course), oldCode })
  }
  api.autoAssignCoursesBySchedule = async () => ({ assigned: [], skippedCount: 0 })
  await act(async () => {
    root.render(
      <CourseManagementModal
        isOpen
        onClose={() => {}}
        lectures={[]}
        onRefreshLibrary={async () => {}}
        onNotice={() => {}}
      />
    )
    await Promise.resolve()
    await Promise.resolve()
  })
  const editCourse = document.querySelector(
    '[title="Modifica anagrafica e orario"]'
  ) as HTMLButtonElement
  await act(async () => editCourse.click())
  const cfuInput = document.querySelector(
    '.course-edit-form input[type="number"]'
  ) as HTMLInputElement
  check(
    cfuInput?.value === '0' && cfuInput.min === '0',
    'Course editor did not preserve zero CFU when reopened'
  )
  await act(async () => {
    ;(document.querySelector('.course-edit-form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    await Promise.resolve()
  })
  check(
    savedCourses.at(-1)?.course.cfu === 0 &&
      savedCourses.at(-1)?.oldCode === 'ZERO',
    'Editing a zero-CFU course did not preserve zero on save'
  )

  class TestHighlight {
    ranges: Range[]
    constructor(...ranges: Range[]) {
      this.ranges = ranges
    }
  }
  const highlightRegistry = new Map<string, TestHighlight>()
  Object.defineProperty(globalThis, 'CSS', {
    configurable: true,
    value: { highlights: highlightRegistry }
  })
  Object.defineProperty(window, 'Highlight', {
    configurable: true,
    value: TestHighlight
  })
  const highlight = (id: string) => ({
    id,
    startOffset: 0,
    endOffset: 5,
    text: 'testo',
    createdAt: new Date().toISOString()
  })
  await act(async () =>
    root.render(
      <div>
        <MarkdownViewer content="testo uno" highlights={[highlight('one')]} />
        <MarkdownViewer content="testo due" highlights={[highlight('two')]} />
      </div>
    )
  )
  check(
    highlightRegistry.get('lezionify-highlight-yellow')?.ranges.length === 2,
    'Multiple MarkdownViewer instances did not share both highlight ranges'
  )
  await act(async () =>
    root.render(
      <MarkdownViewer content="testo due" highlights={[highlight('two')]} />
    )
  )
  check(
    highlightRegistry.get('lezionify-highlight-yellow')?.ranges.length === 1,
    'Unmounting one MarkdownViewer removed another viewer highlight'
  )

  const studyReaderStyle = document.createElement('style')
  studyReaderStyle.textContent = await require('electron').ipcRenderer.invoke('video-import-styles')
  document.head.appendChild(studyReaderStyle)
  await act(async () => root.render(<div className="markdown-rendered-content" style={{ padding: 24 }}><MarkdownViewer content={[
    '> [!NOTE]\n> Testo **importante** con $x^2$.\n>\n> - Primo\n> - Secondo',
    '> [!CONCETTO CHIAVE]\n> Concetto da ricordare.',
    '> [!KEY CONCEPT]\n> Remember **this** and $y^2$.',
    '[!key concept]\nStandalone English concept.',
    '[!NOTE]\nNota senza citazione.',
    '> Citazione ordinaria.',
    'Tag citato nel testo: [!NOTE].',
    '`[!CONCETTO CHIAVE]`',
    '> [!WARNING]\n> Attenzione.'
  ].join('\n\n')} /></div>))
  check(document.querySelectorAll('.markdown-alert').length === 6, 'Italian and English alert markers did not render as six boxes')
  check(Array.from(document.querySelectorAll('.markdown-alert-title')).filter(title => title.textContent === 'Key concept').length === 2, 'English key concepts must render in quoted and standalone form')
  check(document.querySelectorAll('.markdown-alert-note').length === 2, 'NOTE failed with block whitespace or standalone marker')
  check(Array.from(document.querySelectorAll('.markdown-alert-title')).some(title => title.textContent === 'Concetto chiave'), 'Italian key concept label missing')
  check(!Array.from(document.querySelectorAll('.markdown-alert')).some(alert => alert.textContent?.includes('[!')), 'Raw marker remained inside alert')
  check(Boolean(document.querySelector('.markdown-alert strong')) && Boolean(document.querySelector('.markdown-alert .katex')) && document.querySelectorAll('.markdown-alert li').length === 2, 'Alert lost formatting, math or list')
  check(document.querySelector('blockquote')?.textContent?.includes('Citazione ordinaria') && document.querySelector('code')?.textContent === '[!CONCETTO CHIAVE]' && document.querySelector('.markdown-body')?.textContent?.includes('Tag citato nel testo: [!NOTE].'), 'Literal marker or ordinary quote was rewritten')
  await require('electron').ipcRenderer.invoke('capture-video-import', 'markdown-alerts-light')
  document.documentElement.setAttribute('data-theme', 'dark')
  check(getComputedStyle(document.querySelector('.markdown-alert .katex')!).color === getComputedStyle(document.querySelector('.markdown-alert-body')!).color, 'Dark theme formula does not inherit alert text contrast')
  await require('electron').ipcRenderer.invoke('capture-video-import', 'markdown-alerts-dark')
  document.documentElement.removeAttribute('data-theme')
  await act(async () => root.render(<FocusLockModal show courseCode="RL" sessionSeconds={2700} lectureTotalSeconds={9900} onContinue={() => {}} onQuit={() => {}} />))
  const times = document.querySelector('.focus-lock-study-times')!
  check(times.textContent?.includes('Totale della lezione2 h 45 min') && times.textContent?.includes('Sessione attuale45 min'), 'Focus Lock did not show both study durations')
  await require('electron').ipcRenderer.invoke('capture-video-import', 'focus-lock-times')
  await act(async () => root.render(<FocusLockModal show courseCode="RL" sessionSeconds={0} lectureTotalSeconds={null} onContinue={() => {}} onQuit={() => {}} />))
  check(document.querySelector('.focus-lock-study-times')?.textContent?.includes('Non disponibile') && document.querySelector('.focus-lock-study-times')?.textContent?.includes('Meno di 1 min'), 'Missing total or sub-minute session mislabeled')
  studyReaderStyle.remove()

  await act(async () => {
    root.render(
      <MarkdownViewer
        content={`# Pipeline

\`\`\`mermaid
flowchart LR
  accTitle: Pipeline della lezione
  accDescr: Passaggio dall'audio alla dispensa
  A["Audio"] --> B["Trascrizione"] --> C["Dispensa"]
  style A fill:#f9f,stroke:#333,stroke-width:2px
  classDef default fill:#bbf,stroke:#333,stroke-width:2px;
\`\`\``}
      />
    )
  })
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (document.querySelector('.mermaid-diagram-canvas svg')) break
    await act(async () =>
      new Promise((resolve) => setTimeout(resolve, 50))
    )
  }
  check(
    Boolean(document.querySelector('.mermaid-diagram-canvas svg')),
    `Valid Mermaid diagram did not render: ${document.querySelector('.mermaid-diagram-error')?.textContent ?? 'no error shown'}`
  )
  const sourceToggle = document.querySelector(
    '.mermaid-source-toggle'
  ) as HTMLButtonElement
  await act(async () => sourceToggle.click())
  check(
    Boolean(document.querySelector('.mermaid-source-code')),
    'Mermaid source toggle did not reveal the source'
  )

  await act(async () => {
    root.render(
      <MarkdownViewer content={`\`\`\`mermaid
flowchart TD
  subgraph Ambiente ["Ambiente (Environment)"]
    S["Stato $S_t$"]
    R["Ricompensa $R_t$"]
  end
  subgraph Agente ["Agente (Agent)"]
    A["Azione $A_t$"]
  end
  A -->|"Azione scelta"| S
  S -->|"Nuovo stato $S\\_{t+1}$"| A
  R -->|"Feedback parziale"| A
  classDef default fill:#f9f,stroke:#333,stroke-width:2px;
\`\`\``} />
    )
  })
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (document.querySelector('.mermaid-diagram-canvas svg')) break
    await act(async () => new Promise((resolve) => setTimeout(resolve, 50)))
  }
  check(
    Boolean(document.querySelector('.mermaid-diagram-canvas svg')),
    `Mermaid diagram with classDef did not render: ${document.querySelector('.mermaid-diagram-error')?.textContent ?? 'no error shown'}`
  )

  await act(async () => {
    root.render(
      <MarkdownViewer content={'```mermaid\ngantt\ntitle Non consentito\n```'} />
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  check(
    Boolean(document.querySelector('.mermaid-diagram-error')),
    'Unsupported Mermaid diagram did not show the safe fallback'
  )

  const studySet = {
    lectureId: 'study-lecture',
    generatedAt: '2026-09-11T09:00:00.000Z',
    questions: [
      {
        id: 'q1',
        question: 'Quanto fa 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctOptionIndex: 1,
        explanation: 'La somma è 4.',
        keyConcept: 'Somma'
      }
    ],
    flashcards: [{ id: 'f1', front: 'Domanda', back: 'Risposta' }]
  }
  await act(async () => {
    root.render(
      <StudySetTab
        studySet={studySet}
        isLoading={false}
        isGenerating={false}
        generationError={null}
        onGenerateStudySet={() => {}}
        onOpenSettings={() => {}}
        hasTranscriptOrMarkdown={true}
        settingsModel="gemini-3.6-flash"
      />
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  check(Boolean(document.querySelector('.quiz-card')), 'Lazy quiz panel did not load')
  const flashcardTab = document.querySelectorAll(
    '.study-subnav-btn'
  )[1] as HTMLButtonElement
  await act(async () => {
    flashcardTab.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  check(
    Boolean(document.querySelector('.flashcard-scene')),
    'Switching study tabs did not load flashcards'
  )

  let fullscreenElement: Element | null = null
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fullscreenElement
  })
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value: async () => {
      throw new Error('fullscreen denied')
    }
  })
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    value: async () => {
      fullscreenElement = null
      document.dispatchEvent(new Event('fullscreenchange'))
    }
  })
  const selectedLecture = {
    id: 'focus-lecture',
    courseCode: 'ZERO',
    recordedAt: '2026-09-08T09:00:00.000Z',
    sourceAudioFileName: 'focus.mp3',
    sourceTranscriptFileName: null,
    audioFileName: 'focus.mp3',
    transcriptFileName: 'focus.txt',
    markdownFileName: 'focus.md',
    markdownEnFileName: null,
    byteSize: 1,
    checksum: 'focus',
    importedAt: '2026-09-08T09:00:00.000Z',
    status: 'transcript-available',
    studyStatus: 'da-studiare'
  }
  const drawerProps: any = {
    selectedLecture,
    allLectures: [selectedLecture],
    onClose() {},
    activeTab: 'markdown',
    setActiveTab() {},
    markdownText: '# Test focus',
    transcriptText: 'testo',
    studySet: null,
    isGeneratingStudySet: false,
    studySetError: null,
    onGenerateStudySet() {},
    isLoadingContent: false,
    isGenerating: false,
    generationProgress: null,
    generationError: null,
    isTranscribing: false,
    transcribeError: null,
    copyFeedback: null,
    isEditingMetadata: false,
    setIsEditingMetadata() {},
    editCourseCode: '',
    setEditCourseCode() {},
    editRecordedAt: '',
    setEditRecordedAt() {},
    showDeleteConfirm: false,
    setShowDeleteConfirm() {},
    existingCourses: [],
    settingsModel: 'gemini-3.6-flash',
    onStudyStatusChange() {},
    onGenerateLectureNotes() {},
    onPrintNotes() {},
    onCopyMarkdown() {},
    onCopyTranscript() {},
    onAttachTranscript() {},
    onTranscribeAudio() {},
    onPasteFromClipboard() {},
    onSaveMetadata() {},
    onDeleteLecture() {},
    onOpenSettings() {},
    formatDate: () => '',
    formatFileSize: () => '',
    studyStatusLabels: {
      'da-studiare': { label: '', icon: '', className: '' },
      'in-corso': { label: '', icon: '', className: '' },
      completata: { label: '', icon: '', className: '' }
    }
  }
  const drawerStyle = document.createElement('style')
  drawerStyle.textContent = await require('electron').ipcRenderer.invoke('video-import-styles')
  document.head.appendChild(drawerStyle)
  drawerProps.markdownText = '# Test focus\n\n' + 'Paragrafo sintetico per leggere la lezione durante lo scorrimento.\n\n'.repeat(100)
  const lengthLibrary = [
    { id: selectedLecture.id, courseCode: 'ZERO', words: 902 },
    { id: 'same-course-hidden-by-filter', courseCode: 'ZERO', words: 1804 },
    { id: 'different-course', courseCode: 'OTHER', words: 18040 }
  ]
  const courseWordCounts = async (lectureId: string) => {
    check(lectureId === selectedLecture.id, 'Word counts must receive the selected lecture ID')
    const courseCode = lengthLibrary.find(lecture => lecture.id === lectureId)?.courseCode
    return Object.fromEntries(lengthLibrary.filter(lecture => lecture.courseCode === courseCode).map(lecture => [lecture.id, lecture.words]))
  }
  api.getLectureWordCounts = courseWordCounts
  await act(async () => root.render(<LectureDrawer {...drawerProps} />))
  const exports: any[] = []
  api.exportNotesPdf = async (request: any) => { exports.push(request); return { canceled: true } }
  const ordinaryExport = () => document.querySelector<HTMLButtonElement>('.detail-body .pdf-export-action button')
  check(Boolean(ordinaryExport()) && ordinaryExport()!.getBoundingClientRect().height > 0 && !document.querySelector('.focus-mode-overlay'), 'PDF export must be visible in the ordinary lecture view')
  check(ordinaryExport()!.textContent === 'Esporta', 'PDF entry must use the unified export control')
  await act(async () => ordinaryExport()!.click())
  check(exports.length === 0 && document.querySelector('[aria-label="Esporta PDF"]'), 'Export must open the selection modal without generating a file')
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Chiudi esportazione"]')!.click())
  const lengthBadge = () => document.querySelector('.lecture-length-badge')?.textContent
  check(lengthBadge() === '902 parole · 50% di lunghezza', 'Length must use the entire selected course, including filtered-out lessons, excluding longer lessons from other courses')
  check(document.querySelector('.lecture-length-badge')?.getAttribute('title')?.includes('stesso corso'), 'Length explanation must identify its course reference')
  await act(async () => root.render(<LectureDrawer {...drawerProps} selectedLecture={{ ...selectedLecture, courseCode: null }} />))
  check(lengthBadge() === '902 parole · Assegna un corso per confrontare', 'An unassigned lesson must keep its count without an arbitrary percentage')
  let resolveOldCounts!: (counts: Record<string, number>) => void
  api.getLectureWordCounts = () => new Promise(resolve => { resolveOldCounts = resolve })
  await act(async () => root.render(<LectureDrawer {...drawerProps} />))
  lengthLibrary[0].courseCode = 'OTHER'
  api.getLectureWordCounts = courseWordCounts
  await act(async () => root.render(<LectureDrawer {...drawerProps} selectedLecture={{ ...selectedLecture, courseCode: 'OTHER' }} />))
  check(lengthBadge() === '902 parole · 5% di lunghezza', 'Changing course must change the denominator')
  await act(async () => resolveOldCounts({ [selectedLecture.id]: 902, old: 1804 }))
  check(lengthBadge() === '902 parole · 5% di lunghezza', 'A delayed response from the previous course must not overwrite the current comparison')
  lengthLibrary[0].courseCode = 'ZERO'
  await act(async () => root.render(<LectureDrawer {...drawerProps} />))
  check(lengthBadge() === '902 parole · 50% di lunghezza', 'Returning to a course must restore its own reference')
  let shortcutLanguage: 'it' | 'en' = 'it'
  let shortcutChanges = 0
  let shortcutTranslations = 0
  let shortcutItalian = drawerProps.markdownText
  let shortcutEnglish = '# English notes'
  const renderShortcut = async (overrides: Partial<React.ComponentProps<typeof LectureDrawer>> = {}) => act(async () => root.render(
    <LectureDrawer {...drawerProps} activeLanguage={shortcutLanguage} markdownText={shortcutItalian} markdownEnText={shortcutEnglish}
      onToggleLanguage={language => { shortcutLanguage = language; shortcutChanges++ }}
      onTranslateLectureNotes={() => { shortcutTranslations++ }} {...overrides} />
  ))
  const pressLanguage = async (options: KeyboardEventInit = {}, target: EventTarget = document) => {
    const event = new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true, cancelable: true, ...options })
    await act(async () => { target.dispatchEvent(event) })
    return event
  }
  await renderShortcut()
  check((await pressLanguage()).defaultPrevented && shortcutLanguage === 'en', 'Ctrl+L must switch Italian notes to English')
  await renderShortcut()
  check(ordinaryExport()!.textContent === 'Esporta', 'English view must expose unified export')
  await act(async () => ordinaryExport()!.click())
  check(exports.length === 0 && document.querySelector('[aria-label="Esporta PDF"]') && !document.querySelector('.focus-mode-overlay'), 'English export must open the modal without translating')
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Chiudi esportazione"]')!.click())
  await pressLanguage({ key: 'L', ctrlKey: false, metaKey: true })
  check(String(shortcutLanguage) === 'it', 'Cmd+L must switch English notes to Italian')
  await renderShortcut()
  const changesBeforeIgnoredKeys = shortcutChanges
  for (const options of [{ repeat: true }, { shiftKey: true }, { altKey: true }, { isComposing: true }]) await pressLanguage(options)
  for (const tag of ['input', 'textarea', 'select', 'div']) {
    const field = document.createElement(tag)
    if (tag === 'div') field.contentEditable = 'true'
    document.body.appendChild(field)
    await pressLanguage({}, field)
    field.remove()
  }
  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog'); document.body.appendChild(dialog)
  await pressLanguage(); dialog.remove()
  for (const overrides of [{ markdownEnText: null }, { isLoadingContent: true }, { isTranslating: true }, { isGenerating: true }, { activeTab: 'transcript' as const }]) {
    await renderShortcut(overrides)
    await pressLanguage()
  }
  await renderShortcut({ markdownText: null, markdownEnText: null })
  check(!ordinaryExport(), 'Export action must not be offered when no notes are available')
  check(shortcutChanges === changesBeforeIgnoredKeys && shortcutTranslations === 0, 'Shortcut must ignore editing, dialogs, modifiers, unavailable notes and other tabs without starting AI')
  const verifyDrawerAlignment = async (focus: boolean) => {
    shortcutItalian = Array.from({ length: 12 }, (_, i) => `## Capitolo ${i + 1}\n\n${'Testo sintetico italiano. '.repeat(80)}\n\n`).join('')
    shortcutEnglish = Array.from({ length: 12 }, (_, i) => `## Chapter ${i + 1}\n\n${'Synthetic English text. '.repeat(i === 9 ? 220 : 180)}\n\n`).join('')
    shortcutLanguage = 'it'
    await renderShortcut()
    await act(async () => new Promise(resolve => setTimeout(resolve, 100)))
    const container = () => document.querySelector<HTMLElement>(focus ? '.focus-mode-content' : '.markdown-view-container')!
    const scroller = () => !focus && container().scrollHeight <= container().clientHeight + 1 ? document.querySelector<HTMLElement>('.detail-body')! : container()
    const position = () => captureLanguagePoint(container().querySelector('.markdown-body')!, scroller(), 'test')
    const headings = container().querySelectorAll<HTMLElement>('.markdown-body > h2')
    const start = headings[9].getBoundingClientRect().top
    const end = headings[10].getBoundingClientRect().top
    scroller().scrollTop += start - scroller().getBoundingClientRect().top + 0.35 * (end - start)
    await act(async () => scroller().dispatchEvent(new Event('scroll')))
    const before = position()
    check(before.section === 9, 'Drawer alignment fixture must start in section 10')
    await pressLanguage(); await renderShortcut()
    await act(async () => new Promise(resolve => setTimeout(resolve, 100)))
    check(position().section === 9 && Math.abs(position().progress - before.progress) < 0.02, `Ctrl+L lost section 10 or its point, Focus=${focus}`)
    await act(async () => document.querySelector<HTMLButtonElement>('.lang-toggle-pill')!.click())
    await renderShortcut()
    await act(async () => new Promise(resolve => setTimeout(resolve, 100)))
    check(position().section === 9 && Math.abs(position().progress - before.progress) < 0.02, `Language button lost section 10 or its point, Focus=${focus}`)
    shortcutItalian = drawerProps.markdownText
    shortcutEnglish = '# English notes'
    scroller().scrollTop = 0
    await act(async () => scroller().dispatchEvent(new Event('scroll')))
    await renderShortcut()
    await act(async () => new Promise(resolve => setTimeout(resolve, 100)))
  }
  await verifyDrawerAlignment(false)
  await act(async () => root.render(<LectureDrawer {...drawerProps} />))
  const waitForDrawer = async (condition: () => boolean, message: string) => {
    for (let attempt = 0; attempt < 30 && !condition(); attempt++) {
      await act(async () => new Promise(resolve => setTimeout(resolve, 30)))
    }
    check(condition(), message)
  }
  const floatingButton = () => document.querySelector<HTMLButtonElement>('.drawer-floating-focus button')
  check(!floatingButton(), 'Focus shortcut should not float at the top')
  const drawerBody = document.querySelector<HTMLElement>('.detail-body')!
  await waitForDrawer(() => drawerBody.scrollHeight > drawerBody.clientHeight + 1000, 'Long lecture has not finished rendering')
  await act(async () => {
    drawerBody.scrollTop = 500
    drawerBody.dispatchEvent(new Event('scroll'))
  })
  await waitForDrawer(() => Boolean(floatingButton()), 'Focus shortcut missing after actions scroll away')
  const floatingTop = floatingButton()!.getBoundingClientRect().top
  drawerBody.scrollTop = 850
  await act(async () => new Promise(resolve => setTimeout(resolve, 60)))
  check(Math.abs(floatingButton()!.getBoundingClientRect().top - floatingTop) < 1, 'Focus shortcut moved during scrolling')
  check(document.querySelectorAll('.drawer-floating-focus button').length === 1, 'Only Focus Mode should float')
  await require('electron').ipcRenderer.invoke('capture-video-import', 'drawer-focus-floating')
  await act(async () => root.render(<LectureDrawer {...drawerProps} activeTab="transcript" />))
  check(!floatingButton(), 'Focus shortcut visible on another tab')
  await act(async () => root.render(<LectureDrawer {...drawerProps} />))
  await waitForDrawer(() => drawerBody.scrollHeight > drawerBody.clientHeight + 1000, 'Long lecture not restored after switching tabs')
  await act(async () => { drawerBody.scrollTop = 0; drawerBody.dispatchEvent(new Event('scroll')); await new Promise(resolve => requestAnimationFrame(resolve)) })
  await act(async () => new Promise(resolve => setTimeout(resolve, 60)))
  await waitForDrawer(() => !floatingButton(), 'Focus shortcut remained when original actions returned')
  const focusButton = () =>
    document.querySelector(
      '[title="Modalità studio immersiva"]'
    ) as HTMLButtonElement
  drawerBody.scrollTop = 500
  await act(async () => drawerBody.dispatchEvent(new Event('scroll')))
  await waitForDrawer(() => Boolean(floatingButton()), 'Focus shortcut not restored on scroll')
  await act(async () => floatingButton()!.click())
  check(
    !document.querySelector('.focus-mode-overlay'),
    'Rejected fullscreen left Focus Mode active'
  )
  const longBackground = document.createElement('div')
  longBackground.style.height = '3000px'
  document.body.appendChild(longBackground)
  window.scrollTo(0, 250)
  await act(async () => new Promise(resolve => setTimeout(resolve, 40)))
  const backgroundScroll = window.scrollY
  check(backgroundScroll > 0 && getComputedStyle(document.documentElement).overflowY !== 'hidden', 'Focus scroll test needs a genuinely scrollable background')
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value: async () => {
      fullscreenElement = document.documentElement
      document.dispatchEvent(new Event('fullscreenchange'))
    }
  })
  await act(async () => focusButton().click())
  check(
    Boolean(document.querySelector('.focus-mode-overlay')),
    'Successful fullscreen did not enter Focus Mode'
  )
  check(getComputedStyle(document.documentElement).overflowY === 'hidden' && getComputedStyle(document.body).overflowY === 'hidden', 'Focus must hide the outer page scrollbar')
  check(document.documentElement.clientWidth === window.innerWidth, 'The outer scrollbar still occupies space next to Focus')
  check(getComputedStyle(document.querySelector('.focus-mode-content')!).overflowY === 'auto', 'Focus must keep its own reading scrollbar')
  await renderShortcut()
  await pressLanguage()
  check(String(shortcutLanguage) === 'en', 'Ctrl+L must also switch notes in Focus Mode')
  await renderShortcut()
  await pressLanguage()
  check(String(shortcutLanguage) === 'it', 'Ctrl+L must switch back in Focus Mode')
  await verifyDrawerAlignment(true)
  const drawerFocusPerformanceDescriptor = Object.getOwnPropertyDescriptor(performance, 'now')
  const drawerFocusPerformanceNow = performance.now.bind(performance)
  Object.defineProperty(performance, 'now', { configurable: true, value: () => drawerFocusPerformanceNow() + 300_000 })
  await act(async () =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  )
  if (drawerFocusPerformanceDescriptor) Object.defineProperty(performance, 'now', drawerFocusPerformanceDescriptor)
  else Reflect.deleteProperty(performance, 'now')
  check(
    Boolean(document.querySelector('.focus-lock-overlay')),
    'Escape did not open Focus Lock'
  )
  await act(async () => {
    for (let step = 0; step < 15; step++) {
      for (const callback of intervals.values()) callback()
    }
  })
  const confirmedExit = document.querySelector(
    '.focus-lock-quit-btn.unlocked'
  ) as HTMLButtonElement
  check(Boolean(confirmedExit), 'Focus Lock did not unlock confirmed exit')
  await act(async () => confirmedExit.click())
  check(
    !document.querySelector('.focus-mode-overlay') && fullscreenElement === null,
    'Confirmed exit did not leave fullscreen Focus Mode'
  )
  check(getComputedStyle(document.documentElement).overflowY !== 'hidden' && Math.abs(window.scrollY - backgroundScroll) < 2, 'Focus exit must restore background scrolling and its previous position')
  let completionSelections = 0
  const finalDrawerProps = { ...drawerProps,
    allLectures: [selectedLecture, { ...selectedLecture, id: 'later-done', studyStatus: 'completata' }],
    onSelectLecture: () => { completionSelections++ }, onStudyStatusChange: async () => true }
  await act(async () => root.render(<LectureDrawer {...finalDrawerProps} />))
  await act(async () => document.querySelector<HTMLButtonElement>('.lecture-complete-cta-btn')!.click())
  check(completionSelections === 0, 'Final unfinished lesson must not advance into an already completed later lesson')
  await act(async () => root.render(<LectureDrawer {...finalDrawerProps} isReturningToList selectedLecture={{ ...selectedLecture, studyStatus: 'completata' }} />))
  check(document.querySelector('.final-lecture-notice')?.textContent?.includes('Ultima lezione'), 'Ordinary view must announce return to all lessons')
  const beforeCompletionSave = api.saveStudySession
  const completionSessions: any[] = []
  api.saveStudySession = async (session: any) => { completionSessions.push(session) }
  await act(async () => root.render(<LectureDrawer {...finalDrawerProps} />))
  await act(async () => focusButton().click())
  await act(async () => { for (const tick of intervals.values()) tick() })
  await act(async () => root.render(<LectureDrawer {...finalDrawerProps} isReturningToList selectedLecture={{ ...selectedLecture, studyStatus: 'completata' }} />))
  check(document.querySelector('.focus-mode-overlay .final-lecture-notice')?.textContent?.includes('Tutte le lezioni'), 'Focus must announce final return')
  check(!document.querySelector('.focus-lock-overlay'), 'Final completion must bypass the fifteen-second Focus Lock')
  await act(async () => root.render(null))
  check(fullscreenElement === null && !document.querySelector('.focus-lock-overlay'), 'Final unmount must leave fullscreen without Focus Lock')
  check(completionSessions.some(session => session.lectureId === selectedLecture.id && session.durationSeconds > 0), 'Final completion must persist the Focus study session')
  check(new Set(completionSessions.map(session => session.id)).size === completionSessions.length, 'Completion and unmount must not duplicate session saves')
  api.saveStudySession = beforeCompletionSave
  longBackground.remove()
  window.scrollTo(0, 0)

  await act(async () => root.render(null))
  drawerStyle.remove()
  window.setInterval = originalInterval
  window.clearInterval = originalClear
  require('electron').ipcRenderer.send('test-checkpoint', 'runVideoImportScenarios')
  await runVideoImportScenarios(root, api)
  require('electron').ipcRenderer.send('test-checkpoint', 'runMathRenderingScenario')
  await runMathRenderingScenario()
  require('electron').ipcRenderer.send('test-checkpoint', 'runLectureListScenarios')
  await runLectureListScenarios(root)
  require('electron').ipcRenderer.send('test-checkpoint', 'runFocusPdfScenarios')
  await runFocusPdfScenarios(root, api)
  require('electron').ipcRenderer.send('test-checkpoint', 'runReadingPositionScenarios')
  await runReadingPositionScenarios(root)
  require('electron').ipcRenderer.send('test-checkpoint', 'runReadingRestart')
  await runReadingRestart(root, false)
  await runMemoLogsExportScenarios(root, api)
  require('electron').ipcRenderer.send('test-checkpoint', 'runDiscussionDiagnosticsScenarios')
  await runDiscussionDiagnosticsScenarios(root, api)
  require('electron').ipcRenderer.send('test-checkpoint', 'runDictionaryScenarios')
  await runDictionaryScenarios(root, api)
  require('electron').ipcRenderer.send('test-checkpoint', 'runQnaImageScenarios')
  await runQnaImageScenarios(root, api)
  require('electron').ipcRenderer.send('test-checkpoint', 'runCourseChatScenarios')
  await runCourseChatScenarios(root, api)
  require('electron').ipcRenderer.send('test-checkpoint', 'runStudyToolsScenarios')
  await runStudyToolsScenarios(root, api)
  require('electron').ipcRenderer.send('test-checkpoint', 'runMusicTranslationScenarios')
  await runMusicTranslationScenarios(root, api)
  await runInterfacePolishScenarios(root, api)
  await runTodayScenarios(root, api)
  await runOctober22Scenarios(root, api)
  require('electron').ipcRenderer.send(
    'done',
    'PASS: React regression scenarios (Markdown alerts, literals and formula contrast; Focus Lock lecture/session totals, checkpoints, pauses, reentry, errors and stale responses; PDF.js mixed pages, reading position, zoom, native divider, Q&A and hidden panes; dashboard, settings, video import, course archive, Q&A, pipeline, AI isolation, translation, search, Quick Capture, highlights, reminders, Mermaid, study tabs and fullscreen)'
  )
}
run().catch((error) =>
  require('electron').ipcRenderer.send('done', `FAIL: ${error.stack || error}`)
)
