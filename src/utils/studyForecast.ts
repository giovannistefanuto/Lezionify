import { FORECAST_HISTORY_KEY, FORECAST_RUN_PREFIX, forecastBand, forecastPhase, validPoint, finite, type ForecastCase, type ForecastPoint, type ForecastMethod } from '../../shared/studyForecast'
export * from '../../shared/studyForecast'
interface ForecastRun { fingerprint: string; elapsed: number; furthest: number; points: ForecastPoint[] }
const failedRuns = new Set<string>()
export function readForecastHistory(): ForecastCase[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(FORECAST_HISTORY_KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((item): item is ForecastCase => validPoint(item) &&
      typeof item.lesson === 'string' && finite(item.actual)).slice(-600) : []
  } catch { return [] }
}
function readRun(lesson: string, fingerprint: string): ForecastRun {
  try {
    const value = JSON.parse(localStorage.getItem(FORECAST_RUN_PREFIX + lesson) ?? 'null')
    if (value?.fingerprint === fingerprint && finite(value.elapsed) && finite(value.furthest) && value.furthest <= 1 &&
      Array.isArray(value.points) && value.points.length <= 12 && value.points.every(validPoint)) return value
  } catch { /* Start fresh without modifying legacy study samples. */ }
  return { fingerprint, elapsed: 0, furthest: 0, points: [] }
}
export function forecastSession(lesson: string, fingerprint: string) {
  const run = readRun(lesson, fingerprint)
  let revision: string | null = null
  try { revision = localStorage.getItem(FORECAST_RUN_PREFIX + lesson + ':revision') } catch { /* Optional storage. */ }
  let history = readForecastHistory()
  return {
    save: () => {
      try {
        if (localStorage.getItem(FORECAST_RUN_PREFIX + lesson + ':revision') !== revision) return false
        localStorage.setItem(FORECAST_RUN_PREFIX + lesson, JSON.stringify(run)); failedRuns.delete(lesson); return true
      } catch { failedRuns.add(lesson); return false }
    },
    tick: (seconds: number, position: number | null) => {
      if (!finite(seconds) || seconds <= 0 || seconds > 3) return
      run.elapsed += seconds
      if (position !== null && finite(position)) run.furthest = Math.max(run.furthest, Math.min(1, position))
    },
    predict: (predicted: number, position: number, language: string, method: ForecastMethod) => {
      const point: ForecastPoint = { predicted, phase: forecastPhase(position), elapsed: run.elapsed, language, method }
      const band = forecastBand(history, lesson, point)
      // Fixed sampling rule: first usable prediction per phase/language, before knowing the outcome.
      if (validPoint(point) && !run.points.some(item => item.phase === point.phase && item.language === language && item.method === method)) {
        run.points.push({ ...point, ...(band.lower === null ? {} : { lower: band.lower, upper: band.upper! }) })
      }
      return band
    },
    reset: () => { run.points = []; run.elapsed = 0; run.furthest = 0; history = readForecastHistory() }
  }
}
export function discardStudyForecast(lesson: string): void {
  try {
    localStorage.setItem(FORECAST_RUN_PREFIX + lesson + ':revision', crypto.randomUUID())
    localStorage.removeItem(FORECAST_RUN_PREFIX + lesson)
  } catch { /* Optional local calibration must not block study. */ }
}
/** Call only after a successful explicit transition to completed. Idempotent. */
export function completeStudyForecast(lesson: string, fingerprint: string): boolean {
  if (failedRuns.has(lesson)) return false
  const run = readRun(lesson, fingerprint)
  try {
    if (run.furthest >= 0.9 && run.elapsed > 0) {
      const history = readForecastHistory()
      for (const point of run.points) {
        const actual = run.elapsed - point.elapsed
        if (actual < 0) continue
        // Repeated study of the same lesson replaces its former case, never adds independence.
        const previous = history.findIndex(item => item.lesson === lesson && item.phase === point.phase && item.language === point.language && item.method === point.method)
        if (previous >= 0) history.splice(previous, 1)
        history.push({ ...point, lesson, actual })
      }
      localStorage.setItem(FORECAST_HISTORY_KEY, JSON.stringify(history.slice(-600)))
    }
    localStorage.setItem(FORECAST_RUN_PREFIX + lesson + ':revision', crypto.randomUUID())
    localStorage.removeItem(FORECAST_RUN_PREFIX + lesson)
    return true
  } catch { return false }
}
