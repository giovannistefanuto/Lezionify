import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AppUpdates, AppUpdateSettings } from '../../src/components/AppUpdates'
import { registerUpdatePreparation, updateRestartPrepared } from '../../src/utils/updatePreparation'
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
async function run() {
  ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  registerUpdatePreparation(async () => { if (blocked) throw new Error('unsaved') })
  await act(async () => { root.render(<AppUpdates canRestart><button>Archivio</button><AppUpdateSettings onClose={() => {}} /></AppUpdates>); await wait() })
  assert(document.querySelector('[role="dialog"]'), 'Automatic offer missing')
  assert(downloads === 0, 'Downloaded before consent')
  assert(!document.querySelector('script:not([src])'), 'Remote notes executed as HTML')
  await click('Più tardi')
  assert(!document.querySelector('[role="dialog"]'), 'Dismiss failed')
  await click('Versione, novità')
  await click('Aggiorna · scarica')
  assert(downloads === 1 && installs === 0, 'Consent did not control download/install')
  await click('Riavvia e aggiorna')
  assert(installs === 0 && document.querySelector('[role="alert"]'), 'Restart did not wait for saved state')
  blocked = false
  await ipcRenderer.invoke('update-test:screenshot')
  await click('Riavvia e aggiorna')
  assert(installs === 1, 'Explicit install not called')
  await act(async () => { state = { ...state, phase: 'ready', message: 'Installazione rinviata' }; listener?.(state); await wait() })
  assert(!updateRestartPrepared(), 'Failed native install left beforeunload bypass enabled')
  blocked = true
  await click('Riavvia e aggiorna')
  assert(installs === 1, 'Retry skipped a failed save')
  await act(async () => { root.unmount(); await wait() })
  assert(!listener, 'Leaked subscription')
  ipcRenderer.send('update-test:done', 'PASS updater UI: consent, defer, safe notes, save failure, restart, cleanup')
}
void run().catch(error => ipcRenderer.send('update-test:done', `FAIL ${String(error)}`))
