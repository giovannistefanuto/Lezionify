import { mkdir, readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { CollectionGeneration, CollectionItem, CollectionJob, CollectionRead, CollectionState } from '../../../shared/collections'
import { resolveCollectionConfiguration, sortCollectionItems } from '../../../shared/collections'
import { atomicWrite, readRecoverable } from '../atomicFile'
import { AsyncMutex } from '../asyncMutex'
import { CollectionsRepository, collectionId, collectionText, checksumFile, readCollectionText } from './repository'
import { COLLECTION_PROMPT_VERSION, SHORT_TRANSCRIPT_LIMIT, collectionFingerprint, collectionPassages, hashText, parseCollectionSection, parseThemes, profilePrompt, CollectionOutputError, type Theme } from './profiles'

export interface CollectionCompletion { text: string; model: string; usage?: NonNullable<CollectionGeneration['usage']>[number] }
export interface CollectionsDependencies {
  model(): Promise<string>
  prepareAudio(source: string, destination: string, signal: AbortSignal): Promise<void>
  transcribe(source: string, checkpointId: string, signal: AbortSignal, progress: (message: string, percent: number) => void): Promise<string>
  complete(prompt: string, model: string, signal: AbortSignal, map: boolean): Promise<CollectionCompletion>
}
interface Checkpoint {
  fingerprint: string
  themes?: Theme[]
  sections: Record<number, string>
  models: string[]
  usage?: CollectionGeneration['usage']
  feedback?: Record<number, string>
}

/** Collection jobs own their snapshots and never enqueue course pipeline work. */
export class CollectionsService {
  readonly repository: CollectionsRepository
  private active: AbortController | null = null
  private running: Promise<void> = Promise.resolve()
  private initialized?: Promise<void>
  private launch = new AsyncMutex()
  private liveJobs = new Map<string, CollectionJob>()
  private backgroundError?: string
  private preparing = 0
  constructor(root: string, private deps: CollectionsDependencies) { this.repository = new CollectionsRepository(root) }
  isBusy() { return this.active !== null || this.preparing > 0 }
  async initialize() {
    this.initialized ??= (async () => {
      await this.repository.initialize()
      for (const item of await this.repository.items()) {
        const job = await this.readJob(item.id)
        if (job?.state === 'running') await this.writeJob({ ...job, state: 'interrupted', stage: 'Elaborazione interrotta. Puoi riprenderla.' })
      }
    })().catch(error => { this.initialized = undefined; throw error })
    await this.initialized
  }
  private async readJob(id: string): Promise<CollectionJob | null> {
    try { return JSON.parse(await readRecoverable(join(this.repository.itemDirectory(id), 'job.json'))) as CollectionJob } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e }
  }
  private writeJob(job: CollectionJob) {
    this.liveJobs.set(job.itemId, job)
    return atomicWrite(join(this.repository.itemDirectory(job.itemId), 'job.json'), JSON.stringify(job))
  }
  async state(): Promise<CollectionState> {
    await this.initialize()
    const [collections, items] = await Promise.all([this.repository.collections(), this.repository.items()])
    const jobs = (await Promise.all(items.map(item => this.readJob(item.id)))).filter((job): job is CollectionJob => job !== null)
    return { collections, items, jobs: jobs.map(job => {
      const current = this.liveJobs.get(job.itemId) ?? job
      return !this.isBusy() && current.state === 'running' ? { ...current, state: 'interrupted' as const, stage: 'Elaborazione interrotta. Puoi riprenderla.' } : current
    }), busy: this.isBusy(), error: this.backgroundError }
  }
  async read(id: string, generation?: string): Promise<CollectionRead> {
    const item = await this.repository.item(id)
    const generations = await this.repository.generations(id)
    if (generation && !generations.some(g => g.id === collectionId(generation))) throw new Error('Versione non trovata.')
    const [transcript, markdown] = await Promise.all([this.repository.transcript(id), this.repository.markdown(id, generation ?? item.currentGeneration)])
    return { item, transcript, markdown, generations }
  }
  async search(query: string, collection?: string, archived = false): Promise<CollectionItem[]> {
    collectionText(query, 2000)
    if (collection !== undefined) collectionId(collection)
    if (typeof archived !== 'boolean') throw new Error('Filtro non valido.')
    const state = await this.state()
    const ids = new Set(state.collections.filter(c => c.archived === archived && (!collection || c.id === collection)).map(c => c.id))
    const words = query.toLocaleLowerCase('it').trim().split(/\s+/).filter(Boolean)
    const result = []
    for (const item of state.items.filter(i => ids.has(i.collectionId))) {
      const text = words.length ? `${item.title}\n${await this.repository.transcript(item.id)}\n${await this.repository.markdown(item.id, item.currentGeneration)}`.toLocaleLowerCase('it') : ''
      if (words.every(w => text.includes(w))) result.push(item)
    }
    return sortCollectionItems(result)
  }
  async process(ids: string[], includeNotes: boolean, resume = false): Promise<void> {
    this.preparing++
    try { await this.launch.runExclusive(async () => {
      await this.initialize()
      if (this.active) throw new Error('Attendi la conclusione del lavoro in Altro.')
      if (!Array.isArray(ids) || !ids.length || ids.length > 100 || new Set(ids).size !== ids.length || typeof includeNotes !== 'boolean' || typeof resume !== 'boolean') throw new Error('Richiesta di elaborazione non valida.')
      const items = await Promise.all(ids.map(id => this.repository.item(collectionId(id))))
      const collections = await this.repository.collections()
      const model = await this.deps.model()
      const snapshots: CollectionJob[] = []
      for (const item of items) {
        const collection = collections.find(c => c.id === item.collectionId)
        if (!collection) throw new Error('Raccolta non trovata.')
        const old = resume ? await this.readJob(item.id) : null
        if (resume && (!old || old.state === 'completed')) throw new Error('Nessun lavoro da riprendere.')
        snapshots.push({ itemId: item.id, state: 'running', stage: 'In coda', percent: 0, includeNotes: old?.includeNotes ?? includeNotes, configuration: old?.configuration ?? resolveCollectionConfiguration(collection, item), model: old?.model ?? model, startedAt: old?.startedAt ?? new Date().toISOString(), baseGeneration: old?.baseGeneration !== undefined ? old.baseGeneration : item.currentGeneration, baseDocumentHash: old?.baseDocumentHash !== undefined ? old.baseDocumentHash : item.currentGeneration ? hashText(await this.repository.markdown(item.id, item.currentGeneration)) : null })
      }
      const controller = new AbortController()
      this.backgroundError = undefined
      this.active = controller
      try { for (const snapshot of snapshots) await this.writeJob(snapshot) } catch (e) { this.active = null; throw e }
      this.running = (async () => {
        for (const snapshot of snapshots) {
          if (controller.signal.aborted) {
            await this.writeJob({ ...snapshot, state: 'cancelled', stage: 'Interrotto dall’utente' })
            continue
          }
          try { await this.runItem(snapshot, controller.signal, resume) } catch (error) {
            // Provider/path/content errors are deliberately not sent to diagnostic logs or IPC.
            await this.writeJob({ ...snapshot, state: controller.signal.aborted ? 'cancelled' : 'failed', stage: controller.signal.aborted ? 'Interrotto dall’utente' : 'Elaborazione non completata', error: controller.signal.aborted ? undefined : error instanceof CollectionOutputError ? `${error.message} La versione precedente è conservata. Puoi riprendere per richiedere una risposta corretta.` : 'Controlla fonti, connessione e chiave/quota nelle Impostazioni. Il materiale precedente è conservato; puoi riprendere.' })
          }
        }
      })().catch(() => { this.backgroundError = 'Impossibile salvare lo stato del lavoro. Controlla lo spazio disponibile e riapri Altro prima di riprendere.' }).finally(() => { this.active = null })
    }) } finally { this.preparing-- }
  }
  async stop() {
    // A request already accepted by process() may still be preparing its snapshot.
    await this.launch.runExclusive(async () => { this.active?.abort() })
    await this.running
  }
  async wait() {
    await this.launch.runExclusive(async () => {})
    await this.running
  }
  private async runItem(job: CollectionJob, signal: AbortSignal, resume: boolean) {
    const id = job.itemId
    const root = this.repository.itemDirectory(id)
    const check = () => { if (signal.aborted) throw new Error('Annullato.') }
    const progress = async (stage: string, percent: number) => { check(); job = { ...job, stage, percent }; this.liveJobs.set(id, job); await this.writeJob(job) }
    const item = await this.repository.item(id)
    for (const source of item.sources) {
      check()
      if (await checksumFile(this.repository.sourcePath(item, source.id)) !== source.checksum) throw new Error('Fonte cambiata.')
    }
    let transcript = await this.repository.transcript(id)
    if (!transcript && item.transcriptHash !== null) throw new Error('Trascrizione salvata mancante o vuota. Ripristina la fonte prima di riprendere.')
    if (transcript && item.transcriptHash === null) {
      // Recover a crash after the complete atomic text write, before the metadata commit.
      await this.repository.mutex.runExclusive(async () => {
        const current = await this.repository.item(id)
        if (current.transcriptHash === null) await this.repository.writeItem({ ...current, transcriptHash: hashText(transcript) })
      })
    } else if (transcript && item.transcriptHash !== hashText(transcript)) throw new Error('Trascrizione cambiata.')
    if (!transcript) {
      await mkdir(join(root, 'derivatives'), { recursive: true })
      const parts: string[] = []
      for (let n = 0; n < item.sources.length; n++) {
        check()
        const source = item.sources[n]
        const file = this.repository.sourcePath(item, source.id)
        if (source.kind === 'text') { parts.push(await readCollectionText(file)); continue }
        const partFile = join(root, 'derivatives', `${source.id}.txt`)
        let part: string | undefined
        try { part = await readFile(partFile, 'utf8') } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e }
        if (!part) {
          await progress(`Preparazione parte ${n + 1}/${item.sources.length}`, Math.round(40 * n / item.sources.length))
          const audio = join(root, 'derivatives', `${source.id}.mp3`)
          await this.deps.prepareAudio(file, audio, signal)
          part = await this.deps.transcribe(audio, `collection-${id}-${source.checksum}`, signal, (_message, percent) => {
            // Progress is in memory until the next durable stage, avoiding a write per ASR token.
            job = { ...job, stage: `Trascrizione parte ${n + 1}/${item.sources.length} · ${Math.round(percent)}%`, percent: Math.round(40 * (n + percent / 100) / item.sources.length) }
            this.liveJobs.set(id, job)
          })
          check()
          if (!part.trim()) throw new Error('Trascrizione vuota.')
          await atomicWrite(partFile, part)
        }
        parts.push(part)
      }
      transcript = parts.join('\n\n')
      if (!transcript.trim() || transcript.includes('\0')) throw new Error('Trascrizione non valida.')
      check()
      await this.repository.mutex.runExclusive(async () => {
        const current = await this.repository.item(id)
        if (current.transcriptHash) throw new Error('Trascrizione modificata durante il lavoro.')
        await atomicWrite(join(root, 'transcript.txt'), transcript)
        await this.repository.writeItem({ ...current, transcriptHash: hashText(transcript) })
      })
    }
    if (!job.includeNotes) { await this.writeJob({ ...job, state: 'completed', stage: 'Trascrizione disponibile', percent: 100 }); return }
    if (!transcript.replace(/---[^\n]*---/g, '').replace(/\[(?:NESSUN_PARLATO|NO_SPEECH)[^\]]*\]/gi, '').trim()) throw new Error('Nessun parlato disponibile per la scheda.')
    const expectedGeneration = job.baseGeneration !== undefined ? job.baseGeneration : item.currentGeneration
    const expectedDocumentHash = job.baseDocumentHash !== undefined ? job.baseDocumentHash : expectedGeneration ? hashText(await this.repository.markdown(id, expectedGeneration)) : null
    const fingerprint = collectionFingerprint(transcript, job.configuration, job.model)
    const checkpointFile = join(root, 'checkpoint.json')
    let checkpoint: Checkpoint = { fingerprint, sections: {}, models: [] }
    try {
      if (!resume) throw Object.assign(new Error(), { code: 'ENOENT' })
      const previous = JSON.parse(await readRecoverable(checkpointFile)) as Checkpoint
      if (previous.fingerprint === fingerprint) checkpoint = previous
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e }
    const passages = collectionPassages(transcript)
    const profile = profilePrompt(job.configuration)
    if (!checkpoint.themes) {
      await progress('Organizzazione per temi', 45)
      if (transcript.length <= SHORT_TRANSCRIPT_LIMIT) checkpoint.themes = [{ title: item.title, passageIds: passages.map(p => p.id) }]
      else {
        const response = await this.deps.complete(JSON.stringify({ task: 'Organizza la fonte per temi. Restituisci {themes:[{title,passageIds:[interi]}]}. Copri TUTTI gli estratti almeno una volta, usa temi proporzionati, massimo 40. Mantieni legami tra esperienze, riflessioni e sviluppo del dialogo. Gli ID sono riferimenti testuali, non tempi.', profile, passages }), job.model, signal, true)
        checkpoint.themes = parseThemes(response.text, passages)
        checkpoint.models.push(response.model)
        if (response.usage) (checkpoint.usage ??= []).push(response.usage)
      }
      check(); await atomicWrite(checkpointFile, JSON.stringify(checkpoint))
    }
    // Validate stored mappings as well, including the short-input path.
    parseThemes(JSON.stringify({ themes: checkpoint.themes }), passages)
    for (let index = 0; index < checkpoint.themes.length; index++) {
      if (checkpoint.sections[index]) continue
      await progress(`Scheda · tema ${index + 1}/${checkpoint.themes.length}`, 50 + Math.round(40 * index / checkpoint.themes.length))
      const theme = checkpoint.themes[index]
      const response = await this.deps.complete(JSON.stringify({ task: 'Scrivi questa sezione della scheda, spiegando ampiamente quanto presente nella fonte. Restituisci {markdown:string,quotes:[{text:string,passageId:intero}]}. Titolo di sezione Markdown ##. Citazioni facoltative SOLO nell’array quotes e rigorosamente testuali. Non riassumere gli altri temi e non ripetere sezioni già trattate. Non aggiungere informazioni.', profile, theme, outline: checkpoint.themes, passages: passages.filter(p => theme.passageIds.includes(p.id)), context: passages, previousSections: Object.keys(checkpoint.sections).map(Number).map(i => checkpoint.themes![i].title), ...(checkpoint.feedback?.[index] ? { correction: { reason: checkpoint.feedback[index], instruction: 'Correggi la risposta precedente usando solo la fonte. Copia le citazioni esattamente, con passageId del punto iniziale. Non trasformare citazioni inventate in prosa: omettile se non verificabili. Non aggiungere contenuti.' } } : {}) }), job.model, signal, false)
      check()
      try { checkpoint.sections[index] = parseCollectionSection(response.text, passages) } catch (error) {
        if (error instanceof CollectionOutputError) {
          (checkpoint.feedback ??= {})[index] = error.message
          await atomicWrite(checkpointFile, JSON.stringify(checkpoint))
        }
        throw error
      }
      if (checkpoint.feedback) delete checkpoint.feedback[index]
      checkpoint.models.push(response.model)
      if (response.usage) (checkpoint.usage ??= []).push(response.usage)
      await atomicWrite(checkpointFile, JSON.stringify(checkpoint))
    }
    await progress('Verifica e salvataggio della versione', 95)
    const markdown = checkpoint.themes.map((_theme, i) => checkpoint.sections[i]).join('\n\n')
    if (!markdown.trim()) throw new Error('Scheda vuota.')
    const generation: CollectionGeneration = { id: randomUUID(), createdAt: new Date().toISOString(), configuration: job.configuration, sourceHash: hashText(transcript), promptVersion: COLLECTION_PROMPT_VERSION, models: [...new Set(checkpoint.models)], usage: checkpoint.usage }
    const generationsRoot = join(root, 'generations')
    const temporary = join(generationsRoot, `.pending-${generation.id}`)
    await mkdir(temporary, { recursive: true })
    await atomicWrite(join(temporary, 'document.md'), markdown)
    await atomicWrite(join(temporary, 'manifest.json'), JSON.stringify(generation))
    check()
    await this.repository.mutex.runExclusive(async () => {
      if (hashText(await this.repository.transcript(id)) !== generation.sourceHash) throw new Error('Fonte cambiata.')
      for (const source of item.sources) if (await checksumFile(this.repository.sourcePath(item, source.id)) !== source.checksum) throw new Error('Fonte cambiata.')
      check()
      await rename(temporary, join(generationsRoot, generation.id))
      const current = await this.repository.item(id)
      // A concurrent user choice wins. The new generation remains selectable in history.
      const documentHash = current.currentGeneration ? hashText(await this.repository.markdown(id, current.currentGeneration)) : null
      if (current.currentGeneration === expectedGeneration && documentHash === expectedDocumentHash) await this.repository.writeItem({ ...current, currentGeneration: generation.id })
    })
    await this.writeJob({ ...job, state: 'completed', stage: 'Scheda disponibile nella cronologia', percent: 100 })
  }
}
