import { useEffect, useState } from 'react'
import type { OfflineTranslationStatus } from '../../shared/offlineTranslation'

export function useOfflineTranslationStatus(active = true, revision = 0) {
  const [status, setStatus] = useState<OfflineTranslationStatus | null>(null)
  const [statusError, setStatusError] = useState('')
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    if (!active) return
    const refresh = async () => {
      try {
        const value = await window.archive.offlineTranslationStatus()
        if (!cancelled) {
          setStatus(value); setStatusError('')
          // A download belongs to main, so keep observing it after a view remount.
          if (value.installing) timer = setTimeout(() => void refresh(), 1000)
        }
      } catch { if (!cancelled) setStatusError('Stato dei modelli non disponibile. Apri le Impostazioni e riprova.') }
    }
    void refresh()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [active, revision])
  return { status, statusError, updateStatus: (value: OfflineTranslationStatus) => { setStatus(value); setStatusError('') } }
}
