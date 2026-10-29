// Count only ticks already credited by the study tracker, across Focus visits.
const seconds = new Map<string, number>()
const pending = new Set<string>()
export function creditFocusRagStudy(course: string | null) {
  if (!course) return
  const next = (seconds.get(course) ?? 0) + 1
  seconds.set(course, next)
  if (next % 600 || pending.has(course) || !window.archive.getCourseRag) return
  pending.add(course)
  void window.archive.getCourseRag(course).then(state => {
    if (state.semantic?.status !== 'ready' || state.indexing?.status === 'running' || state.indexing?.status === 'complete') return
    return window.archive.manageCourseIndex(course, 'start')
  }).catch(() => { /* Optional local preparation must not interrupt studying. */ }).finally(() => pending.delete(course))
}
