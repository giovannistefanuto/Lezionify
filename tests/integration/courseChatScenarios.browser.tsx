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
    await input(document.querySelector('textarea')!, 'Bozza da conservare')
    await click('Chiudi')
    check(closed, 'Close handler missing')
    await render(false)
    await render(true)
    check(
      document.querySelector('textarea')!.value === 'Bozza da conservare',
      'Closing course chat lost draft'
    )
    await click('Fonti')
    check(
      document
        .querySelector('[aria-label="Fonti del corso"]')
        ?.textContent?.includes('Copertura parziale'),
      'Partial PDF coverage hidden'
    )
    await click('Collega cartella')
    check(states.GAME.enabled, 'Folder activation not connected')
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
    await click('Invia a Gemini')
    await until(
      () =>
        sent.length === 1 &&
        !!document.querySelector('.course-citations button'),
      'Course answer or citation missing'
    )
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
