import { stat, readdir, statfs } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import * as path from 'node:path'
import { parseFileName, fileChecksum } from './fileNameParser'
import { readMp3Duration } from './mp3Duration'
import { logger } from './logger'
import { formatLocalCalendarDateTime } from '../../shared/calendarDate'

export const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.m4a',
  '.aac',
  '.wma'
])

export interface RawUsbAudioFile {
  name: string
  fullPath: string
  byteSize: number
  mtime: string
  durationSeconds: number
  checksum: string
  parsedCourseCode: string | null
  parsedRecordedAt: string | null
}

export interface DetectedUsbDrive {
  detected: boolean
  driveLetter?: string
  recordPath?: string
  volumeName?: string
  freeSpaceBytes?: number
  totalSpaceBytes?: number
  files: RawUsbAudioFile[]
}

/**
 * Cerca unità disco USB / rimovibili con cartella RECORD o cartelle audio.
 */
export async function findUsbRecorderDrive(
  customPath?: string
): Promise<DetectedUsbDrive | null> {
  // 1. Se è specificato un percorso personalizzato ed esiste, verificalo
  if (customPath && existsSync(customPath)) {
    try {
      const stats = await stat(customPath)
      if (stats.isDirectory()) {
        const driveLetter = path.parse(customPath).root.replace(/\\$/, '')
        const files = await scanAudioFiles(customPath)
        const space = await getDriveSpace(driveLetter)
        return {
          detected: true,
          driveLetter,
          recordPath: customPath,
          volumeName: 'Registratore USB',
          freeSpaceBytes: space.free,
          totalSpaceBytes: space.total,
          files
        }
      }
    } catch {
      // continua con scansione automatica
    }
  }

  // 2. Scansione unità da D a Z su Windows
  const candidateLetters = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  for (const letter of candidateLetters) {
    const candidateRecord = `${letter}:\\RECORD`
    if (existsSync(candidateRecord)) {
      try {
        const stats = await stat(candidateRecord)
        if (stats.isDirectory()) {
          const files = await scanAudioFiles(candidateRecord)
          const space = await getDriveSpace(`${letter}:`)
          return {
            detected: true,
            driveLetter: `${letter}:`,
            recordPath: candidateRecord,
            volumeName: 'USB DISK',
            freeSpaceBytes: space.free,
            totalSpaceBytes: space.total,
            files
          }
        }
      } catch {
        // ignora unità inaccessibili o non pronte
      }
    }
  }

  return null
}

async function getDriveSpace(
  driveRoot: string
): Promise<{ free?: number; total?: number }> {
  try {
    const s = await statfs(driveRoot)
    return {
      free: s.bfree * s.bsize,
      total: s.blocks * s.bsize
    }
  } catch {
    return {}
  }
}

/**
 * Scansiona tutti i file audio presenti in una directory.
 */
export async function scanAudioFiles(
  dirPath: string
): Promise<RawUsbAudioFile[]> {
  const result: RawUsbAudioFile[] = []
  const started = performance.now()
  const timing = { listingMs: 0, checksumMs: 0, durationMs: 0, files: 0, errors: 0 }

  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    timing.listingMs = performance.now() - started
    for (const entry of entries) {
      if (!entry.isFile()) continue
      const ext = path.extname(entry.name).toLowerCase()
      if (!SUPPORTED_AUDIO_EXTENSIONS.has(ext)) continue

      const fullPath = path.join(dirPath, entry.name)
      try {
        const stats = await stat(fullPath)
        const checksumStart = performance.now()
        const checksum = await fileChecksum(fullPath)
        timing.checksumMs += performance.now() - checksumStart
        let durationSeconds = 0

        if (ext === '.mp3') {
          const durationStart = performance.now()
          const parsedDur = await readMp3Duration(fullPath)
          timing.durationMs += performance.now() - durationStart
          if (parsedDur !== null) {
            durationSeconds = Math.round(parsedDur)
          }
        }

        const parsed = parseFileName(entry.name)
        const mtimeIso = stats.mtime.toISOString()

        result.push({
          name: entry.name,
          fullPath,
          byteSize: stats.size,
          mtime: mtimeIso,
          durationSeconds,
          checksum,
          parsedCourseCode: parsed?.courseCode ?? null,
          parsedRecordedAt: parsed?.recordedAt ?? formatLocalCalendarDateTime(stats.mtime)
        })
      } catch {
        timing.errors++
      }
    }
  } catch {
    timing.errors++
  }

  // Ordina dal più recente al più vecchio (o cronologico)
  result.sort((a, b) => {
    const dateA = a.parsedRecordedAt || a.mtime
    const dateB = b.parsedRecordedAt || b.mtime
    return dateB.localeCompare(dateA)
  })

  timing.files = result.length
  logger.info('usb-scan', 'Tempi scansione locale (ms).', JSON.stringify({ ...timing, totalMs: performance.now() - started }))
  return result
}
