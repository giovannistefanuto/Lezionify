const KEY = 'lezionify.study-inactivity.v1'
export interface InactivityProfile {
  observing: boolean
  sessions: Record<string, number>
  gaps: number[]
  thresholdMinutes: number | null
}
export function inactivityProfile(): InactivityProfile {
  try {
    const item = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (item && typeof item.observing === 'boolean' && item.sessions && typeof item.sessions === 'object' && !Array.isArray(item.sessions) && Array.isArray(item.gaps)) {
      const sessions = Object.fromEntries(Object.entries(item.sessions).filter(([, seconds]) => typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0).slice(-200)) as Record<string, number>
      return { observing: item.observing, sessions, gaps: item.gaps.filter((gap: unknown) => typeof gap === 'number' && Number.isFinite(gap) && gap >= 0).slice(-500), thresholdMinutes: Number.isFinite(item.thresholdMinutes) && item.thresholdMinutes >= 3 && item.thresholdMinutes <= 60 ? item.thresholdMinutes : null }
    }
  } catch { /* Optional local observation. */ }
  return { observing: false, sessions: {}, gaps: [], thresholdMinutes: null }
}
export function saveInactivityProfile(profile: InactivityProfile): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
    window.dispatchEvent(new Event('study-inactivity-preference'))
    return true
  } catch { return false }
}
export function proposedInactivityMinutes(profile: InactivityProfile): number | null {
  const sessions = Object.values(profile.sessions).filter(value => Number.isFinite(value) && value >= 60)
  const gaps = profile.gaps.filter(value => Number.isFinite(value) && value >= 5 && value <= 3600).sort((a, b) => a - b)
  if (sessions.length < 3 || sessions.reduce((a, b) => a + b, 0) < 3600 || gaps.length < 10) return null
  return Math.min(60, Math.max(3, Math.ceil(gaps[Math.floor((gaps.length - 1) * 0.95)] / 60 * 1.5)))
}
