import { useState } from 'react'
import { useUpdateSave } from './useUpdateSave'

/** Persist an unfinished local form only for an updater restart, without committing it. */
export function readRestartDraft<T>(key: string, fallback: T): T {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    return saved?.version === 1 ? saved.value as T : fallback
  } catch { return fallback }
}

export function useRestartDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState(() => readRestartDraft(key, initial))
  useUpdateSave(async () => { localStorage.setItem(key, JSON.stringify({ version: 1, value })) })
  return [value, setValue, () => localStorage.removeItem(key)] as const
}
