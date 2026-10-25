import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { QuickCaptureOverlay } from '../../src/components/QuickCaptureOverlay'
import { useQuickCapture } from '../../src/hooks/useQuickCapture'
import { LectureRecordingTimes } from '../../src/components/LectureRecordingTimes'
import type { Lecture } from '../../shared/archive'
import { Sidebar } from '../../src/components/Sidebar'

declare const require: any

export async function runInterfacePolishScenarios(root: Root, api: any) {
  const check = (value: unknown, message: string) => {
    if (!value) throw new Error(message)
  }
  const style = document.createElement('style')
  style.textContent = await require('electron').ipcRenderer.invoke(
    'video-import-styles'
  )
  document.head.appendChild(style)
  const oldApi = { ...api }
  const ipc = require('electron').ipcRenderer
  const wait = async () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })
  const shot = async (name: string) => ipc.invoke('capture-video-import', name)
  const click = async (text: string) => {
    const element = [
      ...document.querySelectorAll<HTMLElement>('button, summary')
    ].find(
      (item) =>
        item.textContent?.trim() === text ||
        item.getAttribute('aria-label') === text
    )
    check(element, `Missing control: ${text}`)
    await act(async () => element!.click())
    await wait()
  }
  let capture: ReturnType<typeof useQuickCapture>
  let saved: any
  api.getScratchpad = async () => ({
    todos: [
      {
        id: 'one',
        text: 'Ripassare le dimostrazioni prima della prossima lezione',
        completed: false,
        createdAt: '',
        groupId: 'study'
      },
      {
        id: 'two',
        text: 'Attività completata',
        completed: true,
        createdAt: '',
        groupId: 'study'
      }
    ],
    notes: 'Appunti senza tag',
    selectedGroupId: 'study',
    updatedAt: '',
    groups: [
      {
        id: 'study',
        name: 'Studio',
        shortcut: 'S',
        notes: 'Controllare gli esempi e confrontare i passaggi.'
      }
    ]
  })
  api.saveScratchpad = async (data: any) => {
    saved = structuredClone(data)
  }
  function Memo() {
    capture = useQuickCapture()
    return capture.isOpen ? <QuickCaptureOverlay capture={capture} /> : null
  }
  const noop = () => {}
  const render = async (collapsed = false) =>
    act(async () =>
      root.render(
        <div className="app-shell">
          <Sidebar
            mainView="archive"
            setMainView={noop}
            selectedCourse="tutti"
            setSelectedCourse={noop}
            selectedStudyStatus="tutti"
            setSelectedStudyStatus={noop}
            totalLecturesCount={200}
            coursesWithCounts={Array.from(
              { length: 60 },
              (_, i) => `Corso ${i + 1}`
            )}
            getCourseLecturesCount={() => 4}
            onOpenSettings={noop}
            hasConfiguredKey
            searchQuery=""
            setSearchQuery={noop}
            onRefreshStats={noop}
            isCollapsed={collapsed}
            onToggleCollapse={noop}
            theme="light"
            onToggleTheme={noop}
            onOpenCourseManagement={noop}
          />
          <main style={{ height: 5000 }}>Lista di 200 lezioni sintetiche</main>
        </div>
      )
    )
  try {
    await render()
    const music = () =>
      document.querySelector<HTMLElement>('[aria-label="Apri musica e suoni"]')!
    check(
      music().getBoundingClientRect().bottom <= innerHeight,
      'Musica finisce fuori schermo con una lista lunga'
    )
    const search = document
      .querySelector('.sidebar-search')!
      .getBoundingClientRect()
    check(
      music().getBoundingClientRect().bottom <= search.top,
      'Musica must be above search'
    )
    const scroller = document.querySelector<HTMLElement>('.sidebar-scrollable')!
    check(
      scroller.scrollHeight > scroller.clientHeight,
      'Long course list does not scroll internally'
    )
    scroller.scrollTop = scroller.scrollHeight
    check(
      music().getBoundingClientRect().top >= 0,
      'Course scrolling hid music'
    )
    await shot('polish-sidebar')
    window.scrollTo(0, 2000)
    await new Promise((resolve) => setTimeout(resolve, 80))
    check(
      music().getBoundingClientRect().top >= 0 &&
        music().getBoundingClientRect().bottom <= innerHeight,
      'Musica scompare scorrendo le lezioni'
    )
    await render(true)
    check(
      music().getBoundingClientRect().bottom <= innerHeight &&
        music().textContent === '♫',
      'Collapsed music inaccessible'
    )
    await shot('polish-sidebar-collapsed')
    window.scrollTo(0, 0)
    await ipc.invoke('feature-test-window-size', { width: 640, height: 560 })
    await render()
    await wait()
    check(
      music().getBoundingClientRect().top >= 0 &&
        music().getBoundingClientRect().bottom <= innerHeight,
      'Short window hides music'
    )
    await shot('polish-sidebar-narrow')
    await ipc.invoke('feature-test-window-size', false)
    await act(async () => root.render(<Memo />))
    await act(async () => capture.toggleOpen())
    await wait()
    check(
      document.querySelector('.memo-heading .memo-close'),
      'Close must be in Memo heading'
    )
    check(
      document.querySelector('.memo-main-toolbar nav') &&
        !document.querySelector('.memo-main-toolbar .memo-close'),
      'Group navigation mixed with global actions'
    )
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme)
      await shot(`polish-memo-${theme}`)
    }
    await click('Azioni gruppo')
    const summary = document.querySelector<HTMLElement>(
      '.memo-group-actions summary'
    )!
    summary.focus()
    await act(async () =>
      summary.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    )
    check(
      capture.isOpen &&
        !document.querySelector('details[open].memo-group-actions') &&
        document.activeElement === summary,
      'Escape should dismiss actions and retain Memo'
    )
    await click('Azioni gruppo')
    await click('Modifica gruppo')
    check(
      document.querySelector<HTMLInputElement>('input[maxlength="80"]')
        ?.value === 'Studio',
      'Group edit unavailable'
    )
    await click('Annulla')
    await click('Pulisci completati')
    check(
      capture.todos.length === 1 && !capture.todos[0].completed,
      'Clear removed unfinished task'
    )
    await click('Tutti')
    check(
      document.querySelectorAll('.todo-item-row').length === 1 &&
        document.querySelector('.memo-all-notes'),
      'Compact all view lost activity or notes'
    )
    await ipc.invoke('feature-test-window-size', { width: 390, height: 740 })
    await wait()
    const deck = document.querySelector('.quick-capture-deck')!
    check(
      deck.getBoundingClientRect().right <= innerWidth + 1 &&
        deck.scrollWidth <= deck.clientWidth + 1,
      'Memo content overflows at 390px'
    )
    await shot('polish-memo-narrow')
    await ipc.invoke('feature-test-window-size', false)
    await act(async () => capture.selectGroup('study'))
    await click('Azioni gruppo')
    await click('Elimina gruppo')
    check(
      document.querySelector('.memo-delete-confirm') &&
        capture.todos[0].groupId === 'study',
      'Delete must require confirmation'
    )
    await click('Conferma eliminazione')
    check(
      capture.todos[0].groupId === '' || capture.todos[0].groupId === undefined,
      'Deleting group lost task'
    )
    check(
      capture.notes.includes('Controllare gli esempi'),
      'Deleting group lost notes'
    )
    await act(async () => capture.closeOverlay())
    await act(async () => capture.retrySave())
    check(
      saved.todos.length === 1 && saved.groups.length === 0,
      'Memo changes were not persisted'
    )
    const lecture = {
      recordedAt: '2026-10-21T23:40:00',
      durationSeconds: 2400
    } as Lecture
    await act(async () =>
      root.render(
        <div className="detail-card">
          <h3>Info e Gestione</h3>
          <LectureRecordingTimes lecture={lecture} />
        </div>
      )
    )
    check(
      document
        .querySelector('.recording-times')
        ?.textContent?.includes('00:20 · 22/10/2026'),
      'Audio end date missing at midnight'
    )
    check(
      !document.querySelector('.recording-times input'),
      'Audio time must be read-only'
    )
    await shot('polish-info')
    await act(async () =>
      root.render(
        <LectureRecordingTimes
          lecture={{
            ...lecture,
            videoImport: { scheduledEndTime: '01:00', sources: [] }
          }}
        />
      )
    )
    check(
      document.body.textContent?.includes(
        "Inizio assegnato all'importazione"
      ) && !document.body.textContent?.includes('01:00'),
      'Video scheduled end was used as measured audio end'
    )
  } finally {
    await act(async () => root.render(null))
    window.scrollTo(0, 0)
    Object.assign(api, oldApi)
    await ipc.invoke('feature-test-window-size', false)
    document.documentElement.setAttribute('data-theme', 'light')
    style.remove()
  }
}
