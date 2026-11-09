import type { StudyActivity, StudyBatch, StudyCheckpoint, StudyExclusion, StudyObservation, StudyPredictionRequest } from '../../shared/studyHistory'
import { FORECAST_HISTORY_KEY, FORECAST_RUN_PREFIX } from '../../shared/studyForecast'

const active = new Map<string, StudyHistoryClient>()
export const STUDY_HISTORY_STATUS = 'study-history-status'
export function getStudyHistoryClient(lectureId: string | null) { return lectureId ? active.get(lectureId) : undefined }
export function startStudyHistoryClient(sessionId: string, lectureId: string, courseCode: string | null) {
  if (typeof window.archive?.saveStudyObservations !== 'function') return undefined
  const client = new StudyHistoryClient(sessionId, lectureId, courseCode)
  active.set(lectureId, client)
  if (active.size > 32) for (const [id,c] of active) { if (c.closed && id !== lectureId) { active.delete(id); break } }
  return client
}

/** Bounded, retryable batches; ACK is a durable counter, not an optimistic UI save. */
export class StudyHistoryClient {
  private pending: StudyObservation[] = []
  private sequence = 0
  private queue: Promise<void> = Promise.resolve()
  private lastSentAt = 0
  private last: StudyObservation
  private credited = 0
  private activity: StudyActivity = 'reading'
  private exclusions: StudyExclusion[] = []
  private position: number | undefined
  private fingerprint: string | undefined
  private eligible = false
  private generation = 0
  private blockedSystem = new Set<StudyExclusion>()
  private systemListener: (event: Event) => void
  private unsubscribeSystem?: () => void
  readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  closed = false
  completing = false
  error: string | null = null
  constructor(readonly sessionId: string, readonly lectureId: string, readonly courseCode: string | null) {
    this.last = { sequence: 0, at: new Date(Date.now()).toISOString(), monotonicMs: performance.now(), creditedSeconds: 0, activity: 'reading', exclusions: [] }
    this.pending.push(this.last)
    this.systemListener = event => {
      const detail = (event as CustomEvent).detail
      if (detail && (detail.reason === 'suspended' || detail.reason === 'locked')) {
        if (detail.active) this.blockedSystem.add(detail.reason); else this.blockedSystem.delete(detail.reason)
        this.observe(this.credited, this.exclusions, true)
      }
    }
    document.addEventListener('study-system-state', this.systemListener)
    this.unsubscribeSystem = window.archive.onStudySystemState?.(detail => this.systemListener(new CustomEvent('study-system-state', { detail })))
  }
  get systemExclusions() { return [...this.blockedSystem] }
  setSource(fingerprint: string, eligible: boolean) { this.fingerprint = fingerprint; this.eligible = eligible }
  setContext(activity: StudyActivity, position?: number) {
    if (this.activity === activity && this.position === position) return
    this.observe(this.credited, this.exclusions, true)
    this.activity = activity; this.position = position
    this.observe(this.credited, this.exclusions, true)
  }
  observe(seconds: number, reasons: StudyExclusion[], force = false) {
    if (this.closed) return
    this.credited = seconds; this.exclusions = reasons
    const exclusions = [...new Set([...reasons, ...this.blockedSystem])].sort()
    const now = Date.now()
    const changed = this.last.activity !== this.activity || JSON.stringify(this.last.exclusions) !== JSON.stringify(exclusions)
    if (!force && !changed && now - this.lastSentAt < 10_000) return
    if (this.pending.length >= 720) { this.status('Raccolta non salvata: riprova prima di proseguire.'); return }
    this.last = { sequence: ++this.sequence, at: new Date(now).toISOString(), monotonicMs: performance.now(), creditedSeconds: seconds,
      activity: this.activity, exclusions, ...(this.position === undefined ? {} : { position: this.position }) }
    this.pending.push(this.last); this.lastSentAt = now
    if (changed || !force) void this.flush().catch(() => {})
  }
  private status(message: string | null) {
    this.error = message
    window.dispatchEvent(new CustomEvent(STUDY_HISTORY_STATUS, { detail: { lectureId: this.lectureId, error: message } }))
  }
  flush(): Promise<void> {
    if (!this.closed && this.last.creditedSeconds !== this.credited) {
      this.last = { sequence: ++this.sequence, at: new Date(Date.now()).toISOString(), monotonicMs: performance.now(),
        creditedSeconds: this.credited, activity: this.activity, exclusions: [...new Set([...this.exclusions,...this.blockedSystem])].sort(),
        ...(this.position === undefined ? {} : { position: this.position }) }
      this.pending.push(this.last)
    }
    this.queue = this.queue.catch(() => {}).then(async () => {
      while (this.pending.length) {
        const observations = this.pending.slice(0, 720)
        const batch: StudyBatch = { version: 2, sessionId: this.sessionId, lectureId: this.lectureId, courseCode: this.courseCode,
          timeZone: this.timeZone, eligible: this.eligible, fingerprint: this.fingerprint, observations }
        try {
          const ack = await window.archive.saveStudyObservations(batch)
          if (!Number.isSafeInteger(ack.sequence) || !Number.isSafeInteger(ack.seconds) || ack.sequence < observations.at(-1)!.sequence || ack.seconds < observations.at(-1)!.creditedSeconds) throw new Error('ACK incompleto')
          this.pending = this.pending.filter(p => p.sequence > ack.sequence)
          this.status(null)
        } catch (error) { this.status('Tempo non salvato. Riprova; la calibrazione resta sospesa.'); throw error }
      }
    })
    return this.queue
  }
  async checkpoint(): Promise<StudyCheckpoint> {
    this.observe(this.credited, this.exclusions, true)
    try { await this.flush(); return { sessionId: this.sessionId, sequence: this.sequence } }
    catch { return { sessionId: this.sessionId, sequence: this.sequence, failed: true } }
  }
  async predict(request: Omit<StudyPredictionRequest, 'sessionId' | 'lectureId' | 'fingerprint'>) {
    if (!this.fingerprint || !this.eligible) return null
    const generation = this.generation
    this.observe(this.credited, this.exclusions, true)
    await this.flush()
    const result = await window.archive.recordStudyPrediction({ ...request, sessionId: this.sessionId, lectureId: this.lectureId, fingerprint: this.fingerprint })
    return generation === this.generation ? result : null
  }
  async reset() {
    this.generation++
    await this.flush()
    await window.archive.resetStudyForecast(this.lectureId, this.sessionId)
  }
  stop() {
    if (this.closed) return
    this.observe(this.credited, this.exclusions, true)
    this.last.closed = true
    this.closed = true
    document.removeEventListener('study-system-state', this.systemListener)
    this.unsubscribeSystem?.()
    void this.flush().catch(() => {})
  }
}

let importing: Promise<void> | undefined
export function preserveLegacyStudyForecast() {
  if (!window.archive?.importLegacyStudyForecast || importing) return
  importing = Promise.resolve().then(async () => {
    try {
      if (localStorage.getItem('lezionify.study-forecast.imported.v2') === 'true') return
      const data = { cases: JSON.parse(localStorage.getItem(FORECAST_HISTORY_KEY) ?? '[]'), runs: Object.fromEntries(Object.keys(localStorage)
        .filter(key => key.startsWith(FORECAST_RUN_PREFIX) && !key.endsWith(':revision')).map(key => [key, JSON.parse(localStorage.getItem(key) ?? 'null')])) }
      await window.archive.importLegacyStudyForecast(data)
      localStorage.setItem('lezionify.study-forecast.imported.v2', 'true')
    } catch { importing = undefined }
  })
}
