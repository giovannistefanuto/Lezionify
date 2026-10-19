import { useState } from 'react'
import {
  isStudyEstimateEnabled,
  STUDY_ESTIMATE_PREFERENCE
} from '../utils/studyEstimate'
export function StudyEstimateSettings() {
  const [enabled, setEnabled] = useState(isStudyEstimateEnabled)
  const [error, setError] = useState(false)
  return (
    <section className="settings-field">
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
        Mostra la stima dello studio restante
      </label>
      <p>
        Compare sotto i 30 minuti, dopo almeno 10 minuti di studio e il 60% di
        avanzamento consolidato. Le scorse rapide non fanno avanzare la stima.
        Preferenza salvata subito.
      </p>
      {error && <p role="alert">Impossibile salvare la preferenza. Riprova.</p>}
    </section>
  )
}
