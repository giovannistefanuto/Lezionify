export const STUDY_BINS = 20
export const STUDY_DWELL_SECONDS = 45
export const STUDY_MIN_SECONDS = 600
export interface StudyEstimateState {
  fingerprint: string
  baseline: number
  seconds: number
  dwell: number[]
}
export function newStudyEstimate(
  fingerprint: string,
  baseline = 0
): StudyEstimateState {
  return {
    fingerprint,
    baseline: Math.max(0, Math.min(STUDY_BINS - 1, baseline)),
    seconds: 0,
    dwell: Array(STUDY_BINS).fill(0)
  }
}
export function restoreStudyEstimate(
  value: unknown,
  fingerprint: string
): StudyEstimateState {
  const item = value as StudyEstimateState | null
  if (
    !item ||
    item.fingerprint !== fingerprint ||
    !Number.isInteger(item.baseline) ||
    item.baseline < 0 ||
    item.baseline >= STUDY_BINS ||
    !Number.isFinite(item.seconds) ||
    item.seconds < 0 ||
    !Array.isArray(item.dwell) ||
    item.dwell.length !== STUDY_BINS ||
    item.dwell.some((seconds) => !Number.isFinite(seconds) || seconds < 0)
  )
    return newStudyEstimate(fingerprint)
  return { ...item, dwell: [...item.dwell] }
}
/** A single visible interval can gain dwell; jumps never fill the intervals between. */
export function sampleStudy(
  state: StudyEstimateState,
  seconds: number,
  bin: number | null
): StudyEstimateState {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 5) return state
  const dwell = [...state.dwell]
  if (
    bin !== null &&
    Number.isInteger(bin) &&
    bin >= state.baseline &&
    bin < STUDY_BINS
  )
    dwell[bin] += seconds
  return { ...state, seconds: state.seconds + seconds, dwell }
}
/** Credit only the portion currently visible, never the path of a scroll jump.
 * Coordinates are fractional bins (0..STUDY_BINS). Partial bins receive
 * proportional dwell, so a thin visible edge cannot count as a whole page.
 */
export function sampleVisibleStudy(
  state: StudyEstimateState,
  seconds: number,
  visible: { start: number; end: number } | null
): StudyEstimateState {
  const next = sampleStudy(state, seconds, null)
  if (next === state || !visible || !Number.isFinite(visible.start) || !Number.isFinite(visible.end) ||
    visible.start < 0 || visible.end > STUDY_BINS || visible.end <= visible.start) return next
  for (let bin = Math.max(state.baseline, Math.floor(visible.start)); bin < Math.ceil(visible.end); bin++) {
    const fraction = Math.max(0, Math.min(bin + 1, visible.end) - Math.max(bin, visible.start))
    next.dwell[bin] += seconds * fraction
  }
  return next
}
export function estimateStudyMinutes(state: StudyEstimateState): number | null {
  let end = state.baseline
  while (end < STUDY_BINS && state.dwell[end] >= STUDY_DWELL_SECONDS) end++
  const completed = end - state.baseline
  const total = STUDY_BINS - state.baseline
  if (
    state.seconds < STUDY_MIN_SECONDS ||
    completed / total < 0.6 ||
    end === STUDY_BINS
  )
    return null
  const minutes = (state.seconds * (total - completed)) / completed / 60
  return minutes < 30 ? minutes : null
}
export function studyEstimateLabel(minutes: number): string {
  const low = Math.max(0, Math.floor(minutes / 5) * 5)
  return `Studio restante: circa ${low || 'meno di'}${low ? '–' : ' '}${low + 5} min`
}
export const STUDY_ESTIMATE_PREFERENCE = 'lezionify.study-estimate.enabled'
export function isStudyEstimateEnabled(): boolean {
  try {
    return localStorage.getItem(STUDY_ESTIMATE_PREFERENCE) !== 'false'
  } catch {
    return true
  }
}
