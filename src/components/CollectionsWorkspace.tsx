import { useCallback, useEffect, useRef, useState } from 'react'
import { COLLECTION_MODES, resolveCollectionConfiguration, type CollectionDefinition, type CollectionFileSelection, type CollectionItem, type CollectionItemUpdates, type CollectionMode, type CollectionRead, type CollectionState } from '../../shared/collections'
import { MarkdownViewer } from './MarkdownViewer'
import { useReadingPosition } from '../hooks/useReadingPosition'
import './collections.css'

const EMPTY: CollectionState = { collections: [], items: [], jobs: [], busy: false }
const MODES = Object.entries(COLLECTION_MODES)
function ModeOptions({ inherit = false }: { inherit?: boolean }) {
  return <>{inherit && <option value="">Eredita dalla raccolta</option>}{MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</>
}
const notify = () => window.dispatchEvent(new Event('collections-changed'))

export function CollectionsWorkspace({ collectionId, archived, onSelectCollection, configuredModel }: { collectionId?: string; archived: boolean; onSelectCollection: (id?: string, archived?: boolean) => void; configuredModel?: string }) {
  const [state, setState] = useState(EMPTY)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<CollectionItem[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [generation, setGeneration] = useState('')
  const [read, setRead] = useState<CollectionRead>()
  const [tab, setTab] = useState<'markdown' | 'transcript' | 'sources'>('markdown')
  const [collectionDraft, setCollectionDraft] = useState<CollectionDefinition | 'new'>()
  const [editingItem, setEditingItem] = useState(false)
  const [selection, setSelection] = useState<CollectionFileSelection>()
  const [model, setModel] = useState('modello configurato nelle Impostazioni')
  const [refreshTick, setRefreshTick] = useState(0)
  const reader = useRef<HTMLDivElement>(null)
  const mounted = useRef(true)
  const selectionRef = useRef(selection)
  const importIntent = useRef<{ token: string; cancelled: boolean } | undefined>(undefined)
  selectionRef.current = selection
  const collection = state.collections.find(c => c.id === collectionId)
  const activeJob = state.jobs.find(job => job.itemId === selectedId)
  const currentVersion = state.items.find(item => item.id === selectedId)?.currentGeneration
  const refresh = useCallback(async () => {
    const next = await window.collections.state()
    if (mounted.current) { setState(next); setRefreshTick(value => value + 1) }
  }, [])
  useEffect(() => {
    mounted.current = true
    void refresh().catch(() => setError('Impossibile leggere le raccolte. Riprova.'))
    void window.archive?.getSettings?.().then(settings => { if (mounted.current) setModel(settings.model) }).catch(() => {})
    return () => { mounted.current = false; if (selectionRef.current) void window.collections.releaseSelection(selectionRef.current.token).catch(() => {}) }
  }, [refresh])
  useEffect(() => {
    if (!state.busy) return
    const interval = setInterval(() => { void refresh().catch(() => setError('Impossibile aggiornare lo stato.')) }, 1500)
    return () => clearInterval(interval)
  }, [state.busy, refresh])
  useEffect(() => {
    setSelectedId(undefined); setRead(undefined); setGeneration(''); setEditingItem(false); setQuery('')
    if (importIntent.current) importIntent.current.cancelled = true
    if (selectionRef.current) void window.collections.releaseSelection(selectionRef.current.token).catch(() => {})
    setSelection(undefined)
  }, [collectionId, archived])
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => { void window.collections.search(query, collectionId, archived).then(rows => { if (!cancelled) setItems(rows) }).catch(() => { if (!cancelled) setError('Ricerca non disponibile. Riprova.') }) }, 180)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, collectionId, archived, refreshTick])
  useEffect(() => {
    let cancelled = false
    if (!selectedId) { setRead(undefined); return }
    setRead(undefined)
    void window.collections.read(selectedId, generation || undefined).then(value => { if (!cancelled) setRead(value) }).catch(() => { if (!cancelled) setError('Impossibile leggere il contenuto o la versione.') })
    return () => { cancelled = true }
  }, [selectedId, generation, currentVersion, activeJob?.state])
  const markdown = tab === 'markdown' ? read?.markdown ?? '' : ''
  useReadingPosition(reader, selectedId ? `collection:${selectedId}:${generation || currentVersion || 'none'}` : null, markdown, Boolean(markdown))
  const action = async (work: () => Promise<void>) => {
    setPending(true); setError(''); setNotice('')
    try { await work(); await refresh(); notify() } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Operazione non completata.') } finally { if (mounted.current) setPending(false) }
  }
  const closeSelection = () => {
    if (importIntent.current) importIntent.current.cancelled = true
    if (selection) void window.collections.releaseSelection(selection.token).catch(() => {})
    setSelection(undefined)
  }
  const configuration = read && state.collections.find(c => c.id === read.item.collectionId)
  return <section className="collections-workspace" aria-label="Altro">
    <header className="collections-heading">
      <div><p className="collections-eyebrow">ALTRO{archived ? ' / ARCHIVIATE' : ''}</p><h1>{collection?.name ?? (archived ? 'Raccolte archiviate' : 'Le tue raccolte')}</h1><p>Audio, racconti e idee da conservare.</p></div>
      <div className="collections-actions"><button disabled={pending} onClick={() => setCollectionDraft('new')}>Nuova raccolta</button>{collection && <><button disabled={pending} onClick={() => setCollectionDraft(collection)}>Impostazioni raccolta</button><button disabled={pending} onClick={() => void action(async () => { const selected = await window.collections.selectFiles(); if (selected) { closeSelection(); importIntent.current = { token: selected.token, cancelled: false }; setSelection(selected) } })}>Aggiungi contenuti</button></>}</div>
    </header>
    {error && <div className="collections-message" role="alert">{error} <button onClick={() => void action(refresh)}>Riprova</button></div>}
    {state.error && <p className="collections-message" role="alert">{state.error}</p>}
    {notice && <p className="collections-message" role="status">{notice}</p>}
    {state.busy && <div className="collections-progress" role="status"><div>{state.jobs.filter(j => j.state === 'running').map(j => <p key={j.itemId}>{state.items.find(i => i.id === j.itemId)?.title} · {j.stage} <progress max="100" value={j.percent} /></p>)}</div><button disabled={pending} onClick={() => void action(() => window.collections.stop())}>Interrompi elaborazione</button></div>}
    {collectionDraft && <CollectionEditor key={collectionDraft === 'new' ? 'new' : collectionDraft.id} collection={collectionDraft === 'new' ? undefined : collectionDraft} disabled={pending} onCancel={() => setCollectionDraft(undefined)} onSave={value => void action(async () => { const saved = await window.collections.saveCollection(value); setCollectionDraft(undefined); onSelectCollection(saved.id, saved.archived) })} />}
    {selection && collection && <ImportEditor selection={selection} collection={collection} disabled={pending || state.busy} model={configuredModel ?? model} onCancel={closeSelection} onImport={(request, process) => void action(async () => {
      const intent = importIntent.current?.token === request.token ? importIntent.current : undefined
      const result = await window.collections.importFiles(request)
      setSelection(undefined)
      setNotice(`${result.items.length} contenuti salvati.${result.duplicates.length ? ` Fonti già presenti nell’archivio: ${result.duplicates.join(', ')}. Le copie restano contenuti distinti.` : ''}`)
      if (!intent || intent.cancelled) setNotice('Elaborazione annullata. Le copie locali già completate sono conservate, senza avviare l’AI.')
      else if (process !== 'save') await window.collections.process(result.items.map(i => i.id), process === 'notes')
    })} />}
    {!collectionId && <div className="collection-index">{state.collections.filter(c => c.archived === archived).map(c => <button key={c.id} onClick={() => onSelectCollection(c.id, c.archived)}><strong>{c.name}</strong><span>{COLLECTION_MODES[c.mode]} · {state.items.filter(i => i.collectionId === c.id).length} contenuti</span></button>)}{!state.collections.some(c => c.archived === archived) && <p>Nessuna raccolta{archived ? ' archiviata' : ''}. Crea una raccolta per iniziare.</p>}</div>}
    <label className="collections-search">Cerca nei titoli, nelle trascrizioni e nelle schede<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca in queste raccolte…" /></label>
    <div className={`collections-layout ${selectedId ? 'has-reader' : ''}`}>
      <div className="collections-items" aria-label="Contenuti">
        {!items.length && <p className="collections-empty">{query ? 'Nessun risultato.' : 'Nessun contenuto. Apri una raccolta e aggiungi un file.'}</p>}
        {items.map(item => {
          const job = state.jobs.find(j => j.itemId === item.id)
          return <button key={item.id} className={`collection-item ${selectedId === item.id ? 'is-selected' : ''}`} onClick={() => { setSelectedId(item.id); setGeneration(''); setEditingItem(false); setTab('markdown') }}><strong>{item.title}</strong><span>{new Date(item.recordedAt ?? item.importedAt).toLocaleDateString('it-IT')} · {item.sources.length} {item.sources.length === 1 ? 'fonte' : 'fonti'}</span><small>{job && job.state !== 'completed' ? job.stage : item.currentGeneration ? 'Scheda disponibile' : item.transcriptHash ? 'Trascrizione disponibile' : 'Da trascrivere'}</small></button>
        })}
      </div>
      {selectedId && <article className="collection-reader-shell">
        {!read ? <p role="status">Caricamento contenuto…</p> : <>
          <div className="collections-reader-heading"><h2>{read.item.title}</h2><button onClick={() => setSelectedId(undefined)} aria-label="Chiudi contenuto">Chiudi</button></div>
          {configuration && <p className="collections-meta">{COLLECTION_MODES[resolveCollectionConfiguration(configuration, read.item).mode]} · Prossima scheda: {configuredModel ?? model}</p>}
          <div className="collections-actions">
            <button disabled={pending} onClick={() => setEditingItem(value => !value)}>Impostazioni contenuto</button>
            <button disabled={pending || state.busy} onClick={() => void action(() => window.collections.process([selectedId], false))}>Solo trascrizione</button>
            <button disabled={pending || state.busy} onClick={() => void action(() => window.collections.process([selectedId], true))}>{read.item.currentGeneration ? 'Rigenera scheda' : read.item.transcriptHash ? 'Genera scheda' : 'Trascrivi e genera scheda'}</button>
            {activeJob && ['failed', 'interrupted', 'cancelled'].includes(activeJob.state) && <button disabled={pending || state.busy} onClick={() => void action(() => window.collections.process([selectedId], activeJob.includeNotes, true))}>Riprendi lavoro precedente</button>}
          </div>
          {activeJob?.error && <p role="alert">{activeJob.error}</p>}
          {activeJob && ['failed', 'interrupted', 'cancelled'].includes(activeJob.state) && <details className="collections-meta"><summary>Impostazioni del lavoro da riprendere</summary><p>{COLLECTION_MODES[activeJob.configuration.mode]} · {activeJob.model}</p><p>{activeJob.configuration.instructions || 'Nessuna istruzione personale.'}</p></details>}
          {editingItem && <ItemEditor key={read.item.id} item={read.item} disabled={pending} onCancel={() => setEditingItem(false)} onSave={updates => void action(async () => { await window.collections.updateItem(selectedId, updates); setRead(await window.collections.read(selectedId, generation || undefined)); setEditingItem(false) })} />}
          <div className="collections-tabs" role="group" aria-label="Vista contenuto">{([['markdown', 'Scheda'], ['transcript', 'Trascrizione'], ['sources', 'Fonti']] as const).map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</div>
          {tab === 'markdown' && <>
            <label className="collections-version">Versione<select value={generation} onChange={e => setGeneration(e.target.value)}><option value="">Versione corrente</option>{read.generations.map(g => <option key={g.id} value={g.id}>{new Date(g.createdAt).toLocaleString('it-IT')} · {COLLECTION_MODES[g.configuration.mode]}</option>)}</select></label>
            {read.generations.find(g => g.id === (generation || read.item.currentGeneration)) && <GenerationDetails generation={read.generations.find(g => g.id === (generation || read.item.currentGeneration))!} />}
            {generation && generation !== read.item.currentGeneration && <button disabled={pending} onClick={() => void action(async () => { await window.collections.activateGeneration(selectedId, generation); setGeneration('') })}>Usa questa versione</button>}
            <div ref={reader} className="collection-reader">{read.markdown ? <MarkdownViewer content={read.markdown} /> : <p>Nessuna scheda generata. Puoi crearla dalla trascrizione.</p>}</div>
          </>}
          {tab === 'transcript' && <div className="collection-transcript">{read.transcript || 'Trascrizione non ancora disponibile.'}</div>}
          {tab === 'sources' && <div className="collection-sources"><p>Originali conservati nell’ordine delle parti.</p><ol>{read.item.sources.map(s => <li key={s.id}><button onClick={() => void action(() => window.collections.openSource(selectedId, s.id))}>{s.name}</button> · {(s.byteSize / 1024 / 1024).toFixed(1)} MB</li>)}</ol>{read.item.sourceUrl && <p>Provenienza: <span>{read.item.sourceUrl}</span></p>}</div>}
        </>}
      </article>}
    </div>
  </section>
}

function GenerationDetails({ generation }: { generation: import('../../shared/collections').CollectionGeneration }) {
  return <details className="collections-meta"><summary>Dettagli della versione</summary><p>{new Date(generation.createdAt).toLocaleString('it-IT')} · {COLLECTION_MODES[generation.configuration.mode]} · Modelli: {generation.models.join(', ')}</p><p>{generation.configuration.instructions || 'Nessuna istruzione personale.'}</p>{generation.usage && <p>Token restituiti dal provider per la scheda: {generation.usage.reduce((sum, u) => sum + u.totalTokens, 0)}. Trascrizione e tentativi falliti esclusi; non è un costo fatturato.</p>}</details>
}

type CollectionDraft = Pick<CollectionDefinition, 'name' | 'mode' | 'instructions' | 'archived'> & { id?: string }
function CollectionEditor({ collection, disabled, onCancel, onSave }: { collection?: CollectionDefinition; disabled: boolean; onCancel: () => void; onSave: (value: CollectionDraft) => void }) {
  const [name, setName] = useState(collection?.name ?? '')
  const [mode, setMode] = useState<CollectionMode>(collection?.mode ?? 'podcast')
  const [instructions, setInstructions] = useState(collection?.instructions ?? '')
  const [archived, setArchived] = useState(collection?.archived ?? false)
  return <form className="collection-form" aria-label={collection ? 'Impostazioni raccolta' : 'Nuova raccolta'} onSubmit={e => { e.preventDefault(); onSave({ id: collection?.id, name, mode, instructions, archived }) }}>
    <h2>{collection ? 'Impostazioni raccolta' : 'Nuova raccolta'}</h2>
    <label>Nome<input required maxLength={500} value={name} onChange={e => setName(e.target.value)} /></label>
    <label>Modalità predefinita<select value={mode} onChange={e => setMode(e.target.value as CollectionMode)}><ModeOptions /></select></label>
    <label>Istruzioni personali<textarea maxLength={20000} rows={4} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Quali aspetti della fonte vuoi conservare con più attenzione?" /></label>
    <label className="collection-check"><input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)} />Raccolta archiviata</label>
    <div className="collections-actions"><button disabled={disabled || !name.trim()} type="submit">Salva raccolta</button><button type="button" onClick={onCancel}>Annulla</button></div>
  </form>
}
function ContentFields({ value, setValue }: { value: CollectionItemUpdates; setValue: (value: CollectionItemUpdates) => void }) {
  return <>
    <label>Titolo<input required maxLength={500} value={value.title} onChange={e => setValue({ ...value, title: e.target.value })} /></label>
    <label>Data registrazione<input type="date" value={value.recordedAt ?? ''} onChange={e => setValue({ ...value, recordedAt: e.target.value || null })} /></label>
    <label>Collegamento di provenienza (facoltativo)<input type="url" maxLength={3000} value={value.sourceUrl} onChange={e => setValue({ ...value, sourceUrl: e.target.value })} /></label>
    <label>Modalità<select value={value.mode ?? ''} onChange={e => setValue({ ...value, mode: e.target.value ? e.target.value as CollectionMode : null })}><ModeOptions inherit /></select></label>
    <label className="collection-check"><input type="checkbox" checked={value.instructions === null} onChange={e => setValue({ ...value, instructions: e.target.checked ? null : '' })} />Eredita istruzioni dalla raccolta</label>
    {value.instructions !== null && <label>Istruzioni per questo contenuto<textarea maxLength={20000} rows={4} value={value.instructions} onChange={e => setValue({ ...value, instructions: e.target.value })} /></label>}
  </>
}
function ItemEditor({ item, disabled, onSave, onCancel }: { item: CollectionItem; disabled: boolean; onSave: (value: CollectionItemUpdates) => void; onCancel: () => void }) {
  const [value, setValue] = useState<CollectionItemUpdates>(item)
  return <form className="collection-form" aria-label="Impostazioni contenuto" onSubmit={e => { e.preventDefault(); onSave(value) }}><ContentFields value={value} setValue={setValue} /><div className="collections-actions"><button disabled={disabled} type="submit">Salva impostazioni</button><button type="button" onClick={onCancel}>Annulla</button></div></form>
}
function ImportEditor({ selection, collection, disabled, model, onImport, onCancel }: { selection: CollectionFileSelection; collection: CollectionDefinition; disabled: boolean; model: string; onCancel: () => void; onImport: (request: import('../../shared/collections').CollectionImportRequest, process: 'save' | 'transcript' | 'notes') => void }) {
  const [files, setFiles] = useState(selection.files)
  const [grouped, setGrouped] = useState(false)
  const [process, setProcess] = useState<'save' | 'transcript' | 'notes'>('transcript')
  const [value, setValue] = useState<CollectionItemUpdates>({ title: files[0]?.name ?? '', recordedAt: null, sourceUrl: '', mode: null, instructions: null })
  const config = resolveCollectionConfiguration(collection, value)
  const move = (index: number, direction: number) => setFiles(rows => { const copy = [...rows]; [copy[index], copy[index + direction]] = [copy[index + direction], copy[index]]; return copy })
  return <form className="collection-form" aria-label="Importazione contenuti" onSubmit={e => { e.preventDefault(); onImport({ ...value, token: selection.token, collectionId: collection.id, fileIds: files.map(f => f.id), grouped }, process) }}>
    <h2>Aggiungi a {collection.name}</h2>
    <ol className="collection-import-files">{files.map((file, index) => <li key={file.id}><span>{file.name}</span><button type="button" aria-label={`Sposta prima ${file.name}`} disabled={!index} onClick={() => move(index, -1)}>↑</button><button type="button" aria-label={`Sposta dopo ${file.name}`} disabled={index === files.length - 1} onClick={() => move(index, 1)}>↓</button><button type="button" aria-label={`Escludi ${file.name}`} disabled={files.length === 1} onClick={() => setFiles(rows => rows.filter(f => f.id !== file.id))}>Escludi</button></li>)}</ol>
    {files.length > 1 && <label className="collection-check"><input type="checkbox" checked={grouped} onChange={e => setGrouped(e.target.checked)} />Sono parti dello stesso contenuto, in questo ordine</label>}
    <ContentFields value={value} setValue={setValue} />
    <label>Elaborazione<select value={process} onChange={e => setProcess(e.target.value as typeof process)}><option value="save">Salva soltanto i file</option><option value="transcript">Solo trascrizione</option><option value="notes">Trascrizione e scheda</option></select></label>
    <div className="collections-import-summary"><strong>{COLLECTION_MODES[config.mode]}</strong><p>{config.instructions || 'Nessuna istruzione personale.'}</p><p>{process === 'save' || process === 'transcript' && files.every(f => f.kind === 'text') ? 'Salvataggio locale, senza invio AI.' : `L’elaborazione invierà il materiale necessario a Gemini. Modello scheda: ${model}; la trascrizione usa la catena ASR configurata.`}</p></div>
    <div className="collections-actions"><button disabled={disabled} type="submit">{process === 'save' ? 'Salva i file' : process === 'notes' ? 'Importa e genera scheda' : 'Importa e trascrivi'}</button><button type="button" onClick={onCancel}>Annulla</button></div>
  </form>
}
