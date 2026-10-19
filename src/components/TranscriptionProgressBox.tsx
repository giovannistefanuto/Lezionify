import React, { useEffect, useRef, useState } from 'react'
import type { GenerationProgress } from '../../shared/archive'

interface TranscriptionProgressBoxProps {
  progress?: GenerationProgress | null
  error?: string | null
}

interface LogEntry {
  id: string
  time: string
  text: string
  isError?: boolean
}

export function formatDurationSeconds(seconds?: number): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    return 'Calcolo…'
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`
}

export function TranscriptionProgressBox({
  progress,
  error
}: TranscriptionProgressBoxProps) {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const lastLoggedMessageRef = useRef<string | null>(null)
  const logContainerRef = useRef<HTMLDivElement | null>(null)

  // Aggiunge ogni nuovo messaggio di progresso al log cronologico
  useEffect(() => {
    if (!progress?.message) return
    if (progress.message === lastLoggedMessageRef.current) return

    lastLoggedMessageRef.current = progress.message
    const now = new Date().toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    setLogEntries((prev) => [
      ...prev.slice(-30), // mantiene fino a 30 messaggi recenti
      {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
        time: now,
        text: progress.message
      }
    ])
  }, [progress?.message])

  // Aggiunge eventuali errori al log
  useEffect(() => {
    if (!error) return
    const now = new Date().toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    setLogEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
        time: now,
        text: `⚠️ ${error}`,
        isError: true
      }
    ])
  }, [error])

  // Scroll automatico in fondo alla console dei log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logEntries])

  const percent = Math.max(5, Math.min(100, progress?.percent ?? 10))
  const totalChunks = progress?.totalChunks ?? 1
  const currentChunk = progress?.currentChunk ?? 1
  const chunkInterval = progress?.chunkTimeInterval
  const etaSeconds = progress?.etaSeconds
  const elapsedSeconds = progress?.elapsedSeconds
  const isCompleted = progress?.phase === 'completed' || percent >= 100

  return (
    <div className="transcription-progress-card">
      {/* Header Status Row */}
      <div className="transcription-progress-header">
        <div className="transcription-status-identity">
          <div className={`transcription-pulse-dot ${isCompleted ? 'is-done' : ''}`} />
          <div>
            <h4 className="transcription-title">
              {isCompleted
                ? '✅ Trascrizione completata con successo'
                : '🎙️ Ascolto e Trascrizione in Corso'}
            </h4>
            <p className="transcription-live-status">
              {progress?.message ||
                "Inizializzazione del motore di trascrizione vocale e analisi dell'audio..."}
            </p>
          </div>
        </div>

        <div className="transcription-percent-badge">
          <span>{percent}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="transcription-bar-track">
        <div
          className={`transcription-bar-fill ${isCompleted ? 'is-done' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Structured Metrics Grid */}
      <div className="transcription-metrics-grid">
        {/* Metric 1: Chunking & Subdivision */}
        <div className="transcription-metric-tile">
          <span className="metric-icon">🧩</span>
          <div className="metric-content">
            <span className="metric-label">Suddivisione Audio</span>
            <strong className="metric-value">
              {totalChunks > 1
                ? `${totalChunks} Parti (~15 min)`
                : 'Blocco Unico Diretto'}
            </strong>
            <span className="metric-sub">
              {totalChunks > 1
                ? `Avanzamento: Parte ${currentChunk} di ${totalChunks}`
                : 'Traccia elaborata per intero'}
            </span>
          </div>
        </div>

        {/* Metric 2: Estimated Time Remaining (ETA) */}
        <div className="transcription-metric-tile">
          <span className="metric-icon">⏱️</span>
          <div className="metric-content">
            <span className="metric-label">Tempo Stimato (ETA)</span>
            <strong className="metric-value">
              {isCompleted
                ? 'Completato'
                : typeof etaSeconds === 'number' && etaSeconds > 0
                  ? `~${formatDurationSeconds(etaSeconds)}`
                  : 'Calcolo in corso…'}
            </strong>
            <span className="metric-sub">
              {typeof elapsedSeconds === 'number' && elapsedSeconds > 0
                ? `Trascorsi: ${formatDurationSeconds(elapsedSeconds)}`
                : 'Iniziato da poco'}
            </span>
          </div>
        </div>

        {/* Metric 3: Time Interval / Stage */}
        <div className="transcription-metric-tile">
          <span className="metric-icon">📍</span>
          <div className="metric-content">
            <span className="metric-label">Intervallo Audio Attuale</span>
            <strong className="metric-value">
              {chunkInterval || (totalChunks > 1 ? `Parte ${currentChunk}` : 'Intera traccia')}
            </strong>
            <span className="metric-sub">
              {progress?.stageDetail || 'Elaborazione ASR Gemini'}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Chunk Sequence Timeline (if multiple chunks) */}
      {totalChunks > 1 && (
        <div className="transcription-chunks-strip">
          <span className="chunks-strip-label">Stato parti audio:</span>
          <div className="chunks-pills-row">
            {Array.from({ length: totalChunks }).map((_, idx) => {
              const num = idx + 1
              const isPast = num < currentChunk || (num === currentChunk && isCompleted)
              const isCurrent = num === currentChunk && !isCompleted
              return (
                <div
                  key={num}
                  className={`chunk-pill ${
                    isPast ? 'is-completed' : isCurrent ? 'is-current' : 'is-pending'
                  }`}
                  title={`Parte ${num} di ${totalChunks}`}
                >
                  <span className="chunk-pill-icon">
                    {isPast ? '✓' : isCurrent ? '⚡' : '⏳'}
                  </span>
                  <span className="chunk-pill-text">Parte {num}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Real-Time Live Activity Feed / Console Log */}
      <div className="transcription-log-wrapper">
        <div className="transcription-log-header">
          <span className="log-header-title">📋 Log dettagliato in tempo reale:</span>
          {logEntries.length > 0 && (
            <span className="log-count-tag">{logEntries.length} eventi</span>
          )}
        </div>

        <div className="transcription-log-console" ref={logContainerRef}>
          {logEntries.length === 0 ? (
            <div className="log-empty-hint">
              <span>Attesa dei primi eventi dal motore audio...</span>
            </div>
          ) : (
            logEntries.map((entry) => (
              <div
                key={entry.id}
                className={`transcription-log-line ${entry.isError ? 'is-error' : ''}`}
              >
                <span className="log-timestamp">[{entry.time}]</span>
                <span className="log-message">{entry.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
