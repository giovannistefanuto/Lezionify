import React, { act, useState } from 'react'
import type { Root } from 'react-dom/client'
import { CollectionNavigation } from '../../src/components/CollectionNavigation'
import { CollectionsWorkspace } from '../../src/components/CollectionsWorkspace'
import type { CollectionsApi } from '../../shared/collections'

declare const require: any
export async function runCollectionsRestart(root: Root) {
  const ipc = require('electron').ipcRenderer
  const state = await ipc.invoke('collection-test', 'state')
  if (state.items.length !== 1 || !state.items[0].currentGeneration || !state.collections[0].archived) throw new Error('Collection data lost between Electron processes')
  const read = await ipc.invoke('collection-test', 'read', state.items[0].id)
  if (read.generations.length !== 2 || !read.markdown.includes('esperienza concreta') || !read.transcript.includes('trascrizione sintetica')) throw new Error('Sources/history lost after actual Electron restart')
  await act(async () => root.render(<CollectionNavigation onOpen={() => {}} />))
  if (document.querySelector('button[aria-label="Altro"]')?.getAttribute('aria-expanded') !== 'false') throw new Error('Altro is not collapsed after actual restart')
  await act(async () => root.render(null))
}

export async function runCollectionsScenarios(root: Root) {
  const ipc = require('electron').ipcRenderer
  const previous = window.collections
  const previousSettings = window.archive.getSettings
  const style = document.createElement('style')
  style.textContent = await ipc.invoke('video-import-styles')
  // The desktop shell intentionally has a 900px minimum; exercise the workspace
  // independently below that limit without changing the production shell.
  style.textContent += 'body{min-width:0}.collections-test-shell{display:grid;grid-template-columns:210px minmax(0,1fr);min-height:100vh}@media(max-width:600px){.collections-test-shell{grid-template-columns:1fr}.collections-test-shell>aside{display:none}}'
  document.head.appendChild(style)
  const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
  const wait = async (ms = 250) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)) })
  const click = async (label: string) => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.trim() === label || b.getAttribute('aria-label') === label || b.querySelector('strong')?.textContent === label)
    check(button && !button.disabled, `Missing/enabled button: ${label}`)
    await act(async () => button!.click()); await wait()
  }
  const input = async (label: string, value: string) => {
    const wrapper = [...document.querySelectorAll('label')].find(e => e.firstChild?.textContent?.trim() === label)
    const control = wrapper?.querySelector('input,textarea,select') as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    check(control, `Missing input ${label}`)
    const proto = control instanceof HTMLSelectElement ? HTMLSelectElement.prototype : control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(control, value); control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })) })
  }
  const submit = async (label: string) => {
    const form = document.querySelector<HTMLFormElement>(`form[aria-label="${label}"]`)
    check(form, `Missing form ${label}`)
    await act(async () => form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    await wait()
  }
  const api: CollectionsApi = {
    state: () => ipc.invoke('collection-test', 'state'),
    saveCollection: value => ipc.invoke('collection-test', 'save', value),
    selectFiles: () => ipc.invoke('collection-test', 'select'),
    releaseSelection: token => ipc.invoke('collection-test', 'release', token),
    importFiles: request => ipc.invoke('collection-test', 'import', request),
    updateItem: (id, value) => ipc.invoke('collection-test', 'update', id, value),
    read: (id, generation) => ipc.invoke('collection-test', 'read', id, generation),
    process: (ids, notes, resume) => ipc.invoke('collection-test', 'process', ids, notes, resume),
    stop: () => ipc.invoke('collection-test', 'stop'),
    activateGeneration: (id, version) => ipc.invoke('collection-test', 'activate', id, version),
    openSource: async () => {},
    search: (query, id, archived) => ipc.invoke('collection-test', 'search', query, id, archived)
  }
  let changeConfiguredModel: (model: string) => void = () => {}
  function Harness() {
    const [configuredModel, setConfiguredModel] = useState('synthetic-model')
    changeConfiguredModel = setConfiguredModel
    const [id, setId] = useState<string>()
    const [archived, setArchived] = useState(false)
    const select = (id?: string, archived = false) => { setId(id); setArchived(archived) }
    return <div className="collections-test-shell"><aside style={{ background: 'var(--bg-sidebar)', padding: 14 }}><CollectionNavigation onOpen={select} selected={id} active /></aside><CollectionsWorkspace configuredModel={configuredModel} collectionId={id} archived={archived} onSelectCollection={select} /></div>
  }
  try {
    window.collections = api
    window.archive.getSettings = async () => ({ model: 'synthetic-model' }) as any
    await act(async () => root.render(<Harness />)); await wait()
    check(document.querySelector('button.folder-toggle')?.getAttribute('aria-expanded') === 'false', 'Altro must start collapsed')
    await click('Nuova raccolta')
    await input('Nome', 'Podcast di prova')
    await input('Istruzioni personali', 'Conserva racconti ed esempi concreti.')
    await submit('Nuova raccolta')
    check(document.querySelector('h1')?.textContent === 'Podcast di prova', 'Created collection not selected')
    await click('Altro')
    check(document.body.textContent?.includes('Podcast di prova'), 'Collection absent from navigation')
    await click('Aggiungi contenuti')
    check(document.querySelector('form[aria-label="Importazione contenuti"]'), 'Import form absent')
    await input('Titolo', 'Episodio sintetico')
    await input('Elaborazione', 'notes')
    check(document.querySelector('.collections-import-summary')?.textContent?.includes('Conserva racconti'), 'Effective preferences hidden')
    await submit('Importazione contenuti')
    // Real local repository and job orchestration, deterministic AI adapter; no network.
    await ipc.invoke('collection-test', 'wait')
    await wait(1700)
    await click('Episodio sintetico')
    check(document.querySelector('.collection-reader .markdown-body')?.textContent?.includes('esperienza concreta'), 'Generated document missing')
    const beforeModelChange = await ipc.invoke('collection-test', 'counters')
    await act(async () => changeConfiguredModel('synthetic-next-model')); await wait()
    check(document.querySelector('.collection-reader-shell > .collections-meta')?.textContent?.includes('Prossima scheda: synthetic-next-model'), 'Next generation model label did not update')
    check([...document.querySelectorAll('details.collections-meta')].some(node => node.textContent?.includes('Modelli: synthetic-model')), 'Historical model was replaced by current preference')
    check((await ipc.invoke('collection-test', 'counters')).generation === beforeModelChange.generation, 'Model preference change launched AI work')
    await act(async () => changeConfiguredModel('synthetic-model'))
    await click('Trascrizione')
    check(document.querySelector('.collection-transcript')?.textContent?.includes('trascrizione sintetica'), 'Raw transcript missing')
    await click('Fonti')
    check(document.querySelector('.collection-sources')?.textContent?.includes('fixture.wav'), 'Original source missing')
    await click('Scheda')
    await click('Rigenera scheda')
    await ipc.invoke('collection-test', 'wait'); await wait(1700)
    const read = await api.read((await api.state()).items[0].id)
    check(read.generations.length === 2, 'Regeneration did not preserve history')
    // The backend checkpoint may finish before the renderer's next poll/read.
    const deadline = Date.now() + 5000
    while (!document.querySelector('.collections-version select') && Date.now() < deadline) await wait(50)
    const select = document.querySelector<HTMLSelectElement>('.collections-version select')!
    check(select, 'Generation history did not reach the renderer after regeneration')
    await act(async () => { select.value = read.generations[1].id; select.dispatchEvent(new Event('change', { bubbles: true })) }); await wait()
    await click('Usa questa versione')
    check((await api.read(read.item.id)).item.currentGeneration === read.generations[1].id, 'Previous version not activated')
    await ipc.invoke('capture-video-import', 'collections-desktop')
    await ipc.invoke('feature-test-window-size', { width: 768, height: 900 }); await wait()
    await ipc.invoke('capture-video-import', 'collections-narrow')
    check(document.documentElement.scrollWidth <= window.innerWidth + 2, 'Collection workspace overflows narrow viewport')
    document.documentElement.setAttribute('data-theme', 'dark'); await wait()
    await ipc.invoke('capture-video-import', 'collections-dark')
    await ipc.invoke('feature-test-window-size', { width: 390, height: 844 }); await wait()
    check(document.documentElement.scrollWidth <= window.innerWidth + 2, 'Collection reader overflows 390px workspace')
    await ipc.invoke('capture-video-import', 'collections-mobile')
    document.documentElement.removeAttribute('data-theme')
    await ipc.invoke('feature-test-window-size', { width: 1240, height: 820 }); await wait()
    // Cancel while the local copy is still pending: no later AI request is allowed.
    const realImport = api.importFiles
    const realProcess = api.process
    let finishImport!: () => void
    let cancelledImportProcessing = 0
    api.importFiles = async () => {
      await new Promise<void>(resolve => { finishImport = resolve })
      return { items: [read.item], duplicates: [] }
    }
    api.process = async () => { cancelledImportProcessing++ }
    await click('Aggiungi contenuti')
    await input('Elaborazione', 'notes')
    await submit('Importazione contenuti')
    await click('Annulla')
    await act(async () => finishImport()); await wait()
    api.importFiles = realImport
    api.process = realProcess
    check(cancelledImportProcessing === 0, 'Cancelled import must not launch an AI job after its copy completes')
    await click('Impostazioni raccolta')
    const archive = document.querySelector<HTMLInputElement>('form[aria-label="Impostazioni raccolta"] input[type="checkbox"]')!
    await act(async () => archive.click())
    await submit('Impostazioni raccolta')
    check((await api.search('')).length === 0 && (await api.search('', undefined, true)).length === 1, 'Archived collection leaked into active scope')
    const before = await api.state()
    await ipc.invoke('collection-test', 'restart')
    check((await api.state()).items[0].currentGeneration === before.items[0].currentGeneration, 'Collection history lost after backend restart')
    const counters = await ipc.invoke('collection-test', 'counters')
    check(counters.asr === 1 && counters.generation === 2, 'Regeneration repeated ASR or implicit AI work occurred')
    check(await ipc.invoke('collection-test', 'course-unchanged'), 'Course library changed')
    await act(async () => root.render(null))
    await act(async () => root.render(<Harness />)); await wait()
    check(document.querySelector('button.folder-toggle')?.getAttribute('aria-expanded') === 'false', 'Altro did not restart collapsed')
  } finally {
    await act(async () => root.render(null))
    window.collections = previous
    window.archive.getSettings = previousSettings
    style.remove()
    await ipc.invoke('feature-test-window-size', false)
  }
}
