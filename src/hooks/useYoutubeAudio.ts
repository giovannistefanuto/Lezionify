import { useCallback, useEffect, useRef, useState } from 'react'
import type { YoutubeAudioItem } from '../../shared/youtubeAudio'

export function useYoutubeAudio() {
  const [items, setItems] = useState<YoutubeAudioItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const generation = useRef(0)
  const api = window.archive?.youtubeAudio
  const refresh = useCallback(async () => {
    const request = ++generation.current
    try {
      if (!api) return
      const next = await api.status()
      if (request === generation.current) { setItems(next); setError('') }
    } catch { if (request === generation.current) setError('Impossibile verificare i download locali. Riprova.') }
    finally { if (request === generation.current) setLoading(false) }
  }, [api])
  useEffect(() => {
    void refresh()
    window.addEventListener('focus', refresh)
    const invalidate = () => { generation.current++ }
    return () => { invalidate(); window.removeEventListener('focus', refresh) }
  }, [refresh])
  const active = items.some(item => item.phase === 'downloading' || item.phase === 'converting')
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => void refresh(), 1500)
    return () => clearInterval(timer)
  }, [active, refresh])
  const action = async (id: string, cancel = false) => {
    const request = ++generation.current
    try {
      if (!api) throw new Error('Download locale non disponibile in questa versione.')
      const next = await (cancel ? api.cancel(id) : api.download(id))
      if (request === generation.current) { setItems(next); setError('') }
    } catch (error) { if (request === generation.current) setError(error instanceof Error ? error.message : 'Operazione non riuscita.') }
  }
  return { items, error, loading, download: (id: string) => action(id), cancel: (id: string) => action(id, true), refresh }
}
