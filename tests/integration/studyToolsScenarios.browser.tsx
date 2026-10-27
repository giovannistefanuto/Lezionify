import React, { act, useRef } from 'react'
import type { Root } from 'react-dom/client'
import { useQuickCapture } from '../../src/hooks/useQuickCapture'
import { QuickCaptureOverlay } from '../../src/components/QuickCaptureOverlay'
import { useStudyEstimate } from '../../src/hooks/useStudyEstimate'
import { contentFingerprint } from '../../src/utils/readingPosition'
import { STUDY_ESTIMATE_PREFERENCE } from '../../src/utils/studyEstimate'

function check(value: unknown, message: string) {
  if (!value) throw new Error(message)
}
export async function runStudyToolsScenarios(root: Root, api: any) {
  const previousLoad = api.getScratchpad,
    previousSave = api.saveScratchpad
  let stored: any = {
    todos: [{ id: 'old', text: 'Storica', completed: false, createdAt: '' }],
    notes: 'Originali',
    updatedAt: ''
  }
  let capture: any
  api.getScratchpad = async () => structuredClone(stored)
  api.saveScratchpad = async (data: any) => {
    stored = structuredClone(data)
  }
  function CaptureHarness() {
    capture = useQuickCapture()
    return capture.isOpen ? <QuickCaptureOverlay capture={capture} /> : null
  }
  const click = async (text: string) => {
    const button = Array.from(document.querySelectorAll('button')).find(
      (item) => item.textContent === text
    )
    check(button, `Missing capture control: ${text}`)
    await act(async () => button!.click())
  }
  try {
    await act(async () => root.render(<CaptureHarness />))
    await act(async () => capture.toggleOpen())
    check(document.querySelector('[role="dialog"]'), 'Capture dialog missing')
    await act(async () => capture.saveGroup(null, 'Studio', 'S'))
    const studio = capture.groups[0].id
    await act(async () => {
      capture.addTodo('Nuova')
      capture.updateNotes('Note studio')
    })
    await act(async () => capture.saveGroup(null, 'Casa', 'C'))
    const casa = capture.groups[1].id
    await act(async () =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 's',
          altKey: true,
          bubbles: true,
          cancelable: true
        })
      )
    )
    check(capture.selectedGroupId === studio, 'Alt+letter did not select group')
    const selectedBeforeTyping = capture.selectedGroupId
    await act(async () =>
      document
        .querySelector('input')!
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'c', bubbles: true })
        )
    )
    check(
      capture.selectedGroupId === selectedBeforeTyping,
      'Ordinary typing changed group'
    )
    check(
      capture.saveGroup(null, 'Duplicato', 'S') !== null,
      'Duplicate shortcut accepted'
    )
    await act(async () => capture.saveGroup(studio, 'Università', 'U'))
    check(capture.groups[0].notes === 'Note studio', 'Rename lost notes')
    const todo = capture.todos.find((item: any) => item.text === 'Nuova')
    await act(async () => {
      capture.moveTodo(todo.id, casa)
      capture.toggleTodo(todo.id)
    })
    await act(async () => capture.clearCompletedTodos(studio))
    check(
      capture.todos.some((item: any) => item.id === todo.id),
      'Clear completed crossed group boundary'
    )
    await act(async () => capture.selectGroup('all'))
    check(
      document.querySelectorAll('.todo-item-row').length === 2 && document.querySelectorAll('.memo-all-notes > details').length === 3,
      'All view must flatten activities and retain notes for every group'
    )
    await act(async () => capture.selectGroup(studio))
    await act(async () => document.querySelector<HTMLElement>('.memo-group-actions summary')!.click())
    await click('Elimina gruppo')
    check(capture.groups.length === 2, 'Group removed before confirmation')
    await click('Conferma eliminazione')
    check(
      capture.notes.includes('Originali') &&
        capture.notes.includes('Note studio'),
      'Delete lost historical or group notes'
    )
    await act(async () => {
      capture.selectGroup(casa)
      capture.closeOverlay()
      await capture.retrySave()
    })
    await act(async () => root.render(null))
    await act(async () => root.render(<CaptureHarness />))
    check(
      capture.selectedGroupId === casa &&
        capture.todos.some(
          (item: any) => item.groupId === casa && item.completed
        ),
      'Restart lost group selection or assignments'
    )
    await act(async () => capture.toggleOpen())
    await click('+ Gruppo')
    check(
      document.querySelector('input[maxlength="80"]'),
      'Create group form unavailable'
    )
    await click('Annulla')
    await act(async () => capture.clearCompletedTodos('all'))
    check(capture.todos.every((item: any) => !item.completed) && capture.todos.some((item: any) => item.id === 'old'), 'Clear all completed must preserve unfinished historical activities')
  } finally {
    await act(async () => root.render(null))
    api.getScratchpad = previousLoad
    api.saveScratchpad = previousSave
  }

  const originalNow = Date.now,
    originalInterval = window.setInterval,
    originalClear = window.clearInterval
  const originalFocus = document.hasFocus
  const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
  const callbacks = new Map<number, () => void>()
  let now = originalNow(),
    nextId = 0,
    hidden = false
  Date.now = () => now
  window.setInterval = ((callback: () => void) => {
    callbacks.set(++nextId, callback)
    return nextId
  }) as typeof window.setInterval
  window.clearInterval = (id) => {
    callbacks.delete(id)
  }
  document.hasFocus = () => true
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden
  })
  let output: any
  function EstimateHarness({
    paused = false,
    language = 'it',
    markdown = 'source',
    viewport = 1000
  }: {
    paused?: boolean
    language?: string
    markdown?: string
    viewport?: number
  }) {
    const ref = useRef<HTMLDivElement>(null)
    output = useStudyEstimate({
      lectureId: 'study-tools-test',
      markdown,
      enabled: true,
      paused,
      language,
      rootRef: ref
    })
    return (
      <>
        <div
          ref={ref}
          style={{ height: viewport, overflow: 'auto' }}
          data-estimate-root
        >
          <div className="markdown-body">
            {Array.from({ length: 20 }, (_, i) => (
              <p key={i} style={{ height: 1000, margin: 0 }}>
                {'testo '.repeat(50)}
              </p>
            ))}
          </div>
        </div>
        <div className="focus-qna-column" tabIndex={0}>
          Domande
        </div>
      </>
    )
  }
  const key = 'lezionify.study-estimate.v1:study-tools-test'
  const storedPreference = localStorage.getItem(STUDY_ESTIMATE_PREFERENCE)
  localStorage.removeItem(key)
  localStorage.setItem(STUDY_ESTIMATE_PREFERENCE, 'true')
  const snapshot = () => JSON.parse(localStorage.getItem(key)!)
  const tick = async (count = 1, milliseconds = 1000) => {
    await act(async () => {
      for (let step = 0; step < count; step++) {
        now += milliseconds
        for (const callback of [...callbacks.values()]) callback()
      }
    })
  }
  try {
    await act(async () => root.render(<EstimateHarness />))
    const scroller = () =>
      document.querySelector<HTMLElement>('[data-estimate-root]')!
    // A full skim followed by study at the bottom must not invent completion of the middle.
    for (let bin = 0; bin < 20; bin++) {
      scroller().scrollTop = bin * 1000
      scroller().dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
      await tick(1, 250)
    }
    await tick(600)
    check(output.label === null, 'Five-second skim produced a study estimate')
    scroller().scrollTop = 0
    await act(async () => output.recalculate())
    for (let bin = 0; bin < 12; bin++) {
      scroller().scrollTop = bin * 1000
      scroller().dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
      await tick(60)
    }
    check(
      output.label?.includes('Studio restante'),
      'Consolidated study did not produce estimate: ' +
        JSON.stringify(snapshot())
    )
    await act(async () => root.render(<EstimateHarness paused />))
    const seconds = snapshot().seconds
    await tick(120)
    await act(async () => root.render(<EstimateHarness />))
    check(snapshot().seconds === seconds, 'Pause added study time')
    hidden = true
    await tick(60)
    hidden = false
    await tick(1, 1_800_000)
    await act(async () => root.render(<EstimateHarness paused />))
    check(snapshot().seconds === seconds, 'Hidden page or sleep gap added time')
    await act(async () => root.render(<EstimateHarness language="en" />))
    await tick(1)
    check(
      snapshot().dwell[0] >= 60,
      'Language switch reset consolidated progress'
    )
    const qna = document.querySelector<HTMLElement>('.focus-qna-column')!
    await act(async () =>
      qna.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    )
    const beforeQna = [...snapshot().dwell]
    await tick(60)
    check(
      output.label === null,
      'Estimate should be hidden while consulting Q&A'
    )
    await act(async () => root.render(<EstimateHarness paused language="en" />))
    check(
      snapshot().seconds > seconds &&
        JSON.stringify(snapshot().dwell) === JSON.stringify(beforeQna),
      'Q&A must count time without advancing document'
    )
    await act(async () => root.render(null))
    await act(async () => root.render(<EstimateHarness />))
    check(
      snapshot().fingerprint === contentFingerprint('source'),
      'Restart lost source fingerprint'
    )
    scroller().scrollTop = 10000
    await act(async () => output.recalculate())
    check(
      snapshot().baseline === 10 && snapshot().seconds === 0,
      'Recalculate did not restart from selected position'
    )
    await act(async () => root.render(<EstimateHarness language="en" />))
    await tick(60)
    await act(async () => root.render(<EstimateHarness paused language="en" />))
    check(
      snapshot().seconds > 0,
      'Recalculate was reapplied on language switch'
    )
    await act(async () =>
      root.render(<EstimateHarness markdown="regenerated" />)
    )
    await tick(1)
    await act(async () => root.render(null))
    check(
      snapshot().fingerprint === contentFingerprint('regenerated') &&
        snapshot().seconds <= 1,
      'Regeneration kept old samples'
    )
    localStorage.removeItem(key)
    await act(async () => root.render(<EstimateHarness viewport={2000} />))
    // Read successive complete viewports for 12 minutes: no content is skipped.
    for (let page = 0; page < 8; page++) {
      scroller().scrollTop = page * 2000
      scroller().dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
      await tick(90)
    }
    check(output.label?.includes('Studio restante'),
      'Reading successive full viewports never produced a study estimate: ' + JSON.stringify(snapshot()))
  } finally {
    await act(async () => root.render(null))
    Date.now = originalNow
    window.setInterval = originalInterval
    window.clearInterval = originalClear
    document.hasFocus = originalFocus
    if (hiddenDescriptor)
      Object.defineProperty(document, 'hidden', hiddenDescriptor)
    else delete (document as any).hidden
    localStorage.removeItem(key)
    if (storedPreference === null)
      localStorage.removeItem(STUDY_ESTIMATE_PREFERENCE)
    else localStorage.setItem(STUDY_ESTIMATE_PREFERENCE, storedPreference)
  }
}
