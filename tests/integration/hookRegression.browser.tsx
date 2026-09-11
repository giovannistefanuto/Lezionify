import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useQna } from '../../src/hooks/useQna'
import { useGeminiGeneration } from '../../src/hooks/useGeminiGeneration'
import {
  invalidateLectureContentCache,
  useLectureContent
} from '../../src/hooks/useLectureContent'
import { useStudyTracker } from '../../src/hooks/useStudyTracker'
import { useLectures } from '../../src/hooks/useLectures'
import { useQuickCapture } from '../../src/hooks/useQuickCapture'
import { useHighlights } from '../../src/hooks/useHighlights'
import { LectureList } from '../../src/components/LectureList'
import { FocusReminders } from '../../src/components/FocusReminders'
import { MarkdownViewer } from '../../src/components/MarkdownViewer'
import { Dashboard } from '../../src/components/Dashboard'
import { CourseManagementModal } from '../../src/components/CourseManagementModal'
import { LectureDrawer } from '../../src/components/LectureDrawer'
import { StudySetTab } from '../../src/components/StudySetTab'

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
  readTranscript: async () => null
}
;(window as any).archive = api

async function run() {
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

  await act(async () => {
    root.render(
      <MarkdownViewer
        content={`# Pipeline

\`\`\`mermaid
flowchart LR
  accTitle: Pipeline della lezione
  accDescr: Passaggio dall'audio alla dispensa
  A["Audio"] --> B["Trascrizione"] --> C["Dispensa"]
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
  await act(async () => root.render(<LectureDrawer {...drawerProps} />))
  const focusButton = () =>
    document.querySelector(
      '[title="Modalità studio immersiva"]'
    ) as HTMLButtonElement
  await act(async () => focusButton().click())
  check(
    !document.querySelector('.focus-mode-overlay'),
    'Rejected fullscreen left Focus Mode active'
  )
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
  await act(async () =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  )
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

  await act(async () => root.render(null))
  window.setInterval = originalInterval
  window.clearInterval = originalClear
  require('electron').ipcRenderer.send(
    'done',
    'PASS: 24 React regression scenarios (Q&A, AI isolation and job IDs, translation, LRU, import UX, search, timers, Quick Capture, 0 CFU, highlights, reminders, multiple viewers, Mermaid render and fallback, study tabs, fullscreen)'
  )
}
run().catch((error) =>
  require('electron').ipcRenderer.send('done', `FAIL: ${error.stack || error}`)
)
