import { atomicWrite as writeFile, readRecoverable } from './atomicFile'
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  unlink
} from 'node:fs/promises'
import * as path from 'node:path'

import type {
  Lecture,
  LectureStudySet,
  StudySession,
  ScratchpadData,
  LectureHighlight,
  Reminder
} from '../../shared/archive'

export interface StagedFiles {
  directory: string
  files: Array<{ original: string; staged: string }>
}

export class FileStorageService {
  readonly rootDirectory: string
  readonly audioDirectory: string
  readonly transcriptDirectory: string
  readonly markdownDirectory: string
  readonly courseInfoDirectory: string
  readonly studySetsDirectory: string
  readonly qnaDirectory: string
  readonly highlightsDirectory: string
  readonly studySessionsPath: string
  readonly scratchpadPath: string
  readonly remindersPath: string

  constructor(rootDirectory: string) {
    this.rootDirectory = rootDirectory
    this.audioDirectory = path.join(this.rootDirectory, 'audio')
    this.transcriptDirectory = path.join(this.rootDirectory, 'transcripts')
    this.markdownDirectory = path.join(this.rootDirectory, 'markdown')
    this.courseInfoDirectory = path.join(this.rootDirectory, 'course_info')
    this.studySetsDirectory = path.join(this.rootDirectory, 'study_sets')
    this.qnaDirectory = path.join(this.rootDirectory, 'qna')
    this.highlightsDirectory = path.join(this.rootDirectory, 'highlights')
    this.studySessionsPath = path.join(
      this.rootDirectory,
      'study_sessions.json'
    )
    this.scratchpadPath = path.join(this.rootDirectory, 'scratchpad.json')
    this.remindersPath = path.join(this.rootDirectory, 'reminders.json')
  }

  async initialize(): Promise<void> {
    await Promise.all([
      mkdir(this.rootDirectory, { recursive: true }),
      mkdir(this.audioDirectory, { recursive: true }),
      mkdir(this.transcriptDirectory, { recursive: true }),
      mkdir(this.markdownDirectory, { recursive: true }),
      mkdir(this.courseInfoDirectory, { recursive: true }),
      mkdir(this.studySetsDirectory, { recursive: true }),
      mkdir(this.qnaDirectory, { recursive: true }),
      mkdir(this.highlightsDirectory, { recursive: true })
    ])
  }

  async readTranscript(fileName: string): Promise<string | null> {
    const transcriptPath = path.join(this.transcriptDirectory, fileName)
    try {
      return await readFile(transcriptPath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return null
    }
  }

  async writeTranscript(fileName: string, content: string): Promise<void> {
    const transcriptPath = path.join(this.transcriptDirectory, fileName)
    await writeFile(transcriptPath, content, 'utf8')
  }

  async copyTranscript(
    sourcePath: string,
    targetFileName: string
  ): Promise<void> {
    const targetPath = path.join(this.transcriptDirectory, targetFileName)
    await writeFile(targetPath, await readFile(sourcePath, 'utf8'))
  }

  async readMarkdown(fileName: string): Promise<string | null> {
    const markdownPath = path.join(this.markdownDirectory, fileName)
    try {
      return await readFile(markdownPath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return null
    }
  }

  async writeMarkdown(fileName: string, content: string): Promise<void> {
    const markdownPath = path.join(this.markdownDirectory, fileName)
    await writeFile(markdownPath, content, 'utf8')
  }

  async readMarkdownEn(fileName: string): Promise<string | null> {
    const enFileName = fileName.replace(/\.md$/, '_en.md')
    const markdownPath = path.join(this.markdownDirectory, enFileName)
    try {
      return await readFile(markdownPath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return null
    }
  }

  async writeMarkdownEn(fileName: string, content: string): Promise<void> {
    const enFileName = fileName.replace(/\.md$/, '_en.md')
    const markdownPath = path.join(this.markdownDirectory, enFileName)
    await writeFile(markdownPath, content, 'utf8')
  }

  async writeTranslationAttempt(fileName: string, raw: string, preview: string | null): Promise<void> {
    const base = fileName.replace(/\.md$/, '_en_tentativo')
    // Keep the provider response verbatim, including malformed or duplicate JSON keys.
    await writeFile(path.join(this.markdownDirectory, `${base}.txt`), raw, 'utf8')
    await writeFile(path.join(this.markdownDirectory, `${base}.md`),
      `> **Tentativo inglese non validato.** Controllare completezza e struttura prima dell'uso.\n\n${preview ?? 'Risposta non ricostruibile: consultare il file .txt associato.'}\n`, 'utf8')
  }

  async deleteMarkdownEn(fileName: string): Promise<void> {
    const enFileName = fileName.replace(/\.md$/, '_en.md')
    const markdownPath = path.join(this.markdownDirectory, enFileName)
    try {
      await unlink(markdownPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  async getAudioFilePath(fileName: string): Promise<string | null> {
    const audioPath = path.join(this.audioDirectory, fileName)
    try {
      await stat(audioPath)
      return audioPath
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return null
    }
  }

  async deleteAudio(fileName: string): Promise<void> {
    const audioPath = path.join(this.audioDirectory, fileName)
    try {
      await unlink(audioPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  async deleteTranscript(fileName: string): Promise<void> {
    const transcriptPath = path.join(this.transcriptDirectory, fileName)
    try {
      await unlink(transcriptPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  async deleteMarkdown(fileName: string): Promise<void> {
    const markdownPath = path.join(this.markdownDirectory, fileName)
    try {
      await unlink(markdownPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  async stageLectureFiles(lecture: Lecture): Promise<StagedFiles> {
    const directory = path.join(
      this.rootDirectory,
      '.trash',
      `lecture-${lecture.id}-${Date.now()}`
    )
    const candidates = [
      path.join(this.audioDirectory, lecture.audioFileName),
      lecture.transcriptFileName
        ? path.join(this.transcriptDirectory, lecture.transcriptFileName)
        : null,
      lecture.markdownFileName
        ? path.join(this.markdownDirectory, lecture.markdownFileName)
        : null,
      lecture.markdownFileName
        ? path.join(
            this.markdownDirectory,
            lecture.markdownFileName.replace(/\.md$/, '_en.md')
          )
        : null,
      ...(['md', 'txt'] as const).map(ext => lecture.markdownFileName
        ? path.join(this.markdownDirectory, lecture.markdownFileName.replace(/\.md$/, `_en_tentativo.${ext}`))
        : null),
      path.join(this.studySetsDirectory, `${lecture.id}.json`),
      path.join(this.qnaDirectory, `${lecture.id}.json`),
      path.join(this.highlightsDirectory, `${lecture.id}.json`),
      path.join(this.highlightsDirectory, `${lecture.id}_en.json`)
    ].filter((value): value is string => Boolean(value))
    const files: StagedFiles['files'] = []
    await mkdir(directory, { recursive: true })
    try {
      for (const original of candidates.flatMap((file) => [
        file,
        `${file}.bak`
      ])) {
        const relative = path.relative(this.rootDirectory, original)
        const staged = path.join(directory, relative)
        try {
          await mkdir(path.dirname(staged), { recursive: true })
          await rename(original, staged)
          files.push({ original, staged })
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
      }
      return { directory, files }
    } catch (error) {
      await this.restoreStagedFiles({ directory, files })
      throw error
    }
  }

  async restoreStagedFiles(staging: StagedFiles): Promise<void> {
    for (const item of [...staging.files].reverse()) {
      await mkdir(path.dirname(item.original), { recursive: true })
      await rename(item.staged, item.original)
    }
    await rm(staging.directory, { recursive: true, force: true })
  }

  async purgeStagedFiles(staging: StagedFiles): Promise<void> {
    await rm(staging.directory, { recursive: true, force: true })
  }

  async readCourseInfo(courseCode: string): Promise<string | null> {
    try {
      return await readRecoverable(this.courseInfoPath(courseCode))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      try {
        return await readRecoverable(this.legacyCourseInfoPath(courseCode))
      } catch (legacyError) {
        if ((legacyError as NodeJS.ErrnoException).code !== 'ENOENT')
          throw legacyError
        return null
      }
    }
  }

  async writeCourseInfo(courseCode: string, content: string): Promise<void> {
    await writeFile(this.courseInfoPath(courseCode), content, 'utf8')
  }

  async deleteCourseInfo(courseCode: string): Promise<void> {
    try {
      await unlink(this.courseInfoPath(courseCode))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  private courseInfoPath(courseCode: string): string {
    return path.join(
      this.courseInfoDirectory,
      `course-${Buffer.from(courseCode.trim(), 'utf8').toString('base64url')}.md`
    )
  }

  private legacyCourseInfoPath(courseCode: string): string {
    const safeName = courseCode.replace(/[^a-zA-Z0-9_-]/g, '_')
    return path.join(this.courseInfoDirectory, `${safeName}.md`)
  }

  async renameOrMergeCourseInfo(
    oldCode: string,
    newCode: string
  ): Promise<void> {
    if (oldCode.trim() === newCode.trim()) return
    const oldContent = await this.readCourseInfo(oldCode)
    if (!oldContent) return

    const existingNewContent = await this.readCourseInfo(newCode)
    if (existingNewContent) {
      // Merge: accoda le vecchie informazioni se non già presenti
      const merged = `${existingNewContent.trim()}\n\n---\n\n## Note Importate da "${oldCode}":\n\n${oldContent.trim()}`
      await this.writeCourseInfo(newCode, merged)
    } else {
      await this.writeCourseInfo(newCode, oldContent)
    }
    await this.deleteCourseInfo(oldCode)
    const oldLegacy = this.legacyCourseInfoPath(oldCode)
    const newLegacy = this.legacyCourseInfoPath(newCode)
    if (oldLegacy !== newLegacy) {
      await unlink(oldLegacy).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error
      })
    }
  }

  async listAudioFiles(): Promise<string[]> {
    try {
      return await readdir(this.audioDirectory)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return []
    }
  }

  async listTranscriptFiles(): Promise<string[]> {
    try {
      return await readdir(this.transcriptDirectory)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return []
    }
  }

  async readStudySet(lectureId: string): Promise<LectureStudySet | null> {
    const targetFile = lectureId.endsWith('.json')
      ? lectureId
      : `${lectureId}.json`
    const studySetPath = path.join(this.studySetsDirectory, targetFile)
    try {
      const raw = await readRecoverable(studySetPath)
      return JSON.parse(raw) as LectureStudySet
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return null
    }
  }

  async writeStudySet(lectureId: string, data: LectureStudySet): Promise<void> {
    const targetFile = lectureId.endsWith('.json')
      ? lectureId
      : `${lectureId}.json`
    const studySetPath = path.join(this.studySetsDirectory, targetFile)
    await writeFile(studySetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  }

  async deleteStudySet(fileNameOrId: string): Promise<void> {
    const targetFile = fileNameOrId.endsWith('.json')
      ? fileNameOrId
      : `${fileNameOrId}.json`
    const studySetPath = path.join(this.studySetsDirectory, targetFile)
    try {
      await unlink(studySetPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  async readQnaThreads(fileName: string): Promise<string | null> {
    const qnaPath = path.join(this.qnaDirectory, fileName)
    try {
      return await readRecoverable(qnaPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return null
    }
  }

  async writeQnaThreads(fileName: string, content: string): Promise<void> {
    const qnaPath = path.join(this.qnaDirectory, fileName)
    await writeFile(qnaPath, content, 'utf8')
  }

  async readStudySessions(): Promise<StudySession[]> {
    try {
      const raw = await readRecoverable(this.studySessionsPath)
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return []
    }
  }

  async writeStudySessions(sessions: StudySession[]): Promise<void> {
    await writeFile(
      this.studySessionsPath,
      `${JSON.stringify(sessions, null, 2)}\n`,
      'utf8'
    )
  }

  async readScratchpad(): Promise<ScratchpadData> {
    try {
      const raw = await readRecoverable(this.scratchpadPath)
      const parsed = JSON.parse(raw)
      return {
        ...(parsed?.groups !== undefined ? { groups: parsed.groups } : {}),
        ...(parsed?.selectedGroupId !== undefined ? { selectedGroupId: parsed.selectedGroupId } : {}),
        todos: Array.isArray(parsed?.todos) ? parsed.todos : [],
        notes: typeof parsed?.notes === 'string' ? parsed.notes : '',
        updatedAt: parsed?.updatedAt || new Date().toISOString()
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return {
        todos: [],
        notes: '',
        updatedAt: new Date().toISOString()
      }
    }
  }

  async writeScratchpad(data: ScratchpadData): Promise<void> {
    await writeFile(
      this.scratchpadPath,
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8'
    )
  }

  async readReminders(): Promise<Reminder[]> {
    try {
      const raw = await readRecoverable(this.remindersPath)
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return []
    }
  }

  async writeReminders(reminders: Reminder[]): Promise<void> {
    await writeFile(
      this.remindersPath,
      `${JSON.stringify(reminders, null, 2)}\n`,
      'utf8'
    )
  }

  async readHighlights(lectureId: string): Promise<LectureHighlight[]> {
    const targetFile = lectureId.endsWith('.json')
      ? lectureId
      : `${lectureId}.json`
    const filePath = path.join(this.highlightsDirectory, targetFile)
    try {
      const raw = await readRecoverable(filePath)
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return []
    }
  }

  async writeHighlights(
    lectureId: string,
    data: LectureHighlight[]
  ): Promise<void> {
    const targetFile = lectureId.endsWith('.json')
      ? lectureId
      : `${lectureId}.json`
    const filePath = path.join(this.highlightsDirectory, targetFile)
    await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  }

  async deleteHighlights(lectureId: string): Promise<void> {
    const targetFile = lectureId.endsWith('.json')
      ? lectureId
      : `${lectureId}.json`
    const filePath = path.join(this.highlightsDirectory, targetFile)
    try {
      await unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
}
