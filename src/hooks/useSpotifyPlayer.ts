import { useCallback, useEffect, useRef, useState } from 'react'
import { chooseSpotifyComputer, type SpotifyConnection, type SpotifyDevice, type SpotifyPlayback, type SpotifyCommand } from '../../shared/spotify'

export function useSpotifyPlayer(enabled: boolean, connection: SpotifyConnection | null) {
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [selected, setSelected] = useState('')
  const [playback, setPlayback] = useState<SpotifyPlayback | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const generation = useRef(0)
  const working = useRef(false)
  const selectedRef = useRef('')
  const readInFlight = useRef(false)
  const pollAllowed = useRef(true)
  const delayed = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const connectionRef = useRef(connection); connectionRef.current = connection

  const refresh = useCallback(async (manual = false) => {
    if (readInFlight.current || working.current || (!manual && document.visibilityState === 'hidden')) return
    const current = generation.current
    readInFlight.current = true
    if (manual) { pollAllowed.current = true; setLoading(true) }
    try {
      // Serial calls stop after an error (including Retry-After), without a polling storm.
      const nextDevices = await window.archive.spotifyDevices()
      const nextPlayback = await window.archive.spotifyPlayback()
      if (current !== generation.current) return
      setDevices(nextDevices); setPlayback(nextPlayback); setError(''); setMessage('')
      const candidate = chooseSpotifyComputer(nextDevices, nextPlayback?.deviceId, selectedRef.current || connectionRef.current?.preferredDeviceId, connectionRef.current?.computerName)
      selectedRef.current = candidate; setSelected(candidate)
    } catch (failure) {
      if (current === generation.current) { pollAllowed.current = false; setError(failure instanceof Error ? failure.message : 'Spotify non raggiungibile. Riprova.') }
    } finally { if (current === generation.current) { readInFlight.current = false; setLoading(false) } }
  }, [])

  useEffect(() => {
    const current = ++generation.current
    readInFlight.current = false; pollAllowed.current = true
    selectedRef.current = ''; setSelected(''); setDevices([]); setPlayback(null); setError(''); setMessage('')
    if (!enabled) return () => { generation.current++ }
    void refresh(true)
    const timer = setInterval(() => { if (pollAllowed.current) void refresh() }, 10000)
    const visibility = () => { if (document.visibilityState === 'visible' && pollAllowed.current) void refresh() }
    document.addEventListener('visibilitychange', visibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Counter invalidates async work; this is not a DOM ref.
    return () => { if (generation.current === current) generation.current++; clearInterval(timer); clearTimeout(delayed.current); document.removeEventListener('visibilitychange', visibility) }
  }, [enabled, connection?.clientId, refresh])

  const perform = async (task: () => Promise<void>, waitForPlayback = true) => {
    if (working.current) return
    const current = generation.current
    clearTimeout(delayed.current)
    working.current = true; setBusy(true); setError(''); setMessage('')
    try {
      await task()
      if (current === generation.current) {
        setMessage(waitForPlayback ? 'Comando inviato · sincronizzazione…' : 'Computer preferito salvato')
        if (waitForPlayback) { clearTimeout(delayed.current); delayed.current = setTimeout(() => { if (current === generation.current) void refresh(true) }, 800) }
      }
    } catch (failure) { if (current === generation.current) { pollAllowed.current = false; setError(failure instanceof Error ? failure.message : 'Comando Spotify non riuscito.') } }
    finally { working.current = false; if (current === generation.current) setBusy(false) }
  }
  const select = (id: string) => { const current = generation.current; return perform(async () => { await window.archive.selectSpotifyDevice(id); if (current === generation.current) { selectedRef.current = id; setSelected(id) } }, false) }
  const command = (value: SpotifyCommand, argument?: number) => perform(() => window.archive.spotifyCommand(value, selectedRef.current, argument))
  const playItem = (uri: string) => perform(() => window.archive.playSpotifyItem(uri, selectedRef.current))
  return { devices, selected, playback, loading, busy, error, message, refresh: () => refresh(true), select, command, playItem, perform }
}
