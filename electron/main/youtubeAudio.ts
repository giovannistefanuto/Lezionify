import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join, relative, isAbsolute } from 'node:path'
import { spawn } from 'node:child_process'
import catalog from '../../shared/musicCatalog.json'
import manifest from '../../resources/youtube-tools/manifest.json'
import type { YoutubeAudioItem } from '../../shared/youtubeAudio'
import { AsyncMutex } from './asyncMutex'

export type YoutubeToolRunner = (exe: string, args: string[], signal: AbortSignal, line: (line: string) => void) => Promise<void>
const limit = 2 * 1024 ** 3
const mediaExtensions = ['m4a', 'webm', 'opus', 'ogg', 'mp4']
function message(stderr: string) {
  if (/private|unavailable|removed|not available|age.restrict/i.test(stderr)) return 'Video non disponibile per il download. Puoi aprirlo su YouTube.'
  if (/403|429|sign in|bot|token|challenge/i.test(stderr)) return 'YouTube non consente il download in questo momento. Riprova più tardi oppure apri il video su YouTube.'
  return 'Download o conversione non riusciti. Controlla la connessione e lo spazio libero, poi riprova.'
}
export const runYoutubeTool: YoutubeToolRunner = (exe, args, signal, line) => new Promise((resolve, reject) => {
  signal.throwIfAborted()
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(path|pathext|systemroot|windir|temp|tmp|userprofile|appdata|localappdata|programfiles|programfiles\(x86\))$/i.test(key)))
  const child = spawn(exe, args, { windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'], env: { ...env, DENO_NO_UPDATE_CHECK: '1', DENO_NO_PROMPT: '1' } })
  let buffer = '', stderr = '', failed = false
  let killing: Promise<void> = Promise.resolve()
  const abort = () => {
    if (!child.pid) return
    if (process.platform === 'win32') {
      killing = new Promise(resolve => {
        const killer = spawn(join(process.env.SystemRoot || 'C:/Windows', 'System32/taskkill.exe'), ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
        killer.once('error', () => { child.kill(); resolve() })
        killer.once('close', code => { if (code !== 0) child.kill(); resolve() })
      })
    } else child.kill('SIGTERM')
  }
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) abort()
  child.stdout.on('data', (chunk: Buffer) => {
    buffer = (buffer + chunk.toString()).slice(-16384)
    const lines = buffer.split(/\r?\n/); buffer = lines.pop() ?? ''
    for (const value of lines) line(value)
  })
  child.stderr.on('data', (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-16384) })
  child.once('error', () => { failed = true })
  // Drain handles before cleanup or cancellation acknowledgement (especially on Windows).
  child.once('close', code => { signal.removeEventListener('abort', abort); void killing.then(() => { if (signal.aborted || failed || code !== 0) reject(new Error(message(stderr))); else resolve() }) })
})
interface Recording {
  version: 1; videoId: string; directory: string; original: string; downloadedAt: string; extractorVersion: string
  sourceBytes: number; sourceSha256: string; bytes: number; sha256: string; durationSeconds: number
}
interface Job { id: string; controller: AbortController; item: YoutubeAudioItem; done: Promise<void> }
export class YoutubeAudioService {
  private lock = new AsyncMutex()
  private active: Job | null = null
  private errors = new Map<string, string>()
  private verified = new Map<string, string>()
  private ids: Set<string>
  constructor(private root: string, private tools: string, private ffmpeg: () => string,
    private runner: YoutubeToolRunner = runYoutubeTool, ids = catalog.map(item => item.videoId), private toolsOverride?: () => Promise<{ ytdlp: string; deno: string }>) { this.ids = new Set(ids) }
  private id(value: unknown): string {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(value) || !this.ids.has(value)) throw new Error('Compilation non valida.')
    return value
  }
  private async inside(file: string) {
    const actual = await realpath(file), root = await realpath(this.root), path = relative(root, actual)
    if (!path || path.startsWith('..') || isAbsolute(path) || (await lstat(file)).isSymbolicLink()) throw new Error('File locale non valido.')
    return actual
  }
  private async hash(file: string): Promise<string> {
    const info = await stat(file)
    if (!info.isFile() || info.size < 1 || info.size > limit) throw new Error('File locale non valido.')
    const key = `${file}:${info.size}:${info.mtimeMs}:${info.ctimeMs}`
    const cached = this.verified.get(key)
    if (cached) return cached
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(file)) hash.update(chunk)
    const value = hash.digest('hex'); this.verified.set(key, value)
    return value
  }
  private async recording(id: string): Promise<Recording | null> {
    try {
      const marker = join(this.root, `${id}.json`)
      await this.inside(marker)
      if ((await stat(marker)).size > 4096) return null
      const record = JSON.parse(await readFile(marker, 'utf8')) as Recording
      if (record.version !== 1 || record.videoId !== id || !new RegExp(`^${id}-[a-f0-9-]{36}$`).test(record.directory) ||
          !/^source\.(m4a|webm|opus|ogg|mp4)$/.test(record.original) || !Number.isFinite(record.durationSeconds) || record.durationSeconds <= 0 || record.durationSeconds > 86400) return null
      const directory = join(this.root, record.directory)
      const audio = await this.inside(join(directory, 'audio.mp3'))
      const original = await this.inside(join(directory, record.original))
      if ((await stat(audio)).size !== record.bytes || (await stat(original)).size !== record.sourceBytes ||
          await this.hash(audio) !== record.sha256 || await this.hash(original) !== record.sourceSha256) return null
      return record
    } catch { return null }
  }
  async status(): Promise<YoutubeAudioItem[]> {
    return Promise.all([...this.ids].map(async videoId => {
      if (this.active?.id === videoId) return { ...this.active.item }
      const recording = await this.recording(videoId)
      return recording ? { videoId, phase: 'ready' as const, durationSeconds: recording.durationSeconds } :
        { videoId, phase: this.errors.has(videoId) ? 'error' as const : 'missing' as const, error: this.errors.get(videoId) }
    }))
  }
  async playbackUrl(value: unknown): Promise<string> {
    const id = this.id(value)
    if (!await this.recording(id)) throw new Error('Audio locale non disponibile. Scarica nuovamente la compilation.')
    return `media://youtube/${id}`
  }
  async audioPath(value: unknown): Promise<string | null> {
    const id = this.id(value), record = await this.recording(id)
    return record ? join(this.root, record.directory, 'audio.mp3') : null
  }
  async download(value: unknown): Promise<YoutubeAudioItem[]> {
    const id = this.id(value)
    await this.lock.runExclusive(async () => {
      if (await this.recording(id)) return
      if (this.active) {
        if (this.active.id === id) return
        throw new Error('Un download è già in corso. Attendi oppure annullalo.')
      }
      this.errors.delete(id)
      const job: Job = { id, controller: new AbortController(), item: { videoId: id, phase: 'downloading', progress: 0 }, done: Promise.resolve() }
      this.active = job
      job.done = this.perform(job).catch(error => {
        if (!job.controller.signal.aborted) this.errors.set(id, error instanceof Error ? error.message : 'Download non riuscito.')
      }).finally(() => { if (this.active === job) this.active = null })
    })
    return this.status()
  }
  async cancel(value: unknown): Promise<YoutubeAudioItem[]> {
    const id = this.id(value), job = this.active
    if (job?.id === id) { job.controller.abort(); await job.done }
    this.errors.delete(id)
    return this.status()
  }
  isBusy(): boolean { return this.active !== null }
  async stop(): Promise<void> {
    await this.lock.runExclusive(async () => {
      const job = this.active
      if (job) { job.controller.abort(); await job.done }
    })
  }
  private async tool(name: 'yt-dlp.exe' | 'deno.exe', expected: string | null): Promise<string> {
    const file = join(this.tools, name)
    if (!expected || (await this.hash(file)) !== expected) throw new Error('Strumenti YouTube mancanti o non integri. Ripristina l’installazione di Lezionify.')
    return file
  }
  private async cleanup(staging: string, sourceComplete: boolean, id: string): Promise<void> {
    try {
      await this.inside(staging)
      if (sourceComplete) { await rm(join(staging, 'audio.mp3'), { force: true }); await rename(staging, join(this.root, `${id}-${randomUUID()}`)) }
      else await rm(staging, { recursive: true, force: true })
    } catch (cause) { throw new Error('Pulizia dei file temporanei non riuscita. Controlla spazio e permessi della cartella dati.', { cause }) }
  }
  private async perform(job: Job): Promise<void> {
    let staging: string | undefined
    let sourceComplete = false
    const timeout = AbortSignal.timeout(90 * 60_000)
    const signal = AbortSignal.any([job.controller.signal, timeout])
    try {
      await mkdir(this.root, { recursive: true })
      if ((await lstat(this.root)).isSymbolicLink()) throw new Error('Cartella musica locale non valida.')
      const { ytdlp, deno } = this.toolsOverride ? await this.toolsOverride() : { ytdlp: await this.tool('yt-dlp.exe', manifest.ytDlp.sha256), deno: await this.tool('deno.exe', manifest.deno.sha256) }
      staging = await mkdtemp(join(this.root, '.download-'))
      await this.runner(ytdlp, ['--ignore-config', '--no-plugin-dirs', '--no-remote-components', '--no-cache-dir', '--no-playlist', '--newline', '--progress',
        '--progress-template', 'download:YT:%(progress.downloaded_bytes)s:%(progress.total_bytes,progress.total_bytes_estimate)s',
        '--js-runtimes', `deno:${deno}`, '--socket-timeout', '30', '--retries', '3', '--fragment-retries', '3',
        '--max-filesize', '2G', '-f', 'bestaudio', '-o', join(staging, 'source.%(ext)s'), '--', `https://www.youtube.com/watch?v=${job.id}`], signal, line => {
          const match = /^YT:(\d+):(\d+)$/.exec(line.trim())
          if (match) job.item.progress = Math.min(99, Math.floor(Number(match[1]) / Math.max(1, Number(match[2])) * 100))
        })
      signal.throwIfAborted()
      const originals = (await readdir(staging)).filter(file => mediaExtensions.some(ext => file === `source.${ext}`))
      if (originals.length !== 1) throw new Error('YouTube non ha fornito una traccia audio utilizzabile.')
      const source = join(staging, originals[0])
      await this.inside(source)
      await this.hash(source)
      sourceComplete = true
      job.item = { videoId: job.id, phase: 'converting' }
      const output = join(staging, 'audio.mp3')
      const ffmpeg = this.ffmpeg()
      await this.runner(ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-xerror', '-y', '-protocol_whitelist', 'file,pipe', '-i', source,
        '-map', '0:a:0', '-vn', '-c:a', 'libmp3lame', '-q:a', '2', '-map_metadata', '-1', output], signal, () => {})
      let duration = 0
      await this.runner(ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-xerror', '-progress', 'pipe:1', '-protocol_whitelist', 'file,pipe', '-i', output,
        '-map', '0:a:0', '-f', 'null', '-'], signal, line => { const value = /^out_time_us=(\d+)$/.exec(line); if (value) duration = Math.max(duration, Number(value[1]) / 1_000_000) })
      signal.throwIfAborted()
      if (!Number.isFinite(duration) || duration <= 0 || duration > 86400) throw new Error('Durata audio locale non valida.')
      const record: Recording = { version: 1, videoId: job.id, directory: `${job.id}-${randomUUID()}`, original: originals[0], downloadedAt: new Date().toISOString(), extractorVersion: manifest.ytDlp.version,
        bytes: (await stat(output)).size, sha256: await this.hash(output), sourceBytes: (await stat(source)).size,
        sourceSha256: await this.hash(source), durationSeconds: duration }
      signal.throwIfAborted()
      await rename(staging, join(this.root, record.directory)); staging = undefined
      const temporary = join(this.root, `.${job.id}-${randomUUID()}.json`)
      try { await writeFile(temporary, JSON.stringify(record), { flag: 'wx' }); signal.throwIfAborted(); await rename(temporary, join(this.root, `${job.id}.json`)) }
      finally { await rm(temporary, { force: true }) }
    } catch (error) {
      if (timeout.aborted && !job.controller.signal.aborted) throw new Error('Download interrotto per tempo massimo. Riprova.', { cause: error })
      // Tool output never escapes as a raw diagnostic containing remote URLs or headers.
      if (error instanceof Error && !('code' in error)) throw error
      throw new Error('File o strumenti YouTube non disponibili. Controlla spazio e installazione.', { cause: error })
    } finally {
      if (staging) await this.cleanup(staging, sourceComplete, job.id)
    }
  }
}
