import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getFfmpegPath } from './ffmpegPath'

const execFileAsync = promisify(execFile)

export interface ChunkBoundary {
  start: number
  end: number
}

function parseDurationFromStderr(stderr: string): number | null {
  const match = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/)
  if (match) {
    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const seconds = parseFloat(match[3])
    return hours * 3600 + minutes * 60 + seconds
  }
  return null
}

/**
 * Ottiene la durata totale del file audio in secondi.
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  const ffmpeg = getFfmpegPath()
  try {
    const { stderr } = await execFileAsync(ffmpeg, ['-i', filePath, '-f', 'null', '-'])
    const duration = parseDurationFromStderr(stderr)
    if (duration !== null) return duration
  } catch (error: unknown) {
    const stderr = error instanceof Error && 'stderr' in error ? String((error as { stderr?: unknown }).stderr) : ''
    const duration = parseDurationFromStderr(stderr)
    if (duration !== null) return duration
    throw new Error('Impossibile determinare la durata dell\'audio', { cause: error })
  }
  throw new Error('Impossibile determinare la durata dell\'audio: output non riconosciuto')
}

/**
 * Misura il volume medio dell'audio per calibrare dinamicamente la soglia di silenzio.
 */
export async function measureAudioMeanVolume(
  filePath: string,
  sampleDurationSeconds: number = 180
): Promise<number> {
  const ffmpeg = getFfmpegPath()
  try {
    const { stderr } = await execFileAsync(ffmpeg, [
      '-t',
      String(sampleDurationSeconds),
      '-i',
      filePath,
      '-af',
      'volumedetect',
      '-f',
      'null',
      '-'
    ])
    const match = stderr.match(/mean_volume:\s*([-\d.]+)\s*dB/)
    if (match) {
      return parseFloat(match[1])
    }
  } catch {
    // ignora errori e usa il valore di fallback
  }
  return -32.0 // fallback tipico per registrazioni vocali in aula
}

/**
 * Cerca un silenzio nell'intorno di un target temporale usando una soglia adattiva.
 */
export async function findSilenceNear(
  filePath: string,
  targetSeconds: number,
  searchWindowSeconds: number = 60,
  noiseThresholdDb: number = -34
): Promise<number> {
  const ffmpeg = getFfmpegPath()
  const startSearch = Math.max(0, targetSeconds - searchWindowSeconds)
  const duration = searchWindowSeconds * 2

  // Proviamo prima con la soglia adattiva; se fallisce, proviamo con una soglia più tollerante
  const thresholdsToTry = [noiseThresholdDb, noiseThresholdDb + 4, noiseThresholdDb - 4, -30]
  const uniqueThresholds = Array.from(new Set(thresholdsToTry))

  for (const threshold of uniqueThresholds) {
    let stderr: string
    try {
      const res = await execFileAsync(ffmpeg, [
        '-ss',
        String(startSearch),
        '-i',
        filePath,
        '-t',
        String(duration),
        '-af',
        `silencedetect=noise=${threshold}dB:d=0.25`,
        '-f',
        'null',
        '-'
      ])
      stderr = res.stderr || ''
    } catch (error: unknown) {
      stderr = error instanceof Error && 'stderr' in error ? String((error as { stderr?: unknown }).stderr) : ''
    }

    const regex = /silence_end:\s*([\d.]+)(?:\s*\|\s*silence_duration:\s*([\d.]+))?/g
    let match: RegExpExecArray | null
    let closestSilence = -1
    let minDistance = Infinity

    while ((match = regex.exec(stderr)) !== null) {
      const relEnd = parseFloat(match[1])
      const dur = match[2] ? parseFloat(match[2]) : 0
      const relCenter = relEnd - (dur / 2)
      const absTime = startSearch + relCenter
      const distance = Math.abs(absTime - targetSeconds)
      if (distance < minDistance) {
        minDistance = distance
        closestSilence = absTime
      }
    }

    if (closestSilence !== -1) {
      return closestSilence
    }
  }

  // Fallback: se non trova nessun silenzio idoneo, taglia al target desiderato
  return targetSeconds
}

/**
 * Pianifica i tagli ottimali in modo da avere chunk di circa 'targetChunkMinutes'.
 */
export async function planSmartChunks(
  filePath: string,
  totalDuration: number,
  targetChunkMinutes: number = 15,
  overlapSeconds: number = 2
): Promise<ChunkBoundary[]> {
  const targetChunkSeconds = targetChunkMinutes * 60
  const numChunks = Math.max(1, Math.ceil(totalDuration / targetChunkSeconds))

  if (numChunks === 1) {
    return [{ start: 0, end: totalDuration }]
  }

  const idealChunkDuration = totalDuration / numChunks
  const boundaries: ChunkBoundary[] = []

  // Rileva il rumore medio della registrazione per impostare la soglia di silenzio ottimale
  let adaptiveNoiseDb = -34
  try {
    const meanVol = await measureAudioMeanVolume(filePath)
    // Silenzio è tipicamente da 3 a 6 dB sotto il volume medio del parlato
    adaptiveNoiseDb = Math.min(-26, Math.max(-48, Math.round(meanVol - 4)))
  } catch {
    // mantieni default
  }

  let currentStart = 0
  for (let i = 1; i < numChunks; i++) {
    const idealEnd = i * idealChunkDuration
    // Cerchiamo il silenzio più vicino alla fine ideale (cerchiamo in +/- 60s)
    const smartEnd = await findSilenceNear(filePath, idealEnd, 60, adaptiveNoiseDb)

    boundaries.push({
      start: currentStart,
      end: smartEnd
    })

    // Il prossimo chunk inizia poco prima della fine del precedente (overlap)
    currentStart = Math.max(0, smartEnd - overlapSeconds)
  }

  // Aggiungi l'ultimo chunk
  boundaries.push({
    start: currentStart,
    end: totalDuration
  })

  return boundaries
}

/**
 * Esporta un chunk WAV PCM mono 16kHz garantendo durata esatta.
 */
export async function extractChunkWav(
  inputPath: string,
  outputPath: string,
  start: number,
  end: number
): Promise<void> {
  const ffmpeg = getFfmpegPath()
  const duration = Math.max(0.1, end - start)
  try {
    await execFileAsync(ffmpeg, [
      '-ss',
      String(start),
      '-i',
      inputPath,
      '-t',
      String(duration),
      '-ac',
      '1',
      '-ar',
      '16000',
      '-c:a',
      'pcm_s16le',
      '-y',
      outputPath
    ])
  } catch (error: unknown) {
    throw new Error(`Errore durante l'estrazione del chunk: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
}
