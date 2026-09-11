import React, { useMemo, useState } from 'react'

import type { Lecture } from '../../shared/archive'

export function countTranscriptWords(transcript: string | null): number {
  return transcript?.match(/\S+/g)?.length ?? 0
}

export function buildTranscriptSearchResult(
  transcript: string | null,
  query: string
): { count: number; parts: string[]; normalizedQuery: string } | null {
  if (!transcript || !query) return null
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = transcript.split(new RegExp(`(${escaped})`, 'gi'))
  return {
    count: Math.floor(parts.length / 2),
    parts,
    normalizedQuery: query.toLowerCase()
  }
}

interface TranscriptPanelProps {
  lecture: Lecture
  transcriptText: string | null
  isGenerating: boolean
  isTranscribing: boolean
  onGenerateLectureNotes: () => void
  onCopyTranscript: () => void
  onAttachTranscript: () => void
  onTranscribeAudio: () => void
}

export function TranscriptPanel({
  lecture,
  transcriptText,
  isGenerating,
  isTranscribing,
  onGenerateLectureNotes,
  onCopyTranscript,
  onAttachTranscript,
  onTranscribeAudio
}: TranscriptPanelProps) {
  const [search, setSearch] = useState('')
  const wordCount = useMemo(
    () => countTranscriptWords(transcriptText),
    [transcriptText]
  )
  const searchResult = useMemo(
    () => buildTranscriptSearchResult(transcriptText, search),
    [transcriptText, search]
  )

  return (
    <div className="detail-card transcript-card">
      <div className="card-header">
        <div className="card-title-group">
          <h3>Trascrizione grezza TXT</h3>
          <span className={`status-pill ${lecture.status}`}>
            {lecture.status === 'transcript-available'
              ? 'Disponibile'
              : 'Assente'}
          </span>
        </div>
        <div className="card-actions">
          {lecture.status === 'transcript-available' ? (
            <>
              <button
                className="ai-generate-header-btn"
                onClick={onGenerateLectureNotes}
                disabled={isGenerating}
              >
                ⚡ Genera con AI
              </button>
              <button
                className="secondary-button small"
                onClick={onCopyTranscript}
                disabled={!transcriptText}
              >
                Copia testo
              </button>
              <button
                className="secondary-button small"
                onClick={onAttachTranscript}
              >
                Sostituisci TXT
              </button>
            </>
          ) : (
            <div className="card-actions">
              <button
                className="ai-generate-header-btn"
                onClick={onTranscribeAudio}
                disabled={isTranscribing}
              >
                🎙️ {isTranscribing ? 'Trascrizione…' : 'Trascrivi con AI'}
              </button>
              <button
                className="secondary-button small"
                onClick={onAttachTranscript}
              >
                Associa TXT
              </button>
            </div>
          )}
        </div>
      </div>

      {isTranscribing && (
        <div className="ai-generating-box">
          <div className="ai-pulse-spinner" />
          <div className="ai-generating-text">
            <h4>🎙️ Trascrizione audio con Gemini in corso…</h4>
            <p>Analisi del parlato e sincronizzazione del testo.</p>
          </div>
        </div>
      )}

      {transcriptText ? (
        <div className="transcript-container">
          <div className="transcript-stats">
            <div>
              <span>{wordCount} parole</span>
              <span className="transcript-character-count">
                {transcriptText.length} caratteri
              </span>
            </div>
            {searchResult && <span>{searchResult.count} risultati</span>}
          </div>
          <input
            type="text"
            placeholder="Cerca nella trascrizione..."
            className="search-input transcript-search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? (
            <div className="transcript-text transcript-text-search">
              {searchResult?.parts.map((part, index) =>
                part.toLowerCase() === searchResult.normalizedQuery ? (
                  <mark key={index}>{part}</mark>
                ) : (
                  part
                )
              )}
            </div>
          ) : (
            <pre className="transcript-text">{transcriptText}</pre>
          )}
        </div>
      ) : (
        !isTranscribing && (
          <div className="transcript-empty">
            <p>Nessun file di trascrizione `.txt` associato a questo audio.</p>
            <p className="help-text">
              Puoi avviare la{' '}
              <strong>Trascrizione Automatica con Gemini AI</strong> oppure
              associare un file `.txt` esistente.
            </p>
            <div className="ai-cta-buttons transcript-empty-actions">
              <button
                className="primary-button small ai-main-btn"
                onClick={onTranscribeAudio}
              >
                🎙️ Trascrivi con Gemini AI
              </button>
              <button
                className="secondary-button small"
                onClick={onAttachTranscript}
              >
                📁 Seleziona file TXT
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}
