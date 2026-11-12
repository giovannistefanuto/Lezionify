import React, { useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { mermaidPng } from '../../src/components/MermaidDiagram'
import { useIpadAnticipation } from '../../src/hooks/useIpadAnticipation'
import { creditStudyTick } from '../../src/utils/studyActivity'
import { upcomingDiagrams } from '../../src/utils/ipadAnticipation'
import { IpadExportSettings, IpadExportNotice } from '../../src/components/IpadExportSettings'
const { ipcRenderer } = window.require('electron')
const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const source = 'flowchart TD\n A[Studio e qualità] --> B[Schema su iPad]'
let writes = 0
window.archive = {
  ipadExportStatus: enabled => ipcRenderer.invoke('status', enabled),
  exportIpadDiagram: async request => { writes++; return ipcRenderer.invoke('export', request) }
} as typeof window.archive
Object.defineProperty(document, 'hasFocus', { value: () => true })
function Fixture() {
  const root = useRef<HTMLDivElement>(null)
  useIpadAnticipation({ lectureId: 'synthetic', language: 'it', markdown: 'test', enabled: true, paused: false, rootRef: root })
  return <div ref={root} id="reader" style={{ height: 200, overflow: 'auto' }}>
    <div className="markdown-body"><p style={{ height: 300, margin: 0 }}>Paragrafo corrente</p>
      <p style={{ height: 300, margin: 0 }}>Un solo paragrafo prima dello schema</p>
      <figure className="mermaid-diagram" data-mermaid-source={source} data-render-state="ready">Schema</figure>
    </div>
  </div>
}
async function run() {
  localStorage.clear()
  const root = createRoot(document.getElementById('root')!)
  root.render(<Fixture />)
  await delay(200)
  const reader = document.getElementById('reader')!
  check(upcomingDiagrams(reader)?.diagrams.length === 1, 'lookahead di un paragrafo')
  const modal = document.createElement('div'); modal.setAttribute('aria-modal', 'true'); document.body.append(modal)
  for (let index = 0; index < 300; index++) creditStudyTick('synthetic')
  await delay(20)
  check(writes === 0, 'modali esclusi dal tempo di studio')
  modal.remove()
  for (let index = 0; index < 299; index++) creditStudyTick('synthetic')
  await delay(50)
  check(writes === 0, 'nessun invio anticipato prima dei 5 minuti')
  creditStudyTick('other-lecture')
  await delay(20)
  check(writes === 0, 'altra lezione esclusa')
  const paragraph = reader.querySelector('p')!
  paragraph.replaceWith(paragraph.cloneNode(true))
  for (let index = 0; index < 9; index++) creditStudyTick('synthetic')
  await delay(50)
  check(writes === 0, 'nuovo paragrafo: nove secondi non bastano')
  creditStudyTick('synthetic')
  for (let i = 0; i < 100 && writes === 0; i++) await delay(100)
  check(writes === 1, 'esportazione automatica reale')
  await delay(300)
  for (let i = 0; i < 60; i++) creditStudyTick('synthetic')
  check(writes === 1, 'nessun duplicato per tick')
  reader.scrollTop = 300
  check(upcomingDiagrams(reader)?.diagrams.length === 0, 'non anticipa con zero paragrafi intermedi')
  root.unmount()
  for (const [name, definition] of [['flow', source], ['sequence', 'sequenceDiagram\n Alice->>Bob: Qualità e quantità'], ['state', 'stateDiagram-v2\n [*] --> Studio\n Studio --> Pausa']] as const) {
    const png = await mermaidPng(definition)
    await ipcRenderer.invoke('preview', name, png)
  }
  const preview = createRoot(document.getElementById('root')!)
  preview.render(<div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}><IpadExportSettings /><IpadExportNotice /></div>)
  await delay(200)
  window.dispatchEvent(new CustomEvent('lezionify-ipad-export', { detail: 'Schema salvato nella cartella iCloud. La sincronizzazione con iPad può richiedere tempo.' }))
  await delay(100)
  await ipcRenderer.invoke('screenshot', 'light')
  document.documentElement.setAttribute('data-theme', 'dark')
  await delay(100)
  await ipcRenderer.invoke('screenshot', 'dark')
  await ipcRenderer.invoke('verify')
}
run().then(() => ipcRenderer.send('done', 'PASS: anticipazione, PNG reali e scrittura isolata')).catch(error => ipcRenderer.send('done', `FAIL: ${error.message}`))
