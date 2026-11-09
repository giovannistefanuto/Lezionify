import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWrite, readRecoverable } from './atomicFile'
import { AsyncMutex } from './asyncMutex'
import { buildStudyDay, overlayStudySystem, splitStudyInterval, studyCalendarDate, studyCredit, validateStudyBatch,
  type StudyBatch, type StudyObservation, type StudySegment, type StudyDayFilter, type StudyCheckpoint,
  type StudyPredictionRequest, type StudyAck } from '../../shared/studyHistory'
import type { StudySession } from '../../shared/archive'
import { forecastBand, forecastPhase, validPoint, type ForecastCase, type ForecastPoint } from '../../shared/studyForecast'
import { parseLocalCalendarDate } from '../../shared/calendarDate'

interface SessionState {
  sessionId: string; lectureId: string; courseCode: string | null; timeZone: string; last: StudyObservation
  days: Record<string, { seconds: number; start: string; end: string; uncertain: boolean; unlocated: number }>
}
interface RunPoint extends ForecastPoint { at: string; id: string; position: number }
interface Run {
  id: string; lesson: string; fingerprint: string; policy: 'history-v2'; status: 'open' | 'sealed' | 'completed' | 'invalid'
  sessions: Array<{ id: string; baseline: number }>; points: RunPoint[]; furthest: number; invalid?: string
}
interface Case extends ForecastCase { id: string; runId: string; at: string; fingerprint: string; sessionIds: string[]; invalid?: string; policy: 'history-v2' }
interface Intent { id: string; run: Run; elapsed: number; valid: boolean; invalid?: string }
const key = (value: string) => createHash('sha256').update(value).digest('hex')
const safeId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200

/** Durable observations and outcomes behind one serialized interface. No browser storage. */
export class StudyHistory {
  private mutex = new AsyncMutex()
  private root: string
  private live = new Map<string, SessionState>()
  constructor(root: string, private dependencies: {
    readSessions: () => Promise<StudySession[]>; writeSessions: (sessions: StudySession[]) => Promise<void>
    completionOperation: (lesson: string) => Promise<string | undefined>
  }) { this.root = join(root, 'study') }
  private async read<T>(path: string, missing: T): Promise<T> {
    try {
      let recovered = false
      const result = JSON.parse(await readRecoverable(path, () => { recovered = true })) as T
      if (recovered) await this.write(join(this.root, 'recovery-notice.json'), { at: new Date().toISOString() })
      return result
    }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return missing; throw error }
  }
  private async write(path: string, data: unknown) { await mkdir(join(path, '..'), { recursive: true }); await atomicWrite(path, JSON.stringify(data) + '\n') }
  private sessionPath(id: string) { return join(this.root, 'sessions', key(id) + '.json') }
  private runPath(lesson: string) { return join(this.root, 'forecasts', key(lesson) + '.json') }
  private async session(id: string) { return this.read<SessionState | null>(this.sessionPath(id), null) }
  private async run(lesson: string) { return this.read<Run | null>(this.runPath(lesson), null) }
  private async files(directory: string) {
    try { return (await readdir(directory)).filter(name => /^[a-f0-9-]+\.json$/.test(name)) }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error }
  }
  private async cases() { return this.read<Case[]>(join(this.root, 'forecasts', 'cases.json'), []) }
  private async elapsed(run: Run) {
    let seconds = 0
    for (const ref of run.sessions) {
      const session = await this.session(ref.id)
      if (!session) throw new Error('Contatore di studio non confermato.')
      seconds += Math.max(0, session.last.creditedSeconds - ref.baseline)
    }
    return seconds
  }
  private async attach(lesson: string, fingerprint: string, sessionId: string): Promise<Run> {
    let run = await this.run(lesson)
    if (run && (run.fingerprint !== fingerprint || run.status === 'invalid')) await this.write(join(this.root, 'forecasts', 'archive', run.id + '.json'), run)
    if (!run || run.fingerprint !== fingerprint || run.status === 'invalid') run = {
      id: randomUUID(), lesson, fingerprint, policy: 'history-v2', status: 'open', sessions: [], points: [], furthest: 0 }
    if (run.status === 'open' && !run.sessions.some(s => s.id === sessionId)) {
      run.sessions.push({ id: sessionId, baseline: 0 })
      await this.write(this.runPath(lesson), run)
    }
    return run
  }
  private async project(session: SessionState) {
    const all = await this.dependencies.readSessions()
    for (const [date, day] of Object.entries(session.days)) {
      const id = `history:${key(session.sessionId).slice(0, 32)}:${date}`
      const previous = all.find(s => s.id === id)
      const projected: StudySession = { id, observationSessionId: session.sessionId, lectureId: session.lectureId,
        courseCode: session.courseCode, startTime: day.start, endTime: day.end, date, durationSeconds: day.seconds,
        provenance: 'focus-observed', timingQuality: day.uncertain ? 'unlocated' : 'observed', unlocatedSeconds: day.unlocated, mode: 'focus', corrections: previous?.corrections }
      const index = all.findIndex(s => s.id === id)
      if (index < 0) all.push(projected); else all[index] = projected
    }
    await this.dependencies.writeSessions(all)
  }
  ingest(value: unknown): Promise<StudyAck> {
    validateStudyBatch(value)
    const batch: StudyBatch = JSON.parse(JSON.stringify(value))
    return this.mutex.runExclusive(async () => {
      let state = await this.session(batch.sessionId)
      if (state && (state.lectureId !== batch.lectureId || state.courseCode !== batch.courseCode || state.timeZone !== batch.timeZone)) throw new Error('Contesto della sessione diverso.')
      const run = batch.eligible && batch.fingerprint ? await this.attach(batch.lectureId, batch.fingerprint, batch.sessionId) : null
      const chunks = new Map<string, StudySegment[]>()
      for (const point of batch.observations) {
        if (state && point.sequence <= state.last.sequence) {
          if (point.sequence === state.last.sequence && JSON.stringify(point) !== JSON.stringify(state.last)) throw new Error('Checkpoint conflittuale.')
          if (run?.status === 'open' && point.position !== undefined) run.furthest = Math.max(run.furthest, point.position)
          continue
        }
        if (!state) {
          if (point.sequence !== 0 || point.creditedSeconds !== 0) throw new Error('Manca l inizio della sessione.')
          state = { sessionId: batch.sessionId, lectureId: batch.lectureId, courseCode: batch.courseCode, timeZone: batch.timeZone, last: point, days: {} }
          continue
        }
        if (state.last.closed || point.sequence !== state.last.sequence + 1 || point.creditedSeconds < state.last.creditedSeconds) throw new Error('Sequenza di studio incompleta o chiusa.')
        const previous = state.last, delta = point.creditedSeconds - previous.creditedSeconds
        const monotonic = point.monotonicMs - previous.monotonicMs
        const start = Date.parse(previous.at), finish = Date.parse(point.at)
        if (monotonic < 0 || delta > Math.ceil(monotonic / 1000) + 2) throw new Error('Durata del checkpoint non valida.')
        if (finish === start && delta === 0) {
          state.last = point
          if (run?.status === 'open' && point.position !== undefined) run.furthest=Math.max(run.furthest,point.position)
          continue
        }
        const unknown = finish <= start || Math.abs(finish - start - monotonic) > 3000 || monotonic > 15_000
        const reasons = unknown && !previous.exclusions.includes('suspended') && !previous.exclusions.includes('locked') ? ['unknown' as const] : delta > 0 ? [] : previous.exclusions
        if (delta && previous.exclusions.length && point.exclusions.length) throw new Error('Tempo accreditato durante una sospensione.')
        const parts = finish > start ? splitStudyInterval(start, finish, delta, batch.timeZone) : [{ start: finish, end: finish + 1, date: studyCalendarDate(finish, batch.timeZone), seconds: delta }]
        for (const part of parts) {
          // At most 32 bounded records per chunk as well as a ten-minute time bucket.
          const path = join(this.root, 'history', part.date, `${key(batch.sessionId)}-${Math.floor(part.start / 600_000)}-${Math.floor(point.sequence / 32)}.json`)
          let list = chunks.get(path)
          if (!list) { list = await this.read<StudySegment[]>(path, []); chunks.set(path, list) }
          const segment: StudySegment = { id: `${batch.sessionId}:${point.sequence}:${part.date}`, sessionId: batch.sessionId,
            lectureId: batch.lectureId, courseCode: batch.courseCode, timeZone: batch.timeZone, date: part.date,
            start: new Date(part.start).toISOString(), end: new Date(part.end).toISOString(), creditedSeconds: part.seconds,
            activity: unknown ? 'unknown' : delta > 0 ? point.activity : previous.activity, exclusions: reasons }
          const index = list.findIndex(s => s.id === segment.id)
          if (index < 0) list.push(segment); else list[index] = segment
          const day = state.days[part.date] ?? { seconds: 0, start: segment.start, end: segment.end, uncertain: false, unlocated: 0 }
          day.seconds += part.seconds; day.end = segment.end; day.uncertain ||= unknown; day.unlocated += unknown ? part.seconds : 0; state.days[part.date] = day
        }
        state.last = point
        if (run && run.status === 'open' && point.position !== undefined) run.furthest = Math.max(run.furthest, point.position)
      }
      if (!state) throw new Error('Sessione vuota.')
      for (const [path, segments] of chunks) await this.write(path, segments)
      await this.write(this.sessionPath(batch.sessionId), state)
      if (run?.status === 'open') await this.write(this.runPath(batch.lectureId), run)
      // Retrying after a projection failure always repairs the projection before ACK.
      await this.project(state)
      if (state.last.closed) this.live.delete(state.sessionId); else this.live.set(state.sessionId,state)
      return { sequence: state.last.sequence, seconds: state.last.creditedSeconds, runId: run?.id ?? null }
    })
  }
  noteSystem(reason: 'suspended' | 'locked', active: boolean, at = Date.now()) {
    return this.mutex.runExclusive(async () => {
      const path=join(this.root,'system','pending.json')
      const pending=await this.read<Record<string,{start:number; sessions:SessionState[]}>>(path,{})
      if(active) {
        if(!pending[reason]) pending[reason]={start:at,sessions:[...this.live.values()].filter(s=>at-Date.parse(s.last.at)<30_000)}
      } else if(pending[reason]) {
        const event=pending[reason]
        if(at>event.start)for(const s of event.sessions)for(const p of splitStudyInterval(event.start,at,0,s.timeZone)) {
          const segment:StudySegment={id:`system:${reason}:${s.sessionId}:${p.start}`,system:true,sessionId:s.sessionId,lectureId:s.lectureId,courseCode:s.courseCode,
            date:p.date,timeZone:s.timeZone,start:new Date(p.start).toISOString(),end:new Date(p.end).toISOString(),creditedSeconds:0,activity:'unknown',exclusions:[reason]}
          await this.write(join(this.root,'history',p.date,`${key(segment.id)}.json`),[segment])
        }
        delete pending[reason]
      }
      await this.write(path,pending)
    })
  }
  recordPrediction(request: StudyPredictionRequest) {
    return this.mutex.runExclusive(async () => {
      if (!request || !safeId(request.lectureId) || !safeId(request.sessionId) || !safeId(request.fingerprint) ||
        !Number.isFinite(request.position) || request.position < 0 || request.position > 1 || !validPoint({ ...request, elapsed: 0, phase: forecastPhase(request.position) })) throw new Error('Previsione di studio non valida.')
      const session = await this.session(request.sessionId)
      if (!session || session.lectureId !== request.lectureId) throw new Error('Attendi il salvataggio dello studio.')
      const run = await this.attach(request.lectureId, request.fingerprint, request.sessionId)
      if (run.status !== 'open') throw new Error('La raccolta della lezione è conclusa.')
      const elapsed = await this.elapsed(run), phase = forecastPhase(request.position)
      const point: RunPoint = { id: randomUUID(), language: request.language, method: request.method, predicted: request.predicted,
        phase, elapsed, position: request.position, at: session.last.at }
      const history = (await this.cases()).filter(c => !c.invalid)
      const band = forecastBand(history, request.lectureId, point)
      if (!run.points.some(p => p.language === point.language && p.method === point.method && p.phase === phase)) {
        run.points.push({ ...point, ...(band.lower === null ? {} : { lower: band.lower, upper: band.upper! }) })
        await this.write(this.runPath(request.lectureId), run)
      }
      return { band, runId: run.id, elapsed, phase }
    })
  }
  reset(lesson: string, sessionId?: string) {
    return this.mutex.runExclusive(async () => {
      if (!safeId(lesson) || (sessionId !== undefined && !safeId(sessionId))) throw new Error('Lezione non valida.')
      const run = await this.run(lesson)
      if (!run) return
      const session = sessionId ? await this.session(sessionId) : null
      await this.write(join(this.root, 'forecasts', 'archive', run.id + '.json'), run)
      const next: Run = { ...run, id: randomUUID(), status: 'open', points: [], furthest: 0,
        sessions: session ? [{ id: session.sessionId, baseline: session.last.creditedSeconds }] : [], invalid: undefined }
      await this.write(this.runPath(lesson), next)
    })
  }
  prepareCompletion(lesson: string, checkpoint?: StudyCheckpoint, expectedFingerprint?: string | null): Promise<string | undefined> {
    return this.mutex.runExclusive(async () => {
      const run = await this.run(lesson)
      if (!run || run.status !== 'open') return undefined
      let valid = !checkpoint?.failed && run.furthest >= .9 && expectedFingerprint !== null && (expectedFingerprint === undefined || run.fingerprint === expectedFingerprint)
      for (const ref of run.sessions) {
        const state = await this.session(ref.id)
        if (!state || (!state.last.closed && (!checkpoint || checkpoint.sessionId !== ref.id || checkpoint.sequence !== state.last.sequence))) valid = false
      }
      const id = randomUUID(), elapsed = await this.elapsed(run)
      const intent: Intent = { id, run: { ...run }, elapsed, valid, invalid: valid ? undefined : 'Conteggio finale o avanzamento non verificabile.' }
      await this.write(join(this.root, 'commits', id + '.json'), intent)
      await this.write(this.runPath(lesson), { ...run, status: 'sealed' })
      return id
    })
  }
  private async finalize(intent: Intent) {
    const cases = await this.cases()
    if (intent.valid) for (const p of intent.run.points) {
      const entry: Case = { ...p, lesson: intent.run.lesson, runId: intent.run.id, fingerprint: intent.run.fingerprint,
        actual: intent.elapsed - p.elapsed, policy: 'history-v2', sessionIds: intent.run.sessions.map(s=>s.id) }
      if (entry.actual < 0) continue
      const index = cases.findIndex(c => c.id === p.id)
      if (index < 0) cases.push(entry)
    }
    await this.write(join(this.root, 'forecasts', 'cases.json'), cases.slice(-2400))
    const current = await this.run(intent.run.lesson)
    if (current?.id === intent.run.id) await this.write(this.runPath(current.lesson), { ...current,
      status: intent.valid ? 'completed' : 'invalid', invalid: intent.invalid })
    await this.write(join(this.root, 'commits', intent.id + '.json'), { ...intent, finished: true })
  }
  finishCompletion(lesson: string, operation?: string) {
    return this.mutex.runExclusive(async () => {
      if (!operation) return
      const intent = await this.read<Intent | null>(join(this.root, 'commits', operation + '.json'), null)
      if (intent && intent.run.lesson === lesson && await this.dependencies.completionOperation(lesson) === operation) await this.finalize(intent)
    })
  }
  recover() {
    return this.mutex.runExclusive(async () => {
      for (const file of await this.files(join(this.root, 'commits'))) {
        const intent = await this.read<(Intent & { finished?: boolean }) | null>(join(this.root, 'commits', file), null)
        if (!intent || intent.finished) continue
        if (await this.dependencies.completionOperation(intent.run.lesson) === intent.id) await this.finalize(intent)
        else {
          const run = await this.run(intent.run.lesson)
          if (run?.id === intent.run.id && run.status === 'sealed') await this.write(this.runPath(run.lesson), { ...run, status: 'open' })
          await this.write(join(this.root, 'commits', file), { ...intent, finished: true, valid: false })
        }
      }
    })
  }
  invalidateSessions(ids: string[]) {
    return this.mutex.runExclusive(async () => {
      for (const file of await this.files(join(this.root, 'forecasts'))) {
        const run = await this.read<Run | null>(join(this.root, 'forecasts', file), null)
        if (run?.sessions?.some(s => ids.includes(s.id))) await this.write(this.runPath(run.lesson), { ...run, status: 'invalid', invalid: 'Rettifica del tempo non localizzata.' })
      }
      const cases = await this.cases()
      const invalidRuns = new Set<string>()
      for (const file of await this.files(join(this.root, 'forecasts'))) {
        const run = await this.read<Run | null>(join(this.root, 'forecasts', file), null)
        if (run?.invalid) invalidRuns.add(run.id)
      }
      await this.write(join(this.root, 'forecasts', 'cases.json'), cases.map(c => invalidRuns.has(c.runId) || c.sessionIds?.some(id => ids.includes(id)) ? { ...c, invalid: 'Tempo rettificato.' } : c))
    })
  }
  async importLegacy(value: unknown) {
    if (!value || typeof value !== 'object' || JSON.stringify(value).length > 1_000_000) throw new Error('Storico precedente non valido.')
    const path = join(this.root, 'forecasts', 'legacy-v1.json')
    return this.mutex.runExclusive(async () => { if (await this.read(path, null) === null) await this.write(path, { version: 'legacy-v1', eligible: false, data: value }) })
  }
  getDay(date: string, sessions: StudySession[], courses: Record<string, string | null>, archived: string[], filter: StudyDayFilter = {}) {
    return this.mutex.runExclusive(async () => {
      if (typeof date !== 'string' || !parseLocalCalendarDate(date) || !filter || typeof filter !== 'object' ||
        (filter.courseCode !== undefined && (typeof filter.courseCode !== 'string' || filter.courseCode.length > 120)) ||
        (filter.provenance !== undefined && !['focus-observed','repetition-audio','repetition-reading-estimated','manual','legacy-unlocated'].includes(filter.provenance))) throw new Error('Giorno o filtri non validi.')
      const code = (lesson: string | null, original: string | null) => lesson && Object.hasOwn(courses, lesson) ? courses[lesson] : original
      const visible = (course: string | null) => !(course && archived.includes(course)) && (filter.courseCode === undefined || (course ?? '') === filter.courseCode)
      const directory = join(this.root, 'history', date)
      const segments: StudySegment[] = []
      for (const file of await this.files(directory)) segments.push(...await this.read<StudySegment[]>(join(directory, file), []))
      const credits = sessions.filter(s => s.date === date).map(s => studyCredit({ ...s, courseCode: code(s.lectureId, s.courseCode) }))
        .filter(c => visible(c.courseCode) && (!filter.provenance || c.provenance === filter.provenance))
      const combined=overlayStudySystem(segments.filter(s=>!s.system),segments.filter(s=>s.system))
      const selected = combined.map(s => ({ ...s, courseCode: code(s.lectureId, s.courseCode) })).filter(s => visible(s.courseCode) && (!filter.provenance || filter.provenance === 'focus-observed'))
      const day = buildStudyDay(date, selected[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone, selected, credits, selected.some(s => s.exclusions.includes('unknown')))
      const history = await this.cases()
      day.forecasts = history.filter(c => studyCalendarDate(Date.parse(c.at), day.timeZone) === date && visible(courses[c.lesson] ?? null) && (!filter.provenance || filter.provenance === 'focus-observed'))
        .map(c => ({ id: c.id, at: c.at, predicted: c.predicted, phase: c.phase, language: c.language, actual: c.actual, invalid: c.invalid }))
      if (!filter.provenance || filter.provenance === 'focus-observed') for (const file of await this.files(join(this.root, 'forecasts'))) {
        const run = await this.read<Run | null>(join(this.root,'forecasts',file),null)
        if (!run || !visible(courses[run.lesson] ?? null)) continue
        for (const p of run.points) if (studyCalendarDate(Date.parse(p.at),day.timeZone) === date && !day.forecasts.some(c=>c.id===p.id)) day.forecasts.push({ id:p.id,at:p.at,predicted:p.predicted,phase:p.phase,language:p.language,invalid:run.invalid })
      }
      day.recovered = await this.read(join(this.root, 'recovery-notice.json'), null) !== null
      return day
    })
  }
}
