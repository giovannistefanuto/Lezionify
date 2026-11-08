/** Shared exclusions for the clock, paragraph samples and forecast outcomes. */
export const STUDY_TICK_EVENT = 'lezionify-study-tick'

export function creditStudyTick(lectureId: string): void {
  document.dispatchEvent(new CustomEvent(STUDY_TICK_EVENT, { detail: { lectureId, seconds: 1 } }))
}

export function studySurfaceBlocked(): boolean {
  return document.hidden || !document.hasFocus() || Boolean(document.querySelector(
    '.modal-overlay, .quick-capture-backdrop, [data-dictionary-overlay], [aria-modal="true"], .music-backdrop'
  ))
}
