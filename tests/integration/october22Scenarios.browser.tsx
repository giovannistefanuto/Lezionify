import React, { act, useState } from 'react'
import type { Root } from 'react-dom/client'
import { QnaSidebar } from '../../src/components/QnaSidebar'
import { FocusLockModal } from '../../src/components/FocusLockModal'
import { PauseTimerOverlay } from '../../src/components/PauseTimerOverlay'
import { CourseChat } from '../../src/components/CourseChat'
import { QuickCaptureOverlay } from '../../src/components/QuickCaptureOverlay'
import { useQuickCapture } from '../../src/hooks/useQuickCapture'
import { COPY_GUARD_KEY } from '../../src/utils/copyGuard'
import { CourseManagementModal } from '../../src/components/CourseManagementModal'
import type { QnaThread } from '../../shared/archive'

declare const require: any
export async function runOctober22Scenarios(root: Root, api: any) {
  const ipc = require('electron').ipcRenderer
  const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
  const wait = async () => act(async () => { await new Promise(resolve => setTimeout(resolve, 80)) })
  const render = async (element: React.ReactNode) => { await act(async () => root.render(element)); await wait() }
  const click = async (label: string) => {
    const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(item => item.getAttribute('aria-label') === label || item.textContent?.trim() === label)
    check(button, `Missing ${label}`); await act(async () => button!.click()); await wait()
  }
  const input = async (field: HTMLInputElement | HTMLTextAreaElement, value: string) => act(async () => {
    Object.getOwnPropertyDescriptor(field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')!.set!.call(field, value)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const shot = async (name: string) => ipc.invoke('capture-video-import', `oct22-${name}`)
  const key = async (keyCode: string, shift = false) => act(async () => { await ipc.invoke('feature-test-key', keyCode, shift) })
  const style = document.createElement('style')
  style.textContent = await ipc.invoke('video-import-styles'); document.head.appendChild(style)
  const previous = { ...api }
  const stored = [COPY_GUARD_KEY, 'lezionify:qna-length:v1'].map(key => [key, localStorage.getItem(key)] as const)
  const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  let copies = 0, copied = ''
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { copies++; copied = text } } })
  const thread: QnaThread = { id: 'oct22', quote: 'Passaggio sintetico', contextHeading: 'Introduzione', messages: [], createdAt: '', updatedAt: '' }
  try {
    localStorage.removeItem('lezionify:qna-length:v1')
    let sentLength = ''
    function Questions() {
      const [active, setActive] = useState<string | null>(null)
      return <QnaSidebar threads={[thread]} activeThreadId={active} setActiveThreadId={setActive} isGenerating={false} error="Errore sintetico" onSendMessage={async (_id, _text, _context, _others, length) => { sentLength = length!; return false }} onDeleteThread={() => {}} onClose={() => {}} />
    }
    await render(<Questions />)
    const summary = document.querySelector<HTMLButtonElement>('.qna-thread-summary')!
    check(summary.tagName === 'BUTTON', 'Discussion is not a native button')
    summary.focus(); await key('Enter')
    check(!!document.querySelector('[aria-label="Domanda sulla lezione"]'), 'Keyboard failed to open discussion')
    check(document.querySelector('[role="group"] button[aria-pressed="true"]')?.textContent === 'Breve', 'Breve default lost')
    await click('Media')
    await input(document.querySelector('.qna-input-row textarea')!, 'Domanda sintetica')
    await act(async () => document.querySelector<HTMLButtonElement>('.qna-send-btn')!.click())
    check(sentLength === 'medium', 'Medium choice not sent')
    check(document.querySelector<HTMLTextAreaElement>('.qna-input-row textarea')!.value === 'Domanda sintetica', 'Failed send lost draft')
    check(document.querySelector('.qna-error')?.getAttribute('role') === 'alert', 'Errors not announced')
    check(document.querySelectorAll('[aria-label="Chiudi Q&A"]').length === 1, 'Duplicate Q&A close')
    await click('Torna alle discussioni')
    check(document.activeElement?.getAttribute('data-thread-id') === thread.id, 'Discussion focus not restored')
    await key('Space')
    check(document.querySelector('[role="group"] button[aria-pressed="true"]')?.textContent === 'Breve', 'Reopened Q&A must restore requested brief default')
    await shot('qna')
    await render(null)

    await ipc.invoke('feature-test-window-size', { width: 900, height: 640 })
    let continued = 0
    const lock = (show: boolean) => <><button id="oct22-underlying">Sotto la modale</button><FocusLockModal show={show} courseCode="GAME" sessionSeconds={100} lectureTotalSeconds={200} onContinue={() => { continued++ }} onQuit={() => {}} onPause={() => {}} /></>
    await render(lock(false)); document.querySelector<HTMLButtonElement>('#oct22-underlying')!.focus()
    await render(lock(true))
    check(document.querySelector('#oct22-underlying')?.hasAttribute('inert'), 'Underlying content is not inert')
    check(!!document.querySelector('[aria-labelledby="focus-lock-title"]'), 'Focus Lock has no accessible title')
    for (let i = 0; i < 7; i++) { await key('Tab', i % 2 === 0); check(!!document.activeElement?.closest('.focus-lock-overlay'), 'Focus escaped dialog') }
    const luminance = (color: string) => {
      const rgb = color.startsWith('#') ? [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16)) : color.match(/[0-9.]+/g)!.slice(0, 3).map(Number)
      const linear = rgb.map(value => { const x = value / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4 })
      return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722
    }
    const contrast = (a: string, b: string) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme)
      const tokens = getComputedStyle(document.documentElement)
      check(contrast(tokens.getPropertyValue('--text-dim').trim(), tokens.getPropertyValue('--bg-content').trim()) >= 4.5, 'Metadata contrast below 4.5 in ' + theme)
      check(contrast(tokens.getPropertyValue('--text-dim').trim(), tokens.getPropertyValue('--bg-hover').trim()) >= 4.5, 'Hover metadata contrast below 4.5 in ' + theme)
      const button = getComputedStyle(document.querySelector('.focus-lock-continue-btn')!)
      check(contrast(button.color, button.backgroundColor) >= 4.5, 'Continue button contrast below 4.5')
    }
    document.documentElement.removeAttribute('data-theme')
    for (const zoom of [1, 2]) {
      await ipc.invoke('feature-test-zoom', zoom); await wait()
      const card = document.querySelector<HTMLElement>('.focus-lock-card')!
      const bounds = card.getBoundingClientRect()
      check(bounds.top >= -1 && bounds.bottom <= innerHeight + 1, 'Focus Lock clipped at zoom ' + zoom)
      card.scrollTop = card.scrollHeight
      const controls = Array.from(card.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
      for (const control of controls) { control.focus(); check(card.contains(document.activeElement), 'Dialog control not focusable') }
      await shot('focus-lock-' + zoom)
    }
    await key('Escape'); check(continued === 1, 'Esc no longer continues study')
    await ipc.invoke('feature-test-zoom', 1)
    await render(lock(false)); check(document.activeElement?.id === 'oct22-underlying', 'Focus not restored to origin')
    for (const minutes of [5, 15, 30]) {
      await render(<PauseTimerOverlay show minutes={minutes} onQuit={() => {}} onReturnToStudy={() => {}} />)
      check(document.querySelector('.pause-suggestion')?.textContent?.includes(minutes === 5 ? 'caffè' : minutes === 15 ? 'libro' : 'gatti'), 'Wrong pause suggestion')
    }
    await render(null)
    await ipc.invoke('feature-test-window-size', false)

    let capture: ReturnType<typeof useQuickCapture>
    api.getScratchpad = async () => ({ todos: [{ id: 'one', text: 'Attività lunga da leggere senza hover. '.repeat(12), completed: false, createdAt: '' }], notes: 'Appunti sintetici', selectedGroupId: 'all', groups: [], updatedAt: '' })
    api.saveScratchpad = async () => {}
    function Memo() { capture = useQuickCapture(); return capture.isOpen ? <QuickCaptureOverlay capture={capture} /> : null }
    localStorage.setItem(COPY_GUARD_KEY, JSON.stringify({ start: '00:00', end: '00:00' }))
    await render(<Memo />); await act(async () => capture.toggleOpen()); await wait()
    await click('Leggi tutto'); check(!!document.querySelector('.memo-expanded-text'), 'Full Memo text depends on hover')
    await click('Copia tutto')
    check(copies === 0 && !!document.querySelector('[data-memo-copy-dialog]'), 'Protected copy bypassed')
    const field = document.querySelector<HTMLTextAreaElement>('[aria-label="Ricopia la frase"]')!
    const paste = new Event('paste', { bubbles: true, cancelable: true }); field.dispatchEvent(paste)
    check(paste.defaultPrevented, 'Paste not blocked')
    await input(field, 'Frase errata'); check(document.querySelector<HTMLButtonElement>('.memo-copy-actions [type="submit"]')!.disabled, 'Wrong phrase accepted')
    await shot('copy-guard')
    await key('Escape'); check(!!document.querySelector('.quick-capture-deck') && !document.querySelector('[data-memo-copy-dialog]'), 'Esc closed Memo instead of cancelling copy')
    await click('Copia tutto')
    await input(document.querySelector('[aria-label="Ricopia la frase"]')!, document.querySelector('.memo-copy-phrase')!.textContent!.toUpperCase())
    await click('Copia appunti'); check(copies === 1 && copied.includes('Appunti sintetici'), 'Confirmed copy lost content or copied twice')
    await click('Copia tutto'); check(!!document.querySelector('[data-memo-copy-dialog]') && copies === 1, 'Confirmation should be required for every copy')
    await click('Annulla')
    const date = new Date(), minute = (date.getHours() * 60 + date.getMinutes() + 60) % 1440
    const time = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
    localStorage.setItem(COPY_GUARD_KEY, JSON.stringify({ start: time(minute), end: time((minute + 1) % 1440) }))
    await click('Copia tutto'); check(copies === 2 && !document.querySelector('[data-memo-copy-dialog]'), 'Outside protected hours copy is not immediate')
    await shot('memo-expanded')
    localStorage.setItem(COPY_GUARD_KEY, JSON.stringify({ start: '00:00', end: '00:00' }))
    await act(async () => capture.selectGroup(''))
    await click('Copia gruppo'); check(!!document.querySelector('[data-memo-copy-dialog]') && copies === 2, 'Group copy bypassed protection')
    await click('Annulla')
    await render(null)

    api.getCourses = async () => [{ code: 'GAME', name: 'Teoria dei giochi', cfu: 6, publishToGithub: true, schedule: [] }]
    const state = { course: 'GAME', enabled: false, syncing: false, sources: [{ id: 'partial', title: 'Fonte parziale', kind: 'pdf', version: 'one', status: 'partial' }], missingTranscripts: 2, threads: [{ id: 'chat', title: 'Domande sintetiche', draft: '', updatedAt: '', messages: Array.from({ length: 20 }, (_, i) => ({ id: `m-${i}`, role: 'assistant', text: '## Dalle fonti del corso\n' + 'Spiegazione sintetica. '.repeat(40) + '\n## Deduzione\nUna deduzione.\n## Integrazione generale\nApprofondimento generale.', createdAt: '' })) }] }
    api.getCourseRag = async () => structuredClone(state)
    api.saveCourseThread = async (_course: string, thread: any) => {
      if (!state.threads.some(item => item.id === thread.id)) state.threads.push(structuredClone(thread))
    }
    api.onCourseRagEvent = () => () => {}
    await render(<CourseChat open courses={['GAME']} initialCourse="GAME" onClose={() => {}} onOpenLecture={() => {}} />)
    await click('Ricerche recenti')
    await click('Domande sintetiche')
    const scroller = document.querySelector<HTMLElement>('.course-chat-messages')!
    scroller.scrollTop = 100
    const composer = document.querySelector('.course-chat-composer')!.getBoundingClientRect()
    check(scroller.scrollHeight > scroller.clientHeight && composer.top >= 0 && composer.bottom <= innerHeight + 1, 'Long history hides composer')
    check(document.querySelector('.course-coverage')?.textContent?.includes('Teoria dei giochi') && document.querySelector('.course-coverage')?.textContent?.includes('2 trascrizioni mancanti'), 'Course coverage hidden')
    check(document.querySelectorAll('.course-answer-section.kind-general').length === 20, 'General integrations not distinguished')
    await shot('course-chat')
    await ipc.invoke('feature-test-window-size', { width: 900, height: 640 }); await wait()
    check(document.querySelector('.course-chat-composer')!.getBoundingClientRect().bottom <= innerHeight + 1, 'Low window hides composer')
    await shot('course-chat-low')
    await render(null)

    await render(<CourseManagementModal isOpen lectures={[]} onClose={() => {}} onRefreshLibrary={async () => {}} onNotice={() => {}} />)
    const add = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(item => item.textContent?.includes('Aggiungi Nuovo Corso'))!
    await act(async () => add.click()); await wait()
    check(document.querySelectorAll('.course-publication-choice input:checked').length === 0, 'New course publication chosen implicitly')
    await shot('course-consent')
    await render(null)
  } finally {
    await render(null); await ipc.invoke('feature-test-zoom', 1); await ipc.invoke('feature-test-window-size', false)
    for (const [key, value] of stored) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value) }
    if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard); else delete (navigator as any).clipboard
    Object.assign(api, previous); style.remove()
  }
}
