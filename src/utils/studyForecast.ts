/** Prospective, local forecast/outcome pairs. No lesson text or wall-clock time. */
export const FORECAST_HISTORY_KEY = 'lezionify.study-forecast.history.v1'
export const FORECAST_RUN_PREFIX = 'lezionify.study-forecast.run.v1:'
export const FORECAST_MIN_LESSONS = 20
export const FORECAST_LEVEL = 0.9
export type ForecastMethod = 'paragraph-v2' | 'viewport-v2'
export type ForecastPhase = 0 | 1 | 2
export interface ForecastPoint {
  language: string; method: ForecastMethod; phase: ForecastPhase
  predicted: number; elapsed: number; lower?: number; upper?: number
}
export interface ForecastCase extends ForecastPoint { lesson: string; actual: number }
interface ForecastRun { fingerprint: string; elapsed: number; furthest: number; points: ForecastPoint[] }
export interface ForecastBand {
  lessons: number; margin: number | null; lower: number | null; upper: number | null
  checked: number; covered: number
}
export const forecastPhase = (position: number): ForecastPhase => position < 1 / 3 ? 0 : position < 2 / 3 ? 1 : 2
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
function validPoint(value: ForecastPoint): boolean {
  return Boolean(value && ['it', 'en'].includes(value.language) && ['paragraph-v2', 'viewport-v2'].includes(value.method) &&
    [0, 1, 2].includes(value.phase) && finite(value.predicted) && value.predicted > 0 && finite(value.elapsed) &&
    ((value.lower === undefined && value.upper === undefined) || (finite(value.lower) && finite(value.upper) && value.upper >= value.lower)))
}
export function readForecastHistory(): ForecastCase[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(FORECAST_HISTORY_KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((item): item is ForecastCase => validPoint(item) &&
      typeof item.lesson === 'string' && finite(item.actual)).slice(-600) : []
  } catch { return [] }
}
/** One residual per lesson/phase/language/method; exclude the current lesson. */
export function forecastBand(history: ForecastCase[], lesson: string, point: Pick<ForecastPoint, 'language' | 'method' | 'phase' | 'predicted'>): ForecastBand {
  const unique = new Map<string, ForecastCase>()
  for (const item of history) if (validPoint(item) && finite(item.actual) && item.lesson !== lesson && item.language === point.language && item.method === point.method && item.phase === point.phase) unique.set(item.lesson, item)
  const cases = [...unique.values()].slice(-100)
  const checked = cases.filter(item => item.lower !== undefined && item.upper !== undefined)
  const result: ForecastBand = { lessons: cases.length, margin: null, lower: null, upper: null,
    checked: checked.length, covered: checked.filter(item => item.actual >= item.lower! && item.actual <= item.upper!).length }
  if (cases.length < FORECAST_MIN_LESSONS || !finite(point.predicted) || point.predicted <= 0) return result
  const scores = cases.map(item => Math.abs(item.actual - item.predicted) / Math.max(60, item.predicted)).sort((a, b) => a - b)
  const rank = Math.ceil((scores.length + 1) * FORECAST_LEVEL)
  if (rank > scores.length) return result
  const margin = scores[rank - 1] * Math.max(60, point.predicted)
  if (!Number.isFinite(margin) || !Number.isFinite(point.predicted + margin)) return result
  return { ...result, margin, lower: Math.max(0, point.predicted - margin), upper: point.predicted + margin }
}
function readRun(lesson: string, fingerprint: string): ForecastRun {
  try {
    const value = JSON.parse(localStorage.getItem(FORECAST_RUN_PREFIX + lesson) ?? 'null')
    if (value?.fingerprint === fingerprint && finite(value.elapsed) && finite(value.furthest) && value.furthest <= 1 &&
      Array.isArray(value.points) && value.points.length <= 6 && value.points.every(validPoint)) return value
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
        localStorage.setItem(FORECAST_RUN_PREFIX + lesson, JSON.stringify(run)); return true
      } catch { return false }
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
      if (validPoint(point) && !run.points.some(item => item.phase === point.phase && item.language === language)) {
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
  const run = readRun(lesson, fingerprint)
  try {
    if (run.furthest >= 0.9 && run.elapsed > 0) {
      const history = readForecastHistory()
      for (const point of run.points) {
        const actual = run.elapsed - point.elapsed
        if (actual < 0) continue
        // Repeated study of the same lesson replaces its former case, never adds independence.
        const previous = history.findIndex(item => item.lesson === lesson && item.phase === point.phase && item.language === point.language)
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

export function forecastBandLabel(predicted: number, band: ForecastBand): string {
  if (predicted <= 0) return 'Tempo previsto già coperto; conferma il completamento quando hai finito di studiare.'
  if (band.margin === null) return `Margine statistico non disponibile: ${band.lessons}/${FORECAST_MIN_LESSONS} lezioni confrontabili in questa fase.`
  const minutes = Math.max(1, Math.ceil(predicted / 60))
  const margin = Math.max(1, Math.ceil(band.margin / 60))
  const range = `${Math.max(0, Math.floor(band.lower! / 60))}–${Math.ceil(band.upper! / 60)} min`
  const coverage = band.checked ? ` Copertura successiva osservata: ${Math.round(band.covered / band.checked * 100)}% su ${band.checked} ${band.checked === 1 ? 'lezione' : 'lezioni'}.` : ' Copertura su lezioni successive: ancora da verificare.'
  return `Studio restante: circa ${minutes} ± ${margin} min (${range}). Livello nominale 90%; margine empirico da ${band.lessons} lezioni confrontabili.${coverage}`
}
