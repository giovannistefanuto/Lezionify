import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { CourseChat } from '../../src/components/CourseChat'
import { syntheticPdf } from './focusPdfScenarios.browser'
import type { CourseRagEvent, CourseRagState } from '../../shared/courseRag'

declare const require: any
export async function runCourseChatScenarios(root: Root, api: any) {
  const check = (value: unknown, message: string) => {
    if (!value) throw new Error(message)
  }
  const extracted = await require('electron').ipcRenderer.invoke('course-rag-worker', syntheticPdf(2))
  check(extracted.length === 2 && extracted.every((page: { text: string }) => !page.text), 'Electron PDF worker did not preserve non-text page coverage')
  const previous = { ...api }
  const style = document.createElement('style')
  style.textContent = await require('electron').ipcRenderer.invoke(
    'video-import-styles'
  )
  document.head.appendChild(style)
  const source = {
    id: 'pdf',
    title: 'Slide sintetiche.pdf',
    kind: 'pdf' as const,
    version: 'v1',
    status: 'partial' as const,
    pages: 2,
    unreadablePages: [2]
  }
  const passage = {
    id: 'p1',
    sourceId: 'pdf',
    page: 2,
    offset: 0,
    text: 'Testo citato delle slide sintetiche.'
  }
  const states: Record<string, CourseRagState> = {
    GAME: {
      course: 'GAME',
      enabled: false,
      syncing: false,
      sources: [source],
      semantic: { status: 'ready' },
      threads: []
    },
    OTHER: {
      course: 'OTHER',
      enabled: false,
      syncing: false,
      sources: [],
      threads: []
    }
  }
  let notify: (event: CourseRagEvent) => void = () => {}
  const sent: any[] = []
  let openedLecture = '',
    closed = false
  const url = URL.createObjectURL(
    new Blob([syntheticPdf(2)], { type: 'application/pdf' })
  )
  api.getCourseRag = async (course: string) => structuredClone(states[course])
  api.getCourses = async () => [{ code: 'GAME', name: 'Teoria dei giochi' }, { code: 'OTHER', name: 'Intelligent Robotics' }]
  api.saveCourseThread = async (course: string, thread: any) => {
    const existing = states[course].threads.find(
      (item) => item.id === thread.id
    )
    if (existing) {
      existing.draft = thread.draft
      existing.title = thread.title
    } else states[course].threads.push(structuredClone(thread))
  }
  api.deleteCourseThread = async (course: string, id: string) => {
    states[course].threads = states[course].threads.filter(
      (item) => item.id !== id
    )
  }
  api.onCourseRagEvent = (callback: typeof notify) => {
    notify = callback
    return () => {}
  }
  api.linkCourseFolder = async (course: string) => {
    states[course].enabled = true
    states[course].folderName = 'Cartella corso'
    return structuredClone(states[course])
  }
  api.setCourseFolderEnabled = async (course: string, enabled: boolean) => {
    states[course].enabled = enabled
    return structuredClone(states[course])
  }
  api.syncCourseRag = async (course: string) => structuredClone(states[course])
  api.addCourseDocuments = api.syncCourseRag
  api.manageCourseIndex = async (course: string, action: string) => {
    if (action === 'start') states[course].indexing = { status: 'running', revision: 'synthetic', total: 12, completed: 8, sources: [{ sourceId: 'pdf', completed: 8, total: 12 }], updatedAt: '' }
    if (action === 'cancel') states[course].indexing!.status = 'cancelled'
    if (action === 'storage') states[course].storage = { modelBytes: 140 * 1048576, vectorBytes: 1048576, corpusBytes: 1000, revisions: 2 }
    return structuredClone(states[course])
  }
  api.openCoursePdf = async () => ({
    id: 'course-test-pdf',
    name: source.title,
    sourceVersion: source.version,
    url
  })
  api.releaseFocusPdf = async () => {}
  api.countCourseMentions = async () => ({
    term: 'Nash',
    occurrences: 5,
    lessons: 2,
    missingTranscripts: 1,
    perLecture: [
      { lectureId: 'lecture-1', title: 'Lezione sintetica', occurrences: 3 }
    ]
  })
  api.askCourse = async (...args: any[]) => {
    sent.push(args)
    const [course, id, question] = args
    const thread = states[course].threads.find((item) => item.id === id)!
    thread.messages.push(
      {
        id: `user-${sent.length}`,
        role: 'user',
        text: question,
        createdAt: ''
      },
      {
        id: `answer-${sent.length}`,
        role: 'assistant',
        text: 'Dalle fonti del corso: esempio con $x=1$.',
        createdAt: '',
        citations: [{ source, passage }],
        grounding: { status: 'reviewed', claims: [{ text: 'esempio', kind: 'course', support: 'uncertain', passageIds: ['p1'], reason: 'Controllo sintetico fallibile.' }], contradictions: ['Le due fonti non concordano.'] },
        trace: [{ action: 'send_context', sourceIds: ['pdf'], at: '' }]
      }
    )
    thread.draft = ''
    return structuredClone(thread)
  }
  const render = async (open = true) =>
    act(async () =>
      root.render(
        <CourseChat
          open={open}
          courses={['GAME', 'OTHER']}
          initialCourse="GAME"
          onClose={() => {
            closed = true
          }}
          onOpenLecture={(id) => {
            openedLecture = id
          }}
        />
      )
    )
  const settle = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40))
    })
  const until = async (condition: () => boolean, message: string) => {
    for (let step = 0; step < 100; step++) {
      if (condition()) return
      await settle()
    }
    throw new Error(message)
  }
  const click = async (text: string) => {
    const button = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.course-chat button')
    ).find((item) => item.textContent?.includes(text))
    check(button, `Missing course button: ${text}`)
    await act(async () => button!.click())
  }
  const input = async (
    field: HTMLInputElement | HTMLTextAreaElement,
    value: string
  ) =>
    act(async () => {
      const prototype =
        field instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(
        field,
        value
      )
      field.dispatchEvent(new Event('input', { bubbles: true }))
    })
  try {
    await render()
    await until(
      () =>
        states.GAME.threads.length === 1 &&
        !!document.querySelector('textarea'),
      'Initial course thread not created'
    )
    check(!!document.querySelector('.course-consultation-start'), 'New research did not show consultation start')
    check(document.querySelector<HTMLElement>('[aria-label="Conversazioni del corso"]')!.hidden, 'History dominates new research')
    check(!document.querySelector('.course-coverage') && !document.querySelector('.course-count-tool'), 'Technical details leaked onto consultation start')
    await click('Dove abbiamo introdotto')
    check(document.querySelector<HTMLTextAreaElement>('textarea')!.value.includes('questo concetto') && sent.length === 0, 'Example sent AI instead of preparing an editable draft')
    check(document.activeElement === document.querySelector('textarea'), 'Example did not focus question')
    await click('OTHER')
    await until(() => states.OTHER.threads.length === 1, 'Segmented course switch did not load target')
    await input(document.querySelector('textarea')!, 'Bozza del secondo corso')
    await click('GAME')
    await until(() => document.querySelector<HTMLTextAreaElement>('textarea')?.value.includes('questo concetto') === true, 'Course switch lost original draft')
    check(sent.length === 0, 'Course selection contacted AI')
    await click('Ricerche recenti')
    check(!document.querySelector<HTMLElement>('[aria-label="Conversazioni del corso"]')!.hidden, 'History cannot be reached')
    await click('Ricerche recenti')
    await input(document.querySelector('textarea')!, '')
    const ipc = require('electron').ipcRenderer
    await ipc.invoke('feature-test-window-size', { width: 1440, height: 960 })
    await settle()
    await ipc.invoke('capture-video-import', 'oct22-consultation-start')
    document.documentElement.setAttribute('data-theme', 'dark')
    await ipc.invoke('capture-video-import', 'oct22-consultation-dark')
    document.documentElement.removeAttribute('data-theme')
    await ipc.invoke('feature-test-window-size', { width: 900, height: 640 })
    await settle()
    const consult = document.querySelector<HTMLButtonElement>('.course-consultation-submit')!.getBoundingClientRect()
    check(consult.top >= 0 && consult.bottom <= innerHeight, 'Short window hides consult action')
    await ipc.invoke('capture-video-import', 'oct22-consultation-low')
    await ipc.invoke('feature-test-window-size', { width: 390, height: 844 })
    await settle()
    const form = document.querySelector('.course-chat-composer')!.getBoundingClientRect()
    check(form.left >= 0 && form.right <= innerWidth + 1, 'Narrow consultation overflows horizontally')
    await ipc.invoke('capture-video-import', 'oct22-consultation-narrow')
    await ipc.invoke('feature-test-window-size', { width: 1240, height: 820 })
    await settle()
    await input(document.querySelector('textarea')!, 'Bozza da conservare')
    await click('Chiudi')
    check(closed, 'Close handler missing')
    await render(false)
    await render(true)
    check(
      document.querySelector('textarea')!.value === 'Bozza da conservare',
      'Closing course chat lost draft'
    )
    await click('Materiali del corso')
    check(
      document
        .querySelector('[aria-label="Fonti del corso"]')
        ?.textContent?.includes('Copertura parziale'),
      'Partial PDF coverage hidden'
    )
    await click('Collega cartella')
    check(states.GAME.enabled, 'Folder activation not connected')
    await click('Prepara / riprendi indice locale')
    check(document.querySelector('[aria-label="Preparazione indice locale"]')?.textContent?.includes('8/12'), 'Index coverage missing')
    check(sent.length === 0, 'Local indexing triggered AI')
    await click('Interrompi preparazione')
    check(states.GAME.indexing?.status === 'cancelled', 'Index cancellation not connected')
    await click('Misura spazio locale')
    check(document.querySelector('[aria-label="Fonti del corso"]')?.textContent?.includes('140.0 MB'), 'Local storage missing')
    await click('Apri / scegli pagine')
    await until(
      () =>
        !!document.querySelector(
          '[aria-label="Seleziona pagina 2 per Gemini"]'
        ),
      'Course PDF pages not ready'
    )
    await act(async () =>
      document
        .querySelector<HTMLInputElement>(
          '[aria-label="Seleziona pagina 2 per Gemini"]'
        )!
        .click()
    )
    await click('Allega 1 slide')
    await until(
      () => !document.querySelector('.course-pdf-preview'),
      'Selected PDF pages not attached'
    )
    check(
      document
        .querySelector('.course-chat')
        ?.textContent?.includes('verranno inviate come immagini'),
      'Visual send disclosure missing'
    )
    check(sent.length === 0, 'Page selection sent AI before explicit send')
    await click('Consulta il corso')
    await until(
      () =>
        sent.length === 1 &&
        !!document.querySelector('.course-citations button'),
      'Course answer or citation missing'
    )
    check(document.querySelector('.course-grounding')?.textContent?.includes('1 affermazioni da verificare'), 'Uncertain claim hidden')
    check(document.querySelector('.course-grounding')?.textContent?.includes('Le due fonti non concordano'), 'Contradictory evidence hidden')
    check(
      sent[0][4]?.[0]?.page === 2 && sent[0][5] === 'pdf',
      'Send did not include selected page provenance'
    )
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('.course-citations button')!
        .click()
    )
    check(
      document
        .querySelector('[aria-label="Passaggio citato"]')
        ?.textContent?.includes(passage.text),
      'Citation did not open exact passage'
    )
    await click('Apri PDF attuale')
    await until(
      () => !!document.querySelector('[aria-label="Pagina 2 di 2"]'),
      'PDF citation did not open cited page'
    )
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('[aria-label="Nascondi PDF"]')!
        .click()
    )
    states.GAME.sources[0] = { ...source, version: 'v2' }
    await act(async () =>
      notify({
        course: 'GAME',
        message: 'Aggiornamento delle fonti terminato.'
      })
    )
    await until(
      () =>
        document
          .querySelector('.course-citations button')
          ?.textContent?.includes('fonte modificata') === true,
      'Changed citation version not disclosed'
    )
    await input(
      document.querySelector<HTMLInputElement>('.course-count input')!,
      'Nash'
    )
    await click('Conta')
    await until(
      () =>
        document
          .querySelector('.course-count')
          ?.textContent?.includes('5 occorrenze in 2 lezioni') === true,
      'Per-lesson count not rendered'
    )
    await click('Lezione sintetica')
    check(openedLecture === 'lecture-1', 'Count result did not open lecture')
    const answerNormally = api.askCourse
    let rejectRecovery!: (error: Error) => void
    api.askCourse = async (course: string, _thread: string, _question: string, requestId: string) => {
      notify({ course, requestId, message: 'Riprovo automaticamente tra 15 secondi; la domanda è conservata.' })
      return new Promise((_resolve, reject) => { rejectRecovery = reject })
    }
    api.stopCourseAnswer = async () => rejectRecovery(new Error("Error invoking remote method 'course-rag:ask': Error: Risposta interrotta. La domanda è stata conservata."))
    await input(document.querySelector('textarea')!, 'Domanda durante il recupero')
    await click('Invia a Gemini')
    await until(() => !!document.querySelector('[role="status"]')?.textContent?.includes('Riprovo automaticamente'), 'Automatic recovery status missing')
    check(document.querySelector<HTMLTextAreaElement>('textarea')!.value === 'Domanda durante il recupero', 'Recovery lost question')
    await click('Interrompi')
    await until(() => !!document.querySelector('[role="alert"]')?.textContent?.includes('Risposta interrotta'), 'Cancellation result missing')
    check(!document.querySelector('[role="alert"]')?.textContent?.includes('Error invoking remote method'), 'Raw IPC wrapper shown to user')
    check(document.querySelector<HTMLTextAreaElement>('textarea')!.value === 'Domanda durante il recupero', 'Cancellation lost draft')
    api.askCourse = answerNormally
    await click('Riprova domanda')
    await until(() => document.querySelector<HTMLTextAreaElement>('textarea')?.value === '', 'Retry failed to recover question')
    await act(async () => {
      const select = document.querySelector<HTMLSelectElement>(
        '[aria-label="Corso della chat"]'
      )!
      select.value = 'OTHER'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await until(
      () => states.OTHER.threads.length === 1,
      'Other course failed to load'
    )
    check(
      !document.querySelector('.course-citations button'),
      'Other course leaked previous citations'
    )
    check(document.querySelector('.course-consultation-title')?.textContent?.includes('Intelligent Robotics'), 'Selected course name not used on start')
    await input(document.querySelector('textarea')!, 'Nuova bozza')
    await render(false)
    await act(async () => root.render(null))
    await until(
      () => states.OTHER.threads[0].draft === 'Nuova bozza',
      'Unmount lost latest draft'
    )
  } finally {
    await act(async () => root.render(null))
    style.remove()
    URL.revokeObjectURL(url)
    for (const key of Object.keys(api)) if (!(key in previous)) delete api[key]
    Object.assign(api, previous)
  }
}
