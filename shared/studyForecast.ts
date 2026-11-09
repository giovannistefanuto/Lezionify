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
export interface ForecastBand {
  lessons: number; margin: number | null; lower: number | null; upper: number | null
  checked: number; covered: number
}
/** Wilson interval for a descriptive coverage proportion, not individual predictive confidence. */
export function coverageWilson(covered: number, count: number): [number, number] | null {
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(covered) || covered < 0 || covered > count) return null
  const z = 1.959963984540054, p = covered / count, d = 1 + z*z/count
  const centre = (p + z*z/(2*count))/d
  const half = z*Math.sqrt(p*(1-p)/count + z*z/(4*count*count))/d
  return [Math.max(0, centre-half), Math.min(1, centre+half)]
}
export const forecastPhase = (position: number): ForecastPhase => position < 1 / 3 ? 0 : position < 2 / 3 ? 1 : 2
export const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
export function validPoint(value: ForecastPoint): boolean {
  return Boolean(value && ['it', 'en'].includes(value.language) && ['paragraph-v2', 'viewport-v2'].includes(value.method) &&
    [0, 1, 2].includes(value.phase) && finite(value.predicted) && value.predicted > 0 && finite(value.elapsed) &&
    ((value.lower === undefined && value.upper === undefined) || (finite(value.lower) && finite(value.upper) && value.upper >= value.lower)))
}
/** One residual per lesson/phase/language/method; exclude the current lesson. */
export function forecastBand(history: ForecastCase[], lesson: string, point: Pick<ForecastPoint, 'language' | 'method' | 'phase' | 'predicted'>): ForecastBand {
  const unique = new Map<string, ForecastCase>()
  for (const item of history) if (validPoint(item) && finite(item.actual) && item.lesson !== lesson && item.language === point.language && item.method === point.method && item.phase === point.phase) { unique.delete(item.lesson); unique.set(item.lesson, item) }
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
export function forecastBandLabel(predicted: number, band: ForecastBand): string {
  if (predicted <= 0) return 'Tempo previsto già coperto; conferma il completamento quando hai finito di studiare.'
  if (band.margin === null) return `Margine statistico non disponibile: ${band.lessons}/${FORECAST_MIN_LESSONS} lezioni confrontabili in questa fase.`
  const minutes = Math.max(1, Math.ceil(predicted / 60))
  const margin = Math.max(1, Math.ceil(band.margin / 60))
  const range = `${Math.max(0, Math.floor(band.lower! / 60))}–${Math.ceil(band.upper! / 60)} min`
  const bounds = coverageWilson(band.covered, band.checked)
  const coverage = band.checked ? ` Copertura successiva osservata: ${Math.round(band.covered / band.checked * 100)}% su ${band.checked} ${band.checked === 1 ? 'lezione' : 'lezioni'} (${band.covered}/${band.checked}; intervallo indicativo 95%: ${Math.floor(bounds![0]*100)}–${Math.ceil(bounds![1]*100)}%).${band.checked < 20 ? ' Verifica ancora limitata.' : ''}` : ' Copertura su lezioni successive: ancora da verificare.'
  return `Studio restante: circa ${minutes} ± ${margin} min (${range}). Livello nominale 90%; margine empirico da ${band.lessons} lezioni confrontabili.${coverage}`
}
