import { useState } from 'react'
import {
  AMBIENT_SOUNDS,
  type AmbientSoundDefinition
} from '../../shared/ambientSounds'
import { useAmbientSound } from './AmbientSoundContext'
import { MusicIcon } from './MusicIcon'

const ICONS: Record<string, string> = {
  white: '⚪',
  pink: '🌸',
  brown: '🍂',
  rain: '🌧️',
  waves: '🌊',
  stream: '🏞️', birds: '🐦', fireplace: '🔥', storm: '⛈️', 'summer-night': '🦗', wind: '🍃', breeze: '🌬️', 'heavy-rain': '🌧️', 'forest-stream': '💧', 'rain-thunder': '🌩️', campfire: '🪵'
}

export function AmbientSoundPanel() {
  const {
    status,
    playRandom,
    activeSoundId,
    isPlaying,
    volume,
    transitionSeconds,
    setTransitionSeconds,
    isInstalling,
    error,
    pausedByLectureAudio,
    toggle,
    setVolume,
    install
  } = useAmbientSound()

  const [showCredits, setShowCredits] = useState(false)

  const activeSound = AMBIENT_SOUNDS.find((s) => s.id === activeSoundId) ?? null
  const formatMb = (bytes: number) => `${(bytes / 1024 / 1024).toLocaleString('it-IT', { maximumFractionDigits: 1 })} MB`
  const missingBytes = status?.sounds.filter(sound => !sound.installed).reduce((sum, sound) => sum + sound.bytes, 0) ?? AMBIENT_SOUNDS.reduce((sum, sound) => sum + sound.bytes, 0)
  const allInstalled = status?.installed ?? false
  const installedCount = status?.sounds.filter((s) => s.installed).length ?? 0

  const noises = AMBIENT_SOUNDS.filter((s) => s.category === 'noise')
  const natures = AMBIENT_SOUNDS.filter((s) => s.category === 'nature')

  const renderCard = (sound: AmbientSoundDefinition) => {
    const isThisActive = activeSoundId === sound.id
    const isThisPlaying = isThisActive && isPlaying
    const isInstalled =
      status?.sounds.find((s) => s.id === sound.id)?.installed ?? false

    return (
      <div
        key={sound.id}
        className={`ambient-card ${isThisActive ? 'is-active' : ''} ${!isInstalled ? 'is-missing' : ''}`}
      >
        <div className="ambient-card-header">
          <span className="ambient-card-emoji" aria-hidden="true">
            {ICONS[sound.id] || '🎵'}
          </span>
          <div className="ambient-card-info">
            <strong>{sound.title}</strong>

          </div>
        </div>

        <div className="ambient-card-actions">
          {isInstalled ? (
            <button
              type="button"
              className={`ambient-play-btn ${isThisPlaying ? 'is-playing' : ''}`}
              onClick={() => void toggle(sound.id)}
              aria-label={
                isThisPlaying
                  ? `Metti in pausa ${sound.title}`
                  : `Riproduci ${sound.title}`
              }
              title={isThisPlaying ? 'Pausa' : 'Riproduci'}
            >
              <MusicIcon name={isThisPlaying ? 'pause' : 'play'} size={16} />
              <span>
                {isThisPlaying
                  ? 'In riproduzione'
                  : isThisActive
                    ? 'In pausa'
                    : 'Ascolta'}
              </span>
            </button>
          ) : (
            <button type="button" className="music-primary" disabled={isInstalling || !status}
              onClick={() => void install([sound.id])} aria-label={`Scarica ${sound.title}`}>
              {status?.installingSoundId === sound.id ? 'Scaricamento…' : `Scarica (${formatMb(sound.bytes)})`}
            </button>
          )}
        </div>
        {status?.failures?.[sound.id] && <p className="music-error" role="alert">{status.failures[sound.id]}</p>}
      </div>
    )
  }

  return (
    <div className="ambient-panel">
      {/* Barra di controllo attiva persistente */}
      {activeSound && (
        <div className="ambient-player-bar">
          <div className="ambient-player-track">
            <span className="ambient-player-emoji" aria-hidden="true">
              {ICONS[activeSound.id] || '🎵'}
            </span>
            <div>
              <strong>{activeSound.title}</strong>
              <small>{pausedByLectureAudio ? 'In pausa durante l’audio della lezione' : isPlaying ? 'Attivo in sottofondo' : 'In pausa'}</small>
            </div>
          </div>

          <div className="ambient-player-controls">
            <button
              type="button"
              className="ambient-bar-toggle"
              onClick={() => void toggle(activeSound.id)}
              aria-label={isPlaying ? 'Pausa' : 'Riproduci'}
              title={isPlaying ? 'Pausa' : 'Riproduci'}
            >
              <MusicIcon name={isPlaying ? 'pause' : 'play'} size={18} />
            </button>

            <div className="ambient-volume-slider">
              <span title="Volume">
                <MusicIcon name="volume" size={16} />
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Volume sottofondo"
              />
              <span className="ambient-volume-label">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}


      <div className="music-section-heading">
        <div>
          <span className="music-eyebrow">RUMORI E NATURA</span>
          <h3>Suoni di sottofondo</h3>
        </div>
        <span className="music-count">
          {allInstalled
            ? `${AMBIENT_SOUNDS.length} suoni offline pronti`
            : `${installedCount}/${AMBIENT_SOUNDS.length} scaricati`}
        </span>
      </div>

      <button type="button" className="ambient-random-button" disabled={!status} onClick={() => void playRandom()}>Casuale</button>
      <details className="ambient-options"><summary>Opzioni di riproduzione</summary>
      <label className="ambient-transition-setting">
        Dissolvenza tra suoni locali{' '}
        <select
          aria-label="Durata dissolvenza suoni"
          value={transitionSeconds}
          onChange={(event) => setTransitionSeconds(Number(event.target.value))}
        >
          {[1, 2, 4].map((seconds) => (
            <option value={seconds} key={seconds}>
              {seconds} {seconds === 1 ? 'secondo' : 'secondi'}
            </option>
          ))}
        </select>
      </label>
      <p className="music-feedback">
        La dissolvenza riguarda i suoni offline. Per passare da Spotify o
        YouTube, interrompi prima la musica nel rispettivo player.
      </p>
      </details>
      {error && (
        <div className="music-error" role="alert" style={{ marginBottom: 16 }}>
          <span>{error}</span>
        </div>
      )}

      {pausedByLectureAudio && (
        <div className="ambient-lecture-notice" role="status">
          <MusicIcon name="volume" size={16} />
          <span>
            Sottofondo in pausa automatica durante la riproduzione della
            lezione.
          </span>
        </div>
      )}

      {!allInstalled && (
        <div className="ambient-download-banner">
          <div>
            <strong>Scarica i suoni sul computer</strong>
            <p>
              Scegli Scarica su ciascun suono oppure scarica tutti i file mancanti ({formatMb(missingBytes)}).
              I file già presenti e integri vengono conservati. Nessun ascolto parte automaticamente.
            </p>
          </div>
          <button
            type="button"
            className="music-primary"
            disabled={isInstalling || !status}
            onClick={() => void install()}
          >
            {isInstalling
              ? 'Scaricamento in corso…'
              : 'Scaricali tutti'}
          </button>
        </div>
      )}

      <div className="ambient-section">
        <h4 className="ambient-section-title">Rumori continui</h4>
        <div className="ambient-grid">{noises.map(renderCard)}</div>
      </div>

      <div className="ambient-section" style={{ marginTop: 24 }}>
        <h4 className="ambient-section-title">Paesaggi naturali</h4>
        <div className="ambient-grid">{natures.map(renderCard)}</div>
      </div>

      {/* Accordion licenze e attribuzioni */}
      <div className="ambient-credits-section">
        <button
          type="button"
          className="music-text-button ambient-credits-toggle"
          onClick={() => setShowCredits((prev) => !prev)}
        >
          {showCredits
            ? '▲ Nascondi licenze e crediti audio'
            : '▼ Mostra licenze e crediti audio'}
        </button>

        {showCredits && (
          <div className="ambient-credits-box">
            <p>
              Tutti i suoni sono distribuiti sotto licenze libere (Creative
              Commons o pubblico dominio) e restano
              archiviati esclusivamente sul tuo dispositivo:
            </p>
            <ul>
              {AMBIENT_SOUNDS.map((sound) => (
                <li key={sound.id}>
                  <strong>{sound.title}:</strong> {sound.attribution} —{' '}
                  <a
                    href={sound.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {sound.license}
                  </a>{' '}
                  (
                  <a
                    href={sound.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    fonte
                  </a>
                  )
                </li>
              ))}
            </ul>
            {!isInstalling && (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="music-text-button"
                  style={{ textDecoration: 'underline' }}
                  onClick={() => void install()}
                >
                  Verifica o riscarica file
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
