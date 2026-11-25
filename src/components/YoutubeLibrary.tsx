import { useYoutubeAudio } from '../hooks/useYoutubeAudio'
import { playYoutubeAudio, pauseYoutubeAudio, useYoutubePlayback } from '../utils/youtubePlayback'
import { YoutubeLocalPlayer } from './YoutubeLocalPlayer'
import { useEffect, useRef, useState } from 'react'
import catalog from '../../shared/musicCatalog.json'
import { formatMusicTimestamp, parseMusicTracks, validateMusicTracks, type MusicTrack } from '../../shared/music'
import { MusicArtwork } from './MusicArtwork'
import { MusicIcon } from './MusicIcon'
import { useToolSettings } from './ToolSettingsContext'

const storageKey = 'lezionify:compilation-tracks:v1'
const selectionKey = 'lezionify:music-youtube-selection:v1'
const thumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
export function YoutubeLibrary({ configuration = false }: { configuration?: boolean }) {
  const settings = useToolSettings()
  const local = useYoutubeAudio()
  const playback = useYoutubePlayback()
  const [selected, setSelected] = useState(() => { try { const id = localStorage.getItem(selectionKey); return catalog.some(item => item.videoId === id) ? id! : catalog[0].videoId } catch { return catalog[0].videoId } })
  const [overrides, setOverrides] = useState<Record<string, MusicTrack[]>>({})
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [opened, setOpened] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const alive = useRef(true)
  const entry = catalog.find(item => item.videoId === selected)!
  const tracks = overrides[selected] ?? entry.tracks
  const downloaded = local.items.find(item => item.videoId === selected)
  const downloading = downloaded?.phase === 'downloading' || downloaded?.phase === 'converting'
  const activeDownload = local.items.find(item => item.phase === 'downloading' || item.phase === 'converting')
  const anyDownload = Boolean(activeDownload)
  const ready = downloaded?.phase === 'ready'
  const localAction = async (start = 0) => {
    if (ready) {
      if (downloaded.durationSeconds && start >= downloaded.durationSeconds) { setError('Il punto scelto supera la durata dell’audio scaricato. Correggi il timestamp oppure riproduci dall’inizio.'); return }
      setError(''); await playYoutubeAudio(selected, start); await local.refresh()
    }
    else await local.download(selected)
  }
  const actionLabel = ready ? 'Riproduci' : downloading ? downloaded.phase === 'converting' ? 'Conversione…' : `Download${downloaded.progress !== undefined ? ` ${downloaded.progress}%` : '…'}` : 'Scarica in locale'
  const localButton = (start = 0, title = entry.title) => <button type="button" className="music-primary youtube-local-action"
    aria-label={`${ready ? 'Riproduci in locale' : 'Scarica in locale'} ${title}`} disabled={local.loading || anyDownload && !ready}
    onClick={() => void localAction(start)}><MusicIcon name={ready ? 'play' : 'download'} size={16} />{actionLabel}</button>
  useEffect(() => {
    alive.current = true
    try {
      const text = localStorage.getItem(storageKey)
      if (text) {
        const saved: unknown = JSON.parse(text)
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('format')
        for (const [id, value] of Object.entries(saved)) { if (!catalog.some(item => item.videoId === id)) throw new Error('video'); validateMusicTracks(value) }
        setOverrides(saved as Record<string, MusicTrack[]>)
      }
    } catch { setError('Correzioni locali non leggibili. Sono mostrati i timestamp originali; puoi salvarli nuovamente.') }
    return () => { alive.current = false }
  }, [])
  const choose = (id: string) => { setSelected(id); setEditing(false); setError(''); setOpened(null); try { localStorage.setItem(selectionKey, id) } catch { setError('Impossibile ricordare il video selezionato.') } }
  const open = async (start: number) => {
    setError(''); setBusy(true)
    try { await window.archive.openCompilation(selected, start); if (alive.current) setOpened(start) }
    catch { if (alive.current) setError('Impossibile aprire YouTube. Riprova.') }
    finally { if (alive.current) setBusy(false) }
  }
  const save = () => {
    try { const changed = { ...overrides, [selected]: parseMusicTracks(draft) }; localStorage.setItem(storageKey, JSON.stringify(changed)); setOverrides(changed); setEditing(false); setError('') }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Salvataggio non riuscito.') }
  }
  if (configuration) return <section className="youtube-settings" aria-label="Timestamp YouTube">
    <h3>Titoli e timestamp YouTube</h3>
    <label>Compilation<select aria-label="Compilation da configurare" value={selected} onChange={event => choose(event.target.value)}>{catalog.map(item => <option key={item.videoId} value={item.videoId}>{item.title}</option>)}</select></label>
    <p>{tracks.length} tracce · le correzioni restano sul PC. Una riga per traccia: 00:00 Titolo, in ordine crescente.</p>
    <button type="button" onClick={() => { setDraft(tracks.map(track => `${formatMusicTimestamp(track.start)} ${track.title}`).join('\n')); setEditing(true) }}>Modifica titoli e timestamp</button>
    {editing && <div className="youtube-editor"><label>Una traccia per riga: 00:00 Titolo<textarea aria-label="Titoli e timestamp" value={draft} onChange={event => setDraft(event.target.value)} /></label><div><button type="button" onClick={save}>Salva timestamp sul PC</button><button type="button" onClick={() => setEditing(false)}>Annulla</button></div></div>}
    {error && <p role="alert" className="music-error">{error}</p>}
  </section>
  return <div className="youtube-library">
    <div className="music-section-heading"><div><span className="music-eyebrow">LA TUA SELEZIONE</span><h3>Un sottofondo per ogni sessione</h3></div><span className="music-count">{catalog.length} compilation</span></div>
    <div className="youtube-collection-grid" role="group" aria-label="Compilation YouTube">{catalog.map(item => <button type="button" className={`youtube-collection-card${selected === item.videoId ? ' is-selected' : ''}`} key={item.videoId} aria-pressed={selected === item.videoId} onClick={() => choose(item.videoId)}><MusicArtwork src={thumbnail(item.videoId)} title={item.title} wide /><span><strong title={item.title}>{item.title}</strong><small>{(overrides[item.videoId] ?? item.tracks).length ? `${(overrides[item.videoId] ?? item.tracks).length} tracce` : 'Video completo'}</small></span>{selected === item.videoId && <MusicIcon name="check" size={16} />}</button>)}</div>
    <section className="youtube-detail" aria-label={`Tracce di ${entry.title}`}>
      <div className="youtube-detail-heading"><div><span className="music-source-label"><span className="youtube-brand-icon"><MusicIcon name="play" size={12} /></span>YouTube</span><h3>{entry.title}</h3><p>{tracks.length ? `${tracks.length} tracce · scegli da dove iniziare` : 'Apri il video completo oppure aggiungi i tuoi timestamp.'}</p></div><button type="button" className="music-primary youtube-play" disabled={busy} onClick={() => void open(0)}><MusicIcon name="play" size={18} /> Apri su YouTube <MusicIcon name="external" size={14} /></button>{localButton()}</div>
      <YoutubeLocalPlayer />
      {activeDownload && activeDownload.videoId !== selected && <div className="youtube-download-status" role="status"><span>{activeDownload.phase === 'converting' ? 'Conversione' : 'Download'} · {catalog.find(item => item.videoId === activeDownload.videoId)?.title}</span><button type="button" className="music-text-button" onClick={() => void local.cancel(activeDownload.videoId)}>Annulla download</button></div>}
      {(downloading || ready) && <div className="youtube-download-status" role="status"><span>{downloading ? `${actionLabel} · ${entry.title}` : 'Compilation disponibile offline · tutte le tracce usano lo stesso audio locale.'}</span>{downloading && <button type="button" className="music-text-button" onClick={() => void local.cancel(selected)}>Annulla download</button>}{ready && playback.videoId === selected && playback.playing && <button type="button" className="music-text-button" onClick={pauseYoutubeAudio}>Pausa</button>}</div>}
      <div className="youtube-track-heading"><span>#</span><span>TITOLO</span><span>INIZIO</span><span /></div>
      <ol className="music-track-list">{tracks.map((track, index) => <li key={track.start} className={`youtube-track-row ${opened === track.start ? 'is-opened' : ''}`}><button className="youtube-track-open" type="button" disabled={busy} onClick={() => void open(track.start)} aria-label={`Apri ${track.title} da ${formatMusicTimestamp(track.start)}`}><span className="music-track-number">{opened === track.start ? <MusicIcon name="external" size={14} /> : index + 1}</span><strong title={track.title}>{track.title}</strong><time>{formatMusicTimestamp(track.start)}</time><MusicIcon name="external" size={15} /></button>{localButton(track.start, track.title)}</li>)}</ol>
      <div className="youtube-list-footer"><p>{opened !== null ? `Aperto su YouTube da ${formatMusicTimestamp(opened)}. I controlli di riproduzione sono nel browser.` : 'Apri la traccia su YouTube oppure scarica una sola volta la compilation per ascoltarla offline.'}</p><button type="button" className="music-text-button" onClick={() => settings.open('music')}>Gestisci timestamp nelle Impostazioni</button></div>

    </section>
    {(error || local.error || downloaded?.error) && <p role="alert" className="music-error">{error || local.error || downloaded?.error}</p>}
  </div>
}
