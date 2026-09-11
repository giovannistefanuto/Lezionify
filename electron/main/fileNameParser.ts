import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import * as path from 'node:path'

export const AUDIO_EXTENSION = '.mp3'
export const FILE_NAME_PATTERN = /^(?:(?<course>[\p{L}\p{N}_-]+)\s+)?(?<year>\d{4})-(?<month>\d{2})(?<day>\d{2})-(?<hour>\d{2})-(?<minute>\d{2})-(?<second>\d{2})$/u

export interface ParsedFileName {
  courseCode: string | null
  recordedAt: string
}

export function parseFileName(sourceFileName: string): ParsedFileName | null {
  if (path.extname(sourceFileName).toLowerCase() !== AUDIO_EXTENSION) return null

  const baseName = path.basename(sourceFileName, path.extname(sourceFileName))
  const match = FILE_NAME_PATTERN.exec(baseName)
  if (!match?.groups) return null

  const { course, year, month, day, hour, minute, second } = match.groups
  const localDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  )
  const isValidDate =
    localDate.getFullYear() === Number(year) &&
    localDate.getMonth() === Number(month) - 1 &&
    localDate.getDate() === Number(day) &&
    localDate.getHours() === Number(hour) &&
    localDate.getMinutes() === Number(minute) &&
    localDate.getSeconds() === Number(second)

  if (!isValidDate) return null
  return {
    courseCode: course ?? null,
    recordedAt: `${year}-${month}-${day}T${hour}:${minute}:${second}`
  }
}

export async function fileChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}
