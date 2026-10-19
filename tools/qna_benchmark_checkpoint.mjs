import { BenchError } from './qna_benchmark_core.mjs'

const retryable = new Set(['rate_limit', 'server_error', 'network_or_stream_error'])

// Recover a completed attempt if the process stopped before its result file.
// In particular, never send another request after a persisted partial answer.
export function terminalCheckpoint(attempts) {
  const last = attempts.at(-1)
  if (!last) return null
  return last.status === 'success' || last.answer || !retryable.has(last.errorCategory) || attempts.length >= 2 ? last : null
}

// Reservations include requests whose response checkpoint was never written.
export function reservedAttempts(ledger, runId, jobId) {
  return ledger.entries.filter(entry => entry.runId === runId && entry.jobId === jobId).length
}

export function missingAttemptCheckpoint(ledger, runId, jobId, attempts) {
  return reservedAttempts(ledger, runId, jobId) > attempts.length
}

export function sessionDelay(job, clock, now = Date.now()) {
  if (!Number.isFinite(clock?.startedAtMs) || !Number.isFinite(clock?.intervalMs) || clock.intervalMs <= 0) throw new BenchError('session_clock_invalid')
  const last = clock.lastDispatch?.[job.candidateId]
  if (last && !Number.isFinite(last.sentAtMs)) throw new BenchError('session_clock_invalid')
  // Absolute offsets alone would burst overdue questions after a long pause.
  const spacing = last && last.jobId !== job.id ? last.sentAtMs+clock.intervalMs-now : 0
  return Math.max(0, clock.startedAtMs+job.notBeforeOffset-now, spacing)
}
