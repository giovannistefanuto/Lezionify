import { useState } from 'react'
import { StudyInactivitySettings } from './StudyInactivitySettings'
import {
  isStudyEstimateEnabled,
  STUDY_ESTIMATE_PREFERENCE
} from '../utils/studyEstimate'
export function StudyEstimateSettings() {
  const [enabled, setEnabled] = useState(isStudyEstimateEnabled)
  const [error, setError] = useState(false)
  return (
    <><section className="settings-field">
      <h4>Studio in Focus</h4>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            try {
              localStorage.setItem(
                STUDY_ESTIMATE_PREFERENCE,
                String(event.target.checked)
              )
              setEnabled(event.target.checked)
              setError(false)
              window.dispatchEvent(new Event('study-estimate-preference'))
            } catch {
              setError(true)
            }
          }}
        />{' '}
        Stima dello studio restante nell'icona 🌱
      </label>
      <p>
        Tempo per paragrafo, residuo e totale dal ritmo osservato localmente.
        I primi campioni danno una stima provvisoria; numeri e formule ricevono
        un peso diverso solo se migliorano il confronto su lezioni separate.
        Non misura la comprensione. Le scorse rapide non sono campioni validi.
        Il Q&amp;A contribuisce al tempo del blocco di riferimento; Memo,
        traduttore, pause e altre finestre sono esclusi. Il margine statistico
        richiede almeno 20 lezioni completate confrontabili nella stessa fase.
        Preferenza salvata subito.
      </p>
      {error && <p role="alert">Impossibile salvare la preferenza. Riprova.</p>}
    </section><StudyInactivitySettings /></>
  )
}
