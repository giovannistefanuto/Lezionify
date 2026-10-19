import fs from 'node:fs'
import path from 'node:path'
import type { AppLogEntry, LogLevel } from '../../shared/archive'
import {
  localLogDay,
  validateLogDay,
  type AppLogDay
} from '../../shared/appLogs'

function isLogEntry(value: unknown): value is AppLogEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as AppLogEntry
  return (
    typeof entry.id === 'string' &&
    typeof entry.timestamp === 'string' &&
    ['info', 'warn', 'error'].includes(entry.level) &&
    typeof entry.source === 'string' &&
    typeof entry.message === 'string' &&
    (entry.details === undefined || typeof entry.details === 'string') &&
    !Number.isNaN(new Date(entry.timestamp).getTime())
  )
}

/**
 * Maschera stringhe sensibili come le chiavi API Google Gemini
 * per evitare la persistenza in chiaro nei log (compliance AGENTS.md).
 */
export function maskSensitiveData(text: unknown): string {
  if (text == null) return ''
  const str = typeof text === 'string' ? text : String(text)
  // Maschera chiavi formato standard Google AI (AIzaSy...)
  return str.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, (match) => {
    return `${match.slice(0, 6)}...${match.slice(-4)}`
  })
}

export class AppLogger {
  private static instance: AppLogger
  private logDir = ''
  private logFilePath = ''
  private buffer: AppLogEntry[] = []
  private readonly maxBufferSize = 5000
  private writeQueue: Promise<void> = Promise.resolve()
  private persistedBytes = 0
  private dayRanges = new Map<string, { start: number; length: number }[]>()

  private indexLines(raw: string | Buffer, start = 0): void {
    const bytes = typeof raw === 'string' ? Buffer.from(raw) : raw
    let position = 0
    while (position < bytes.length) {
      const newline = bytes.indexOf(10, position)
      const end = newline === -1 ? bytes.length : newline + 1
      const line = bytes.subarray(position, end).toString('utf8')
      const offset = start + position
      const length = end - position
      try {
        const entry = JSON.parse(line) as AppLogEntry
        const date = new Date(entry.timestamp)
        if (isLogEntry(entry)) {
          const day = localLogDay(date)
          const ranges = this.dayRanges.get(day) ?? []
          const previous = ranges.at(-1)
          if (previous && previous.start + previous.length === offset)
            previous.length += length
          else ranges.push({ start: offset, length })
          this.dayRanges.set(day, ranges)
        }
      } catch {
        /* Preserve corrupt lines on disk, exclude them from the index. */
      }
      position = end
    }
  }

  private constructor() {}

  public static getInstance(): AppLogger {
    if (!AppLogger.instance) {
      AppLogger.instance = new AppLogger()
    }
    return AppLogger.instance
  }

  public init(logDir: string): void {
    this.logDir = logDir
    this.logFilePath = path.join(logDir, 'app.log')
    this.buffer = []
    this.dayRanges.clear()

    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }

      if (fs.existsSync(this.logFilePath)) {
        this.persistedBytes = fs.statSync(this.logFilePath).size
        const bytes = fs.readFileSync(this.logFilePath)
        const raw = bytes.toString('utf8')
        this.indexLines(bytes)
        const lines = raw.trim().split('\n').filter(Boolean)
        const recentLines = lines.slice(-this.maxBufferSize)
        for (const line of recentLines) {
          try {
            const entry = JSON.parse(line) as AppLogEntry
            if (isLogEntry(entry)) {
              this.buffer.push(entry)
            }
          } catch {
            // Ignora linee corrotte
          }
        }
      } else this.persistedBytes = 0
    } catch (err) {
      console.error('Impossibile inizializzare file di log app.log:', err)
    }
  }

  public log(
    level: LogLevel,
    source: string,
    message: unknown,
    details?: unknown
  ): AppLogEntry {
    const safeMsg = maskSensitiveData(message)
    const safeDetails = details != null ? maskSensitiveData(details) : undefined

    const entry: AppLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      source,
      message: safeMsg,
      details: safeDetails
    }

    this.buffer.push(entry)
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift()
    }

    const logPrefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.source}]`
    const suppressRoutineTestOutput =
      level === 'info' &&
      (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true')
    if (level === 'error') {
      console.error(logPrefix, safeMsg, safeDetails ?? '')
    } else if (level === 'warn') {
      console.warn(logPrefix, safeMsg, safeDetails ?? '')
    } else if (!suppressRoutineTestOutput) {
      console.log(logPrefix, safeMsg)
    }

    this.persistEntry(entry)
    return entry
  }

  public info(source: string, message: string, details?: string): AppLogEntry {
    return this.log('info', source, message, details)
  }

  public warn(source: string, message: string, details?: string): AppLogEntry {
    return this.log('warn', source, message, details)
  }

  public error(source: string, message: string, details?: string): AppLogEntry {
    return this.log('error', source, message, details)
  }

  public getLogs(): AppLogEntry[] {
    return [...this.buffer]
  }

  /** Only the byte ranges of the requested local day cross the disk/UI seam. */
  public async getLogDay(value?: unknown): Promise<AppLogDay> {
    const day = value === undefined ? localLogDay() : validateLogDay(value)
    const read = this.writeQueue.then(async (): Promise<AppLogDay> => {
      const ranges = this.dayRanges.get(day) ?? []
      const entries: AppLogEntry[] = []
      if (ranges.length) {
        const file = await fs.promises.open(this.logFilePath, 'r')
        try {
          for (const range of ranges) {
            const bytes = Buffer.alloc(range.length)
            let read = 0
            while (read < bytes.length) {
              const result = await file.read(
                bytes,
                read,
                bytes.length - read,
                range.start + read
              )
              if (!result.bytesRead) break
              read += result.bytesRead
            }
            for (const line of bytes
              .subarray(0, read)
              .toString('utf8')
              .split('\n')) {
              try {
                const entry: unknown = JSON.parse(line)
                if (isLogEntry(entry)) entries.push(entry)
              } catch {
                /* Corrupt line. */
              }
            }
          }
        } finally {
          await file.close()
        }
      }
      const days = [...this.dayRanges.keys()]
        .filter((candidate) => candidate < day)
        .sort()
      return { day, entries, previousDay: days.at(-1) ?? null }
    })
    this.writeQueue = read.then(
      () => {},
      () => {}
    )
    return read.catch(() => {
      throw new Error('Lettura dei log non riuscita.')
    })
  }

  public async clearLogs(): Promise<void> {
    this.buffer = []
    const clear = this.writeQueue.then(async () => {
      if (this.logFilePath && this.logDir && fs.existsSync(this.logDir)) {
        await fs.promises.writeFile(this.logFilePath, '', 'utf-8')
        this.persistedBytes = 0
        this.dayRanges.clear()
      }
    })
    this.writeQueue = clear.catch(() => {})
    await clear
  }

  public async flush(): Promise<void> {
    await this.writeQueue.catch(() => {})
  }

  private persistEntry(entry: AppLogEntry): void {
    if (!this.logFilePath) return

    this.writeQueue = this.writeQueue
      .then(async () => {
        try {
          if (!this.logDir || !fs.existsSync(this.logDir)) return
          const line = JSON.stringify(entry) + '\n'
          if (this.persistedBytes + Buffer.byteLength(line) > 5 * 1024 * 1024) {
            const rotated =
              this.buffer.map((e) => JSON.stringify(e)).join('\n') + '\n'
            await fs.promises.writeFile(this.logFilePath, rotated, 'utf-8')
            this.dayRanges.clear()
            this.indexLines(rotated)
            this.persistedBytes = Buffer.byteLength(rotated)
            return
          }
          await fs.promises.appendFile(this.logFilePath, line, 'utf-8')
          this.indexLines(line, this.persistedBytes)
          this.persistedBytes += Buffer.byteLength(line)
        } catch (err) {
          console.error('Errore scrittura su app.log:', err)
        }
      })
      .catch((err) => {
        console.error('Errore coda scrittura log:', err)
      })
  }
}

export const logger = AppLogger.getInstance()
