import { useEffect, useState } from 'react'
import { inactivityProfile, proposedInactivityMinutes, saveInactivityProfile } from '../utils/studyInactivity'

export function StudyInactivitySettings() {
  const [profile, setProfile] = useState(inactivityProfile)
  const [error, setError] = useState(false)
  useEffect(() => {
    const update = () => setProfile(inactivityProfile())
    window.addEventListener('study-inactivity-preference', update)
    return () => window.removeEventListener('study-inactivity-preference', update)
  }, [])
  const save = (next: typeof profile) => { if (saveInactivityProfile(next)) { setProfile(next); setError(false) } else setError(true) }
  const proposed = proposedInactivityMinutes(profile)
  return <section className="settings-field"><h4>Conferma dello studio</h4>
    <label><input type="checkbox" checked={profile.observing} onChange={event => save({ ...profile, observing: event.target.checked })} />Osserva il mio ritmo nell’app</label>
    <p>Solo intervalli e conteggi locali, senza tasti digitati, testi o posizioni del mouse. Dopo almeno tre sessioni e un’ora osservata viene proposta una soglia da confermare. Lettura e iPad possono richiedere intervalli più lunghi.</p>
    <p>{Object.keys(profile.sessions).length} sessioni · {Math.floor(Object.values(profile.sessions).reduce((a, b) => a + b, 0) / 60)} minuti osservati.</p>
    {proposed !== null && <button type="button" onClick={() => save({ ...profile, thresholdMinutes: proposed })}>Applica soglia proposta: {proposed} minuti</button>}
    {profile.thresholdMinutes !== null && <><p>Soglia confermata: {profile.thresholdMinutes} minuti. All’avviso il tempo si ferma; il tempo precedente resta conteggiato.</p><button type="button" onClick={() => save({ ...profile, thresholdMinutes: null })}>Disattiva soglia personale</button></>}
    <button type="button" onClick={() => save({ observing: false, sessions: {}, gaps: [], thresholdMinutes: null })}>Elimina osservazioni locali</button>
    {error && <p role="alert">Impossibile salvare le preferenze.</p>}
  </section>
}
