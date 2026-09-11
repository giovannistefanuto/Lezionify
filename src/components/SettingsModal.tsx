import React, { useState } from 'react'
import type { GeminiModel } from '../../shared/archive'

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
  show: boolean
  onClose: () => void
  inputApiKeys: string[]
  activeKeyIdx: number
  setActiveKeyIdx: (idx: number) => void
  autoRotate: boolean
  setAutoRotate: (val: boolean) => void
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
}

export function SettingsModal({
  show,
  onClose,
  inputApiKeys,
  activeKeyIdx,
  setActiveKeyIdx,
  autoRotate,
  setAutoRotate,
  inputModel,
  setInputModel,
  newKeyInput,
  setNewKeyInput,
  keyTestStates,
  isSaving,
  onAddKey,
  onRemoveKey,
  onTestKey,
  onSave
}: SettingsModalProps) {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(inputApiKeys.length >= 2)

  if (!show) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content settings-modal-content">
        <div className="modal-header">
          <h3>⚙️ Configurazione AI & Pool Chiavi Gemini</h3>
          <button className="modal-close" onClick={onClose} aria-label="Chiudi impostazioni">
            ✕
          </button>
        </div>
        <p className="modal-description">
          Configura il tuo pool di chiavi API per Google Gemini. Lezionify utilizzerà la chiave attiva e
          ruoterà automaticamente alla successiva in caso di limite di quota sul Free Tier.
        </p>

        <div className="settings-modal-body">
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

        <div className="modal-actions">
          <button className="primary-button" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Salvataggio…' : 'Salva Impostazioni'}
          </button>
          <button className="secondary-button" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
