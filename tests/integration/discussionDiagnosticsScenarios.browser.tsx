import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import type { AppLogEntry, QnaThread } from '../../shared/archive'
import { QnaSidebar } from '../../src/components/QnaSidebar'
import { ResizableQnaPane } from '../../src/components/ResizableQnaPane'
import { LogViewerModal } from '../../src/components/LogViewerModal'

declare const require: any

export async function runDiscussionDiagnosticsScenarios(root: Root, api: any) {
  const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 80)) })
  const until = async (condition: () => boolean, message: string) => {
    for (let attempt = 0; attempt < 40; attempt++) { if (condition()) return; await settle() }
    check(condition(), message)
  }
  const style = document.createElement('style')
  style.textContent = await require('electron').ipcRenderer.invoke('video-import-styles')
  document.head.appendChild(style)
  let thread: QnaThread = {
    id: 'streaming-question', quote: 'Concetto della lezione', contextHeading: null, createdAt: '', updatedAt: '',
    messages: [
      ...Array.from({ length: 8 }, (_, index) => ({ role: index % 2 ? 'ai' as const : 'user' as const, text: 'Discussione precedente. '.repeat(30), timestamp: '' })),
      { role: 'user', text: 'Puoi spiegare questo concetto usando il contesto della lezione?', timestamp: '' },
      { role: 'ai', text: 'Inizio della risposta. '.repeat(20), timestamp: '' }
    ]
  }
  const render = async (generating = true) => act(async () => root.render(
    <div className="focus-workspace" style={{ height: 640, width: 1080 }}>
      <div className="qna-standard-layout"><div className="markdown-view-container">Dispensa di riferimento</div>
        <ResizableQnaPane><QnaSidebar threads={[thread]} activeThreadId={thread.id} setActiveThreadId={() => {}}
          isGenerating={generating} error={null} onSendMessage={() => {}} onDeleteThread={() => {}} onClose={() => {}} /></ResizableQnaPane>
      </div>
    </div>))
  try {
    await render()
    await settle()
    await until(() => document.querySelector<HTMLElement>('.resizable-qna-pane')?.clientWidth === 432, 'Initial discussion width did not settle after ResizeObserver')
    const chat = document.querySelector<HTMLElement>('.qna-messages-container')!
    chat.scrollTop = 140
    chat.dispatchEvent(new Event('scroll'))
    const before = chat.scrollTop
    const parentBefore = document.documentElement.scrollTop
    for (let index = 0; index < 5; index++) {
      thread = { ...thread, messages: thread.messages.map((message, messageIndex) => messageIndex === thread.messages.length - 1 ? { ...message, text: message.text + '\n\nTesto generato durante lo streaming. '.repeat(25) } : message) }
      await render()
      check(chat.scrollTop === before, 'Streaming should not move the chat reading position')
    }
    await render(false)
    await settle()
    check(chat.scrollTop === before && document.documentElement.scrollTop === parentBefore, 'Completion should not scroll the chat or its parent')
    chat.scrollTop = chat.scrollHeight - chat.clientHeight - 80
    chat.dispatchEvent(new Event('scroll'))
    const answerBefore = chat.scrollTop
    thread = { ...thread, messages: thread.messages.map((message, messageIndex) => messageIndex === thread.messages.length - 1 ? { ...message, text: message.text + '\n\nNuova parte leggibile. '.repeat(20) } : message) }
    await render()
    check(chat.scrollTop === answerBefore, 'Reading the streamed answer should not follow newly appended text')
    const pane = document.querySelector<HTMLElement>('.resizable-qna-pane')!
    const divider = document.querySelector<HTMLElement>('[aria-label="Larghezza della discussione"]')!
    const widthBefore = pane.clientWidth
    const chatWidthBefore = chat.clientWidth
    const readingPosition = () => {
      const top = chat.getBoundingClientRect().top
      const messages = Array.from(chat.querySelectorAll<HTMLElement>('.qna-message'))
      const index = messages.findIndex(message => message.getBoundingClientRect().bottom > top)
      const bounds = messages[index].getBoundingClientRect()
      return { index, fraction: (top - bounds.top) / bounds.height }
    }
    const beforeResize = readingPosition()
    await act(async () => divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })))
    await until(() => pane.clientWidth > widthBefore && Math.abs(readingPosition().fraction - beforeResize.fraction) < 0.02, 'Discussion resize did not settle at the saved reading point')
    await require('electron').ipcRenderer.invoke('capture-video-import', 'discussion-light')
    check(pane.clientWidth > widthBefore && chat.clientWidth > chatWidthBefore && Math.abs(document.querySelector('.qna-sidebar')!.getBoundingClientRect().width - pane.getBoundingClientRect().width) < 2, `Standard discussion should widen with its divider: ${widthBefore} -> ${pane.clientWidth}, chat ${chatWidthBefore} -> ${chat.clientWidth}, ratio ${divider.getAttribute('aria-valuenow')}`)
    const afterResize = readingPosition()
    check(beforeResize.index === afterResize.index && Math.abs(beforeResize.fraction - afterResize.fraction) < 0.02, `Discussion resize should preserve the point of reading: ${JSON.stringify(beforeResize)} -> ${JSON.stringify(afterResize)}`)
    await act(async () => divider.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
    await until(() => pane.clientWidth === widthBefore, 'Double click width did not settle')
    check(pane.clientWidth === widthBefore, `Double click should restore standard discussion width: ${widthBefore} -> ${pane.clientWidth}, ratio ${divider.getAttribute('aria-valuenow')}, parent ${pane.parentElement?.clientWidth}`)
    await require('electron').ipcRenderer.invoke('capture-video-import', 'discussion-light')
    document.documentElement.setAttribute('data-theme', 'dark')
    await require('electron').ipcRenderer.invoke('capture-video-import', 'discussion-dark')
    document.documentElement.removeAttribute('data-theme')
    await act(async () => root.render(null))

    let logs: AppLogEntry[] = ['archive-pipeline', 'transcription', 'ai-notes', 'course-logistics', 'translation', 'gemini-api', 'system'].map((source, index) => ({ id: String(index), timestamp: '2026-10-09T10:00:00Z', level: 'info', source, message: `Fase sintetica ${source}` }))
    api.getAppLogDay = async (day: string) => ({ day, entries: logs, previousDay: null })
    const originalInterval = window.setInterval
    const originalClear = window.clearInterval
    const ticks = new Map<number, () => void>()
    let interval = 10000
    window.setInterval = ((callback: () => void) => { ticks.set(++interval, callback); return interval }) as any
    window.clearInterval = ((id: number) => { ticks.delete(id) }) as any
    try {
      await act(async () => root.render(<LogViewerModal show onClose={() => {}} />))
      const aiButton = Array.from(document.querySelectorAll<HTMLButtonElement>('.log-filter-btn')).find(button => button.textContent?.startsWith('AI Gemini'))!
      await act(async () => aiButton.click())
      check(document.querySelectorAll('.log-entry-item').length === 6, 'AI filter should include pipeline, translation and course notes')
      logs = [...logs, { id: 'attempt', timestamp: '2026-10-12T10:00:01Z', level: 'info', source: 'gemini-api', message: '[sections · synthetic] Tentativo 2 · Chiave 1 · modello model-2: invio richiesta.', details: JSON.stringify({ event: 'gemini_request_attempt', physicalAttempt: 2, model: 'model-2' }) }]
      await act(async () => { for (const tick of ticks.values()) tick() })
      check(document.body.textContent?.includes('Tentativo 2 · Chiave 1 · modello model-2') && !document.querySelector('.log-details-block'), 'Attempt, key and model should be readable without expanding details')
      logs = [...logs, { id: 'new', timestamp: '2026-10-09T10:00:02Z', level: 'info', source: 'ai-notes', message: 'Nuova sezione completata' }]
      await act(async () => { for (const tick of ticks.values()) tick() })
      check(document.querySelectorAll('.log-entry-item').length === 8 && document.body.textContent?.includes('Nuova sezione completata'), 'Open diagnostics should refresh automatically')
      await act(async () => root.render(null))
      check(ticks.size === 0, 'Diagnostics refresh timer should stop on unmount')
    } finally {
      window.setInterval = originalInterval
      window.clearInterval = originalClear
    }
  } finally {
    await act(async () => root.render(null))
    style.remove()
    document.documentElement.removeAttribute('data-theme')
  }
}
