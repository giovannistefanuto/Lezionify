import { useEffect, useRef, useState } from 'react'
import { useOfflineTranslationStatus } from '../hooks/useOfflineTranslationStatus'

export function OfflineTranslationSettings() {
  const { status, statusError, updateStatus } = useOfflineTranslationStatus()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const alive = useRef(true)
  const working = useRef(false)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  const install = async () => {
    if (working.current) return
    working.current = true; setBusy(true); setError(''); setMessage('')
    try {
      const value = await window.archive.installOfflineTranslation()
      if (alive.current) { updateStatus(value); setMessage('Modelli verificati e pronti per la traduzione offline.') }
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Installazione non riuscita. Riprova.') }
    finally { working.current = false; if (alive.current) setBusy(false) }
  }
  return <section className="offline-translation-settings" aria-label="Traduttore offline">
    <h3>Traduttore offline</h3>
    <p>Mozilla/Bergamot · italiano ↔ inglese. Le frasi vengono tradotte sul PC e non inviate online. I termini tecnici possono essere imprecisi.</p>
    <p>Download dei due modelli: circa 53 MB, 74 MB su disco. Il download contiene solo i modelli, senza le tue frasi.</p>
    <p role="status">{busy || status?.installing ? 'Installazione in corso…' : status?.installed ? 'Modelli installati' : status ? 'Modelli non installati' : 'Controllo dei modelli…'}</p>
    <button type="button" disabled={busy || status?.installing} onClick={() => void install()}>{status?.installed ? 'Verifica / ripara modelli' : 'Scarica / ripara modelli offline'}</button>
    {message && <p role="status">{message}</p>}{(error || statusError) && <p role="alert">{error || statusError}</p>}
  </section>
}
