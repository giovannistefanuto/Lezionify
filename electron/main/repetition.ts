import { createHash, randomUUID } from 'node:crypto'
import { fileChecksum } from './fileNameParser'
import { logger } from './logger'
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  unlink
} from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { atomicWrite, readRecoverable } from './atomicFile'
import type {
  RepetitionDocument,
  RepetitionSession,
  RepetitionState
} from '../../shared/repetition'
import type { UsbRecorderInfo } from '../../shared/archive'
import { validateRepetitionAssessment } from './ai/repetitionPrompt'

interface RecordData extends RepetitionSession {
  checksum: string
  referenceChecksum: string
  audioFile: string
  offset: number
}

export interface RepetitionDependencies {
  scan: () => Promise<UsbRecorderInfo>
  transcribe: (
    audio: string,
    id: string,
    signal: AbortSignal,
    progress: (message: string, percent: number) => void
  ) => Promise<string>
  evaluate: (
    reference: string,
    transcript: string,
    previous: string,
    final: boolean,
    id: string,
    signal: AbortSignal
  ) => Promise<string>
}

const summary = ({
  id,
  audioName,
  referenceName,
  createdAt,
  status,
  message,
  percent
}: RecordData): RepetitionSession => ({
  id,
  audioName,
  referenceName,
  createdAt,
  status,
  message,
  percent
})
const textHash = (text: string) =>
  createHash('sha256').update(text).digest('hex')

/** A separate local archive: never inserts repetition recordings in the lecture library. */
export class RepetitionService {
  private active: {
    id: string
    controller: AbortController
    done: Promise<void>
  } | null = null
  private opening: Promise<string> | null = null
  private current: RecordData | null = null

  constructor(
    private root: string,
    private dependencies: RepetitionDependencies
  ) {}

  private async config(): Promise<{ referencePath?: string }> {
    try {
      const value = JSON.parse(
        await readRecoverable(join(this.root, 'config.json'))
      )
      if (
        !value ||
        (value.referencePath !== undefined &&
          typeof value.referencePath !== 'string')
      )
        throw new Error('Configurazione RIPETERE non valida.')
      return value
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
      throw error
    }
  }

  private directory(id: string): string {
    if (!/^[a-f0-9]{64}$/.test(id))
      throw new Error('Sessione RIPETERE non valida.')
    return join(this.root, id)
  }

  private async record(id: string): Promise<RecordData> {
    const record = JSON.parse(
      await readRecoverable(join(this.directory(id), 'session.json'))
    ) as RecordData
    if (
      !record ||
      record.id !== id ||
      record.checksum !== id ||
      !/^[a-f0-9]{64}$/.test(record.referenceChecksum) ||
      typeof record.audioName !== 'string' ||
      typeof record.referenceName !== 'string' ||
      typeof record.message !== 'string' ||
      typeof record.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(record.createdAt)) ||
      !Number.isFinite(record.percent) ||
      record.percent < 0 ||
      record.percent > 100 ||
      !/^audio\.(mp3|wav|m4a|aac|wma)$/.test(record.audioFile) ||
      !Number.isInteger(record.offset) ||
      record.offset < 0 ||
      !['transcribing', 'evaluating', 'completed', 'paused', 'failed'].includes(
        record.status
      )
    ) {
      throw new Error(
        'Metadati RIPETERE non validi. Conservare la cartella per il recupero.'
      )
    }
    return record
  }

  private save(record: RecordData): Promise<void> {
    return atomicWrite(
      join(this.directory(record.id), 'session.json'),
      JSON.stringify(record, null, 2)
    )
  }

  async setReference(file: string): Promise<void> {
    if (this.active || this.opening)
      throw new Error(
        'Attendi o interrompi la sessione prima di cambiare gli appunti.'
      )
    await this.readReference(file)
    await mkdir(this.root, { recursive: true })
    await atomicWrite(
      join(this.root, 'config.json'),
      JSON.stringify({ referencePath: file })
    )
  }

  private async readReference(file: string): Promise<string> {
    if (!['.md', '.txt', '.markdown'].includes(extname(file).toLowerCase()))
      throw new Error('Seleziona appunti Markdown o TXT.')
    try {
      const info = await stat(file)
      if (!info.isFile() || info.size > 1024 * 1024)
        throw new Error(
          'Gli appunti devono essere un file di testo entro 1 MB.'
        )
      let text: string
      try {
        text = new TextDecoder('utf-8', { fatal: true })
          .decode(await readFile(file))
          .replace(/^\uFEFF/, '')
      } catch (cause) {
        throw new Error('Gli appunti devono essere testo UTF-8 valido.', {
          cause
        })
      }
      if (!text.trim() || text.includes('\0'))
        throw new Error('Il file degli appunti è vuoto o non è testo UTF-8.')
      return text
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code)
        throw new Error(
          'Appunti non disponibili. Seleziona nuovamente il file di riferimento.',
          { cause: error }
        )
      throw error
    }
  }

  async state(): Promise<RepetitionState> {
    await mkdir(this.root, { recursive: true })
    const sessions: RepetitionSession[] = []
    for (const entry of await readdir(this.root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[a-f0-9]{64}$/.test(entry.name)) continue
      const record =
        this.current?.id === entry.name
          ? this.current
          : await this.record(entry.name)
      const item = summary(record)
      if (
        this.active?.id !== item.id &&
        ['transcribing', 'evaluating'].includes(item.status)
      ) {
        item.status = 'paused'
        item.message =
          'Sessione interrotta. Premi Riprendi sessione per continuare.'
      }
      sessions.push(item)
    }
    return {
      referenceName:
        basename((await this.config()).referencePath || '') || null,
      busy: !!(this.active || this.opening),
      activeId: this.active?.id ?? this.current?.id ?? null,
      sessions: sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
  }

  async read(id: string): Promise<RepetitionDocument> {
    const record =
      this.current?.id === id ? this.current : await this.record(id)
    const directory = this.directory(id)
    const optional = async (name: string) => {
      try {
        return await readFile(join(directory, name), 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''
        throw error
      }
    }
    return {
      session: summary(record),
      transcript: await optional('trascrizione.txt'),
      reference: await readFile(join(directory, 'appunti.md'), 'utf8'),
      assessment: await optional('valutazione.md')
    }
  }

  async audioPath(id: string): Promise<string> {
    return join(this.directory(id), (await this.record(id)).audioFile)
  }

  startLatest(): Promise<string> {
    if (this.active) return Promise.resolve(this.active.id)
    if (this.opening) return this.opening
    this.opening = this.prepare().finally(() => {
      this.opening = null
    })
    return this.opening
  }

  resume(id: string): Promise<string> {
    if (this.active) return Promise.resolve(this.active.id)
    if (this.opening) return this.opening
    this.opening = this.record(id)
      .then((record) => this.begin(record))
      .finally(() => {
        this.opening = null
      })
    return this.opening
  }

  private async prepare(): Promise<string> {
    const source = (await this.dependencies.scan()).files[0]
    if (!source) throw new Error('Nessun audio disponibile sul registratore.')
    const id = source.checksum
    const directory = this.directory(id)
    let record: RecordData | null = null
    try {
      record = await this.record(id)
      // Existing results always retain the reference snapshot used originally.
      if (record.status === 'completed') {
        this.current = record
        return id
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    if (!record) {
      const config = await this.config()
      if (!config.referencePath)
        throw new Error('Scegli il file dei tuoi appunti per avviare RIPETERE.')
      const reference = await this.readReference(config.referencePath)
      const extension = extname(source.name).toLowerCase()
      if (!['.mp3', '.wav', '.m4a', '.aac', '.wma'].includes(extension))
        throw new Error('Formato audio non supportato.')
      // Stage all primary sources before exposing a session to readers.
      await mkdir(this.root, { recursive: true })
      const staging = join(this.root, `preparazione-${randomUUID()}`)
      await mkdir(staging)
      const audioFile = `audio${extension}`
      const destination = join(staging, audioFile)
      try {
        await copyFile(source.fullPath, destination)
        if ((await fileChecksum(destination)) !== id)
          throw new Error(
            'Audio cambiato durante la copia. Attendi la fine della registrazione e riprova.'
          )
        await atomicWrite(join(staging, 'appunti.md'), reference)
        record = {
          id,
          checksum: id,
          referenceChecksum: textHash(reference),
          audioFile,
          audioName: source.name,
          referenceName: basename(config.referencePath),
          createdAt: new Date().toISOString(),
          status: 'transcribing',
          message: 'Preparazione della trascrizione…',
          percent: 0,
          offset: 0
        }
        await atomicWrite(
          join(staging, 'session.json'),
          JSON.stringify(record, null, 2)
        )
        await rename(staging, directory)
      } catch (error) {
        // Only files created by this attempt; preserve unrelated files and existing sessions.
        for (const name of [audioFile, 'appunti.md', 'session.json'])
          await unlink(join(staging, name)).catch(() => {})
        throw error
      }
    }
    return this.begin(record)
  }

  private async begin(record: RecordData): Promise<string> {
    const id = record.id
    if (record.status === 'completed') {
      this.current = record
      return id
    }
    const directory = this.directory(id)
    if (
      (await fileChecksum(join(directory, record.audioFile))) !==
      record.checksum
    )
      throw new Error(
        'La copia locale dell’audio è cambiata. Ripristinala prima di riprendere.'
      )
    const controller = new AbortController()
    this.current = record
    this.active = { id, controller, done: Promise.resolve() }
    this.active.done = this.run(record, controller.signal)
      .catch(() => {
        record.status = 'failed'
        record.message =
          'Salvataggio non riuscito. Controlla spazio e permessi della cartella RIPETERE.'
        logger.error(
          'repetition',
          'Salvataggio della sessione RIPETERE non riuscito.'
        )
      })
      .finally(() => {
        this.active = null
      })
    return id
  }

  async stop(): Promise<void> {
    if (this.opening) await this.opening
    const active = this.active
    active?.controller.abort()
    await active?.done
  }

  private async run(record: RecordData, signal: AbortSignal): Promise<void> {
    const directory = this.directory(record.id)
    try {
      const document = await this.read(record.id)
      const reference = document.reference
      if (textHash(reference) !== record.referenceChecksum)
        throw new Error('La copia degli appunti è cambiata.')
      let { transcript, assessment } = document
      if (!transcript) {
        record.status = 'transcribing'
        await this.save(record)
        transcript = await this.dependencies.transcribe(
          join(directory, record.audioFile),
          `ripetere-${record.id}`,
          signal,
          (message, percent) => {
            record.message = message
            record.percent = Math.round(percent * 0.6)
          }
        )
        signal.throwIfAborted()
        if (!transcript.trim()) throw new Error('Trascrizione vuota.')
        await atomicWrite(join(directory, 'trascrizione.txt'), transcript)
      }
      record.status = 'evaluating'
      const transcriptChecksum = textHash(transcript)
      // A single atomic checkpoint holds assessment and offset together.
      try {
        const checkpoint = JSON.parse(
          await readRecoverable(join(directory, 'controllo.json'))
        )
        if (
          !Number.isInteger(checkpoint.offset) ||
          checkpoint.offset < 0 ||
          checkpoint.offset > transcript.length ||
          checkpoint.transcriptChecksum !== transcriptChecksum ||
          checkpoint.referenceChecksum !== record.referenceChecksum ||
          typeof checkpoint.assessment !== 'string'
        )
          throw new Error('Checkpoint non valido.')
        validateRepetitionAssessment(checkpoint.assessment)
        record.offset = checkpoint.offset
        assessment = checkpoint.assessment
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        record.offset = 0
      }
      while (record.offset < transcript.length) {
        signal.throwIfAborted()
        const end = Math.min(transcript.length, record.offset + 48000)
        record.message = `Confronto con gli appunti · parte ${Math.floor(record.offset / 48000) + 1}/${Math.ceil(transcript.length / 48000)}`
        record.percent =
          60 + Math.floor((35 * record.offset) / transcript.length)
        await this.save(record)
        assessment = await this.dependencies.evaluate(
          reference,
          transcript.slice(record.offset, end),
          assessment,
          end === transcript.length,
          record.id,
          signal
        )
        validateRepetitionAssessment(assessment)
        signal.throwIfAborted()
        await atomicWrite(
          join(directory, 'controllo.json'),
          JSON.stringify({
            offset: end,
            assessment,
            transcriptChecksum,
            referenceChecksum: record.referenceChecksum
          })
        )
        record.offset = end
      }
      await atomicWrite(join(directory, 'valutazione.md'), assessment)
      record.status = 'completed'
      record.percent = 100
      record.message = 'Valutazione salvata in RIPETERE.'
    } catch {
      record.status = signal.aborted ? 'paused' : 'failed'
      record.message = signal.aborted
        ? 'Sessione sospesa. I progressi sono conservati.'
        : 'Elaborazione non completata. Controlla rete e chiavi Gemini nelle Impostazioni, poi riprova. I materiali sono conservati.'
    } finally {
      await this.save(record)
    }
  }
}
