import { randomUUID } from 'node:crypto'
import type {
  ArchivePipelineStage,
  ArchivePipelineStageSummary,
  ArchivePipelineStartResult,
  ArchivePipelineStatus,
  ArchivePipelineTask,
  Lecture,
  PipelineFailureKind,
  TranscribeAudioResult,
  GenerationResult
} from '../../../shared/archive'
import { AiJobStore } from './aiJobStore'
import { logger } from '../logger'
import { GeminiError } from './geminiErrors'
import { pipelineFailureFromError } from './pipelineFailure'

type PipelineTrigger = 'manual' | 'import'

interface PipelineRunReservation {
  phase: 'preparing' | 'running'
  stopRequested: boolean
  completion: Promise<void>
  resolveCompletion: () => void
}

export interface StartArchivePipelineOptions {
  trigger: PipelineTrigger
  lectureIds?: string[]
  includeTranslation: boolean
}

interface ArchivePipelineOperations {
  canProcessImports?: () => Promise<boolean>
  listLectures: () => Promise<Lecture[]>
  hasConfiguredKey: () => Promise<boolean>
  transcribe: (
    lectureId: string,
    jobId: string
  ) => Promise<TranscribeAudioResult>
  generateNotes: (lectureId: string, jobId: string) => Promise<GenerationResult>
  translate: (lectureId: string, jobId: string) => Promise<GenerationResult>
}

const STAGES: ArchivePipelineStage[] = ['transcription', 'notes', 'translation']

function emptySummary(): ArchivePipelineStageSummary {
  return {
    total: 0,
    pending: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    blocked: 0,
    skipped: 0
  }
}

function emptyStatus(): ArchivePipelineStatus {
  const now = new Date().toISOString()
  return {
    version: 1,
    runId: null,
    trigger: null,
    status: 'idle',
    activeStage: null,
    currentLectureId: null,
    currentLectureTitle: null,
    message: 'Nessuna elaborazione archivio in corso.',
    startedAt: null,
    updatedAt: now,
    completedAt: null,
    stopRequested: false,
    includeTranslation: true,
    tasks: [],
    stageSummaries: {
      transcription: emptySummary(),
      notes: emptySummary(),
      translation: emptySummary()
    }
  }
}

function cloneStatus(status: ArchivePipelineStatus): ArchivePipelineStatus {
  return {
    ...status,
    queuedImportLectureIds: [...(status.queuedImportLectureIds ?? [])],
    tasks: status.tasks.map((task) => ({ ...task })),
    stageSummaries: {
      transcription: { ...status.stageSummaries.transcription },
      notes: { ...status.stageSummaries.notes },
      translation: { ...status.stageSummaries.translation }
    }
  }
}

function titleFor(lecture: Lecture): string {
  return lecture.title || lecture.sourceAudioFileName || lecture.id
}

/** Solo categorie sanitizzate, senza riportare dati o credenziali nel job. */
function classifyFailure(message: string | undefined): PipelineFailureKind {
  const value = (message || '').toLowerCase()
  if (
    /chiave|api key|authentication|unauthenticated|permission|accesso negato|403|401/.test(
      value
    )
  ) {
    return 'authentication'
  }
  if (/quota.*giornal|daily.*quota|resource_exhausted/.test(value)) {
    return 'quota_exhausted'
  }
  if (
    /429|rate.?limit|tropp|limite.*richiest|richiest.*minuto|\brpm\b/.test(
      value
    )
  ) {
    return 'rate_limited'
  }
  if (/network|rete|connessione|fetch|enotfound|econn|offline/.test(value)) {
    return 'network'
  }
  if (
    /503|502|504|500|unavailable|sovraccarico|server|tempo limite|timeout|modello.*non.*disponibile/.test(
      value
    )
  ) {
    return 'provider_unavailable'
  }
  if (/cambiata durante|source.*changed/.test(value)) return 'source_changed'
  if (/non trovata|non trovato/.test(value)) return 'not_found'
  if (/vuot|mancante|non ha una trascrizione/.test(value)) return 'input'
  if (/annullat|interrott/.test(value)) return 'cancelled'
  if (/parametri.*non validi|output.*non valid/.test(value)) return 'input'
  return 'unknown'
}

function isProviderPause(kind: PipelineFailureKind): boolean {
  return (
    kind === 'authentication' ||
    kind === 'quota_exhausted' ||
    kind === 'rate_limited' ||
    kind === 'network' ||
    kind === 'provider_unavailable'
  )
}

function isRetryableOnResume(kind: PipelineFailureKind | undefined): boolean {
  return Boolean(kind && isProviderPause(kind))
}

function resumeFailureKind(
  task: ArchivePipelineTask
): PipelineFailureKind | undefined {
  if (task.failureKind && task.failureKind !== 'unknown')
    return task.failureKind
  // Solo messaggi controllati noti possono riabilitare vecchi errori unknown.
  if (
    /^(Accesso negato: verifica i permessi|Chiave API Gemini non valida|Quota giornaliera del modello|Limite di richieste al minuto|Errore di connessione di rete|Server Google temporaneamente|Tempo limite della richiesta|Il modello richiesto non)/.test(
      task.error ?? ''
    )
  ) {
    return classifyFailure(task.error)
  }
  return task.failureKind
}

/**
 * Orchestratore locale di alto livello. Non implementa rate limit o retry:
 * ogni operazione passa al GeminiRequestManager già condiviso dall'app.
 */
export class ArchivePipeline {
  private readonly pendingImports = new Set<string>()
  private status: ArchivePipelineStatus = emptyStatus()
  private reservation: PipelineRunReservation | null = null
  private onStatus?: (status: ArchivePipelineStatus) => void

  constructor(
    private readonly store: AiJobStore,
    private readonly operations: ArchivePipelineOperations
  ) {}

  setStatusCallback(callback: (status: ArchivePipelineStatus) => void): void {
    this.onStatus = callback
  }

  async initialize(): Promise<void> {
    const loaded = await this.store.loadArchivePipelineState()
    if (!loaded) return

    this.status = loaded
    for (const id of loaded.queuedImportLectureIds ?? []) {
      if (typeof id === 'string') this.pendingImports.add(id)
    }
    if (loaded.status === 'planning' || loaded.status === 'running') {
      this.status = {
        ...loaded,
        status: 'paused',
        activeStage: null,
        currentLectureId: null,
        currentLectureTitle: null,
        stopRequested: false,
        tasks: loaded.tasks.map((task) =>
          task.status === 'running' ? { ...task, status: 'pending' } : task
        ),
        message:
          'Elaborazione interrotta dalla chiusura dell’app. Puoi riprenderla senza rifare il lavoro già salvato.',
        updatedAt: new Date().toISOString()
      }
      this.refreshSummaries()
      await this.persistAndEmit()
      return
    }

    this.refreshSummaries()
    this.emit()
  }

  getStatus(): ArchivePipelineStatus {
    const snapshot = cloneStatus(this.status)
    if (this.reservation?.phase === 'preparing') {
      snapshot.status = 'planning'
      snapshot.stopRequested = this.reservation.stopRequested
      snapshot.message = 'Preparazione dell’elaborazione dell’archivio…'
    }
    return snapshot
  }

  isProcessing(): boolean {
    return this.reservation !== null
  }

  async waitForCompletion(): Promise<void> {
    while (this.reservation) await this.reservation.completion
  }

  async start(
    options: StartArchivePipelineOptions
  ): Promise<ArchivePipelineStartResult> {
    if (options.trigger === 'import' && (this.reservation || this.status.status === 'paused')) {
      for (const id of options.lectureIds ?? []) this.pendingImports.add(id)
      await this.persistAndEmit()
      return { started: false, status: this.getStatus() }
    }
    if (this.reservation) return { started: false, status: this.getStatus() }
    if (this.status.status === 'paused' && this.status.runId) {
      return { started: false, status: this.getStatus() }
    }

    const reservation = this.reserve()
    const previous = cloneStatus(this.status)
    let launched = false
    try {
      const tasks = await this.buildTasks(options)
      if (options.trigger === 'manual' && !options.lectureIds) {
        for (const task of tasks) this.pendingImports.delete(task.lectureId)
      }
      const pendingCount = tasks.filter(
        (task) => task.status === 'pending'
      ).length
      const hasPreflightErrors = tasks.some(
        (task) => task.status === 'failed' || task.status === 'blocked'
      )
      this.status = {
        ...emptyStatus(),
        runId: randomUUID(),
        trigger: options.trigger,
        status:
          pendingCount > 0
            ? 'planning'
            : hasPreflightErrors
              ? 'completed_with_errors'
              : 'completed',
        message:
          pendingCount > 0
            ? 'Preparazione dell’elaborazione dell’archivio…'
            : hasPreflightErrors
              ? 'Elaborazione non avviata: alcuni audio sorgente sono mancanti.'
              : 'Archivio già completo: non ci sono elaborazioni da avviare.',
        startedAt: pendingCount > 0 ? new Date().toISOString() : null,
        completedAt: pendingCount > 0 ? null : new Date().toISOString(),
        includeTranslation: options.includeTranslation,
        stopRequested: reservation.stopRequested,
        tasks
      }
      this.refreshSummaries()

      if (pendingCount > 0 && !(await this.operations.hasConfiguredKey())) {
        if (reservation.stopRequested) {
          await this.finishStopped()
          return { started: false, status: cloneStatus(this.status) }
        }
        this.status.status = 'paused'
        this.status.message =
          'Configura almeno una chiave API Gemini prima di avviare l’elaborazione.'
        await this.persistAndEmit()
        return { started: false, status: cloneStatus(this.status) }
      }

      await this.persistAndEmit()
      if (reservation.stopRequested) {
        await this.finishStopped()
        return { started: false, status: cloneStatus(this.status) }
      }
      if (pendingCount === 0)
        return { started: false, status: cloneStatus(this.status) }
      this.launch(reservation)
      launched = true
      return { started: true, status: cloneStatus(this.status) }
    } catch (error) {
      this.status = previous
      throw error
    } finally {
      if (!launched) this.release(reservation)
    }
  }

  async resume(): Promise<ArchivePipelineStartResult> {
    if (this.reservation) return { started: false, status: this.getStatus() }
    if (this.status.status !== 'paused' || !this.status.runId) {
      return { started: false, status: cloneStatus(this.status) }
    }
    const reservation = this.reserve()
    const previous = cloneStatus(this.status)
    let launched = false
    try {
      if (!(await this.operations.hasConfiguredKey())) {
        if (reservation.stopRequested) {
          await this.finishStopped()
          return { started: false, status: cloneStatus(this.status) }
        }
        this.status.message =
          'Configura almeno una chiave API Gemini prima di riprendere l’elaborazione.'
        await this.persistAndEmit()
        return { started: false, status: cloneStatus(this.status) }
      }

      this.status = {
        ...this.status,
        status: 'planning',
        stopRequested: reservation.stopRequested,
        message: 'Ripresa dell’elaborazione dell’archivio…',
        tasks: this.status.tasks.map((task) =>
          task.status === 'running' ||
          (task.status === 'failed' &&
            isRetryableOnResume(resumeFailureKind(task)))
            ? {
                ...task,
                status: 'pending',
                startedAt: undefined,
                completedAt: undefined,
                error: undefined,
                failureKind: undefined
              }
            : task
        )
      }
      this.refreshSummaries()
      await this.persistAndEmit()
      if (reservation.stopRequested) {
        await this.finishStopped()
        return { started: false, status: cloneStatus(this.status) }
      }
      this.launch(reservation)
      launched = true
      return { started: true, status: cloneStatus(this.status) }
    } catch (error) {
      this.status = previous
      throw error
    } finally {
      if (!launched) this.release(reservation)
    }
  }

  async requestStop(): Promise<ArchivePipelineStatus> {
    if (!this.reservation) return this.getStatus()
    this.reservation.stopRequested = true
    if (this.reservation.phase === 'preparing') return this.getStatus()
    this.status.stopRequested = true
    this.status.message =
      'Interruzione richiesta: l’attività Gemini corrente terminerà prima di fermare la coda.'
    await this.persistAndEmit()
    return this.getStatus()
  }

  private reserve(): PipelineRunReservation {
    let resolveCompletion!: () => void
    const completion = new Promise<void>((resolve) => {
      resolveCompletion = resolve
    })
    const reservation: PipelineRunReservation = {
      phase: 'preparing',
      stopRequested: false,
      completion,
      resolveCompletion
    }
    this.reservation = reservation
    return reservation
  }

  private release(reservation: PipelineRunReservation): void {
    if (this.reservation === reservation) {
      this.reservation = null
      if (this.status.status === 'completed' && !reservation.stopRequested && this.pendingImports.size) {
        // Reserve the handoff synchronously; imports cannot fall into the gap.
        const next = this.reserve()
        void (async () => {
          let ids: string[] = []
          try {
            const allowed = await (this.operations.canProcessImports?.() ?? Promise.resolve(true))
            if (next.stopRequested) { await this.finishStopped(); return }
            if (!allowed) return
            ids = [...this.pendingImports]
            for (const id of ids) this.pendingImports.delete(id)
            this.reservation = null
            await this.start({ trigger: 'import', lectureIds: ids, includeTranslation: true })
            await this.waitForCompletion()
          } catch {
            for (const id of ids) this.pendingImports.add(id)
            this.status.status = 'paused'
            this.status.message = 'Import conservati: impossibile preparare la coda successiva.'
            try { await this.persistAndEmit() } catch { this.emit() }
          }
        })().finally(() => {
          if (this.reservation === next) this.reservation = null
          next.resolveCompletion()
          reservation.resolveCompletion()
        })
        return
      }
    }
    reservation.resolveCompletion()
  }

  private launch(reservation: PipelineRunReservation): void {
    reservation.phase = 'running'
    this.status.stopRequested = reservation.stopRequested
    void this.run()
      .catch(() => {
        // Anche un errore della persistenza finale deve chiudere il ciclo osservabile.
        this.status.status = 'paused'
        this.status.message =
          'Elaborazione sospesa: impossibile salvare lo stato locale. Controlla il disco e riprova.'
        this.emit()
        logger.error(
          'archive-pipeline',
          'Impossibile salvare lo stato finale della pipeline.'
        )
      })
      .finally(() => this.release(reservation))
  }

  private async run(): Promise<void> {
    try {
      for (const stage of STAGES) {
        if (!this.status.includeTranslation && stage === 'translation') continue
        if (this.status.stopRequested) {
          await this.finishStopped()
          return
        }
        await this.runStage(stage)
        if (this.status.status === 'paused' || this.status.stopRequested) {
          if (this.status.stopRequested) await this.finishStopped()
          return
        }
      }

      const hasErrors = this.status.tasks.some(
        (task) => task.status === 'failed' || task.status === 'blocked'
      )
      this.status = {
        ...this.status,
        status: hasErrors ? 'completed_with_errors' : 'completed',
        activeStage: null,
        currentLectureId: null,
        currentLectureTitle: null,
        completedAt: new Date().toISOString(),
        message: hasErrors
          ? 'Elaborazione completata con elementi da riprovare o controllare.'
          : 'Elaborazione completata: archivio aggiornato.'
      }
      await this.persistAndEmit()
      logger.info(
        'archive-pipeline',
        `Pipeline ${this.status.runId} completata (${this.status.status}).`
      )
    } catch {
      this.status = {
        ...this.status,
        status: 'paused',
        activeStage: null,
        currentLectureId: null,
        currentLectureTitle: null,
        message:
          'Pipeline sospesa per un errore locale. Controlla l’archivio e riprova.'
      }
      await this.persistAndEmit()
      logger.error(
        'archive-pipeline',
        `Pipeline ${this.status.runId} sospesa per errore imprevisto.`
      )
    }
  }

  private async finishStopped(): Promise<void> {
    this.status = {
      ...this.status,
      status: 'stopped',
      stopRequested:
        this.reservation?.stopRequested ?? this.status.stopRequested,
      activeStage: null,
      currentLectureId: null,
      currentLectureTitle: null,
      completedAt: new Date().toISOString(),
      message: 'Elaborazione fermata dopo l’attività corrente.'
    }
    await this.persistAndEmit()
  }

  private async runStage(stage: ArchivePipelineStage): Promise<void> {
    const tasks = this.status.tasks.filter((task) => task.stage === stage)
    if (tasks.length === 0) return

    this.status = {
      ...this.status,
      status: 'running',
      activeStage: stage,
      message: this.stageMessage(stage)
    }
    await this.persistAndEmit()

    for (const task of tasks) {
      if (this.status.stopRequested || this.status.status === 'paused') return
      if (task.status !== 'pending') continue

      const lectures = await this.operations.listLectures()
      if (this.status.stopRequested) return
      const lecture = lectures.find(
        (candidate) => candidate.id === task.lectureId
      )
      if (!lecture) {
        await this.completeTask(
          task,
          'failed',
          'Lezione non trovata.',
          'not_found'
        )
        continue
      }
      if (this.isAlreadyComplete(task.stage, lecture)) {
        await this.completeTask(task, 'skipped')
        continue
      }
      if (this.isBlockedByDependency(task)) {
        await this.completeTask(
          task,
          'blocked',
          'Attività precedente della stessa lezione non completata.'
        )
        continue
      }

      task.status = 'running'
      task.startedAt = new Date().toISOString()
      this.status.currentLectureId = lecture.id
      this.status.currentLectureTitle = titleFor(lecture)
      this.status.message = `${this.stageMessage(stage)}: ${titleFor(lecture)}`
      await this.persistAndEmit()
      if (this.status.stopRequested) {
        task.status = 'pending'
        task.startedAt = undefined
        return
      }

      const jobId = `${this.status.runId}:${stage}:${lecture.id}`
      logger.info('archive-pipeline', `${this.stageMessage(stage)}: attività avviata.`, JSON.stringify({ lectureId: lecture.id, jobId, stage }))
      const result = await this.executeTask(stage, lecture.id, jobId)
      if (result.success) {
        await this.completeTask(task, 'succeeded')
        continue
      }

      const message = result.error || 'Operazione non completata.'
      const failureKind = result.failureKind ?? classifyFailure(message)
      await this.completeTask(task, 'failed', message, failureKind)
      if (isProviderPause(failureKind) || failureKind === 'cancelled') {
        this.status = {
          ...this.status,
          status: 'paused',
          activeStage: null,
          currentLectureId: null,
          currentLectureTitle: null,
          message:
            failureKind === 'authentication'
              ? 'Elaborazione sospesa: controlla chiave API, permessi o fatturazione e premi “Riprendi elaborazione”.'
              : failureKind === 'cancelled'
                ? 'Elaborazione annullata. Nessuna nuova attività avviata.'
                : 'Elaborazione sospesa per rete, quota o servizio Gemini. Correggi il problema e premi “Riprendi elaborazione”.'
        }
        await this.persistAndEmit()
        return
      }
    }
  }

  private async executeTask(
    stage: ArchivePipelineStage,
    lectureId: string,
    jobId: string
  ): Promise<TranscribeAudioResult | GenerationResult> {
    try {
      if (stage === 'transcription') {
        return await this.operations.transcribe(lectureId, jobId)
      }
      if (stage === 'notes')
        return await this.operations.generateNotes(lectureId, jobId)
      return await this.operations.translate(lectureId, jobId)
    } catch (error) {
      if (error instanceof GeminiError) return pipelineFailureFromError(error)
      throw error
    }
  }

  private isAlreadyComplete(
    stage: ArchivePipelineStage,
    lecture: Lecture
  ): boolean {
    if (stage === 'transcription') return Boolean(lecture.transcriptFileName)
    if (stage === 'notes') return Boolean(lecture.markdownFileName)
    return Boolean(lecture.markdownEnFileName)
  }

  private isBlockedByDependency(task: ArchivePipelineTask): boolean {
    const dependsOn: ArchivePipelineStage[] =
      task.stage === 'notes'
        ? ['transcription']
        : task.stage === 'translation'
          ? ['transcription', 'notes']
          : []
    return dependsOn.some((stage) => {
      const previous = this.status.tasks.find(
        (candidate) =>
          candidate.lectureId === task.lectureId && candidate.stage === stage
      )
      return Boolean(
        previous &&
        previous.status !== 'succeeded' &&
        previous.status !== 'skipped'
      )
    })
  }

  private async completeTask(
    task: ArchivePipelineTask,
    status: ArchivePipelineTask['status'],
    error?: string,
    failureKind?: PipelineFailureKind
  ): Promise<void> {
    task.status = status
    task.completedAt = new Date().toISOString()
    task.error = error
    task.failureKind = failureKind
    logger[status === 'failed' ? 'warn' : 'info']('archive-pipeline', `${this.stageMessage(task.stage)}: ${status === 'succeeded' ? 'completata' : status === 'skipped' ? 'già disponibile' : status === 'blocked' ? 'bloccata dalla fase precedente' : 'non completata'}.`, JSON.stringify({ lectureId: task.lectureId, stage: task.stage, status, failureKind }))
    this.status.currentLectureId = null
    this.status.currentLectureTitle = null
    await this.persistAndEmit()
  }

  private async buildTasks(
    options: StartArchivePipelineOptions
  ): Promise<ArchivePipelineTask[]> {
    const selectedIds = options.lectureIds ? new Set(options.lectureIds) : null
    const lectures = (await this.operations.listLectures()).filter(
      (lecture) => !selectedIds || selectedIds.has(lecture.id)
    )
    const tasks: ArchivePipelineTask[] = []

    for (const lecture of lectures) {
      const base = {
        lectureId: lecture.id,
        title: titleFor(lecture),
        courseCode: lecture.courseCode
      }
      if (!lecture.transcriptFileName) {
        tasks.push({
          ...base,
          stage: 'transcription',
          status: lecture.missingAudio ? 'failed' : 'pending',
          ...(lecture.missingAudio
            ? {
                completedAt: new Date().toISOString(),
                error: 'File audio originale non presente sul disco.',
                failureKind: 'input' as PipelineFailureKind
              }
            : {})
        })
        tasks.push({
          ...base,
          stage: 'notes',
          status: lecture.missingAudio ? 'blocked' : 'pending',
          ...(lecture.missingAudio
            ? {
                completedAt: new Date().toISOString(),
                error: 'Trascrizione non disponibile.'
              }
            : {})
        })
        if (options.includeTranslation) {
          tasks.push({
            ...base,
            stage: 'translation',
            status: lecture.missingAudio ? 'blocked' : 'pending',
            ...(lecture.missingAudio
              ? {
                  completedAt: new Date().toISOString(),
                  error: 'Dispensa italiana non disponibile.'
                }
              : {})
          })
        }
        continue
      }

      if (!lecture.markdownFileName) {
        tasks.push({ ...base, stage: 'notes', status: 'pending' })
        if (options.includeTranslation) {
          tasks.push({ ...base, stage: 'translation', status: 'pending' })
        }
        continue
      }

      if (options.includeTranslation && !lecture.markdownEnFileName) {
        tasks.push({ ...base, stage: 'translation', status: 'pending' })
      }
    }
    return tasks
  }

  private refreshSummaries(): void {
    const summaries: Record<ArchivePipelineStage, ArchivePipelineStageSummary> =
      {
        transcription: emptySummary(),
        notes: emptySummary(),
        translation: emptySummary()
      }
    for (const task of this.status.tasks) {
      const summary = summaries[task.stage]
      summary.total++
      summary[task.status]++
    }
    this.status.stageSummaries = summaries
  }

  private stageMessage(stage: ArchivePipelineStage): string {
    if (stage === 'transcription') return 'Trascrizione degli audio'
    if (stage === 'notes') return 'Generazione delle dispense italiane'
    return 'Traduzione delle dispense in inglese'
  }

  private async persistAndEmit(): Promise<void> {
    this.status.queuedImportLectureIds = [...this.pendingImports]
    this.refreshSummaries()
    this.status.updatedAt = new Date().toISOString()
    await this.store.saveArchivePipelineState(this.status)
    this.emit()
  }

  private emit(): void {
    this.onStatus?.(cloneStatus(this.status))
  }
}
