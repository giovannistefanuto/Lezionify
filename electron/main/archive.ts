import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile
} from 'node:fs/promises'
import * as path from 'node:path'
import { app, dialog } from 'electron'
import type {
  AppSettings,
  GenerationResult,
  ImportSummary,
  Lecture,
  SkippedImport,
  TestApiKeyResult,
  UpdateLecturePayload
} from '../../shared/archive'
import { GeminiService } from './gemini'
import { SettingsService } from './settings'

const AUDIO_EXTENSION = '.mp3'
const LIBRARY_VERSION = 1
export const FILE_NAME_PATTERN = /^(?:(?<course>[\p{L}\p{N}_-]+)\s+)?(?<year>\d{4})-(?<month>\d{2})(?<day>\d{2})-(?<hour>\d{2})-(?<minute>\d{2})-(?<second>\d{2})$/u

export interface LibraryFile {
  version: number
  lectures: Lecture[]
}

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

export class ArchiveService {
  private readonly rootDirectory: string
  private readonly audioDirectory: string
  private readonly transcriptDirectory: string
  private readonly markdownDirectory: string
  private readonly libraryPath: string
  private readonly settingsService: SettingsService
  private readonly geminiService: GeminiService

  constructor(customRootDirectory?: string, customGeminiService?: GeminiService) {
    this.rootDirectory =
      customRootDirectory ??
      (app && typeof app.getPath === 'function'
        ? path.join(app.getPath('userData'), 'library')
        : path.join(process.cwd(), '.library-data'))
    this.audioDirectory = path.join(this.rootDirectory, 'audio')
    this.transcriptDirectory = path.join(this.rootDirectory, 'transcripts')
    this.markdownDirectory = path.join(this.rootDirectory, 'markdown')
    this.libraryPath = path.join(this.rootDirectory, 'library.json')
    this.settingsService = new SettingsService(this.rootDirectory)
    this.geminiService = customGeminiService ?? new GeminiService()
  }

  async initialize(): Promise<void> {
    await Promise.all([
      mkdir(this.audioDirectory, { recursive: true }),
      mkdir(this.transcriptDirectory, { recursive: true }),
      mkdir(this.markdownDirectory, { recursive: true })
    ])
    try {
      await stat(this.libraryPath)
    } catch {
      await this.writeLibrary({ version: LIBRARY_VERSION, lectures: [] })
    }
  }

  async listLectures(): Promise<Lecture[]> {
    const library = await this.readLibrary()
    return [...library.lectures].sort((first, second) => {
      const firstDate = first.recordedAt ?? first.importedAt
      const secondDate = second.recordedAt ?? second.importedAt
      return secondDate.localeCompare(firstDate)
    })
  }

  async selectAndImportFiles(): Promise<ImportSummary | null> {
    const selection = await dialog.showOpenDialog({
      title: 'Importa file audio',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio MP3', extensions: ['mp3'] }]
    })
    if (selection.canceled) return null
    return this.importFiles(selection.filePaths)
  }

  async selectAndImportFolder(): Promise<ImportSummary | null> {
    const selection = await dialog.showOpenDialog({
      title: 'Scegli la cartella del registratore',
      properties: ['openDirectory']
    })
    if (selection.canceled || selection.filePaths.length === 0) return null

    const directory = selection.filePaths[0]
    const entries = await readdir(directory, { withFileTypes: true })
    const audioFiles = entries
      .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === AUDIO_EXTENSION)
      .map((entry) => path.join(directory, entry.name))
    return this.importFiles(audioFiles)
  }

  async readTranscript(id: string): Promise<string | null> {
    const library = await this.readLibrary()
    const lecture = library.lectures.find((item) => item.id === id)
    if (!lecture || !lecture.transcriptFileName) return null

    const transcriptPath = path.join(this.transcriptDirectory, lecture.transcriptFileName)
    try {
      return await readFile(transcriptPath, 'utf8')
    } catch {
      return null
    }
  }

  async attachTranscript(id: string): Promise<Lecture | null> {
    const selection = await dialog.showOpenDialog({
      title: 'Seleziona trascrizione TXT',
      properties: ['openFile'],
      filters: [{ name: 'Trascrizione TXT', extensions: ['txt'] }]
    })
    if (selection.canceled || selection.filePaths.length === 0) return null
    return this.attachTranscriptFromFile(id, selection.filePaths[0])
  }

  async attachTranscriptFromFile(id: string, sourcePath: string): Promise<Lecture> {
    const library = await this.readLibrary()
    const lectureIndex = library.lectures.findIndex((item) => item.id === id)
    if (lectureIndex === -1) throw new Error('Lezione non trovata.')

    const transcriptFileName = `${id}.txt`
    await copyFile(sourcePath, path.join(this.transcriptDirectory, transcriptFileName))

    const lecture = library.lectures[lectureIndex]
    const updatedLecture: Lecture = {
      ...lecture,
      sourceTranscriptFileName: path.basename(sourcePath),
      transcriptFileName,
      status: 'transcript-available'
    }
    library.lectures[lectureIndex] = updatedLecture
    await this.writeLibrary(library)
    return updatedLecture
  }

  async readMarkdown(id: string): Promise<string | null> {
    const library = await this.readLibrary()
    const lecture = library.lectures.find((item) => item.id === id)
    if (!lecture || !lecture.markdownFileName) return null

    const markdownPath = path.join(this.markdownDirectory, lecture.markdownFileName)
    try {
      return await readFile(markdownPath, 'utf8')
    } catch {
      return null
    }
  }

  async saveMarkdown(id: string, content: string): Promise<void> {
    const library = await this.readLibrary()
    const lectureIndex = library.lectures.findIndex((item) => item.id === id)
    if (lectureIndex === -1) throw new Error('Lezione non trovata.')

    const markdownFileName = `${id}.md`
    const markdownPath = path.join(this.markdownDirectory, markdownFileName)
    await writeFile(markdownPath, content, 'utf8')

    const lecture = library.lectures[lectureIndex]
    library.lectures[lectureIndex] = {
      ...lecture,
      markdownFileName
    }
    await this.writeLibrary(library)
  }

  async updateLecture(id: string, updates: UpdateLecturePayload): Promise<Lecture> {
    const library = await this.readLibrary()
    const lectureIndex = library.lectures.findIndex((item) => item.id === id)
    if (lectureIndex === -1) throw new Error('Lezione non trovata.')

    const lecture = library.lectures[lectureIndex]
    const updatedLecture: Lecture = {
      ...lecture,
      courseCode: updates.courseCode !== undefined ? (updates.courseCode?.trim() || null) : lecture.courseCode,
      recordedAt: updates.recordedAt !== undefined ? (updates.recordedAt?.trim() || null) : lecture.recordedAt,
      studyStatus: updates.studyStatus !== undefined ? updates.studyStatus : lecture.studyStatus
    }
    library.lectures[lectureIndex] = updatedLecture
    await this.writeLibrary(library)
    return updatedLecture
  }

  async deleteLecture(id: string): Promise<boolean> {
    const library = await this.readLibrary()
    const lecture = library.lectures.find((item) => item.id === id)
    if (!lecture) return false

    const audioPath = path.join(this.audioDirectory, lecture.audioFileName)
    try {
      await unlink(audioPath)
    } catch {
      // Ignora se non esiste
    }

    if (lecture.transcriptFileName) {
      const transcriptPath = path.join(this.transcriptDirectory, lecture.transcriptFileName)
      try {
        await unlink(transcriptPath)
      } catch {
        // Ignora se non esiste
      }
    }

    if (lecture.markdownFileName) {
      const markdownPath = path.join(this.markdownDirectory, lecture.markdownFileName)
      try {
        await unlink(markdownPath)
      } catch {
        // Ignora se non esiste
      }
    }

    library.lectures = library.lectures.filter((item) => item.id !== id)
    await this.writeLibrary(library)
    return true
  }

  async getAudioFilePath(id: string): Promise<string | null> {
    const library = await this.readLibrary()
    const lecture = library.lectures.find((item) => item.id === id)
    if (!lecture) return null
    const audioPath = path.join(this.audioDirectory, lecture.audioFileName)
    try {
      await stat(audioPath)
      return audioPath
    } catch {
      return null
    }
  }

  async searchFullText(query: string): Promise<string[]> {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return []

    const library = await this.readLibrary()
    const matchingIds: string[] = []

    for (const lecture of library.lectures) {
      const matchMeta =
        lecture.sourceAudioFileName.toLowerCase().includes(trimmed) ||
        (lecture.courseCode && lecture.courseCode.toLowerCase().includes(trimmed)) ||
        (lecture.recordedAt && lecture.recordedAt.toLowerCase().includes(trimmed)) ||
        (lecture.sourceTranscriptFileName && lecture.sourceTranscriptFileName.toLowerCase().includes(trimmed))

      if (matchMeta) {
        matchingIds.push(lecture.id)
        continue
      }

      if (lecture.transcriptFileName) {
        try {
          const transcriptContent = await readFile(
            path.join(this.transcriptDirectory, lecture.transcriptFileName),
            'utf8'
          )
          if (transcriptContent.toLowerCase().includes(trimmed)) {
            matchingIds.push(lecture.id)
            continue
          }
        } catch {
          // Ignora errori di lettura
        }
      }

      if (lecture.markdownFileName) {
        try {
          const mdContent = await readFile(
            path.join(this.markdownDirectory, lecture.markdownFileName),
            'utf8'
          )
          if (mdContent.toLowerCase().includes(trimmed)) {
            matchingIds.push(lecture.id)
            continue
          }
        } catch {
          // Ignora errori di lettura
        }
      }
    }

    return matchingIds
  }

  async getSettings(): Promise<AppSettings> {
    return this.settingsService.getSettings()
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    return this.settingsService.saveSettings(settings)
  }

  async testApiKey(apiKey: string): Promise<TestApiKeyResult> {
    return this.geminiService.testApiKey(apiKey)
  }

  async generateLectureNotes(id: string): Promise<GenerationResult> {
    const library = await this.readLibrary()
    const lecture = library.lectures.find((item) => item.id === id)
    if (!lecture) {
      return { success: false, error: 'Lezione non trovata.' }
    }

    if (!lecture.transcriptFileName) {
      return {
        success: false,
        error: 'Questa lezione non ha una trascrizione associata. Associa prima un file TXT.'
      }
    }

    const transcript = await this.readTranscript(id)
    if (!transcript || !transcript.trim()) {
      return { success: false, error: 'Il file di trascrizione è vuoto.' }
    }

    const settings = await this.settingsService.getSettings()
    if (!settings.apiKey || !settings.apiKey.trim()) {
      return {
        success: false,
        error: 'Chiave API Gemini non impostata. Inseriscila nelle Impostazioni (⚙️).'
      }
    }

    try {
      const generatedMarkdown = await this.geminiService.generateLectureNotes({
        apiKey: settings.apiKey,
        model: settings.model,
        transcript,
        courseCode: lecture.courseCode,
        recordedAt: lecture.recordedAt,
        sourceAudioFileName: lecture.sourceAudioFileName
      })

      await this.saveMarkdown(id, generatedMarkdown)
      return { success: true, markdown: generatedMarkdown }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Errore durante la generazione della dispensa.'
      return { success: false, error: msg }
    }
  }

  async importFiles(filePaths: string[]): Promise<ImportSummary> {
    const library = await this.readLibrary()
    const imported: Lecture[] = []
    const skipped: SkippedImport[] = []

    for (const sourcePath of filePaths) {
      const sourceFileName = path.basename(sourcePath)
      if (path.extname(sourcePath).toLowerCase() !== AUDIO_EXTENSION) {
        skipped.push({ sourceFileName, reason: 'Sono supportati solo file MP3.' })
        continue
      }

      try {
        const checksum = await fileChecksum(sourcePath)
        if (library.lectures.some((lecture) => lecture.checksum === checksum)) {
          skipped.push({ sourceFileName, reason: 'Audio gia presente nell’archivio.' })
          continue
        }

        const fileStats = await stat(sourcePath)
        const id = randomUUID()
        const parsed = parseFileName(sourceFileName)
        const audioFileName = `${id}${AUDIO_EXTENSION}`
        await copyFile(sourcePath, path.join(this.audioDirectory, audioFileName))

        const transcriptSourcePath = path.join(
          path.dirname(sourcePath),
          `${path.basename(sourcePath, path.extname(sourcePath))}.txt`
        )
        const transcriptFileName = await this.copyTranscriptIfPresent(id, transcriptSourcePath)
        const lecture: Lecture = {
          id,
          courseCode: parsed?.courseCode ?? null,
          recordedAt: parsed?.recordedAt ?? null,
          sourceAudioFileName: sourceFileName,
          sourceTranscriptFileName: transcriptFileName ? path.basename(transcriptSourcePath) : null,
          audioFileName,
          transcriptFileName,
          markdownFileName: null,
          byteSize: fileStats.size,
          checksum,
          importedAt: new Date().toISOString(),
          status: transcriptFileName ? 'transcript-available' : 'audio-only',
          studyStatus: 'da-studiare'
        }
        library.lectures.push(lecture)
        imported.push(lecture)
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Errore sconosciuto durante l’importazione.'
        skipped.push({ sourceFileName, reason })
      }
    }

    if (imported.length > 0) await this.writeLibrary(library)
    return { imported, skipped }
  }

  private async copyTranscriptIfPresent(id: string, sourcePath: string): Promise<string | null> {
    try {
      const sourceStats = await stat(sourcePath)
      if (!sourceStats.isFile()) return null
      const transcriptFileName = `${id}.txt`
      await copyFile(sourcePath, path.join(this.transcriptDirectory, transcriptFileName))
      return transcriptFileName
    } catch {
      return null
    }
  }

  private async readLibrary(): Promise<LibraryFile> {
    const rawLibrary = await readFile(this.libraryPath, 'utf8')
    const parsedLibrary: unknown = JSON.parse(rawLibrary)
    if (!this.isLibraryFile(parsedLibrary)) {
      throw new Error('L’archivio locale ha un formato non valido.')
    }

    const normalizedLectures = parsedLibrary.lectures.map((lecture) => ({
      ...lecture,
      studyStatus: lecture.studyStatus ?? 'da-studiare',
      markdownFileName: lecture.markdownFileName ?? null
    }))

    return {
      version: parsedLibrary.version,
      lectures: normalizedLectures
    }
  }

  private isLibraryFile(value: unknown): value is LibraryFile {
    return (
      typeof value === 'object' &&
      value !== null &&
      'version' in value &&
      'lectures' in value &&
      typeof value.version === 'number' &&
      Array.isArray(value.lectures)
    )
  }

  private async writeLibrary(library: LibraryFile): Promise<void> {
    const temporaryPath = `${this.libraryPath}.tmp`
    await writeFile(temporaryPath, `${JSON.stringify(library, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, this.libraryPath)
  }
}
