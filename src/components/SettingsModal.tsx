import { CopyGuardSettings } from './CopyGuard'
import { StudyEstimateSettings } from './StudyEstimateSettings'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GeminiModel, PublishingStatus } from '../../shared/archive'
import { QnaImageLibrary } from './QnaImageLibrary'
import { SpotifyPanel } from './SpotifyPanel'
import { OfflineTranslationSettings } from './OfflineTranslationSettings'
import { YoutubeLibrary } from './YoutubeLibrary'
import type { ToolSettingsSection } from './ToolSettingsContext'

export const AVAILABLE_MODELS: {
  value: GeminiModel
  label: string
  tag: string
  description: string
}[] = [
  {
    value: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash',
    tag: 'Ultimissima Uscita (Sett. 2026)',
    description: 'Nuovo modello Google ultra-potente per ragionamento avanzato, architetture complesse e agenti.'
  },
  {
    value: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    tag: 'Consigliato · Free Tier Ottimale',
    description: 'Il modello più equilibrato e accurato per formule LaTeX e dispense di ingegneria.'
  },
  {
    value: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash-Lite',
    tag: 'Ultra Veloce (~700ms)',
    description: 'Generazione quasi istantanea, perfetto per lezioni veloci e consumo minimo di quota.'
  },
  {
    value: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    tag: 'Veloce',
    description: 'Solido per elaborazioni ad alta capacità di contesto.'
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    tag: 'Stabile',
    description: 'Collaudato per trascrizioni universitarie e dispense didattiche.'
  },
  {
    value: 'gemini-3.7-flash',
    label: 'Gemini 3.7 Flash',
    tag: 'Flagship Precedente',
    description: 'Modello potente per compiti articolati (richiede quota disponibile).'
  }
]

interface SettingsModalProps {
  initialSection?: ToolSettingsSection
  show: boolean
  onClose: () => void
  inputApiKeys: string[]
  inputApiKeyQuotaGroups: string[]
  setQuotaGroupForKey: (idx: number, value: string) => void
  activeKeyIdx: number
  setActiveKeyIdx: (idx: number) => void
  autoRotate: boolean
  setAutoRotate: (val: boolean) => void
  autoProcessOnImport: boolean
  setAutoProcessOnImport: (val: boolean) => void
  inputModel: GeminiModel
  setInputModel: (model: GeminiModel) => void
  newKeyInput: string
  setNewKeyInput: (val: string) => void
  keyTestStates: Record<string, { isTesting: boolean; result?: { valid: boolean; keyValid?: boolean; modelAvailable?: boolean; error?: string } }>
  isSaving: boolean
  onAddKey: () => void
  onRemoveKey: (idx: number) => void
  onTestKey: (idx: number, key: string) => void
  onSave: () => void
  publishingEnabled: boolean
  setPublishingEnabled: (value: boolean) => void
  publishingRepoUrl: string
  setPublishingRepoUrl: (value: string) => void
  publishingToken: string
  setPublishingToken: (value: string) => void
  publishingStatus: PublishingStatus | null
}

export function SettingsModal({
  initialSection,
  show,
  onClose,
  inputApiKeys,
  inputApiKeyQuotaGroups,
  setQuotaGroupForKey,
  activeKeyIdx,
  setActiveKeyIdx,
  autoRotate,
  setAutoRotate,
  autoProcessOnImport,
  setAutoProcessOnImport,
  inputModel,
  setInputModel,
  newKeyInput,
  setNewKeyInput,
  keyTestStates,
  isSaving,
  onAddKey,
  onRemoveKey,
  onTestKey,
  onSave,
  publishingEnabled,
  setPublishingEnabled,
  publishingRepoUrl,
  setPublishingRepoUrl,
  publishingToken,
  setPublishingToken,
  publishingStatus
}: SettingsModalProps) {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(inputApiKeys.length >= 2)
  const [section, setSection] = useState<'general' | ToolSettingsSection>(initialSection ?? 'general')
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!show) return
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [show])

  if (!show) return null

  return createPortal(
    <div className="modal-overlay settings-modal-overlay" onKeyDownCapture={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
      if (event.key === 'Tab') {
        const controls = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary') ?? [])].filter(element => element.getClientRects().length)
        const first = controls[0], last = controls.at(-1)
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first?.focus() }
      }
    }}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Impostazioni" className="modal-content settings-modal-content">
        <div className="modal-header">
          <h3>⚙️ Impostazioni</h3>
          <button className="modal-close" onClick={onClose} aria-label="Chiudi impostazioni">
            ✕
          </button>
        </div>
        <p className="modal-description">
          Configura Lezionify, il traduttore offline e la musica.
        </p>
        <nav className="tool-settings-nav" aria-label="Sezioni Impostazioni">
          <button type="button" aria-pressed={section === 'general'} onClick={() => setSection('general')}>Generali</button>
          <button type="button" aria-pressed={section === 'translation'} onClick={() => setSection('translation')}>Traduttore offline</button>
          <button type="button" aria-pressed={section === 'music'} onClick={() => setSection('music')}>Musica</button>
        </nav>
        <div className="settings-modal-body" hidden={section !== 'general'}>
          <StudyEstimateSettings />
          <CopyGuardSettings />
          <section className="publishing-settings" aria-labelledby="publishing-settings-title">
            <h4 id="publishing-settings-title">Pubblicazione automatica su GitHub</h4>
            <p>Condividi trascrizioni e dispense dei corsi abilitati nel tuo repository. Al salvataggio,
              a ogni avvio e dopo l’elaborazione, Lezionify controlla GitHub e sincronizza
              lezioni nuove e modifiche. Gli audio restano sul computer.</p>
            <label className="auto-rotate-checkbox-label">
              <input type="checkbox" checked={publishingEnabled}
                onChange={event => setPublishingEnabled(event.target.checked)} />
              <span>Attiva la sincronizzazione automatica</span>
            </label>
            <label className="publishing-field">
              Repository GitHub
              <input type="url" value={publishingRepoUrl}
                onChange={event => setPublishingRepoUrl(event.target.value)}
                placeholder="https://github.com/utente/lezionify-appunti"
                autoComplete="off" spellCheck={false} />
            </label>
            <label className="publishing-field">
              Token GitHub
              <input type="password" value={publishingToken}
                onChange={event => setPublishingToken(event.target.value)}
                placeholder={publishingStatus?.configured ? 'Token salvato · lascia vuoto per conservarlo' : 'Incolla il token una volta'}
                autoComplete="new-password" spellCheck={false} />
            </label>
            <p className="publishing-hint">Il token viene cifrato sul computer e non viene mostrato dopo il salvataggio.
              Se il repository è pubblico, i testi saranno visibili a chiunque.</p>
            <div className="publishing-status" role="status" aria-live="polite">
              {!publishingStatus ? 'Caricamento dello stato…' : !publishingStatus.enabled ? 'Sincronizzazione disattivata.' :
                publishingStatus.phase === 'checking' ? 'Verifica della connessione a GitHub e dei contenuti pubblicati…' :
                publishingStatus.phase === 'publishing' ? 'Sincronizzazione delle lezioni in corso…' :
                publishingStatus.connection === 'offline' ? 'GitHub non è raggiungibile. Riproverò automaticamente.' :
                publishingStatus.lastError || (publishingStatus.unpublishedCount ?
                  `${publishingStatus.unpublishedCount} lezioni nuove o modificate da sincronizzare.` :
                  publishingStatus.lastCheckedAt ? 'Le lezioni dei corsi abilitati sono aggiornate su GitHub.' : 'In attesa della prima verifica automatica.')}
              {publishingStatus?.lastCheckedAt && <small>Ultima verifica: {new Date(publishingStatus.lastCheckedAt).toLocaleString('it-IT')}</small>}
            </div>
          </section>
          {/* Pool Header & List */}
          <div className="settings-field">
            <div className="field-label-row">
              <span>Pool Chiavi API ({inputApiKeys.length}):</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="api-key-link"
              >
                Ottieni nuova chiave (gratuita) ↗
              </a>
            </div>

            <div className="keys-pool-list">
              {inputApiKeys.length === 0 ? (
                <div className="keys-pool-empty">
                  Nessuna chiave nel pool. Aggiungine una sotto per iniziare.
                </div>
              ) : (
                inputApiKeys.map((key, idx) => {
                  const isActive = idx === activeKeyIdx
                  const testState = keyTestStates[key]
                  const maskedKey = `${key.slice(0, 8)}••••••••${key.slice(-4)}`

                  return (
                    <div
                      key={key}
                      className={`key-pool-item ${isActive ? 'is-active-key' : ''}`}
                    >
                      <label className="key-select-label">
                        <input
                          type="radio"
                          name="active-api-key"
                          checked={isActive}
                          onChange={() => setActiveKeyIdx(idx)}
                        />
                        <div className="key-item-info">
                          <div className="key-item-title">
                            <strong>Chiave #{idx + 1}</strong>
                            {isActive && <span className="active-key-badge">Attiva</span>}
                          </div>
                          <span className="key-masked-text">{maskedKey}</span>
                        </div>
                      </label>

                      <div className="key-item-actions">
                        <button
                          type="button"
                          className="key-action-btn test-btn"
                          onClick={() => onTestKey(idx, key)}
                          disabled={testState?.isTesting}
                          title="Testa questa chiave"
                          aria-label="Testa chiave API"
                        >
                          {testState?.isTesting ? '⏳' : '🧪 Testa'}
                        </button>

                        <button
                          type="button"
                          className="key-action-btn delete-btn"
                          onClick={() => onRemoveKey(idx)}
                          title="Elimina dal pool"
                          aria-label="Elimina chiave"
                        >
                          🗑️
                        </button>
                      </div>

                      <label
                        className="key-quota-group"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          width: '100%',
                          fontSize: 12,
                          color: 'var(--text-secondary, #667085)'
                        }}
                      >
                        Gruppo quota/progetto
                        <input
                          type="text"
                          value={inputApiKeyQuotaGroups[idx] ?? 'default-project'}
                          onChange={(event) =>
                            setQuotaGroupForKey(idx, event.target.value)
                          }
                          onBlur={(event) => {
                            if (!event.target.value.trim()) {
                              setQuotaGroupForKey(idx, 'default-project')
                            }
                          }}
                          aria-label={`Gruppo quota della chiave ${idx + 1}`}
                          title="Usa lo stesso gruppo per chiavi create nello stesso progetto Google AI Studio"
                          style={{ flex: 1, minWidth: 0 }}
                        />
                      </label>

                      {testState?.result && (
                        <div
                          className={`key-test-feedback ${
                            testState.result.valid ? 'is-valid' : 'is-error'
                          }`}
                        >
                          {testState.result.valid && testState.result.modelAvailable === false
                            ? `⚠️ ${testState.result.error}`
                            : testState.result.valid
                            ? '✅ Valida'
                            : `❌ ${testState.result.error || 'Errore'}`}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Add new key input row */}
            <div className="add-key-row">
              <input
                type="text"
                value={newKeyInput}
                onChange={(e) => setNewKeyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onAddKey()
                  }
                }}
                placeholder="Incolla nuova chiave (AIzaSy...)"
                className="api-key-input"
              />
              <button
                type="button"
                className="secondary-button"
                onClick={onAddKey}
                disabled={!newKeyInput.trim()}
              >
                + Aggiungi
              </button>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <button
            type="button"
            className="advanced-settings-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #666)', cursor: 'pointer', padding: '10px 0', fontSize: '0.9rem', textAlign: 'left', marginTop: '10px' }}
          >
            {showAdvanced ? '▾ Nascondi impostazioni avanzate' : '▸ Mostra impostazioni avanzate'}
          </button>

          {showAdvanced && (
            <div className="advanced-settings-section">
              {/* Auto rotate checkbox */}
              <label className="auto-rotate-checkbox-label">
                <input
                  type="checkbox"
                  checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                />
                <span>
                  <strong>Rotazione automatica del pool</strong> se la chiave attiva esaurisce la quota
                  temporanea (Consigliato per Free Tier)
                </span>
              </label>

              {/* Auto process on import checkbox */}
              <label className="auto-rotate-checkbox-label" style={{ marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={autoProcessOnImport}
                  onChange={(e) => setAutoProcessOnImport(e.target.checked)}
                />
                <span>
                  <strong>Elaborazione automatica all’importazione</strong> (opzionale):
                  avvia trascrizione, dispensa ITA e versione ENG in background per ogni lezione appena
                  importata. Se disattivata, importa tutti gli audio e poi usa “Elabora archivio”.
                </span>
              </label>

              {/* Model selection */}
              <div className="settings-field" style={{ marginTop: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main, #1e3f32)' }}>
                  Modello Gemini Predefinito:
                </span>
                <div className="model-options-list">
                  {AVAILABLE_MODELS.map((m) => (
                    <label
                      key={m.value}
                      className={`model-option-card ${inputModel === m.value ? 'is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="gemini-model"
                        value={m.value}
                        checked={inputModel === m.value}
                        onChange={() => setInputModel(m.value)}
                      />
                      <div className="model-option-info">
                        <div className="model-option-title">
                          <strong>{m.label}</strong>
                          <span className="model-badge">{m.tag}</span>
                        </div>
                        <span className="model-desc">{m.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {section === 'general' && <QnaImageLibrary />}
        {section !== 'general' && <div className="settings-modal-body settings-tools-body">
          {section === 'translation' && <OfflineTranslationSettings />}
          {section === 'music' && <><SpotifyPanel configuration /><YoutubeLibrary configuration /></>}
        </div>}
        <div className="modal-actions">
          {section === 'general' &&
          <button className="primary-button" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Salvataggio…' : 'Salva Impostazioni'}
          </button>}
          <button className="secondary-button" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>, document.fullscreenElement ?? document.body
  )
}
