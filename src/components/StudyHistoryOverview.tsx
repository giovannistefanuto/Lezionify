import { useMemo, useState } from 'react'
import { formatLocalCalendarDate } from '../../shared/calendarDate'
import './studyHistoryOverview.css'

type Day = { date: string; totalSeconds: number }
const shift = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next }
const label = (date: Date) => date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
const duration = (seconds: number) => `${Math.floor(seconds / 3600)} h ${Math.floor(seconds % 3600 / 60)} min`
const weekdays = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

export function StudyHistoryOverview({ history, view = 'chart' }: { history?: Day[]; view?: 'chart' | 'summary' | 'averages' }) {
  const [offset, setOffset] = useState(0)
  const today = new Date(); today.setHours(12, 0, 0, 0)
  const todayKey = formatLocalCalendarDate(today)
  const data = useMemo(() => new Map((history ?? []).map(item => [item.date, item.totalSeconds])), [history])
  const first = history?.[0]?.date
  const monday = shift(today, -((today.getDay() + 6) % 7))
  const start = shift(monday, -7 * offset)
  const end = shift(start, 6)
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = shift(start, index), key = formatLocalCalendarDate(date)
    return { date, key, value: data.get(key) ?? 0, available: Boolean(first && key >= first && key <= todayKey), future: key > todayKey }
  })
  const current = Array.from({ length: (today.getDay() + 6) % 7 + 1 }, (_, i) => data.get(formatLocalCalendarDate(shift(monday, i))) ?? 0).reduce((a, b) => a + b, 0)
  const priorStart = formatLocalCalendarDate(shift(monday, -21))
  const previousAvailable = Boolean(first && first <= priorStart)
  const previous = Array.from({ length: 21 }, (_, i) => data.get(formatLocalCalendarDate(shift(monday, i - 21))) ?? 0).reduce((a, b) => a + b, 0) / 3
  const averages = weekdays.map((name, index) => {
    const matching = (history ?? []).filter(item => item.date < todayKey && (new Date(`${item.date}T12:00:00`).getDay() + 6) % 7 === index)
    if (!first || first >= todayKey) return { name, value: null, count: 0 }
    const from = new Date(`${first}T12:00:00`)
    let count = 0
    for (let d = from; formatLocalCalendarDate(d) < todayKey; d = shift(d, 1)) if ((d.getDay() + 6) % 7 === index) count++
    return { name, value: count ? matching.reduce((sum, item) => sum + item.totalSeconds, 0) / count : null, count }
  })
  const max = Math.max(3600, ...days.map(day => day.value))
  if (view === 'summary') return <section className="chart-card history-overview" aria-label="Riepilogo settimanale"><div className="history-summary"><div><span>Questa settimana · finora</span><strong>{first ? duration(current) : 'Dati insufficienti'}</strong></div><div><span>Media · 3 settimane precedenti</span><strong>{previousAvailable ? duration(previous) : 'Dati insufficienti'}</strong></div></div></section>
  if (view === 'averages') {
    const averageMax = Math.max(3600, ...averages.map(item => item.value ?? 0))
    return <section className="chart-card history-overview" aria-label="Media per giorno della settimana"><h3>Media per giorno della settimana</h3><p className="history-note">Da {first ?? 'nessuna registrazione'} a ieri. I giorni senza crediti valgono zero; oggi è escluso.</p><div className="weekday-averages">{averages.map(item => <div className="weekday-average" key={item.name}><span>{item.name}</span><div className="weekday-track" aria-hidden="true"><div style={{width: `${(item.value ?? 0) / averageMax * 100}%`}} /></div><strong>{item.value === null ? '—' : duration(item.value)}</strong><small>{item.count} giorni</small></div>)}</div></section>
  }
  return <section className="chart-card history-overview" aria-label="Andamento dello studio">
    <div className="chart-card-header history-heading"><div><h3>{offset === 0 ? 'Questa settimana' : 'Settimana'}</h3><span className="chart-legend">{label(days[0].date)} – {label(end)} {end.getFullYear()}</span></div><div className="history-nav"><button type="button" onClick={() => setOffset(n => n + 1)} aria-label="Sette giorni precedenti">‹</button><button type="button" disabled={offset === 0} onClick={() => setOffset(n => n - 1)} aria-label="Sette giorni successivi">›</button>{offset > 0 && <button type="button" onClick={() => setOffset(0)}>Oggi</button>}</div></div>
    <div className="bar-chart-container">{days.map(day => <div key={day.key} className={`bar-chart-col ${day.key === todayKey ? 'is-today' : ''}`}><div className="bar-wrapper" title={`${day.key}: ${day.available ? duration(day.value) : day.future ? 'Giorno futuro' : 'Dati non disponibili'}`}><div className="bar-fill" style={{ height: day.available && day.value ? `${Math.max(day.value / max * 100, 4)}%` : '0%' }}>{day.value > 0 && <span className="bar-tooltip">{duration(day.value)}</span>}</div></div><span className="bar-label">{day.date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })}</span><span className="history-bar-value">{day.available ? duration(day.value) : '—'}</span></div>)}</div>
    <p className="history-note">Tempo accreditato dei corsi attivi. La presenza di registrazioni non garantisce che lo storico sia completo.</p>
  </section>
}
