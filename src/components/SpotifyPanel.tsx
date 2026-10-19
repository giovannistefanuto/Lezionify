import { useEffect, useRef, useState } from 'react'
import { spotifyCallback, type SpotifyConnection } from '../../shared/spotify'
import { SpotifyWorkspace } from './SpotifyWorkspace'
import { MusicIcon } from './MusicIcon'
import { useToolSettings } from './ToolSettingsContext'

export function SpotifyPanel({ configuration = false }: { configuration?: boolean }) {
  const settings = useToolSettings()
  const [connection, setConnection] = useState<SpotifyConnection | null>(null)
  const [clientId, setClientId] = useState('')
  const [busy, setBusy] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    void window.archive.spotifyConnection().then(value => { if (alive.current) { setConnection(value); setClientId(value.clientId) } }).catch(() => { if (alive.current) setError('Configurazione Spotify non disponibile. Salva nuovamente il Client ID.') })
    return () => { alive.current = false }
  }, [])
  const action = async (task: () => Promise<void>) => {
    setBusy(true); setError(''); setMessage('')
    try { await task() } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Operazione Spotify non riuscita.') }
    finally { if (alive.current) setBusy(false) }
  }
  const connect = (library = false) => {
    setLoggingIn(true)
    return action(async () => { try {
      const value = await (library ? window.archive.connectSpotifyLibrary() : window.archive.connectSpotify())
      if (alive.current) { setConnection(value); setMessage(library ? 'Playlist e preferiti abilitati.' : 'Account collegato.') }
    } finally { if (alive.current) setLoggingIn(false) } })
  }
  const brand = <img className="spotify-brand" src="./music/spotify-logo.svg" alt="Spotify" />
  return <section className={`spotify-panel${configuration ? ' spotify-settings' : ''}`} aria-label="Spotify">
    {configuration && <><h3>Spotify</h3><p>Le transizioni tra brani si gestiscono nel player Spotify. Lezionify non applica dissolvenze o sovrapposizioni alla musica Spotify.</p><p>Collega il tuo account una volta. Lezionify ricorda il computer e aggiorna automaticamente la riproduzione.</p>
      <details open={!connection?.clientId}><summary>Configurazione account Spotify</summary>
        <p>Nel Developer Dashboard registra questo Redirect URI:</p><code>{spotifyCallback}</code>
        <label>Client ID Spotify<input aria-label="Client ID Spotify" value={clientId} maxLength={32} disabled={busy} onChange={event => setClientId(event.target.value)} /></label>
        <button type="button" disabled={busy || !/^[a-f0-9]{32}$/i.test(clientId)} onClick={() => void action(async () => { const value = await window.archive.configureSpotify(clientId); if (alive.current) { setConnection(value); setMessage('Client ID salvato.') } })}>Salva Client ID</button>
      </details></>}
    {!connection?.connected && <div className="music-empty spotify-welcome"><div className="music-welcome-mark">{brand}</div><h3>La tua musica, mentre studi</h3><p>Ritrova quello che stai ascoltando, le tue playlist e i brani preferiti.</p>
      {!connection?.clientId && <p>Inserisci il Client ID nelle impostazioni per iniziare.</p>}
      <button className="music-primary" type="button" disabled={configuration && (busy || !connection?.clientId)} onClick={() => configuration ? void connect() : settings.open('music')}>{configuration ? 'Collega account Spotify' : 'Apri Impostazioni musica'}</button>
      {loggingIn && <button type="button" onClick={() => void window.archive.disconnectSpotify().catch(() => {})}>Annulla collegamento</button>}
    </div>}
    {connection?.connected && (configuration ? <div className="spotify-account"><p><MusicIcon name="check" /> Account collegato su questo PC.</p>
      {!connection.libraryConnected && <button type="button" disabled={busy} onClick={() => void connect(true)}>Attiva playlist e preferiti</button>}
      <button type="button" disabled={busy} onClick={() => void action(async () => { const value = await window.archive.disconnectSpotify(); if (alive.current) { setConnection(value); setMessage('Credenziali rimosse da Lezionify.') } })}>Scollega account</button>
    </div> : <SpotifyWorkspace connection={connection} onLibraryConnect={async () => settings.open('music')} connecting={busy} />)}
    {busy && <p role="status" className="music-feedback">{loggingIn ? 'Completa l’autorizzazione nel browser…' : 'Operazione in corso…'}</p>}
    {message && <p role="status" className="music-feedback">{message}</p>}{error && <p role="alert" className="music-error">{error}</p>}
  </section>
}
