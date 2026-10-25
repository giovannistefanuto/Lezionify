import { useState } from 'react'

/** Local UI preferences must remain usable when storage is unavailable. */
export function useNumericPreference(
  key: string,
  fallback: number,
  min: number,
  max: number
) {
  const clamp = (value: number) => Math.max(min, Math.min(max, value))
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      const parsed = stored === null ? NaN : Number(stored)
      return Number.isFinite(parsed) ? clamp(parsed) : fallback
    } catch {
      return fallback
    }
  })
  const update = (next: number) => {
    if (!Number.isFinite(next)) return
    const bounded = Math.round(clamp(next) * 100) / 100
    setValue(bounded)
    try {
      localStorage.setItem(key, String(bounded))
    } catch {
      /* Keep the in-memory preference. */
    }
  }
  return [value, update] as const
}
