import type { StudySession } from './archive'
import { effectiveStudySeconds } from './studyCorrections'
import type { ForecastBand, ForecastMethod } from './studyForecast'

export const STUDY_ACTIVITIES = ['reading', 'qna', 'slides', 'unknown'] as const
export type StudyActivity = typeof STUDY_ACTIVITIES[number]
export const STUDY_EXCLUSIONS = ['memo', 'translator', 'modal', 'music', 'pause', 'focus-lock', 'inactive-window', 'inactivity', 'suspended', 'locked', 'unknown'] as const
export type StudyExclusion = typeof STUDY_EXCLUSIONS[number]
export type StudyProvenance = 'focus-observed' | 'repetition-audio' | 'repetition-reading-estimated' | 'manual' | 'legacy-unlocated'
export interface StudyObservation {
  sequence: number; at: string; monotonicMs: number; creditedSeconds: number
  activity: StudyActivity; exclusions: StudyExclusion[]; position?: number; closed?: boolean
}
export interface StudyBatch {
  version: 2; sessionId: string; lectureId: string; courseCode: string | null; timeZone: string
  fingerprint?: string; eligible: boolean; observations: StudyObservation[]
}
export interface StudyAck { sequence: number; seconds: number; runId: string | null }
export interface StudyCheckpoint { sessionId: string; sequence: number; failed?: boolean }
export interface StudyPredictionRequest {
  lectureId: string; sessionId: string; fingerprint: string; predicted: number; position: number
  language: 'it' | 'en'; method: ForecastMethod
}
export interface StudyPredictionResult { band: ForecastBand; runId: string; elapsed: number; phase: number }
export interface StudySegment {
  system?: boolean
  id: string; sessionId: string; lectureId: string | null; courseCode: string | null
  start: string; end: string; date: string; timeZone: string; creditedSeconds: number
  activity: StudyActivity; exclusions: StudyExclusion[]
}
/** Overlay native system facts without duplicating intervals or their credited seconds. */
export function overlayStudySystem(raw: StudySegment[], facts: StudySegment[]): StudySegment[] {
  const result: StudySegment[] = []
  for (const s of raw) {
    const start = Date.parse(s.start), end = Date.parse(s.end)
    const overlaps = facts.filter(f => f.sessionId === s.sessionId && Date.parse(f.start)<end && Date.parse(f.end)>start)
    if (!overlaps.length) { result.push(s); continue }
    const points = [...new Set([start,end,...overlaps.flatMap(f=>[Math.max(start,Date.parse(f.start)),Math.min(end,Date.parse(f.end))])])].sort((a,b)=>a-b)
    let assigned = 0
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i], cumulative=Math.round(s.creditedSeconds*(b-start)/(end-start))
      const native=overlaps.filter(f=>Date.parse(f.start)<=a && Date.parse(f.end)>=b).flatMap(f=>f.exclusions)
      result.push({...s,id:`${s.id}:system:${i}`,start:new Date(a).toISOString(),end:new Date(b).toISOString(),creditedSeconds:cumulative-assigned,
        exclusions:native.length?[...new Set([...s.exclusions.filter(r=>r!=='unknown'),...native])]:s.exclusions})
      assigned=cumulative
    }
  }
  for(const f of facts) {
    let portions: Array<[number,number]> = [[Date.parse(f.start),Date.parse(f.end)]]
    for(const s of raw.filter(s=>s.sessionId===f.sessionId)) {
      const a=Date.parse(s.start),b=Date.parse(s.end)
      portions=portions.flatMap(([x,y])=>b<=x||a>=y?[[x,y]]:([[x,Math.min(y,a)],[Math.max(x,b),y]] as Array<[number,number]>).filter(([m,n])=>n>m))
    }
    for(const [a,b] of portions)result.push({...f,id:`${f.id}:${a}`,start:new Date(a).toISOString(),end:new Date(b).toISOString()})
  }
  return result
}
export interface StudyCredit {
  id: string; courseCode: string | null; lectureId: string | null; provenance: StudyProvenance
  seconds: number; correctionSeconds: number; unlocatedSeconds: number; start?: string; end?: string; quality: 'observed' | 'declared' | 'estimated' | 'unlocated'
}
export interface StudyDay {
  recovered?: boolean
  date: string; timeZone: string; segments: StudySegment[]; credits: StudyCredit[]
  creditedSeconds: number; observedSeconds: number; unlocatedSeconds: number
  medianBlockSeconds: number; longestBlockSeconds: number; contextChanges: number
  interruptions: Array<{ reason: string; count: number; seconds: number }>
  incomplete: boolean; forecasts: Array<{ id: string; at: string; predicted: number; phase: number; language: string; actual?: number; invalid?: string }>
}
export interface StudyDayFilter { courseCode?: string; provenance?: StudyProvenance }
export interface StudyHistoryApi {
  onStudySystemState?: (callback: (state: { reason: 'suspended' | 'locked'; active: boolean }) => void) => () => void
  saveStudyObservations: (batch: StudyBatch) => Promise<StudyAck>
  recordStudyPrediction: (request: StudyPredictionRequest) => Promise<StudyPredictionResult>
  resetStudyForecast: (lectureId: string, sessionId?: string) => Promise<void>
  getStudyDay: (date: string, filter?: StudyDayFilter) => Promise<StudyDay>
  importLegacyStudyForecast: (data: unknown) => Promise<void>
}
const text = (value: unknown, maximum = 200): value is string => typeof value === 'string' && value.length > 0 && value.length <= maximum
export function validateStudyBatch(value: unknown): asserts value is StudyBatch {
  const v = value as StudyBatch
  if (!v || v.version !== 2 || !text(v.sessionId) || !text(v.lectureId) ||
    (v.courseCode !== null && !text(v.courseCode, 120)) || !text(v.timeZone, 80) || typeof v.eligible !== 'boolean' ||
    (v.fingerprint !== undefined && !text(v.fingerprint)) || !Array.isArray(v.observations) || !v.observations.length || v.observations.length > 720) throw new Error('Osservazioni di studio non valide.')
  try { new Intl.DateTimeFormat('en', { timeZone: v.timeZone }).format() } catch { throw new Error('Fuso dello studio non valido.') }
  for (const p of v.observations) if (!p || !Number.isSafeInteger(p.sequence) || p.sequence < 0 || !text(p.at, 40) || !Number.isFinite(Date.parse(p.at)) ||
    !Number.isFinite(p.monotonicMs) || p.monotonicMs < 0 || !Number.isSafeInteger(p.creditedSeconds) || p.creditedSeconds < 0 || p.creditedSeconds > 2592000 ||
    !STUDY_ACTIVITIES.includes(p.activity) || !Array.isArray(p.exclusions) || p.exclusions.length > STUDY_EXCLUSIONS.length || !p.exclusions.every(r => STUDY_EXCLUSIONS.includes(r)) ||
    (p.position !== undefined && (!Number.isFinite(p.position) || p.position < 0 || p.position > 1)) || (p.closed !== undefined && typeof p.closed !== 'boolean')) throw new Error('Checkpoint di studio non valido.')
}
const formatters = new Map<string, Intl.DateTimeFormat>()
export function studyCalendarDate(at: number, zone: string): string {
  let formatter = formatters.get(zone)
  if (!formatter) { formatter = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }); formatters.set(zone, formatter) }
  const parts = formatter.formatToParts(at)
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)!.value).join('-')
}
/** Split using actual local date boundaries, including 23/25-hour days. */
export function splitStudyInterval(start: number, end: number, seconds: number, zone: string) {
  const pieces: Array<{ start: number; end: number; date: string; seconds: number }> = []
  let cursor = start, assigned = 0
  while (cursor < end) {
    const date = studyCalendarDate(cursor, zone)
    let boundary = end
    if (studyCalendarDate(end - 1, zone) !== date) {
      let lo = cursor + 1, hi = end
      while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (studyCalendarDate(mid, zone) === date) lo = mid + 1; else hi = mid }
      boundary = lo
    }
    const cumulative = Math.round(seconds * (boundary - start) / Math.max(1, end - start))
    pieces.push({ start: cursor, end: boundary, date, seconds: cumulative - assigned })
    assigned = cumulative; cursor = boundary
  }
  return pieces
}
export function studyDayBounds(date: string, zone: string) {
  const middle = Date.parse(date + 'T12:00:00Z')
  const boundary = (after: boolean) => {
    let lo = middle - 172800000, hi = middle + 172800000
    while (lo < hi) { const mid = Math.floor((lo + hi) / 2), d = studyCalendarDate(mid, zone)
      if (after ? d <= date : d < date) lo = mid + 1; else hi = mid }
    return lo
  }
  return { start: boundary(false), end: boundary(true) }
}
export function studyCredit(session: StudySession): StudyCredit {
  const provenance = session.provenance ?? (session.id.startsWith('repetition-audio:') ? 'repetition-audio' : session.id.startsWith('repetition-reading:') ? 'repetition-reading-estimated' : session.mode === 'manual' ? 'manual' : 'legacy-unlocated')
  const quality = session.timingQuality ?? (provenance === 'repetition-audio' ? 'estimated' : 'unlocated')
  const located = quality !== 'unlocated' && provenance !== 'repetition-reading-estimated' && Date.parse(session.endTime) > Date.parse(session.startTime)
  return { id: session.id, courseCode: session.courseCode, lectureId: session.lectureId, provenance, quality,
    seconds: effectiveStudySeconds(session), correctionSeconds: session.durationSeconds - effectiveStudySeconds(session),
    unlocatedSeconds: Math.min(effectiveStudySeconds(session), session.unlocatedSeconds ?? (located ? 0 : effectiveStudySeconds(session))),
    ...(located ? { start: session.startTime, end: session.endTime } : {}) }
}
export function buildStudyDay(date: string, zone: string, segments: StudySegment[], credits: StudyCredit[], incomplete = false): StudyDay {
  const sorted = [...segments].sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id))
  const active = sorted.filter(s => s.exclusions.length === 0 && s.creditedSeconds > 0)
  // Union, never sum overlapping clock intervals (e.g. recorder audio and Focus).
  const intervals: Array<[number, number]> = active.map(s => [Date.parse(s.start), Date.parse(s.end)])
  for (const c of credits) if (c.start && c.end && c.quality === 'observed' && c.provenance === 'repetition-audio') intervals.push([Date.parse(c.start), Date.parse(c.end)])
  intervals.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const item of intervals) { const last = merged.at(-1); if (last && item[0] <= last[1]) last[1] = Math.max(last[1], item[1]); else merged.push([...item]) }
  const blocks: number[] = []
  let end = -1, session = '', block = 0, lastActivity = '', changes = 0
  const reasons = new Map<string, { reason: string; count: number; seconds: number }>()
  const reasonIntervals = new Map<string, Array<[number, number]>>()
  for (const s of sorted) {
    const start = Date.parse(s.start), finish = Date.parse(s.end)
    const isActive = !s.exclusions.length && s.creditedSeconds > 0
    if (isActive) {
      if (s.sessionId !== session || start > end + 1) { if (block) blocks.push(block); block = 0; lastActivity = '' }
      if (lastActivity && lastActivity !== s.activity) changes++
      lastActivity = s.activity; block += s.creditedSeconds; session = s.sessionId; end = finish
    } else { if (block) blocks.push(block); block = 0; lastActivity = ''; end = -1 }
    for (const reason of new Set(s.exclusions)) {
      const spans = reasonIntervals.get(reason) ?? []
      spans.push([start, finish]); reasonIntervals.set(reason, spans)
    }
  }
  for (const [reason, spans] of reasonIntervals) {
    spans.sort((a, b) => a[0] - b[0])
    const union: Array<[number, number]> = []
    for (const span of spans) {
      const last = union.at(-1)
      if (last && span[0] <= last[1] + 1) last[1] = Math.max(last[1], span[1])
      else union.push([...span])
    }
    reasons.set(reason, { reason, count: union.length, seconds: union.reduce((n, s) => n + (s[1] - s[0]) / 1000, 0) })
  }
  if (block) blocks.push(block)
  blocks.sort((a, b) => a - b)
  const n = blocks.length
  return { date, timeZone: zone, segments: sorted, credits,
    creditedSeconds: credits.reduce((n, c) => n + c.seconds, 0), observedSeconds: merged.reduce((n, v) => n + (v[1] - v[0]) / 1000, 0),
    unlocatedSeconds: credits.reduce((n, c) => n + c.unlocatedSeconds, 0),
    medianBlockSeconds: n ? (blocks[Math.floor((n - 1) / 2)] + blocks[Math.floor(n / 2)]) / 2 : 0,
    longestBlockSeconds: blocks.at(-1) ?? 0, contextChanges: changes, interruptions: [...reasons.values()], incomplete, forecasts: [] }
}
