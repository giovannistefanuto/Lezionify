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
  if (document.querySelector('.music-backdrop')) reasons.push('music')
  if (document.querySelector('[data-study-exclusion="reminder-settings"]')) reasons.push('modal')
  if (!reasons.some(r=>r === 'memo' || r === 'music' || r === 'modal') &&
    [...document.querySelectorAll('.modal-overlay, [aria-modal="true"]')].some(element => !element.closest('[data-dictionary-overlay]'))) reasons.push('modal')
  return reasons
}
