import type { StudyExclusion } from '../../shared/studyHistory'
/** Shared exclusions for the clock, paragraph samples and forecast outcomes. */
export const STUDY_TICK_EVENT = 'lezionify-study-tick'

export function creditStudyTick(lectureId: string): void {
  document.dispatchEvent(new CustomEvent(STUDY_TICK_EVENT, { detail: { lectureId, seconds: 1 } }))
}

export function studySurfaceBlocked(): boolean {
  return studySurfaceExclusions().length > 0
}

export function studySurfaceExclusions(): StudyExclusion[] {
  const reasons: StudyExclusion[] = []
  if (document.hidden || !document.hasFocus()) reasons.push('inactive-window')
  if (document.querySelector('.quick-capture-backdrop')) reasons.push('memo')
  if (document.querySelector('[data-dictionary-overlay]')) reasons.push('translator')
  if (document.querySelector('.music-backdrop')) reasons.push('music')
  if (!reasons.some(r=>r === 'memo' || r === 'translator' || r === 'music') && document.querySelector('.modal-overlay, [aria-modal="true"]')) reasons.push('modal')
  return reasons
}
