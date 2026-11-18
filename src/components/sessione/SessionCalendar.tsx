import { useId, useMemo, useState, type ReactNode } from 'react'
import { calendarDayDifference, parseLocalCalendarDate } from '../../../shared/calendarDate'
import { getSessionWeekRows, getSessionWindow, shiftSessionMonth } from './sessionCalendar'
import './sessione.css'

export interface CalendarExam {
  id: string
  date: string
  course: string
  code: string
  label: string
  color?: string
  status: 'chosen' | 'alternative' | 'taken'
  pending?: boolean
}

const examStatuses = { chosen: 'Scelto', alternative: 'Alternativa', taken: 'Sostenuto' }
const weekdays = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
const monthName = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })
const fullDate = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })

function format(date: string, formatter: Intl.DateTimeFormat) {
  return formatter.format(parseLocalCalendarDate(date)!)
}

interface Props {
  today: string
  initialMonth: string
  exams: readonly CalendarExam[]
  onExam: (id: string) => void
  header: ReactNode
}

export function SessionCalendar({ today, initialMonth, exams, onExam, header }: Props) {
  const [anchor, setAnchor] = useState(initialMonth)
  const noteTitle = useId()
  const { months, earlier, later } = getSessionWindow(anchor, exams.map(exam => exam.date))
  const byDay = useMemo(() => {
    const days = new Map<string, CalendarExam[]>()
    for (const exam of exams) {
      const current = days.get(exam.date)
      if (current) current.push(exam)
      else days.set(exam.date, [exam])
    }
    return days
  }, [exams])
  const countdown = exams.filter(exam => exam.pending || (exam.status === 'chosen' && exam.date >= today))
    .sort((left, right) => left.date.localeCompare(right.date))

  return <div className="session-layout">
    <div className="session-main">
      {header}
      <div className="session-calendar-nav">
        <button type="button" onClick={() => setAnchor(shiftSessionMonth(anchor, -1))} aria-label="Mese precedente">‹</button>
        <button type="button" onClick={() => setAnchor(shiftSessionMonth(anchor, 1))} aria-label="Mese successivo">›</button>
        <button type="button" className="session-today" onClick={() => setAnchor(today)}>
          Oggi è <time dateTime={today}>{format(today, fullDate)}</time>
        </button>
      </div>
      {(earlier || later) && <div className="session-outside">
        {earlier && <button type="button" onClick={() => setAnchor(earlier)}>← Appelli a {format(earlier, monthName)}</button>}
        {later && <button type="button" onClick={() => setAnchor(later)}>Appelli a {format(later, monthName)} →</button>}
      </div>}
      <div className="session-months">
        {months.map(month => <table className="session-month" key={month}>
          <caption>{format(month, monthName)}</caption>
          <thead><tr>{weekdays.map(day => <th key={day} scope="col" aria-label={day}>{day.slice(0, 2)}</th>)}</tr></thead>
          <tbody>{getSessionWeekRows(month).map((week, index) => <tr key={index}>{week.map((date, column) =>
            <td key={column} className={date && date < today ? 'session-day-past' : undefined}>
              {date && <>
                <time dateTime={date} aria-current={date === today ? 'date' : undefined}>{Number(date.slice(-2))}</time>
                {byDay.get(date)?.map(exam => <button className="session-exam" data-status={exam.status} key={exam.id}
                  type="button" onClick={() => onExam(exam.id)}
                  aria-label={`${exam.course}, ${exam.label}, ${format(date, fullDate)}, ${examStatuses[exam.status]}`}>
                  {exam.status === 'alternative' && <span aria-hidden="true">○ </span>}
                  {exam.status === 'taken' && <span aria-hidden="true">✓ </span>}
                  {exam.color && <i className="session-course-dot" style={{ backgroundColor: exam.color }} aria-hidden="true" />}
                  {exam.code}
                </button>)}
              </>}
            </td>
          )}</tr>)}</tbody>
        </table>)}
      </div>
      <ul className="session-legend" aria-label="Legenda">
        <li><span className="session-legend-chosen" aria-hidden="true" /> Scelto</li>
        <li><span className="session-legend-alternative" aria-hidden="true" /> Alternativa</li>
        <li><span aria-hidden="true">✓</span> Sostenuto</li>
      </ul>
    </div>
    <aside className="session-note" aria-labelledby={noteTitle}>
      <h3 id={noteTitle}>Prossimi esami</h3>
      {countdown.length ? <table><tbody>
        {countdown.map(exam => {
          const days = calendarDayDifference(today, exam.date)
          return <tr key={exam.id}>
            <th scope="row"><button type="button" onClick={() => onExam(exam.id)}>{exam.course}
              <small>{exam.label} · <time dateTime={exam.date}>{format(exam.date, shortDate)}</time></small>
            </button></th>
            <td>{exam.pending ? 'In attesa di esito' : days === 0 ? 'Oggi' : `${days} ${days === 1 ? 'giorno' : 'giorni'}`}</td>
          </tr>
        })}
      </tbody></table> : <p>Nessuna prova in programma.</p>}
    </aside>
  </div>
}
