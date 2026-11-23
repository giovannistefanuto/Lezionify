import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { deviceNoticePreferences, type DeviceNotice, type DeviceNoticePreferences } from '../../shared/deviceNotices'
import './deviceNotices.css'

export function DeviceNotices() {
  const [notice, setNotice] = useState<(DeviceNotice & { id: number; preview?: boolean }) | null>(null)
  const [target, setTarget] = useState(document.fullscreenElement ?? document.body)
  useEffect(() => {
    let sequence = 0, timer: ReturnType<typeof setTimeout> | undefined
    const show = (value: DeviceNotice, preview = false) => {
      clearTimeout(timer)
      setNotice({ ...value, id: ++sequence, preview })
      timer = setTimeout(() => setNotice(null), 2000)
    }
    const unsubscribe = window.archive.onDeviceNotice?.(value => show(value))
    const preview = (event: Event) => show((event as CustomEvent<DeviceNotice>).detail, true)
    const fullscreen = () => setTarget(document.fullscreenElement ?? document.body)
    window.addEventListener('lezionify:preview-device-notice', preview)
    document.addEventListener('fullscreenchange', fullscreen)
    return () => { unsubscribe?.(); clearTimeout(timer); window.removeEventListener('lezionify:preview-device-notice', preview); document.removeEventListener('fullscreenchange', fullscreen) }
  }, [])
  if (!notice) return null
  const title = notice.kind === 'headphones-disconnected' ? 'Cuffiette disconnesse' : notice.kind === 'headphones' ? 'Cuffiette connesse' : notice.kind === 'ac' ? 'Alimentazione collegata' : 'Alimentazione scollegata'
  return createPortal(<div key={notice.id} className={`device-notice device-notice-${notice.kind}`} role="status" aria-live="polite">
    <span className="device-notice-symbol" aria-hidden="true">{notice.kind.startsWith('headphones') ? <svg width="30" height="36" viewBox="0 0 24 32" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 7L19 23L12 30V2L19 9L5 25" /></svg> : notice.kind === 'ac' ? '⚡' : '🔋'}</span>
    <span><strong>{notice.preview ? `Anteprima · ${title}` : title}</strong><small>{notice.kind.startsWith('headphones') ? notice.name : notice.kind === 'ac' ? 'Il PC usa la corrente' : 'Il PC usa la batteria'}</small></span>
  </div>, target)
}

export function DeviceNoticeSettings() {
  const [preferences, setPreferences] = useState<DeviceNoticePreferences | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let disposed = false
    void window.archive.getSettings().then(settings => {
      if (!disposed) { const value = deviceNoticePreferences(settings.deviceNotices); setPreferences(value); setName(value.headphonesName) }
    }).catch(() => { if (!disposed) setError('Impossibile leggere le impostazioni degli avvisi.') })
    const refresh = () => void window.archive.getDeviceNoticeStatus?.().then(value => {
      if (!disposed) setStatus(value.bluetooth === 'ready' ? 'Rilevamento Bluetooth attivo' : value.bluetooth === 'starting' ? 'Avvio rilevamento Bluetooth…' : 'Rilevamento Bluetooth non disponibile')
    }).catch(() => { if (!disposed) setStatus('Rilevamento Bluetooth non disponibile') })
    refresh(); const timer = setInterval(refresh, 5000)
    return () => { disposed = true; clearInterval(timer) }
  }, [])
  const save = async (next: DeviceNoticePreferences) => {
    setPending(true); setError('')
    try { const saved = deviceNoticePreferences((await window.archive.saveSettings({ deviceNotices: next })).deviceNotices); setPreferences(saved); setName(saved.headphonesName) }
    catch { setError('Impossibile salvare gli avvisi. Riprova.') }
    finally { setPending(false) }
  }
  return <section className="publishing-settings device-notice-settings" aria-labelledby="device-notice-settings-title">
    <h4 id="device-notice-settings-title">Connessioni e alimentazione</h4>
    <p>Avvisi silenziosi di 2 secondi, anche in Full Focus.</p>
    {preferences && <>
      <label className="auto-rotate-checkbox-label"><input type="checkbox" checked={preferences.headphones} disabled={pending} onChange={event => void save({ ...preferences, headphones: event.target.checked })} />Animazione alla connessione e disconnessione delle cuffiette</label>
      <form onSubmit={event => { event.preventDefault(); if (name.trim()) void save({ ...preferences, headphonesName: name.trim() }) }}>
        <label>Nome Bluetooth delle cuffiette<input type="text" maxLength={120} value={name} onChange={event => setName(event.target.value)} disabled={pending} required /></label>
        <button type="submit" disabled={pending || !name.trim() || name.trim() === preferences.headphonesName}>Salva nome</button>
      </form>
      <small>{status}. Usa il nome Bluetooth esatto; il rilevamento riguarda le connessioni Bluetooth classiche su Windows.</small>
      <label className="auto-rotate-checkbox-label"><input type="checkbox" checked={preferences.power} disabled={pending} onChange={event => void save({ ...preferences, power: event.target.checked })} />Animazione quando colleghi o scolleghi la corrente</label>
      <div className="device-notice-previews">{(['headphones', 'headphones-disconnected', 'ac', 'battery'] as const).map(kind => <button key={kind} type="button" onClick={() => window.dispatchEvent(new CustomEvent('lezionify:preview-device-notice', { detail: { kind, name: preferences.headphonesName } }))}>Prova {kind === 'headphones-disconnected' ? 'disconnessione cuffiette' : kind === 'headphones' ? 'cuffiette' : kind === 'ac' ? 'corrente' : 'batteria'}</button>)}</div>
    </>}
    {error && <p role="alert">{error}</p>}
  </section>
}
