import { useEffect, useRef, useState } from 'react'
import type { SpotifyConnection, SpotifyLibraryItem, SpotifyLibraryKind, SpotifyLibraryPage } from '../../shared/spotify'
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer'
import { MusicArtwork } from './MusicArtwork'
import { MusicIcon } from './MusicIcon'
import { musicPreferences } from '../utils/musicPreferences'

const time = (ms: number) => `${Math.floor(ms / 60000)}:${Math.floor(ms / 1000 % 60).toString().padStart(2, '0')}`
export function SpotifyWorkspace({ connection, onLibraryConnect, connecting }: { connection: SpotifyConnection; onLibraryConnect: () => Promise<void>; connecting: boolean }) {
  const player = useSpotifyPlayer(true, connection)
  const { playback, selected } = player
  const [tick, setTick] = useState(Date.now())
  const [seek, setSeek] = useState<number | null>(null)
  const [volume, setVolume] = useState<number | null>(null)
  useEffect(() => { const timer = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(timer) }, [])
  useEffect(() => { setSeek(null); setVolume(null) }, [playback?.observedAt, player.error])
  const onComputer = Boolean(selected && playback?.deviceId === selected)
  const playing = Boolean(onComputer && playback?.playing)
  const elapsed = Math.min(playback?.durationMs || 0, (playback?.progressMs || 0) + (playback?.playing ? Math.max(0, tick - (playback.observedAt ?? tick)) : 0))
  const device = player.devices.find(item => item.id === selected)
  const open = (uri?: string | null) => player.perform(() => uri ? window.archive.openSpotifyItem(uri) : window.archive.openSpotify(), false)
  const disabled = player.busy || !selected
  return <div className="spotify-workspace">
    <div className="music-section-heading"><div><span className="music-eyebrow">IL TUO ASCOLTO</span><h3>Fai spazio alla concentrazione</h3></div><button type="button" className={`music-icon-button${player.loading ? ' is-loading' : ''}`} disabled={player.loading || player.busy} aria-label="Aggiorna Spotify" title="Aggiorna Spotify" onClick={() => void player.refresh()}><MusicIcon name="refresh" /></button></div>
    <section className="spotify-now-playing" aria-label="Lettore Spotify">
      <button type="button" className="spotify-cover-link" title="Apri questo brano su Spotify" onClick={() => void open(playback?.uri)}><MusicArtwork src={playback?.imageUrl} title={playback?.title || 'Copertina del brano'} /></button>
      <div className="spotify-player-body">
        <button type="button" className="spotify-brand-link" aria-label="Apri Spotify" onClick={() => void open()}><img className="spotify-brand" src="./music/spotify-logo.svg" alt="Spotify" /></button>
        <div aria-label="Stato riproduzione Spotify" className="spotify-track-info"><span className="music-eyebrow">{player.loading ? 'SINCRONIZZAZIONE…' : playback ? playback.playing ? 'IN RIPRODUZIONE' : 'IN PAUSA' : 'PRONTO AD ASCOLTARE'}</span><h3 title={playback?.title}>{playback?.title || 'Scegli la tua prossima traccia'}</h3><p title={playback?.artists}>{playback?.artists || 'Apri Spotify sul PC oppure scegli una playlist qui sotto.'}</p></div>
        <div className="spotify-transport">
          <button className="music-icon-button" type="button" disabled={disabled} aria-label="Precedente" title="Precedente" onClick={() => void player.command('previous')}><MusicIcon name="previous" /></button>
          <button className="spotify-play-button" type="button" disabled={disabled} aria-label={playing ? 'Pausa' : 'Riprendi'} title={playing ? 'Pausa' : 'Riprendi'} onClick={() => void player.command(playing ? 'pause' : 'play')}><MusicIcon name={playing ? 'pause' : 'play'} size={27} /></button>
          <button className="music-icon-button" type="button" disabled={disabled} aria-label="Successivo" title="Successivo" onClick={() => void player.command('next')}><MusicIcon name="next" /></button>
          <div className="spotify-volume"><MusicIcon name="volume" size={16} /><input type="range" aria-label="Volume Spotify" min={0} max={100} value={volume ?? playback?.volume ?? 50} disabled={disabled || !onComputer || playback?.volume == null || !playback.canSetVolume} onChange={event => setVolume(Number(event.target.value))} onPointerUp={event => void player.command('volume', Number(event.currentTarget.value))} onKeyUp={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) void player.command('volume', Number(event.currentTarget.value)) }} /></div>
        </div>
        <div className="spotify-progress"><time>{time(seek ?? elapsed)}</time><input type="range" aria-label="Posizione brano Spotify" min={0} max={Math.max(1, playback?.durationMs || 1)} value={seek ?? elapsed} disabled={disabled || !onComputer || !playback?.durationMs} onChange={event => setSeek(Number(event.target.value))} onPointerUp={event => void player.command('seek', Number(event.currentTarget.value))} onKeyUp={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) void player.command('seek', Number(event.currentTarget.value)) }} /><time>{time(playback?.durationMs || 0)}</time></div>
      </div>
    </section>
    <div className="spotify-device-row"><details><summary><MusicIcon name="computer" size={16} /><span>{device?.name || 'Scegli il computer'}<small>{device ? 'Computer ricordato automaticamente' : player.loading ? 'Ricerca dispositivi…' : 'Apri Spotify sul PC per trovarlo'}</small></span></summary><select aria-label="Computer Spotify" disabled={player.busy} value={selected} onChange={event => { if (event.target.value) void player.select(event.target.value) }}><option value="">Scegli un computer</option>{player.devices.map(item => <option key={item.id} value={item.id}>{item.name}{item.active ? ' · attivo' : ''}</option>)}</select></details><button type="button" className="music-text-button" onClick={() => void open()}>Apri Spotify <MusicIcon name="external" size={14} /></button></div>
    {playback && selected && !onComputer && <p className="music-feedback">Stai ascoltando su un altro dispositivo. Premi Riprendi per continuare sul computer scelto.</p>}
    {player.error && <p role="alert" className="music-error">{player.error} <button type="button" onClick={() => void player.refresh()}>Riprova</button></p>}
    {player.message && <p role="status" className="music-feedback">{player.message}</p>}
    <SpotifyLibrary enabled={Boolean(connection.libraryConnected)} onConnect={onLibraryConnect} connecting={connecting} selected={selected} busy={player.busy} onPlay={uri => player.playItem(uri)} onOpen={uri => open(uri)} />
  </div>
}

function SpotifyLibrary({ enabled, onConnect, connecting, selected, busy, onPlay, onOpen }: { enabled: boolean; onConnect: () => Promise<void>; connecting: boolean; selected: string; busy: boolean; onPlay: (uri: string) => Promise<void>; onOpen: (uri: string) => Promise<void> }) {
  const [view, setView] = useState(musicPreferences.library)
  const { kind, offset } = view
  const navigate = (type: SpotifyLibraryKind, start: number) => { const next = { kind: type, offset: start }; setView(next); musicPreferences.selectLibrary(next) }
  const [page, setPage] = useState<SpotifyLibraryPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const revision = useRef(0)
  const load = async (type: SpotifyLibraryKind, offset = 0) => {
    const current = ++revision.current; setLoading(true); setError('')
    try { const next = await window.archive.spotifyLibrary(type, offset); if (current === revision.current) { setPage(next) } }
    catch (failure) { if (current === revision.current) setError(failure instanceof Error ? failure.message : 'Libreria Spotify non disponibile.') }
    finally { if (current === revision.current) setLoading(false) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Revision is an async invalidation counter, not a DOM ref.
  useEffect(() => { setPage(null); if (enabled) void load(kind, offset); return () => { revision.current++ } }, [kind, offset, enabled])
  const card = (item: SpotifyLibraryItem) => <article className="spotify-library-card" key={item.uri}>
    <button type="button" className="music-card-main" disabled={!selected || busy} onClick={() => void onPlay(item.uri)} title={`Riproduci ${item.title}`} aria-label={`Riproduci ${item.title}`}><MusicArtwork src={item.imageUrl} title={item.title} /><strong title={item.title}>{item.title}</strong></button>
    <div className="music-card-caption"><span title={item.subtitle}>{item.subtitle || (item.kind === 'track' ? 'Brano' : 'Playlist')}</span><button className="music-icon-button" type="button" aria-label={`Apri ${item.title} su Spotify`} title="Apri su Spotify" onClick={() => void onOpen(item.uri)}><MusicIcon name="external" size={15} /></button></div>
  </article>
  return <section className="spotify-library" aria-label="La tua libreria Spotify"><div className="music-section-heading"><h3>La tua libreria</h3><div className="music-pills" role="group" aria-label="Raccolta Spotify"><button type="button" aria-pressed={kind === 'playlists'} onClick={() => navigate('playlists', 0)}>Playlist</button><button type="button" aria-pressed={kind === 'tracks'} onClick={() => navigate('tracks', 0)}><MusicIcon name="heart" size={13} /> Brani che ti piacciono</button></div></div>
    {!enabled ? <div className="music-library-consent"><span className="music-heart-tile"><MusicIcon name="heart" size={26} /></span><div><strong>Ritrova la musica che ami</strong><p>Abilita playlist e preferiti dalle Impostazioni con un consenso aggiuntivo, una sola volta.</p></div><button type="button" className="music-primary" disabled={connecting} onClick={() => void onConnect()}>Apri Impostazioni musica</button></div> : <>
      {loading && <div className="music-skeleton-grid" aria-label="Caricamento libreria Spotify">{[0, 1, 2, 3].map(value => <div key={value} />)}</div>}
      {error && <p role="alert" className="music-error">{error} <button type="button" onClick={() => void load(kind, offset)}>Riprova</button></p>}
      {!loading && page && <><div className="spotify-library-grid">{page.items.map(card)}</div>{page.items.length === 0 && <p className="music-empty">{kind === 'tracks' ? 'I brani che salvi su Spotify appariranno qui.' : 'Le playlist che segui su Spotify appariranno qui.'}</p>}<div className="music-library-pagination"><button type="button" disabled={busy} onClick={() => void onOpen('')}>Continua su Spotify <MusicIcon name="external" size={14} /></button>{offset > 0 && <button type="button" onClick={() => navigate(kind, Math.max(0, offset - 20))}>← Pagina precedente</button>}{page.nextOffset !== null && <button type="button" onClick={() => navigate(kind, page.nextOffset!)}>Pagina successiva →</button>}</div></>}
    </>}
  </section>
}
