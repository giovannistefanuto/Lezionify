/**
 * aiJobStore.ts
 * Gestione locale e atomica dei checkpoint per ripresa granulare dei job Gemini (Fase D).
 * Memorizza lo stato intermedio di sezioni, overview, note d'esame e chunk audio in library/ai-jobs/.
 */

import { atomicWrite, readRecoverable } from '../atomicFile'
import { mkdir, stat, unlink } from 'node:fs/promises'
import * as path from 'node:path'
import { createHash } from 'node:crypto'
import type { ArchivePipelineStatus } from '../../../shared/archive'

export interface NotesSectionCheckpoint {
  index: number
  title: string
  transcript: string
  note: string
  completedAt: string
}

export interface ASRChunkCheckpoint {
  index: number
  start: number
  end: number
  status: 'transcribed' | 'no_speech' | 'needs_review' | 'failed'
  text: string
  modelUsed?: string
  completedAt: string
}

export interface LectureNotesCheckpoint {
  lectureId: string
  sourceTextHash: string
  model: string
  totalSections?: number
  cuts?: Array<{ macroargomento: string; fineParte: string; inizioParteSuccessiva: string }>
  overview?: { title: string; overview: string }
  examNotes?: string | null
  sections: Record<number, string>
  status: 'in_progress' | 'completed' | 'failed'
  updatedAt: string
}

export interface AsrChunkRecord {
  startSec: number
  endSec: number
  text: string
  status: 'transcribed' | 'no_speech' | 'needs_review' | 'failed'
  method: 'asr' | 'fallback'
}

export interface AsrJobCheckpoint {
  lectureId: string
  audioChecksum: string
  totalChunks: number
  chunks: Record<number, AsrChunkRecord>
  status: 'in_progress' | 'completed' | 'failed'
  updatedAt: string
}

export interface AiJobCheckpoint {
  version: 1
  jobId: string
  lectureId: string
  purpose: 'lecture_notes' | 'transcription'
  sourceHash: string
  status: 'in_progress' | 'completed' | 'failed'
  updatedAt: string
  // Campi specifici per dispense
  overview?: {
    title: string
    overview: string
  }
  examNotes?: string | null
  cuts?: Array<{ macroargomento: string; fineParte: string; inizioParteSuccessiva: string }>
  sections?: NotesSectionCheckpoint[]
  logistics?: string | null
  // Campi specifici per trascrizione
  asrChunks?: ASRChunkCheckpoint[]
  lastError?: string
}

export function computeSourceHash(sourceContent: string): string {
  return createHash('sha256').update(sourceContent).digest('hex')
}

export class AiJobStore {
  readonly jobsDirectory: string

  constructor(rootDirectory: string) {
    this.jobsDirectory = path.join(rootDirectory, 'ai-jobs')
  }

  computeSourceHash(sourceContent: string): string {
    return computeSourceHash(sourceContent)
  }

  async initialize(): Promise<void> {
    await mkdir(this.jobsDirectory, { recursive: true })
  }

  private getFilePath(lectureId: string, purpose: string): string {
    const safePurpose = purpose.replace(/[^a-z0-9_-]/gi, '_')
    return path.join(this.jobsDirectory, `${lectureId}.${safePurpose}.json`)
  }

  private getArchivePipelineFilePath(): string {
    return path.join(this.jobsDirectory, 'archive-pipeline.json')
  }

  async saveCheckpoint(checkpoint: AiJobCheckpoint): Promise<void> {
    await this.initialize()
    const filePath = this.getFilePath(checkpoint.lectureId, checkpoint.purpose)
    checkpoint.updatedAt = new Date().toISOString()
    await atomicWrite(filePath, JSON.stringify(checkpoint, null, 2))
  }

  async loadCheckpoint(
    lectureId: string,
    purpose: 'lecture_notes' | 'transcription',
    expectedSourceHash?: string
  ): Promise<AiJobCheckpoint | null> {
    const filePath = this.getFilePath(lectureId, purpose)
    try {
      const exists = await stat(filePath).then((s) => s.isFile()).catch(() => false)
      if (!exists) return null

      const raw = await readRecoverable(filePath)
      const parsed = JSON.parse(raw) as AiJobCheckpoint
      if (!parsed || parsed.version !== 1) return null

      // Se la sorgente è cambiata rispetto al checkpoint salvato, il checkpoint non è più valido!
      if (expectedSourceHash && parsed.sourceHash !== expectedSourceHash) {
        return null
      }

      return parsed
    } catch {
      return null
    }
  }

  async saveLectureNotesCheckpoint(checkpoint: LectureNotesCheckpoint): Promise<void> {
    await this.initialize()
    const filePath = this.getFilePath(checkpoint.lectureId, 'lecture_notes')
    checkpoint.updatedAt = new Date().toISOString()
    await atomicWrite(filePath, JSON.stringify(checkpoint, null, 2))
  }

  async loadLectureNotesCheckpoint(lectureId: string): Promise<LectureNotesCheckpoint | null> {
    const filePath = this.getFilePath(lectureId, 'lecture_notes')
    try {
      const exists = await stat(filePath).then((s) => s.isFile()).catch(() => false)
      if (!exists) return null
      const raw = await readRecoverable(filePath)
      return JSON.parse(raw) as LectureNotesCheckpoint
    } catch {
      return null
    }
  }

  async saveAsrCheckpoint(checkpoint: AsrJobCheckpoint): Promise<void> {
    await this.initialize()
    const filePath = this.getFilePath(checkpoint.lectureId, 'transcription')
    checkpoint.updatedAt = new Date().toISOString()
    await atomicWrite(filePath, JSON.stringify(checkpoint, null, 2))
  }

  async loadAsrCheckpoint(lectureId: string): Promise<AsrJobCheckpoint | null> {
    const filePath = this.getFilePath(lectureId, 'transcription')
    try {
      const exists = await stat(filePath).then((s) => s.isFile()).catch(() => false)
      if (!exists) return null
      const raw = await readRecoverable(filePath)
      return JSON.parse(raw) as AsrJobCheckpoint
    } catch {
      return null
    }
  }

  /**
   * Salva lo stato di alto livello della pipeline. I checkpoint granulari
   * restano nei file per lezione e consentono di riprendere senza rifare
   * chunk ASR o sezioni già completate.
   */
  async saveArchivePipelineState(
    state: ArchivePipelineStatus
  ): Promise<void> {
    await this.initialize()
    const nextState: ArchivePipelineStatus = {
      ...state,
      updatedAt: new Date().toISOString()
    }
    await atomicWrite(
      this.getArchivePipelineFilePath(),
      JSON.stringify(nextState, null, 2)
    )
  }

  async loadArchivePipelineState(): Promise<ArchivePipelineStatus | null> {
    const filePath = this.getArchivePipelineFilePath()
    try {
      const exists = await stat(filePath)
        .then((value) => value.isFile())
        .catch(() => false)
      if (!exists) return null
      const raw = await readRecoverable(filePath)
      const parsed = JSON.parse(raw) as ArchivePipelineStatus
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.tasks)) {
        return null
      }
      return parsed
    } catch {
      return null
    }
  }

  async deleteArchivePipelineState(): Promise<void> {
    await unlink(this.getArchivePipelineFilePath()).catch(() => {})
  }

  async deleteCheckpoint(
    lectureId: string,
    purpose: 'lecture_notes' | 'transcription'
  ): Promise<void> {
    const filePath = this.getFilePath(lectureId, purpose)
    await unlink(filePath).catch(() => {})
  }

  async deleteLectureNotesCheckpoint(lectureId: string): Promise<void> {
    await this.deleteCheckpoint(lectureId, 'lecture_notes')
  }

  async deleteAsrCheckpoint(lectureId: string): Promise<void> {
    await this.deleteCheckpoint(lectureId, 'transcription')
  }

  async deleteForLecture(lectureId: string): Promise<void> {
    await this.deleteLectureNotesCheckpoint(lectureId)
    await this.deleteAsrCheckpoint(lectureId)
  }
}
