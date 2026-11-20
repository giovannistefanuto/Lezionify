import type { StudyAnalytics } from '../../shared/archive'
import { addCalendarDays } from '../../shared/calendarDate'
import './studyRecords.css'

const dateLabel = (date: string) => date.split('-').reverse().join('/')
function duration(seconds: number) {
  if (seconds < 60) return `${Math.floor(seconds)} s`
  const minutes = Math.floor(seconds / 60)
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`
}
export function StudyRecords({ analytics }: { analytics: StudyAnalytics | null }) {
  const records = analytics?.records
  const streak = analytics?.currentStreakDays ?? 0
  return <section className="study-records chart-card" aria-labelledby="study-records-title">
    <div className="chart-card-header"><h3 id="study-records-title">I tuoi record</h3><span className="chart-legend">Dallo storico disponibile · corsi attivi</span></div>
    <dl className="study-records-grid">
      <div><dt>Giorno migliore</dt><dd>{records?.bestDay ? duration(records.bestDay.seconds) : '—'}</dd><small>{records?.bestDay ? dateLabel(records.bestDay.date) : 'Nessuno studio registrato'}</small></div>
      <div><dt>Settimana migliore</dt><dd>{records?.bestWeek ? duration(records.bestWeek.seconds) : '—'}</dd><small>{records?.bestWeek ? `${dateLabel(records.bestWeek.date)} – ${dateLabel(addCalendarDays(records.bestWeek.date, 6))}` : 'Da lunedì a domenica'}</small></div>
      <div><dt>Concentrazione consecutiva</dt><dd>{records?.longestFocusSeconds != null ? duration(records.longestFocusSeconds) : '—'}</dd><small>Solo intervalli osservati, senza pause. Sessioni rettificate escluse.</small></div>
      <div><dt>Serie migliore</dt><dd>{records?.bestStreak ? `${records.bestStreak.days} ${records.bestStreak.days === 1 ? 'giorno' : 'giorni'}` : '—'}</dd><small>{records?.bestStreak ? `${dateLabel(records.bestStreak.start)} – ${dateLabel(records.bestStreak.end)}` : 'Almeno 10 minuti al giorno'}</small></div>
    </dl>
    <div className="study-streak-progress"><span>{streak >= 7 ? `${streak} giorni di continuità` : `${streak} / 7 giorni di continuità`}</span><progress aria-label="Continuità di studio: obiettivo 7 giorni" value={Math.min(streak, 7)} max={7} /><small>Un giorno conta con almeno 10 minuti accreditati. Oggi puoi ancora completarlo.</small></div>
    <p className="study-records-note">Giorno, settimana e serie includono i crediti manuali e stimati. I record descrivono il tempo registrato, non misurano l’apprendimento.</p>
  </section>
}
