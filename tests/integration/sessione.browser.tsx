import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { SessionWorkspace } from '../../src/components/sessione/SessionWorkspace'
import { useSessione, type SessionAction } from '../../src/hooks/useSessione'
import { SessionDialog } from '../../src/components/sessione/SessionDialog'
import type { AppSettings } from '../../shared/archive'
import type { SessionArchive, SessionResult } from '../../shared/sessione'
import { resolveExamTargets } from '../../shared/sessione'
import { studySurfaceExclusions } from '../../src/utils/studyActivity'

declare const require: (name: string) => {
  ipcRenderer: { invoke: (name: string, ...args: unknown[]) => Promise<unknown>; send: (name: string, result: string) => void }
}
const { ipcRenderer } = require('electron')
const settings: AppSettings = {
  apiKey: '', apiKeys: [], activeKeyIndex: 0, autoRotateOnQuota: false, model: 'gemini-3.1-flash-lite',
  courseConfigs: { RL: { examDate: '2027-01-20' } }
}

const root = createRoot(document.getElementById('root')!)
let pending: Promise<boolean> | undefined
function Fixture({ initial }: { initial: SessionArchive }) {
  const [archive, set] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function apply(action: SessionAction) {
    setBusy(true)
    try {
      const result = await ipcRenderer.invoke('test:sessione', 'apply',
        { ...action, commandId: crypto.randomUUID(), baseRevision: archive.revision }) as SessionResult
      set(result.archive)
      setError('')
      return result.status === 'saved'
    } catch (error) {
      setError(String(error))
      return false
    } finally {
      setBusy(false)
    }
  }
  return <SessionDialog title="Sessione" onClose={() => {}} workspace>
    <SessionWorkspace archive={archive} settings={settings} today="2027-01-12" busy={busy} error={error}
      onApply={action => { pending = apply(action); return pending }} />
  </SessionDialog>
}

function ShortcutFixture() {
  const sessione = useSessione()
  const [lock, setLock] = useState(true)
  return <>
    <button type="button" id="reading-point">Posizione nella lezione</button>
    {lock && <button type="button" className="focus-lock-overlay" onClick={() => setLock(false)}>Rimuovi Focus Lock di prova</button>}
    {sessione.open && <SessionDialog title="Sessione" workspace onClose={sessione.close}>Calendario</SessionDialog>}
  </>
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function topDialog() {
  return [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1) ?? document.body
}

async function click(text: string) {
  const button = [...topDialog().querySelectorAll<HTMLElement>('button, summary')].find(item => item.textContent?.trim() === text)
  assert(button, `Comando assente: ${text}; schermata: ${topDialog().textContent?.slice(0, 240)}`)
  await act(async () => {
    pending = undefined
    button.click()
    await pending
  })
}

async function field(selector: string, value: string) {
  const input = [...topDialog().querySelectorAll<HTMLInputElement>(selector)].at(-1)
  assert(input, `Campo mancante: ${selector}`)
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

async function run() {
  ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  const initial = await ipcRenderer.invoke('test:sessione', 'state') as SessionArchive
  await act(async () => root.render(<Fixture initial={initial} />))
  await click('Crea sessione')
  await click('Salva sessione')
  await click('Esami')
  await click('Aggiungi o modifica appelli')
  await click('RL')
  await click('Importa 2027-01-20 da Dashboard')
  await click('Aggiungi percorso a parziali')
  await click('Aggiungi data')
  await field('.session-appointment-row input[type="date"]', '2027-01-29')
  await click('Salva appelli')
  const alternatives = topDialog().querySelectorAll<HTMLButtonElement>('.session-exam[data-status="alternative"]')
  assert(alternatives.length === 2, 'Le due date non sono nel calendario')
  await act(async () => alternatives[1].click())
  await click('Azioni')
  await click('Scegli appello')
  await click('Conferma piano')
  await click('Conferma e aggiorna')
  await click('Piano')
  await click('Distanza gli esami')
  await act(async () => {
    for (let i = 0; i < 8; i++) await new Promise(resolve => setTimeout(resolve, 25))
  })
  assert(topDialog().textContent?.includes('Migliore combinazione disponibile'), 'Worker di spaziatura senza risultato')
  await click('Annulla')
  await click('Piano')
  await click('Duplica piano')
  await click('Salva piano')
  assert(topDialog().querySelectorAll('.session-note tbody tr').length === 1, 'Countdown non univoco')
  const actual = await ipcRenderer.invoke('test:sessione', 'restart') as SessionArchive
  assert(actual.sessions[0].draft.plans.length === 2, 'Copia non persistita')
  assert(resolveExamTargets(actual, settings)[0]?.date === '2027-01-29', 'Data confermata incoerente')
  assert(actual.sessions[0].draft.courses[0].paths.length === 2, 'Alternativa importata persa')
  await act(async () => root.render(<ShortcutFixture />))
  const shortcut = (repeat = false) => new KeyboardEvent('keydown', { key: 's', code: 'KeyS',
    ctrlKey: true, altKey: true, repeat, cancelable: true, bubbles: true })
  await act(async () => window.dispatchEvent(shortcut()))
  assert(!document.querySelector('.session-overlay'), 'Sessione ha scavalcato Focus Lock')
  await click('Rimuovi Focus Lock di prova')
  const readingPoint = document.getElementById('reading-point')
  readingPoint?.focus()
  await act(async () => window.dispatchEvent(shortcut(true)))
  assert(!document.querySelector('.session-overlay'), 'Sessione ha risposto all’autoripetizione')
  await act(async () => window.dispatchEvent(shortcut()))
  assert(document.querySelector('.session-overlay[open]'), 'Scorciatoia Sessione assente')
  assert(studySurfaceExclusions().includes('sessione') && !studySurfaceExclusions().includes('memo'), 'Esclusione di studio errata')
  await act(async () => document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
  assert(document.activeElement === readingPoint && !studySurfaceExclusions().includes('sessione'), 'Ripristino focus o esclusione non riuscito')
  await act(async () => root.unmount())
  ipcRenderer.send('done', 'PASS Sessione: configurazione, scelta, conferma, riavvio, scorciatoia, Focus Lock, esclusione e ripristino focus')
}

void run().catch(error => ipcRenderer.send('done', `FAIL ${String(error)}`))
