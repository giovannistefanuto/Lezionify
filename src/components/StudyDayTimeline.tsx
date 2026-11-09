import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatLocalCalendarDate } from '../../shared/calendarDate'
import { studyDayBounds, type StudyCredit, type StudyDay, type StudyProvenance, type StudySegment } from '../../shared/studyHistory'
import './studyDay.css'

const sources: Record<StudyProvenance, string> = { 'focus-observed': 'Focus osservato', 'repetition-audio': 'RIPETERE · audio',
  'repetition-reading-estimated': 'RIPETERE · lettura stimata', manual: 'Studio manuale', 'legacy-unlocated': 'Storico senza dettaglio' }
const activities = { reading: 'Lettura', qna: 'Q&A', slides: 'Slide', unknown: 'Non osservato' }
const reasons: Record<string, string> = { memo: 'Memo / RIPETERE aperto', translator: 'Traduttore', modal: 'Strumento aperto', music: 'Musica',
  pause: 'Pausa programmata', 'focus-lock': 'Attesa di conferma', 'inactive-window': 'Altra finestra', inactivity: 'Inattività rilevata', suspended: 'PC sospeso', locked: 'Schermo bloccato', unknown: 'Dati mancanti' }
const duration = (seconds: number) => seconds < 60 ? `${Math.round(seconds)} s` : `${Math.floor(seconds / 3600) ? Math.floor(seconds / 3600) + ' h ' : ''}${Math.floor(seconds % 3600 / 60)} min`
const exclusionLabel = (segment: StudySegment) => segment.exclusions.map(r => reasons[r]).join(' · ')
function compact(segments: StudySegment[]) {
  const result: StudySegment[] = []
  for (const item of segments) {
    const previous = result.at(-1)
    if (previous && previous.sessionId === item.sessionId && previous.end === item.start && previous.activity === item.activity && JSON.stringify(previous.exclusions) === JSON.stringify(item.exclusions)) {
      previous.end = item.end; previous.creditedSeconds += item.creditedSeconds
    } else result.push({ ...item })
  }
  return result
}
export function StudyDayTimeline({ courses = [], refreshToken = 0 }: { courses?: string[]; refreshToken?: number }) {
  const [date, setDate] = useState(formatLocalCalendarDate)
  const [course, setCourse] = useState<string | undefined>()
  const [source, setSource] = useState<StudyProvenance | undefined>()
  const [allHours, setAllHours] = useState(false)
  const [day, setDay] = useState<StudyDay | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [limit, setLimit] = useState(100)
  const revision = useRef(0)
  const load = useCallback(async () => {
    if (!window.archive.getStudyDay) return
    const request = ++revision.current
    setLoading(true)
    try { const value = await window.archive.getStudyDay(date, { courseCode: course, provenance: source }); if (request === revision.current) { setDay(value); setError(null) } }
    catch { if (request === revision.current) setError('Cronologia non disponibile. I dati mancanti non valgono zero studio.') }
    finally { if (request === revision.current) setLoading(false) }
  }, [date, course, source])
  const invalidate = useCallback(() => { revision.current++ }, [])
  useEffect(() => { setDay(null); setLimit(100); void load(); return invalidate }, [load, refreshToken, invalidate])
  useEffect(() => { const timer = setInterval(() => { if (!document.hidden) void load() }, 30_000); return () => clearInterval(timer) }, [load])
  const segments = useMemo(() => compact(day?.segments ?? []), [day])
  const timed = useMemo(() => day?.credits.filter(c => c.provenance !== 'focus-observed' && c.start && c.end) ?? [], [day])
  const unlocated = day?.credits.filter(c => c.unlocatedSeconds > 0) ?? []
  const time = (at: string | number, detailed = false) => new Date(at).toLocaleTimeString('it-IT', { timeZone: day?.timeZone,
    hour: '2-digit', minute: '2-digit', ...(detailed ? { timeZoneName: 'shortOffset' as const } : {}) })
  const range = useMemo(() => {
    const positions = [...segments.flatMap(s => [Date.parse(s.start), Date.parse(s.end)]), ...timed.flatMap(c=>[Date.parse(c.start!),Date.parse(c.end!)])]
    if (!positions.length) return null
    let min = positions.reduce((a,b)=>Math.min(a,b), Infinity), max = positions.reduce((a,b)=>Math.max(a,b), -Infinity)
    if (allHours) {
      const bounds = studyDayBounds(date, day?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
      min = Math.min(min,bounds.start); max = Math.max(max,bounds.end)
    } else { min = Math.floor(min/1800000)*1800000; max = Math.max(min+1800000,Math.ceil(max/1800000)*1800000) }
    return { min, max, span: max-min }
  }, [segments,timed,allHours,date,day?.timeZone])
  const shiftDay = (offset: number) => { const d = new Date(date+'T12:00:00'); d.setDate(d.getDate()+offset); setDate(formatLocalCalendarDate(d)) }
  const creditLabel = (c: StudyCredit) => `${sources[c.provenance]}${c.quality === 'declared' ? ' · orario dichiarato' : c.quality === 'estimated' ? ' · orario stimato' : ''}`
  if (!window.archive.getStudyDay) return null
  return <section className="study-day" aria-labelledby="study-day-title">
    <header className="study-day-header"><div><p className="study-day-eyebrow">CRONOLOGIA LOCALE</p><h3 id="study-day-title">La mia giornata</h3><p>Studio, strumenti e interruzioni, con la loro provenienza.</p></div>
      <div className="study-day-date"><button type="button" aria-label="Giorno precedente" onClick={()=>shiftDay(-1)}>‹</button>
        <label>Giorno<input type="date" value={date} onChange={e=>{if(e.target.value)setDate(e.target.value)}} /></label>
        <button type="button" aria-label="Giorno successivo" onClick={()=>shiftDay(1)}>›</button><button type="button" onClick={()=>setDate(formatLocalCalendarDate())}>Oggi</button></div></header>
    <div className="study-day-filters"><label>Corso<select value={course === undefined ? '' : JSON.stringify(course)} onChange={e=>setCourse(e.target.value ? JSON.parse(e.target.value) : undefined)}>
      <option value="">Tutti i corsi attivi</option><option value={'""'}>Senza corso</option>{courses.map(c=><option key={c} value={JSON.stringify(c)}>{c}</option>)}</select></label>
      <label>Provenienza<select value={source ?? ''} onChange={e=>setSource((e.target.value || undefined) as StudyProvenance | undefined)}><option value="">Tutte le attività</option>{Object.entries(sources).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label className="study-day-check"><input type="checkbox" checked={allHours} onChange={e=>setAllHours(e.target.checked)} />Tutte le ore</label>
      <button type="button" onClick={()=>void load()} disabled={loading}>{loading ? 'Caricamento…' : 'Aggiorna'}</button></div>
    {error && <p role="alert" className="study-day-warning">{error} <button type="button" onClick={()=>void load()}>Riprova</button></p>}
    {!day && !error && <p role="status">Caricamento della giornata…</p>}
    {day && <>
      <div className="study-day-metrics">
        <div><span>Studio accreditato</span><strong>{duration(day.creditedSeconds)}</strong></div>
        <div><span>Tempo osservato collocabile</span><strong>{duration(day.observedSeconds)}</strong></div>
        <div><span>Senza orario registrato</span><strong>{duration(day.unlocatedSeconds)}</strong></div>
        <div><span>Blocco più lungo / mediano</span><strong>{duration(day.longestBlockSeconds)} / {duration(day.medianBlockSeconds)}</strong></div>
      </div>
      {range ? <div className="study-day-chart" aria-label="Cronologia oraria; i dati equivalenti sono nell'elenco sottostante">
        <div className="study-day-axis" aria-hidden="true">{Array.from({length:5},(_,i)=><span key={i}>{time(range.min+range.span*i/4)}</span>)}</div>
        {(['reading','qna','slides','excluded','repetition-audio','manual'] as const).map(lane=>{
          const entries = lane === 'manual' || lane === 'repetition-audio' ? timed.filter(c=>c.provenance === lane).map(c=>({id:c.id,start:c.start!,end:c.end!,label:creditLabel(c),estimated:c.quality !== 'observed'}))
            : segments.filter(s=>lane === 'excluded' ? s.exclusions.length > 0 : !s.exclusions.length && s.activity === lane).map(s=>({id:s.id,start:s.start,end:s.end,label:exclusionLabel(s)||activities[s.activity],estimated:false}))
          if (!entries.length) return null
          return <div className="study-day-lane" key={lane}><span>{lane==='excluded'?'Pause e strumenti':lane==='manual'?'Manuale':lane==='repetition-audio'?'RIPETERE':activities[lane]}</span><div className="study-day-track" aria-hidden="true">{entries.map(s=><div key={s.id} className={`study-day-bar ${lane}${s.estimated?' estimated':''}`} style={{left:`${(Date.parse(s.start)-range.min)/range.span*100}%`,width:`${Math.max(.15,(Date.parse(s.end)-Date.parse(s.start))/range.span*100)}%`}} title={`${s.label} · ${time(s.start,true)}–${time(s.end,true)}`} />)}</div></div>
        })}
      </div> : <p className="study-day-empty">Nessuna fascia oraria osservata per questa giornata. Gli eventuali crediti senza orario sono elencati sotto.</p>}
      <div className="study-day-source-totals" aria-label="Totali per provenienza">{Object.entries(sources).map(([id,label])=>{
        const seconds=day.credits.filter(c=>c.provenance===id).reduce((n,c)=>n+c.seconds,0)
        return seconds>0?<span key={id}>{label}: <strong>{duration(seconds)}</strong></span>:null
      })}</div>
      {day.credits.some(c=>c.correctionSeconds>0) && <p className="study-day-warning">Rettifiche del totale: −{duration(day.credits.reduce((n,c)=>n+c.correctionSeconds,0))}. Le fasce originariamente osservate restano visibili: la sottrazione non è localizzabile con certezza sull’orologio.</p>}
      <p className="study-day-note">Le fasce vuote non indicano una pausa: possono essere ore non osservate. I crediti stimati e gli intervalli sovrapposti possono far differire il totale accreditato dal tempo sull’orologio. Fuso: {day.timeZone}.</p>
      {day.incomplete && <p className="study-day-warning">Sono presenti tratti senza osservazioni sufficienti. Il dettaglio è incompleto.</p>}
      {day.recovered && <p className="study-day-warning">Alcuni file dello storico sono stati recuperati da una copia precedente. Potrebbero mancare osservazioni più recenti.</p>}
      <div className="study-day-indicators"><div><h4>Interruzioni e strumenti</h4>{day.interruptions.length ? <ul>{day.interruptions.map(r=><li key={r.reason}>{r.reason.split(',').map(v=>reasons[v]??v).join(' · ')}: <strong>{r.count}</strong> · {duration(r.seconds)}</li>)}</ul> : <p>Nessuna interruzione osservata.</p>}</div>
        <div><h4>Cambi di contesto nello studio</h4><p><strong>{day.contextChanges}</strong> passaggi tra lettura, Q&amp;A e slide nei blocchi continui. Non sono un voto di attenzione.</p></div></div>
      <details className="study-day-details"><summary>Elenco delle fasce e provenienza ({segments.length+timed.length})</summary>
        <div className="study-day-table-wrap"><table><caption>Fasce collocabili del {date}</caption><thead><tr><th>Orario</th><th>Attività / provenienza</th><th>Corso</th><th>Accreditato</th></tr></thead><tbody>
          {segments.slice(0,limit).map(s=><tr key={s.id}><td>{time(s.start,true)}–{time(s.end,true)}</td><td>{exclusionLabel(s)||activities[s.activity]} · Focus osservato</td><td>{s.courseCode||'Senza corso'}</td><td>{duration(s.creditedSeconds)}</td></tr>)}
          {timed.map(c=><tr key={c.id}><td>{time(c.start!,true)}–{time(c.end!,true)}</td><td>{creditLabel(c)}</td><td>{c.courseCode||'Senza corso'}</td><td>{duration(c.seconds)}</td></tr>)}
        </tbody></table></div>{segments.length>limit && <button type="button" onClick={()=>setLimit(n=>n+100)}>Mostra altre fasce</button>}</details>
      {unlocated.length>0 && <div className="study-day-unlocated"><h4>Studio senza orario registrato</h4><ul>{unlocated.map(c=><li key={c.id}><span>{sources[c.provenance]} · {c.courseCode||'Senza corso'}</span><strong>{duration(c.unlocatedSeconds)}</strong>{c.correctionSeconds>0 && <small>Rettifica: −{duration(c.correctionSeconds)}</small>}</li>)}</ul></div>}
      {day.forecasts.length>0 && <details className="study-day-details"><summary>Previsioni registrate ({day.forecasts.length})</summary><ul>{day.forecasts.map(p=><li key={p.id}>{time(p.at,true)} · {['inizio','metà','fine'][p.phase]} · {p.language.toUpperCase()}: previsti {duration(p.predicted)}{p.actual===undefined?' · esito ancora aperto':` · effettivi ${duration(p.actual)}`}{p.invalid && ` · esclusa: ${p.invalid}`}</li>)}</ul></details>}
    </>}
  </section>
}
