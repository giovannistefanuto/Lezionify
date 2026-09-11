import React from 'react'

interface PasteModalProps {
  show: boolean
  onClose: () => void
  inputText: string
  setInputText: (text: string) => void
  onConfirm: () => void
}

export function PasteModal({
  show,
  onClose,
  inputText,
  setInputText,
  onConfirm
}: PasteModalProps) {
  if (!show) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Incolla Dispensa Markdown da Gemini</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="modal-description">
          Incolla qui sotto la risposta in Markdown generata da Gemini:
        </p>
        <textarea
          className="modal-textarea"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="# Titolo Lezione..."
          rows={10}
        />
        <div className="modal-actions">
          <button
            className="primary-button small"
            onClick={onConfirm}
            disabled={!inputText.trim()}
          >
            Salva e Renderizza
          </button>
          <button className="secondary-button small" onClick={onClose}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
