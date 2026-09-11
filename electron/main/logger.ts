import fs from 'node:fs'
import path from 'node:path'
import type { AppLogEntry, LogLevel } from '../../shared/archive'

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
  private readonly maxBufferSize = 500
  private writeQueue: Promise<void> = Promise.resolve()
  private persistedBytes = 0

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

    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }

      if (fs.existsSync(this.logFilePath)) {
        this.persistedBytes = fs.statSync(this.logFilePath).size
        const raw = fs.readFileSync(this.logFilePath, 'utf-8')
        const lines = raw.trim().split('\n').filter(Boolean)
        const recentLines = lines.slice(-this.maxBufferSize)
        for (const line of recentLines) {
          try {
            const entry = JSON.parse(line) as AppLogEntry
            if (entry && entry.id && entry.timestamp && entry.level) {
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

  public async clearLogs(): Promise<void> {
    this.buffer = []
    if (this.logFilePath) {
      await this.writeQueue.catch(() => {})
      try {
        if (this.logDir && fs.existsSync(this.logDir)) {
          await fs.promises.writeFile(this.logFilePath, '', 'utf-8')
        }
      } catch (err) {
        console.error('Errore durante lo svuotamento del log:', err)
      }
    }
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
            this.persistedBytes = Buffer.byteLength(rotated)
            return
          }
          await fs.promises.appendFile(this.logFilePath, line, 'utf-8')
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
