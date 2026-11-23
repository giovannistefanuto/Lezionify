import { SessionSettingsForm } from '../../src/components/sessione/SessionSettingsForm'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AppUpdates, AppUpdateSettings } from '../../src/components/AppUpdates'
import { registerUpdatePreparation, updateRestartPrepared, prepareUpdateRestart, resetUpdateRestart } from '../../src/utils/updatePreparation'
import { useQna } from '../../src/hooks/useQna'
import { ArchivePipelinePanel } from '../../src/components/ArchivePipelinePanel'
import { HomePause } from '../../src/components/HomePause'
import type { ArchivePipelineStatus, QnaThread } from '../../shared/archive'
import type { AppUpdateState } from '../../shared/appUpdate'
import '../../src/styles.css'

declare const require: (name: string) => { ipcRenderer: { send: (name: string, value?: string) => void; invoke: (name: string) => Promise<void> } }
const { ipcRenderer } = require('electron')
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message) }
const root = createRoot(document.getElementById('root')!)
let listener: ((state: AppUpdateState) => void) | undefined
let downloads = 0, installs = 0, blocked = true
let state: AppUpdateState = { currentVersion: '0.2.0', supported: true, phase: 'available', version: '0.2.1', notes: '## Novità\nPacchetto sintetico per il collaudo.\n<script>throw new Error("remote")</script>', size: 300_000_000 }
window.appUpdate = {
  getState: async () => state,
  onState: callback => { listener = callback; return () => { listener = undefined } },
  check: async () => state,
  download: async () => { downloads++; state = { ...state, phase: 'ready', percent: 100 }; listener?.(state); return state },
  install: async () => { installs++; return { ...state, phase: 'installing' } },
  openReleases: async () => {}, acknowledge: async () => {}
}
const wait = () => new Promise(resolve => setTimeout(resolve, 40))
async function click(text: string) {
  const button = [...document.querySelectorAll('button')].find(button => button.textContent?.includes(text))
  assert(button, `Missing button: ${text}`)
  await act(async () => { button!.click(); await wait() })
}
async function runQueueAndSave() {
  const summary = { total: 1, pending: 1, running: 0, succeeded: 0, failed: 0, blocked: 0, skipped: 0 }
  const status = { version: 1, status: 'paused', tasks: [{ stage: 'transcription', status: 'pending' }], includeTranslation: true,
    stageSummaries: { transcription: summary, notes: summary, translation: summary } } as ArchivePipelineStatus
  let finishClear!: () => void, cleared = 0
  await act(async () => root.render(<><HomePause /><ArchivePipelinePanel status={status} onResume={() => {}} onStop={() => {}} onClear={() => {
    cleared++; return new Promise(resolve => { finishClear = resolve })
  }} /></>))
  const pause = document.querySelector<HTMLElement>('.home-pause-button')!
  assert(parseFloat(getComputedStyle(pause).fontSize) <= 12 && pause.getBoundingClientRect().height < 36, 'Home pause is not compact')
  await click('Svuota coda')
  assert(cleared === 1 && document.querySelector<HTMLButtonElement>('.archive-pipeline-actions button')?.disabled, 'Queue clear must serialize clicks')
  await ipcRenderer.invoke('update-test:screenshot')
  await act(async () => finishClear())
  await act(async () => root.render(null))

  const sessionDraft = { id: 'update-session', name: 'Initial', start: '2026-11-01', end: '2026-12-01', courses: [], plans: [], unavailable: [] }
  const renderSession = () => root.render(<SessionSettingsForm initial={sessionDraft} onSave={async () => true} busy={false} />)
  await act(async () => renderSession())
  const sessionName = document.querySelector<HTMLInputElement>('.session-form input')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(sessionName, 'Bozza da ripristinare')
    sessionName.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => prepareUpdateRestart())
  await act(async () => root.render(null))
  await act(async () => renderSession())
  assert(document.querySelector<HTMLInputElement>('.session-form input')?.value === 'Bozza da ripristinare', 'Update lost the unfinished Sessione form')
  localStorage.removeItem('lezionify:session-settings:update-session')
  resetUpdateRestart()
  await act(async () => root.render(null))

  const thread: QnaThread = { id: 'update-partial', quote: 'Synthetic', anchorString: 'Synthetic', contextHeading: null,
    messages: [], createdAt: '', updatedAt: '' }
  let emitChunk!: (value: { threadId: string; chunk: string }) => void
  let finishResponse!: (result: { success: boolean; error: string }) => void
  let saved: QnaThread[] = [], send!: () => Promise<boolean>
  window.archive = {
    loadQnaThreads: async () => [thread], saveQnaThreads: async (_id, threads) => { saved = structuredClone(threads) },
    onQnaChunk: callback => { emitChunk = callback; return () => {} }, onQnaStatus: () => () => {},
    generateQnaResponse: () => new Promise(resolve => { finishResponse = resolve }),
    cancelQnaResponses: async () => { finishResponse?.({ success: false, error: 'Annullato per aggiornamento' }) }
  } as typeof window.archive
  function Conversation() {
    const qna = useQna('synthetic-lecture')
    send = () => qna.sendMessage(thread.id, 'Domanda sintetica', true)
    return <div>{qna.threads.map(t => t.messages.map((message, i) => <p key={i}>{message.text}</p>))}</div>
  }
  await act(async () => { root.render(<Conversation />); await wait() })
  let request!: Promise<boolean>
  await act(async () => { request = send(); await wait() })
  await act(async () => { emitChunk({ threadId: thread.id, chunk: 'Risposta parziale conservata' }); await wait() })
  await act(async () => { await prepareUpdateRestart(); await request; await wait() })
  assert(saved[0].messages.some(message => message.role === 'user' && message.text === 'Domanda sintetica'), 'Update lost the question')
  assert(saved[0].messages.some(message => message.role === 'ai' && message.text.includes('Risposta parziale conservata') && message.text.includes('interrotta')), 'Update lost or failed to label the partial answer')
  resetUpdateRestart()
  await act(async () => { root.render(null); await wait() })
}

async function run() {
  ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  await runQueueAndSave()
  registerUpdatePreparation(async () => { if (blocked) throw new Error('unsaved') })
  await act(async () => { root.render(<AppUpdates canRestart={false}><button>Archivio</button><AppUpdateSettings onClose={() => {}} /></AppUpdates>); await wait() })
  assert(document.querySelector('[role="dialog"]'), 'Automatic offer missing')
  assert(downloads === 0, 'Downloaded before consent')
  assert(!document.querySelector('script:not([src])'), 'Remote notes executed as HTML')
  await click('Più tardi')
  assert(!document.querySelector('[role="dialog"]'), 'Dismiss failed')
  const underlying = document.createElement('dialog'); underlying.textContent = 'Editor nativo aperto'; document.body.append(underlying); underlying.showModal()
  await click('Versione, novità')
  assert(document.querySelector('.app-update-panel')?.matches(':modal'), 'Updater did not enter the native top layer above open editors')
  await click('Aggiorna · scarica')
  assert(downloads === 1 && installs === 0, 'Consent did not control download/install')
  await click('Aggiorna ora')
  assert(installs === 0 && document.querySelector('[role="alert"]'), 'Restart did not wait for saved state')
  blocked = false
  await ipcRenderer.invoke('update-test:screenshot')
  await click('Aggiorna ora')
  assert(installs === 1, 'Explicit install not called')
  underlying.close(); underlying.remove()
  await act(async () => { state = { ...state, phase: 'ready', message: 'Installazione rinviata' }; listener?.(state); await wait() })
  assert(!updateRestartPrepared(), 'Failed native install left beforeunload bypass enabled')
  blocked = true
  await click('Aggiorna ora')
  assert(installs === 1, 'Retry skipped a failed save')
  await act(async () => { root.unmount(); await wait() })
  assert(!listener, 'Leaked subscription')
  ipcRenderer.send('update-test:done', 'PASS updater UI: compact pause, queue clear serialization, partial Q&A save, Sessione draft restore, native modal editors, consent, defer, safe notes, save failure, automatic restart with open views, cleanup')
}
void run().catch(error => ipcRenderer.send('update-test:done', `FAIL ${String(error)}`))
