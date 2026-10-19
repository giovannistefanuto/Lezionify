import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import {
  mkdir,
  mkdtemp,
  readdir,
  rmdir,
  stat,
  unlink,
  writeFile
} from 'node:fs/promises'
import * as path from 'node:path'
import type {
  Lecture,
  VideoImportProgress,
  VideoImportReady,
  VideoImportSelection
} from '../../shared/archive'
import { fileChecksum } from './fileNameParser'
import { getFfmpegPath } from './ffmpegPath'
import { readMp3Duration } from './mp3Duration'

export const VIDEO_EXTENSIONS = [
  'mp4',
  'm4v',
  'mkv',
  'mov',
  'avi',
  'webm',
  'wmv',
  'flv',
  'mpeg',
  'mpg',
  'mts',
  'm2ts',
  'ts',
  '3gp',
  'ogv',
  'vob'
]
type Source = VideoImportSelection['files'][number] & { fullPath: string }
interface Session {
  files: Source[]
  state: 'selected' | 'converting' | 'ready' | 'saving'
  directory?: string
  outputPath?: string
  ready?: VideoImportReady
  sources?: NonNullable<Lecture['videoImport']>['sources']
  abort?: AbortController
  running?: Promise<VideoImportReady>
}

/** Sessions contain native-dialog paths; renderer requests use opaque IDs only. */
export class VideoImporter {
  private readonly sessions = new Map<string, Session>()
  private readonly tempRoot: string
  private progress?: (value: VideoImportProgress) => void

  constructor(rootDirectory: string) {
    this.tempRoot = path.resolve(rootDirectory, 'video-import-temp')
  }

  setProgressCallback(callback: (value: VideoImportProgress) => void): void {
    this.progress = callback
  }

  async initialize(): Promise<void> {
    await mkdir(this.tempRoot, { recursive: true })
    // Only generated, flat session directories are removed after an interrupted app run.
    for (const entry of await readdir(this.tempRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && /^session-[A-Za-z0-9]+$/.test(entry.name)) {
        await this.cleanDirectory(path.join(this.tempRoot, entry.name))
      }
    }
  }

  async select(filePaths: string[]): Promise<VideoImportSelection> {
    if (this.sessions.size >= 5)
      throw new Error(
        'Chiudi le importazioni video precedenti prima di continuare.'
      )
    if (!filePaths.length || filePaths.length > 100)
      throw new Error('Seleziona da 1 a 100 video.')
    const files: Source[] = []
    for (const fullPath of [...new Set(filePaths)]) {
      if (
        !path.isAbsolute(fullPath) ||
        !VIDEO_EXTENSIONS.includes(
          path.extname(fullPath).slice(1).toLowerCase()
        )
      ) {
        throw new Error('Seleziona un formato video supportato.')
      }
      const info = await stat(fullPath).catch(() => null)
      if (!info?.isFile() || !info.size)
        throw new Error('Un video selezionato è vuoto o non accessibile.')
      files.push({
        id: randomUUID(),
        name: path.basename(fullPath),
        byteSize: info.size,
        fullPath
      })
    }
    const sessionId = randomUUID()
    this.sessions.set(sessionId, { files, state: 'selected' })
    return {
      sessionId,
      files: files.map(({ id, name, byteSize }) => ({ id, name, byteSize }))
    }
  }

  private session(id: string): Session {
    const session = this.sessions.get(id)
    if (!session)
      throw new Error('Importazione scaduta: seleziona nuovamente i video.')
    return session
  }

  async convert(id: string, orderedIds: unknown): Promise<VideoImportReady> {
    const session = this.session(id)
    if (session.state !== 'selected')
      throw new Error('Conversione già avviata.')
    if (
      !Array.isArray(orderedIds) ||
      orderedIds.length !== session.files.length ||
      new Set(orderedIds).size !== session.files.length ||
      orderedIds.some(
        (value) => !session.files.some((file) => file.id === value)
      )
    ) {
      throw new Error('L’ordine dei video non è valido.')
    }
    const executable = getFfmpegPath()
    session.state = 'converting'
    session.abort = new AbortController()
    const ordered = orderedIds.map((value) =>
      session.files.find((file) => file.id === value)!
    )
    session.running = this.runConversion(id, session, ordered, executable)
    return session.running
  }

  private async runConversion(
    id: string,
    session: Session,
    ordered: Source[],
    executable: string
  ): Promise<VideoImportReady> {
    const signal = session.abort!.signal
    const report = (message: string, percent: number) =>
      this.progress?.({ sessionId: id, message, percent })
    try {
      await mkdir(this.tempRoot, { recursive: true })
      session.directory = await mkdtemp(path.join(this.tempRoot, 'session-'))
      signal.throwIfAborted()
      const sources: NonNullable<Lecture['videoImport']>['sources'] = []
      for (let index = 0; index < ordered.length; index++) {
        signal.throwIfAborted()
        report(
          `Estrazione audio ${index + 1} di ${ordered.length}`,
          Math.round((index / (ordered.length + 1)) * 100)
        )
        const input = ordered[index]
        const checksum = await fileChecksum(input.fullPath, signal)
        signal.throwIfAborted()
        const output = path.join(session.directory, `part-${index}.wav`)
        // Decode each source independently: video resolution/FPS/codec never enter the output.
        await runFfmpeg(
          executable,
          [
            '-i',
            input.fullPath,
            '-map',
            '0:a:0',
            '-vn',
            '-sn',
            '-dn',
            '-map_metadata',
            '-1',
            '-af',
            'asetpts=PTS-STARTPTS',
            '-ac',
            '1',
            '-ar',
            '48000',
            '-c:a',
            'pcm_s16le',
            '-rf64',
            'auto',
            output
          ],
          session.directory,
          signal,
          () =>
            report(
              `Estrazione audio ${index + 1} di ${ordered.length} in corso…`,
              Math.round((index / (ordered.length + 1)) * 100)
            )
        ).catch(() => {
          signal.throwIfAborted()
          throw new Error(
            `Video ${index + 1} (${input.name}): audio assente, formato non decodificabile o spazio su disco insufficiente. Nessuna lezione salvata.`
          )
        })
        if ((await fileChecksum(input.fullPath, signal)) !== checksum)
          throw new Error(
            `Video ${index + 1} modificato durante la conversione. Ripeti l’importazione.`
          )
        // Fixed PCM format: payload size gives audio duration without decoding a second time.
        const durationSeconds = await wavDuration(
          executable,
          output,
          session.directory,
          signal
        )
        if (durationSeconds <= 0)
          throw new Error(`Video ${index + 1}: la traccia audio è vuota.`)
        sources.push({ name: input.name, checksum, durationSeconds })
      }
      signal.throwIfAborted()
      report(
        'Unione delle tracce audio…',
        Math.round((ordered.length / (ordered.length + 1)) * 100)
      )
      const manifest = path.join(session.directory, 'parts.txt')
      // Manifest includes generated relative names only, never paths selected by the user.
      await writeFile(
        manifest,
        ordered.map((_, index) => `file 'part-${index}.wav'`).join('\n'),
        'utf8'
      )
      const outputPath = path.join(session.directory, 'lecture.mp3')
      await runFfmpeg(
        executable,
        [
          '-f',
          'concat',
          '-safe',
          '1',
          '-i',
          manifest,
          '-map',
          '0:a:0',
          '-vn',
          '-map_metadata',
          '-1',
          '-c:a',
          'libmp3lame',
          '-b:a',
          '128k',
          outputPath
        ],
        session.directory,
        signal,
        () => report('Unione delle tracce audio in corso…', 95)
      )
      signal.throwIfAborted()
      const durationSeconds = await readMp3Duration(outputPath)
      if (!durationSeconds || durationSeconds <= 0)
        throw new Error('L’audio convertito non è valido.')
      const expected = sources.reduce(
        (sum, source) => sum + source.durationSeconds,
        0
      )
      if (Math.abs(durationSeconds - expected) > Math.max(1, expected * 0.001))
        throw new Error(
          'La durata dell’audio unito non corrisponde alle parti selezionate.'
        )
      session.ready = {
        durationSeconds,
        byteSize: (await stat(outputPath)).size
      }
      session.outputPath = outputPath
      session.sources = sources
      session.state = 'ready'
      // Keep just the finished audio while the user chooses its destination.
      for (const file of await readdir(session.directory)) {
        if (file !== 'lecture.mp3')
          await unlink(path.join(session.directory, file))
      }
      report('Audio pronto. Scegli corso, data e orario.', 100)
      return session.ready
    } catch (error) {
      if (session.directory) await this.cleanDirectory(session.directory)
      session.directory = undefined
      session.state = 'selected'
      if (signal.aborted)
        throw new Error('Conversione annullata.', { cause: error })
      throw error
    }
  }

  takeReady(id: string): {
    outputPath: string
    ready: VideoImportReady
    sources: NonNullable<Lecture['videoImport']>['sources']
  } {
    const session = this.session(id)
    if (
      session.state !== 'ready' ||
      !session.outputPath ||
      !session.ready ||
      !session.sources
    )
      throw new Error('Converti i video prima di salvare.')
    session.state = 'saving'
    return {
      outputPath: session.outputPath,
      ready: session.ready,
      sources: session.sources
    }
  }

  restoreReady(id: string): void {
    this.session(id).state = 'ready'
  }

  abortAll(): void {
    for (const session of this.sessions.values()) session.abort?.abort()
  }

  async finish(id: string): Promise<void> {
    const session = this.session(id)
    this.sessions.delete(id)
    if (session.directory) await this.cleanDirectory(session.directory)
  }

  async cancel(id: string): Promise<void> {
    const session = this.sessions.get(id)
    if (!session) return
    if (session.state === 'saving')
      throw new Error('Attendi il completamento del salvataggio.')
    session.abort?.abort()
    await session.running?.catch(() => {})
    await this.finish(id)
  }

  private async cleanDirectory(directory: string): Promise<void> {
    const resolved = path.resolve(directory)
    if (
      path.dirname(resolved) !== this.tempRoot ||
      !/^session-[A-Za-z0-9]+$/.test(path.basename(resolved))
    )
      throw new Error('Cartella temporanea non valida.')
    for (const entry of await readdir(resolved, { withFileTypes: true }).catch(
      () => []
    )) {
      if (entry.isFile())
        await unlink(path.join(resolved, entry.name)).catch(() => {})
    }
    await rmdir(resolved).catch(() => {})
  }
}

/** Stream output to a bounded parser; no shells, PATH lookup, or private FFmpeg stderr in errors. */
function runFfmpeg(
  executable: string,
  args: string[],
  cwd: string,
  signal: AbortSignal,
  heartbeat?: () => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const process = spawn(
      executable,
      [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-xerror',
        '-y',
        '-progress',
        'pipe:1',
        ...args
      ],
      {
        cwd,
        windowsHide: true,
        signal,
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
    let output = ''
    let lastHeartbeat = 0
    process.stdout.on('data', (value: Buffer) => {
      output = (output + value.toString()).slice(-8192)
      if (Date.now() - lastHeartbeat > 1000) {
        heartbeat?.()
        lastHeartbeat = Date.now()
      }
    })
    process.stderr.resume()
    let failed = false
    // Wait for close even after an abort/error: on Windows the child may still hold files.
    process.once('error', () => {
      failed = true
    })
    process.once('close', (code) =>
      !failed && code === 0
        ? resolve(output)
        : reject(new Error('Conversione FFmpeg non riuscita.'))
    )
  })
}

async function wavDuration(
  executable: string,
  file: string,
  cwd: string,
  signal: AbortSignal
): Promise<number> {
  // Output progress measures decoded audio, including containers without a declared duration.
  const progress = await runFfmpeg(
    executable,
    ['-i', file, '-map', '0:a:0', '-c:a', 'copy', '-f', 'null', '-'],
    cwd,
    signal
  )
  const values = [...progress.matchAll(/out_time_us=(\d+)/g)]
  return Number(values.at(-1)?.[1] ?? 0) / 1_000_000
}
