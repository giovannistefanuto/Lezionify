import { toLocalDateTimeInput } from '../../shared/calendarDate'
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type {
  UsbRecorderInfo,
  UsbImportItemSelection,
  CourseDefinition
} from '../../shared/archive'

interface UsbRecorderModalProps {
  isOpen: boolean
  onClose: () => void
  onRefreshLibrary: () => Promise<unknown>
  onNotice: (msg: string) => void
  courses?: CourseDefinition[]
}

interface ItemDecision {
  action: 'import' | 'discard'
  courseCode: string | null
  title: string
  recordedAt: string
}

interface PostImportInfo {
  count: number
  paths: string[]
  fileNames: string[]
}


function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB'
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 min'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}h ${m}m`
  }
  if (m > 0) {
    return `${m}m ${s > 0 ? `${s}s` : ''}`.trim()
  }
  return `${s}s`
}

function formatDateTime(isoOrDate: string | null): string {
  if (!isoOrDate) return 'Data non rilevata'
  try {
    const d = new Date(isoOrDate)
    if (isNaN(d.getTime())) return isoOrDate
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return isoOrDate
  }
}

export function UsbRecorderModal({
  isOpen,
  onClose,
  onRefreshLibrary,
  onNotice,
  courses = []
}: UsbRecorderModalProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [recorderInfo, setRecorderInfo] = useState<UsbRecorderInfo | null>(null)
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0)
  const [decisions, setDecisions] = useState<Record<string, ItemDecision>>({})
  const [postImportInfo, setPostImportInfo] = useState<PostImportInfo | null>(
    null
  )
  const [isDeletingFromUsb, setIsDeletingFromUsb] = useState(false)

  // Audio preview state
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)

  const scanRecorder = useCallback(async () => {
    setIsScanning(true)
    try {
      const info = await window.archive.detectUsbRecorder()
      setRecorderInfo(info)

      // Inizializza le decisioni in base all'analisi euristica
      const initialDecisions: Record<string, ItemDecision> = {}
      info.files.forEach((file) => {
        initialDecisions[file.fullPath] = {
          action: file.defaultAction,
          courseCode: file.suggestedCourseCode,
          title: '',
          recordedAt: file.recordedAt || ''
        }
      })
      setDecisions(initialDecisions)

      // Seleziona il primo file non duplicato o il primo in assoluto
      const firstValidIdx = info.files.findIndex((f) => !f.alreadyImported)
      setSelectedFileIndex(firstValidIdx >= 0 ? firstValidIdx : 0)
    } catch (err) {
      console.error('Errore scansione registratore:', err)
      onNotice('Errore durante la scansione del registratore USB.')
    } finally {
      setIsScanning(false)
    }
  }, [onNotice])

  useEffect(() => {
    if (isOpen) {
      setPostImportInfo(null)
      void scanRecorder()
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setIsPlaying(false)
      setPostImportInfo(null)
    }
  }, [isOpen, scanRecorder])

  const files = recorderInfo?.files || []
  const activeFile = files[selectedFileIndex] || null
  const activeDecision = activeFile ? decisions[activeFile.fullPath] : null

  // Gestione cambio file attivo nel player audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }, [selectedFileIndex])

  const togglePlayPause = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      void audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
        console.error('Errore riproduzione anteprima:', e)
      })
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setCurrentTime(val)
    }
  }

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
  }

  const updateDecision = (
    fullPath: string,
    patch: Partial<ItemDecision>
  ) => {
    setDecisions((prev) => {
      const current = prev[fullPath] || {
        action: 'import',
        courseCode: null,
        title: '',
        recordedAt: ''
      }
      return {
        ...prev,
        [fullPath]: { ...current, ...patch }
      }
    })
  }

  const acceptAllSuggested = () => {
    setDecisions((prev) => {
      const updated = { ...prev }
      files.forEach((f) => {
        if (!f.alreadyImported) {
          updated[f.fullPath] = {
            ...updated[f.fullPath],
            action: f.criteria.isDurationValid ? 'import' : 'discard'
          }
        }
      })
      return updated
    })
  }

  const selectAll = (action: 'import' | 'discard') => {
    setDecisions((prev) => {
      const updated = { ...prev }
      files.forEach((f) => {
        if (!f.alreadyImported) {
          updated[f.fullPath] = {
            ...updated[f.fullPath],
            action
          }
        }
      })
      return updated
    })
  }

  const importCount = useMemo(() => {
    return Object.values(decisions).filter((d) => d.action === 'import').length
  }, [decisions])

  const handleExecuteImport = async () => {
    const itemsToImport: UsbImportItemSelection[] = files.map((file) => {
      const dec = decisions[file.fullPath]
      return {
        fullPath: file.fullPath,
        action: dec ? dec.action : 'discard',
        courseCode: dec ? dec.courseCode : file.suggestedCourseCode,
        title: dec?.title ? dec.title.trim() : null,
        recordedAt: dec?.recordedAt ? dec.recordedAt.trim() : file.recordedAt
      }
    })

    const selectedItems = itemsToImport.filter((i) => i.action === 'import')
    if (selectedItems.length === 0) {
      onNotice('Nessuna registrazione selezionata per l’importazione.')
      return
    }

    setIsImporting(true)
    try {
      const result = await window.archive.importUsbRecorderFiles(selectedItems)
      await onRefreshLibrary()

      const importedPaths =
        result.importedFilePaths && result.importedFilePaths.length > 0
          ? result.importedFilePaths
          : selectedItems.map((i) => i.fullPath)
      const importedNames = importedPaths.map(
        (p) => p.split(/[\\/]/).pop() || p
      )

      if (result.importedCount > 0) {
        setPostImportInfo({
          count: result.importedCount,
          paths: importedPaths,
          fileNames: importedNames
        })
      } else {
        onNotice(
          'Nessuna nuova registrazione importata (file già presenti nella libreria o non validi).'
        )
        onClose()
      }
    } catch (err) {
      console.error('Errore durante importazione registratore:', err)
      onNotice('Errore durante l’importazione dei file dal registratore.')
    } finally {
      setIsImporting(false)
    }
  }

  const handleDeleteImportedFromUsb = async () => {
    if (!postImportInfo) return
    setIsDeletingFromUsb(true)
    try {
      const res = await window.archive.deleteUsbRecorderFiles(
        postImportInfo.paths
      )
      if (res.deletedCount > 0) {
        onNotice(
          `Eliminati ${res.deletedCount} file dal registratore USB per liberare spazio. Copie locali al sicuro in Lezionify!`
        )
      }
      if (res.failedCount > 0) {
        onNotice(
          `Attenzione: ${res.failedCount} file non sono stati eliminati dal registratore (possibile protezione di scrittura).`
        )
      }
      setPostImportInfo(null)
      onClose()
    } catch (err) {
      console.error('Errore durante eliminazione file da registratore:', err)
      onNotice('Impossibile eliminare i file dal registratore USB.')
      setPostImportInfo(null)
      onClose()
    } finally {
      setIsDeletingFromUsb(false)
    }
  }

  const handleKeepFilesOnUsb = () => {
    if (postImportInfo) {
      onNotice(
        `Importate ${postImportInfo.count} registrazioni. Le registrazioni originali sono state conservate sul registratore.`
      )
    }
    setPostImportInfo(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay usb-modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content usb-modal-container">
        {/* Header Modale */}
        <div className="usb-modal-header">
          <div className="usb-header-info">
            <div className="usb-icon-badge">🎙️</div>
            <div>
              <h2 className="usb-title">Acquisizione Registratore USB</h2>
              <p className="usb-subtitle">
                {recorderInfo?.detected ? (
                  <>
                    <span className="usb-status-connected">● Connesso</span>
                    {' · '}
                    <code>{recorderInfo.recordPath}</code>
                    {recorderInfo.freeSpaceBytes ? (
                      <span className="usb-space-info">
                        {' · '}Spazio libero: {formatBytes(recorderInfo.freeSpaceBytes)}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="usb-status-disconnected">
                    Nessun registratore rilevato
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="usb-header-actions">
            {!postImportInfo && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void scanRecorder()}
                disabled={isScanning || isImporting}
                title="Aggiorna scansione unità USB"
              >
                {isScanning ? 'Scansione in corso…' : '🔄 Riscansiona'}
              </button>
            )}
            <button
              type="button"
              className="btn-icon-close"
              onClick={postImportInfo ? handleKeepFilesOnUsb : onClose}
              disabled={isImporting || isDeletingFromUsb}
              aria-label="Chiudi"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo Modale: Split-View oppure Conferma Post-Import */}
        {postImportInfo ? (
          <div className="usb-post-import-container">
            <div className="usb-post-import-card">
              <div className="usb-post-import-icon-badge">✅</div>
              <h2 className="usb-post-import-title">
                Importazione completata con successo!
              </h2>
              <p className="usb-post-import-subtitle">
                Abbiamo importato{' '}
                <strong>
                  {postImportInfo.count}{' '}
                  {postImportInfo.count === 1 ? 'lezione' : 'lezioni'}
                </strong>{' '}
                nella libreria locale di Lezionify.
              </p>

              {/* Riquadro di garanzia copia locale */}
              <div className="usb-safe-guarantee-box">
                <div className="usb-safe-guarantee-icon">🛡️</div>
                <div className="usb-safe-guarantee-content">
                  <h4>Le tue registrazioni sono al sicuro sul computer</h4>
                  <p>
                    I file audio sono stati copiati integralmente nell'archivio locale protetto di Lezionify sul tuo PC.
                    Anche se decidi di eliminarli dal registratore per liberare memoria,{' '}
                    <strong>la copia sul tuo computer rimarrà sempre accessibile, intatta e protetta</strong>.
                  </p>
                </div>
              </div>

              {/* Domanda cancellazione registratore */}
              <div className="usb-post-import-question-box">
                <h3>Vuoi liberare spazio sulla memoria del registratore?</h3>
                <p>
                  Puoi eliminare dal registratore{' '}
                  <strong>
                    soltanto{' '}
                    {postImportInfo.count === 1
                      ? 'il file appena importato'
                      : `i ${postImportInfo.count} file appena importati`}
                  </strong>:
                </p>
                <div className="usb-post-import-files-chips">
                  {postImportInfo.fileNames.map((name, idx) => (
                    <span key={idx} className="usb-file-chip">
                      🎵 {name}
                    </span>
                  ))}
                </div>
                <p className="usb-post-import-note">
                  🔒 Tutte le altre registrazioni presenti sul dispositivo USB non verranno modificate.
                </p>
              </div>

              {/* Bottoni di scelta */}
              <div className="usb-post-import-buttons">
                <button
                  type="button"
                  className="btn btn-danger btn-lg usb-btn-delete-recorder"
                  disabled={isDeletingFromUsb}
                  onClick={() => void handleDeleteImportedFromUsb()}
                >
                  {isDeletingFromUsb
                    ? 'Eliminazione dal registratore in corso…'
                    : `🗑️ Sì, elimina ${postImportInfo.count} ${postImportInfo.count === 1 ? 'file' : 'file'} dal registratore`}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  disabled={isDeletingFromUsb}
                  onClick={handleKeepFilesOnUsb}
                >
                  No, conserva i file sul registratore ed esci
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="usb-modal-body">
          {!recorderInfo?.detected ? (
            <div className="usb-empty-state">
              <div className="usb-empty-icon">🔌</div>
              <h3>Registratore non trovato</h3>
              <p>
                Collega il registratore vocale tramite porta USB e assicurati che contenga
                la cartella <code>RECORD</code> (es. <code>D:\RECORD</code>).
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void scanRecorder()}
                disabled={isScanning}
              >
                {isScanning ? 'Scansione in corso…' : 'Rileva registratore adesso'}
              </button>
            </div>
          ) : files.length === 0 ? (
            <div className="usb-empty-state">
              <div className="usb-empty-icon">📂</div>
              <h3>Nessuna registrazione trovata</h3>
              <p>
                L&apos;unità <code>{recorderInfo.recordPath}</code> è connessa, ma non contiene file audio supportati (.mp3, .wav, .m4a).
              </p>
            </div>
          ) : (
            <div className="usb-split-view">
              {/* Colonna Sinistra: Elenco File sul Registratore */}
              <div className="usb-panel-left">
                <div className="usb-panel-left-toolbar">
                  <span className="usb-files-count">
                    {files.length} {files.length === 1 ? 'file trovato' : 'file trovati'}
                  </span>
                  <div className="usb-quick-btn-group">
                    <button
                      type="button"
                      className="btn-link-action"
                      onClick={acceptAllSuggested}
                      title="Accetta solo i file consigliati >= 30m non duplicati"
                    >
                      Suggeriti
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      className="btn-link-action"
                      onClick={() => selectAll('import')}
                    >
                      Tutti
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      className="btn-link-action"
                      onClick={() => selectAll('discard')}
                    >
                      Nessuno
                    </button>
                  </div>
                </div>

                <div className="usb-file-list">
                  {files.map((file, idx) => {
                    const dec = decisions[file.fullPath]
                    const isSelected = idx === selectedFileIndex
                    const isImport = dec?.action === 'import'
                    const isDuplicate = file.alreadyImported
                    const isShort = !file.criteria.isDurationValid && file.durationSeconds > 0

                    return (
                      <div
                        key={file.fullPath}
                        className={`usb-file-item ${isSelected ? 'selected' : ''} ${
                          isImport ? 'action-import' : 'action-discard'
                        } ${isDuplicate ? 'is-duplicate' : ''}`}
                        onClick={() => setSelectedFileIndex(idx)}
                      >
                        <div className="usb-file-checkbox-wrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isImport}
                            disabled={isDuplicate}
                            onChange={(e) =>
                              updateDecision(file.fullPath, {
                                action: e.target.checked ? 'import' : 'discard'
                              })
                            }
                            aria-label={`Importa ${file.name}`}
                          />
                        </div>

                        <div className="usb-file-meta">
                          <div className="usb-file-title-row">
                            <span className="usb-file-name" title={file.name}>
                              {file.name}
                            </span>
                            {isDuplicate && (
                              <span className="badge badge-neutral">Già in libreria</span>
                            )}
                            {!isDuplicate && isShort && (
                              <span className="badge badge-warning" title="Durata inferiore a 30 minuti">
                                Breve
                              </span>
                            )}
                            {!isDuplicate && file.matchConfidence >= 60 && (
                              <span className="badge badge-success" title={file.matchReason}>
                                {file.suggestedCourseCode || 'Match orario'} {file.matchConfidence}%
                              </span>
                            )}
                          </div>

                          <div className="usb-file-sub-row">
                            <span>📅 {formatDateTime(file.recordedAt)}</span>
                            <span>⏱️ {formatDuration(file.durationSeconds)}</span>
                            <span>💾 {formatBytes(file.byteSize)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Player Audio Preview per il file selezionato */}
                {activeFile && (
                  <div className="usb-audio-preview-bar">
                    <audio
                      ref={audioRef}
                      src={`media://preview?path=${encodeURIComponent(activeFile.fullPath)}`}
                      onTimeUpdate={() => {
                        if (audioRef.current) {
                          setCurrentTime(audioRef.current.currentTime)
                        }
                      }}
                      onLoadedMetadata={() => {
                        if (audioRef.current) {
                          setDuration(audioRef.current.duration)
                          audioRef.current.playbackRate = playbackRate
                        }
                      }}
                      onEnded={() => setIsPlaying(false)}
                    />

                    <div className="usb-player-controls">
                      <button
                        type="button"
                        className="btn-play-pause"
                        onClick={togglePlayPause}
                        title={isPlaying ? 'Pausa' : 'Riproduci anteprima'}
                      >
                        {isPlaying ? '⏸️' : '▶️'}
                      </button>

                      <div className="usb-player-timeline">
                        <input
                          type="range"
                          min={0}
                          max={duration || activeFile.durationSeconds || 1}
                          step={0.5}
                          value={currentTime}
                          onChange={handleSeek}
                          className="usb-seek-slider"
                        />
                        <div className="usb-player-time-labels">
                          <span>{formatDuration(currentTime)}</span>
                          <span>{formatDuration(duration || activeFile.durationSeconds)}</span>
                        </div>
                      </div>

                      <div className="usb-player-speed-pills">
                        {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            className={`speed-pill ${playbackRate === rate ? 'active' : ''}`}
                            onClick={() => handleRateChange(rate)}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Colonna Destra: Proposta Intelligente & Configurazione */}
              <div className="usb-panel-right">
                {activeFile && activeDecision ? (
                  <div className="usb-proposal-card">
                    <div className="usb-proposal-header">
                      <h3>Proposta di Importazione</h3>
                      <div className="usb-decision-toggle-group">
                        <button
                          type="button"
                          className={`btn-toggle-action ${
                            activeDecision.action === 'import' ? 'active-import' : ''
                          }`}
                          disabled={activeFile.alreadyImported}
                          onClick={() =>
                            updateDecision(activeFile.fullPath, { action: 'import' })
                          }
                        >
                          ✓ Accogli
                        </button>
                        <button
                          type="button"
                          className={`btn-toggle-action ${
                            activeDecision.action === 'discard' ? 'active-discard' : ''
                          }`}
                          onClick={() =>
                            updateDecision(activeFile.fullPath, { action: 'discard' })
                          }
                        >
                          ✕ Scarta
                        </button>
                      </div>
                    </div>

                    {/* Analisi Diagnostica Euristica */}
                    <div className="usb-analysis-section">
                      <h4 className="usb-section-label">Analisi dei criteri:</h4>
                      <div className="usb-criteria-grid">
                        {/* 1. Criterio Durata */}
                        <div
                          className={`usb-criterion-card ${
                            activeFile.criteria.isDurationValid ? 'pass' : 'warn'
                          }`}
                        >
                          <div className="criterion-icon">
                            {activeFile.criteria.isDurationValid ? '✅' : '⚠️'}
                          </div>
                          <div>
                            <strong>Durata Lezione</strong>
                            <p>
                              {activeFile.criteria.isDurationValid
                                ? `${formatDuration(activeFile.durationSeconds)}: idonea a una lezione accademica.`
                                : `Audio breve (${formatDuration(activeFile.durationSeconds)}): durata inferiore a 30 min.`}
                            </p>
                          </div>
                        </div>

                        {/* 2. Criterio Orario Accademico */}
                        <div
                          className={`usb-criterion-card ${
                            activeFile.matchConfidence >= 60 ? 'pass' : 'info'
                          }`}
                        >
                          <div className="criterion-icon">
                            {activeFile.matchConfidence >= 60 ? '🎓' : 'ℹ️'}
                          </div>
                          <div>
                            <strong>Orario Accademico</strong>
                            <p>{activeFile.matchReason}</p>
                          </div>
                        </div>

                        {/* 3. Criterio Duplicati */}
                        <div
                          className={`usb-criterion-card ${
                            activeFile.alreadyImported ? 'error' : 'pass'
                          }`}
                        >
                          <div className="criterion-icon">
                            {activeFile.alreadyImported ? '🚫' : '✨'}
                          </div>
                          <div>
                            <strong>Stato Duplicato</strong>
                            <p>
                              {activeFile.alreadyImported
                                ? 'File già presente nella libreria (checksum corrispondente).'
                                : 'Nessun duplicato: file audio non ancora archiviato.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Configurazione della Lezione */}
                    <div className="usb-form-section">
                      <h4 className="usb-section-label">Parametri di archiviazione:</h4>

                      <div className="form-group">
                        <label htmlFor="usb-course-select">Corso Assegnato:</label>
                        <select
                          id="usb-course-select"
                          className="form-control"
                          value={activeDecision.courseCode || ''}
                          disabled={activeDecision.action === 'discard'}
                          onChange={(e) =>
                            updateDecision(activeFile.fullPath, {
                              courseCode: e.target.value || null
                            })
                          }
                        >
                          <option value="">-- Nessun corso (Da assegnare in seguito) --</option>
                          {courses.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code} {c.name ? `(${c.name})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="usb-title-input">Titolo Lezione (Opzionale):</label>
                        <input
                          id="usb-title-input"
                          type="text"
                          className="form-control"
                          placeholder={activeFile.name}
                          value={activeDecision.title}
                          disabled={activeDecision.action === 'discard'}
                          onChange={(e) =>
                            updateDecision(activeFile.fullPath, {
                              title: e.target.value
                            })
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="usb-date-input">Data e Ora di Registrazione:</label>
                        <input
                          id="usb-date-input"
                          type="datetime-local"
                          className="form-control"
                          value={
                            toLocalDateTimeInput(activeDecision.recordedAt)
                          }
                          disabled={activeDecision.action === 'discard'}
                          onChange={(e) =>
                            updateDecision(activeFile.fullPath, {
                              recordedAt: e.target.value
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="usb-no-selection">
                    <p>Seleziona un file a sinistra per visualizzare la proposta.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer con Azioni */}
      {!postImportInfo && (
        <div className="usb-modal-footer">
          <div className="usb-footer-stats">
            {recorderInfo?.detected && (
              <span>
                <strong>{importCount}</strong> di {files.length} registrazioni selezionate per
                l’importazione
              </span>
            )}
          </div>
          <div className="usb-footer-buttons">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isImporting}
            >
              Annulla
            </button>
            {recorderInfo?.detected && files.length > 0 && (
              <button
                type="button"
                className="btn btn-primary btn-import-confirm"
                onClick={() => void handleExecuteImport()}
                disabled={isImporting || importCount === 0}
              >
                {isImporting
                  ? 'Importazione in corso…'
                  : `Importa ${importCount} ${importCount === 1 ? 'lezione' : 'lezioni'}`}
              </button>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
