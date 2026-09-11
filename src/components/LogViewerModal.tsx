import { useEffect, useState, useMemo, useCallback } from 'react'
import type { AppLogEntry } from '../../shared/archive'

interface LogViewerModalProps {
  show: boolean
  onClose: () => void
}

type FilterCategory = 'all' | 'error' | 'warn' | 'ai' | 'system'

export function LogViewerModal({ show, onClose }: LogViewerModalProps) {
  const [logs, setLogs] = useState<AppLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({})

  const fetchLogs = useCallback(async () => {
    if (!window.archive?.getAppLogs) return
    setIsLoading(true)
    try {
      const data = await window.archive.getAppLogs()
      setLogs(data)
    } catch (err) {
      console.error('Errore nel recupero dei log:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (show) {
      void fetchLogs()
    }
  }, [show, fetchLogs])

  useEffect(() => {
    if (!show) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [show, onClose])

  const handleClearLogs = async () => {
    if (!window.archive?.clearAppLogs) return
    if (!window.confirm('Sei sicuro di voler cancellare tutti i log salvati?')) return
    try {
      await window.archive.clearAppLogs()
      setLogs([])
    } catch (err) {
      console.error('Errore cancellazione log:', err)
    }
  }

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredLogs = useMemo(() => {
    let list = [...logs]

    if (activeFilter === 'error') {
      list = list.filter((l) => l.level === 'error')
    } else if (activeFilter === 'warn') {
      list = list.filter((l) => l.level === 'warn')
    } else if (activeFilter === 'ai') {
      list = list.filter((l) =>
        ['gemini', 'qna', 'ai-notes', 'study-set', 'transcription', 'gemini-api'].includes(l.source)
      )
    } else if (activeFilter === 'system') {
      list = list.filter((l) =>
        ['system', 'storage', 'process', 'main-process', 'renderer'].includes(l.source)
      )
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.source.toLowerCase().includes(q) ||
          (l.details && l.details.toLowerCase().includes(q))
      )
    }

    // Più recenti in alto
    return list.reverse()
  }, [logs, activeFilter, searchQuery])

  const counts = useMemo(() => {
    const errorCount = logs.filter((l) => l.level === 'error').length
    const warnCount = logs.filter((l) => l.level === 'warn').length
    const aiCount = logs.filter((l) =>
      ['gemini', 'qna', 'ai-notes', 'study-set', 'transcription', 'gemini-api'].includes(l.source)
    ).length
    const systemCount = logs.filter((l) =>
      ['system', 'storage', 'process', 'main-process', 'renderer'].includes(l.source)
    ).length
    return {
      all: logs.length,
      error: errorCount,
      warn: warnCount,
      ai: aiCount,
      system: systemCount
    }
  }, [logs])

  const handleCopyLogs = async () => {
    if (filteredLogs.length === 0) return
    const text = filteredLogs
      .map((l) => {
        let line = `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`
        if (l.details) {
          line += `\n  Dettagli:\n  ${l.details.replace(/\n/g, '\n  ')}`
        }
        return line
      })
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch (err) {
      console.error('Errore copia log negli appunti:', err)
    }
  }

  if (!show) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content log-viewer-modal-content">
        <div className="modal-header">
          <div className="log-viewer-title-group">
            <h3>📋 Log di Sistema & Diagnostica</h3>
            <span className="log-viewer-subtitle">
              Monitora chiamate AI, rotazione chiavi, errori e attività interna
            </span>
          </div>
          <button className="modal-close" onClick={onClose} title="Chiudi (Esc)">
            ✕
          </button>
        </div>

        <div className="log-viewer-toolbar">
          <div className="log-viewer-filters">
            <button
              type="button"
              className={`log-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              Tutti ({counts.all})
            </button>
            <button
              type="button"
              className={`log-filter-btn filter-error ${activeFilter === 'error' ? 'active' : ''}`}
              onClick={() => setActiveFilter('error')}
            >
              Errori ({counts.error})
            </button>
            <button
              type="button"
              className={`log-filter-btn filter-warn ${activeFilter === 'warn' ? 'active' : ''}`}
              onClick={() => setActiveFilter('warn')}
            >
              Avvisi ({counts.warn})
            </button>
            <button
              type="button"
              className={`log-filter-btn ${activeFilter === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveFilter('ai')}
            >
              AI Gemini ({counts.ai})
            </button>
            <button
              type="button"
              className={`log-filter-btn ${activeFilter === 'system' ? 'active' : ''}`}
              onClick={() => setActiveFilter('system')}
            >
              Sistema ({counts.system})
            </button>
          </div>

          <div className="log-viewer-actions">
            <button
              type="button"
              className="log-action-btn refresh"
              onClick={() => void fetchLogs()}
              disabled={isLoading}
              title="Aggiorna i log"
            >
              🔄 {isLoading ? 'Caricamento…' : 'Aggiorna'}
            </button>
            <button
              type="button"
              className={`log-action-btn copy ${copyFeedback ? 'copied' : ''}`}
              onClick={() => void handleCopyLogs()}
              disabled={filteredLogs.length === 0}
              title="Copia i log filtrati negli appunti"
            >
              {copyFeedback ? '✓ Copiato!' : '📋 Copia Log'}
            </button>
            <button
              type="button"
              className="log-action-btn clear"
              onClick={() => void handleClearLogs()}
              disabled={logs.length === 0}
              title="Pulisci cronologia log"
            >
              🗑️ Pulisci
            </button>
          </div>
        </div>

        <div className="log-viewer-search-bar">
          <input
            type="text"
            className="log-search-input"
            placeholder="Cerca nei log (messaggio, sorgente, dettagli)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="log-search-clear"
              onClick={() => setSearchQuery('')}
              title="Cancella ricerca"
            >
              ✕
            </button>
          )}
        </div>

        <div className="log-entries-container">
          {filteredLogs.length === 0 ? (
            <div className="log-empty-state">
              <span className="log-empty-icon">📝</span>
              <p>Nessun log trovato per i criteri selezionati.</p>
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const dateStr = new Date(entry.timestamp).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                fractionalSecondDigits: 3
              })
              const isExpanded = !!expandedDetails[entry.id]

              return (
                <div key={entry.id} className={`log-entry-item level-${entry.level}`}>
                  <div className="log-entry-header">
                    <span className="log-entry-time">{dateStr}</span>
                    <span className={`log-badge badge-${entry.level}`}>
                      {entry.level.toUpperCase()}
                    </span>
                    <span className="log-source-tag">{entry.source}</span>
                  </div>
                  <div className="log-entry-message">{entry.message}</div>
                  {entry.details && (
                    <div className="log-entry-details-wrapper">
                      <button
                        type="button"
                        className="log-details-toggle-btn"
                        onClick={() => toggleDetails(entry.id)}
                      >
                        {isExpanded ? '▾ Nascondi dettagli' : '▸ Mostra dettagli tecnici'}
                      </button>
                      {isExpanded && (
                        <pre className="log-details-block">{entry.details}</pre>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
