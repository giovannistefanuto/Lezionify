import { useEffect, useState } from 'react'
import type { MobileCompanionStatus } from '../../shared/mobileCompanion'

export function MobileCompanionSettings() {
  const api = window.archive?.mobileCompanion
  const [status, setStatus] = useState<MobileCompanionStatus | null>(null)
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')
  const [token, setToken] = useState('')
  const [pairing, setPairing] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (api) void api.state().then(setStatus).catch(() => setMessage('Impossibile leggere lo stato.')) }, [api])
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setMessage('')
    try { await action() } catch { setMessage('Operazione non riuscita. Controlla configurazione e connessione.') } finally { setBusy(false) }
  }
  if (!api) return null
  return <section className="publishing-settings" aria-labelledby="mobile-settings-title">
    <h4 id="mobile-settings-title">Statistiche e Memo sul telefono Android</h4>
    <p>Invia un riepilogo cifrato a un repository GitHub pubblico dedicato. Il telefono mostra l’ultima copia disponibile; l’invio avviene durante l’uso di Lezionify, al massimo ogni cinque minuti se i dati cambiano.</p>
    {status?.enabled ? <>
      <p>Collegato a <strong>{status.destination}</strong>{status.publishedAt ? ` · Ultimo invio: ${new Date(status.publishedAt).toLocaleString('it-IT')}` : ' · Nessun invio completato'}</p>
      <label><input type="checkbox" checked={status.memoEnabled === true} disabled={busy} onChange={event => { const enabled = event.target.checked; void run(async () => setStatus(await api.setMemoEnabled(enabled))) }} /> Sincronizza anche Memo: gruppi, attività e note (sola lettura)</label>
      <p>Memo viene cifrato prima dell’invio. Il nuovo widget Android usa lo stesso abbinamento. Disattivando l’opzione, il prossimo invio rimuove Memo dalla copia corrente; la cronologia cifrata su GitHub rimane.</p>
      {status.error && <p role="alert">{status.error}</p>}
      <button type="button" disabled={busy} onClick={() => void run(async () => setStatus(await api.publish()))}>Aggiorna ora</button>{' '}
      <button type="button" disabled={busy} onClick={() => void run(async () => setPairing(await api.pairing()))}>Mostra codice di abbinamento</button>{' '}
      <button type="button" disabled={busy} onClick={() => { if (window.confirm('Disattivare il collegamento ed eliminare la chiave locale? Il file cifrato già presente su GitHub rimarrà online.')) void run(async () => { setStatus(await api.disable()); setPairing('') }) }}>Disattiva</button>
      {pairing && <label className="publishing-field">Codice di abbinamento — trattalo come una password
        <textarea readOnly rows={4} value={pairing} onFocus={event => event.currentTarget.select()} />
        <span>Incollalo nell’app Android. Non condividere il codice con altre persone.</span>
      </label>}
    </> : <>
      <p>Usa un repository pubblico separato e un token GitHub limitato a quel repository con permesso Contents di lettura e scrittura. Nomi dei corsi, conteggi e tempi sono cifrati prima dell’invio.</p>
      {status?.error && <p role="alert">{status.error}</p>}
      <label className="publishing-field">Proprietario GitHub<input value={owner} onChange={event => setOwner(event.target.value)} autoComplete="off" /></label>
      <label className="publishing-field">Nome repository dati<input value={repo} onChange={event => setRepo(event.target.value)} autoComplete="off" /></label>
      <label className="publishing-field">Ramo<input value={branch} onChange={event => setBranch(event.target.value)} autoComplete="off" /></label>
      <label className="publishing-field">Token GitHub<input type="password" value={token} onChange={event => setToken(event.target.value)} autoComplete="off" /></label>
      <button type="button" disabled={busy || !owner || !repo || !branch || !token || !!status?.error} onClick={() => void run(async () => { setStatus(await api.configure({ owner, repo, branch, token })); setToken(''); setStatus(await api.publish()) })}>Attiva e invia</button>
    </>}
    {message && <p role="status">{message}</p>}
  </section>
}
