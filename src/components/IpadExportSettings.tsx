import { useEffect, useState } from 'react'
import { IPAD_PREFERENCE_EVENT, IPAD_EXPORT_EVENT } from '../utils/ipadAnticipation'
import type { IpadExportStatus } from '../../shared/ipadExport'

export function IpadExportSettings() {
  const [status, setStatus] = useState<IpadExportStatus | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    void window.archive.ipadExportStatus?.().then(setStatus).catch(() => setError('Stato invio iPad non disponibile.'))
  }, [])
  const toggle = async (enabled: boolean) => {
    setBusy(true); setError('')
    try {
      setStatus(await window.archive.ipadExportStatus(enabled))
      window.dispatchEvent(new Event(IPAD_PREFERENCE_EVENT))
    } catch { setError('Preferenza iPad non salvata. Riprova.') }
    finally { setBusy(false) }
  }
  return <section className="settings-field">
    <h4>Schemi su iPad</h4>
    <label><input type="checkbox" checked={status?.enabled ?? false} disabled={!status || busy}
      onChange={event => void toggle(event.target.checked)} /> Invia automaticamente gli schemi tramite Foto di iCloud</label>
    <p>Dopo 5 minuti di studio della lezione e 10 secondi sul paragrafo corrente,
      prepara gli schemi che seguono il prossimo paragrafo. Salva PNG chiari nella cartella
      Foto di iCloud del PC: Apple li sincronizza online con i dispositivi collegati.
      Ogni schema viene salvato una volta per lezione e lingua. Nessuna cancellazione automatica.</p>
    {status && <p>{status.count} {status.count === 1 ? 'schema salvato' : 'schemi salvati'} · {(
      status.bytes < 1024 * 1024 ? status.bytes / 1024 : status.bytes / 1024 / 1024
    ).toLocaleString('it-IT', { maximumFractionDigits: 1 })} {status.bytes < 1024 * 1024 ? 'KB' : 'MB'} esportati complessivamente.</p>}
    {error && <p role="alert">{error}</p>}
  </section>
}

export function IpadExportNotice() {
  const [message, setMessage] = useState('')
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const update = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (typeof detail !== 'string') return
      setMessage(detail)
      clearTimeout(timer)
      timer = setTimeout(() => setMessage(''), 10000)
    }
    window.addEventListener(IPAD_EXPORT_EVENT, update)
    return () => { clearTimeout(timer); window.removeEventListener(IPAD_EXPORT_EVENT, update) }
  }, [])
  return message ? <div className="ipad-export-notice" role="status">{message}<button type="button" aria-label="Chiudi avviso iPad" onClick={() => setMessage('')}>×</button></div> : null
}
