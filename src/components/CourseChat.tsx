import React, { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CourseCitation,
  CourseCount,
  CourseRagState,
  CourseThread
} from '../../shared/courseRag'
import type { FocusPdfDocument } from '../../shared/archive'
import type { QnaImageInput } from '../../shared/qnaImages'
import { MarkdownViewer } from './MarkdownViewer'
import { courseAnswerSections } from '../utils/courseAnswerSections'

const FocusPdfViewer = React.lazy(() =>
  import('./FocusPdfViewer').then((module) => ({
    default: module.FocusPdfViewer
  }))
)

export function CourseChat({
  open,
  courses,
  initialCourse,
  onClose,
  onOpenLecture
}: {
  open: boolean
  courses: string[]
  initialCourse: string
  onClose: () => void
  onOpenLecture: (id: string, kind: string) => void
}) {
  const [courseNames, setCourseNames] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!open || !window.archive.getCourses) return
    let cancelled = false
    void window.archive.getCourses().then(items => { if (!cancelled) setCourseNames(Object.fromEntries(items.map(item => [item.code, item.name || item.code]))) }).catch(() => {})
    return () => { cancelled = true }
  }, [open])
  const [course, setCourse] = useState(
    initialCourse && courses.includes(initialCourse)
      ? initialCourse
      : (courses[0] ?? '')
  )
  const [data, setData] = useState<CourseRagState | null>(null)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [semanticBusy, setSemanticBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showSources, setShowSources] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [citation, setCitation] = useState<CourseCitation | null>(null)
  const [pdf, setPdf] = useState<{
    document: FocusPdfDocument & { sourceVersion: string }
    sourceId: string
    page?: number
  } | null>(null)
  const [attachments, setAttachments] = useState<QnaImageInput[]>([])
  const [imageSourceId, setImageSourceId] = useState<string | undefined>()
  const [imageSourceVersion, setImageSourceVersion] = useState<
    string | undefined
  >()
  const [term, setTerm] = useState('')
  const [count, setCount] = useState<CourseCount | null>(null)
  const generation = useRef(0)
  const currentCourse = useRef(course)
  currentCourse.current = course
  const request = useRef<{ course: string; id: string } | null>(null)
  const draftCache = useRef(new Map<string, string>())
  const draftQueue = useRef<Promise<void>>(Promise.resolve())
  const pendingDraft = useRef<{ course: string; thread: CourseThread } | null>(
    null
  )
  const panel = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current && !busy && courses.includes(initialCourse)) {
      setCourse(initialCourse)
      setPdf(null)
    }
    wasOpen.current = open
  }, [open, initialCourse, courses, busy])
  const active = data?.threads.find((thread) => thread.id === threadId)
  const isStart = !active?.messages.length
  const chooseCourse = (code: string) => {
    void flushDraft()
    setCourse(code)
    setPdf(null)
    setShowHistory(false)
  }
  const updateDraft = (value: string) => {
    setDraft(value)
    if (!active) return
    draftCache.current.set(`${course}:${active.id}`, value)
    setData(previous => previous ? {
      ...previous,
      threads: previous.threads.map(thread => thread.id === threadId ? { ...thread, draft: value } : thread)
    } : previous)
    pendingDraft.current = { course, thread: { ...active, draft: value } }
  }
  const refresh = useCallback(async () => {
    const selected = currentCourse.current
    if (!selected) return
    const result = await window.archive.getCourseRag(selected)
    if (currentCourse.current === selected)
      setData((previous) => ({
        ...result,
        threads: result.threads.map((thread) => {
          const current = previous?.threads.find(
            (item) => item.id === thread.id
          )
          return current && current.messages.length > thread.messages.length
            ? current
            : thread
        })
      }))
  }, [])
  const hasData = Boolean(data)
  useEffect(() => {
    if (open && hasData)
      void refresh().catch(() =>
        setError('Impossibile aggiornare le fonti del corso.')
      )
  }, [open, hasData, refresh])
  const flushDraft = useCallback(async () => {
    const pending = pendingDraft.current
    if (!pending) return draftQueue.current
    pendingDraft.current = null
    const write = draftQueue.current
      .catch(() => {})
      .then(() =>
        window.archive.saveCourseThread(pending.course, pending.thread)
      )
    draftQueue.current = write.catch(() => {})
    try {
      await write
    } catch {
      setError('Bozza non salvata. Riprova prima di chiudere l’app.')
    }
  }, [])
  useEffect(() => {
    const token = ++generation.current
    setData(null)
    setThreadId(null)
    setDraft('')
    setError('')
    setCitation(null)
    setCount(null)
    setAttachments([])
    if (!course) return
    void window.archive
      .getCourseRag(course)
      .then(async (result) => {
        if (generation.current !== token) return
        if (!result.threads.some(thread => !thread.messages.length)) {
          const initial: CourseThread = {
            id: crypto.randomUUID(),
            title: 'Nuova ricerca',
            messages: [],
            draft: '',
            updatedAt: new Date().toISOString()
          }
          await window.archive.saveCourseThread(course, initial)
          if (generation.current !== token) return
          result.threads = [...result.threads, initial]
        }
        setData(result)
        const first = result.threads.filter(thread => !thread.messages.length).at(-1)
        setThreadId(first?.id ?? null)
        setDraft(
          first
            ? (draftCache.current.get(`${course}:${first.id}`) ?? first.draft)
            : ''
        )
      })
      .catch(() => {
        if (generation.current === token)
          setError('Impossibile caricare la chat del corso.')
      })
    return () => {
      // A request identity token, not a DOM ref; invalidation also covers unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++
      void flushDraft()
    }
  }, [course, flushDraft])
  useEffect(() => {
    if (!open) return
    const before = document.activeElement as HTMLElement | null
    panel.current?.focus()
    return () => {
      if (before?.isConnected) before.focus({ preventScroll: true })
    }
  }, [open])
  useEffect(() => {
    if (!window.archive.onCourseRagEvent) return
    return window.archive.onCourseRagEvent((event) => {
      if (event.course !== currentCourse.current) return
      if (!event.requestId || event.requestId === request.current?.id)
        setStatus(event.message)
      if (
        !event.requestId &&
        (event.message === 'Aggiornamento delle fonti terminato.' || event.message.startsWith('Indice locale:'))
      )
        void refresh().catch(() => {})
    })
  }, [refresh])
  useEffect(() => {
    const timer = setTimeout(() => {
      void flushDraft()
    }, 300)
    return () => clearTimeout(timer)
  }, [draft, flushDraft])
  useEffect(() => {
    if (!pdf) return
    return () => {
      void window.archive.releaseFocusPdf(pdf.document.id).catch(() => {})
    }
  }, [pdf])
  useEffect(
    () => () => {
      const activeRequest = request.current
      if (activeRequest)
        void window.archive.stopCourseAnswer(
          activeRequest.course,
          activeRequest.id
        )
    },
    []
  )

  const perform = async (action: () => Promise<CourseRagState>) => {
    setError('')
    const selected = course
    try {
      const result = await action()
      if (currentCourse.current === selected) setData(result)
    } catch {
      if (currentCourse.current === selected)
        setError('Operazione non riuscita. Controlla la fonte e riprova.')
    }
  }
  const createThread = async () => {
    await flushDraft()
    const next: CourseThread = {
      id: crypto.randomUUID(),
      title: 'Nuova ricerca',
      messages: [],
      draft: '',
      updatedAt: new Date().toISOString()
    }
    await window.archive.saveCourseThread(course, next)
    await refresh()
    setThreadId(next.id)
    setDraft('')
    setShowHistory(false)
    setShowSources(false)
  }
  const send = async () => {
    if (!draft.trim() || busy) return
    const selected = course,
      token = generation.current,
      question = draft.trim()
    setBusy(true)
    setError('')
    setStatus('Ricerca nelle fonti del corso…')
    try {
      await flushDraft()
      let id = threadId
      if (!id) {
        id = crypto.randomUUID()
        await window.archive.saveCourseThread(selected, {
          id,
          title: question.slice(0, 80),
          messages: [],
          draft: '',
          updatedAt: new Date().toISOString()
        })
        setThreadId(id)
      }
      const requestId = crypto.randomUUID()
      request.current = { course: selected, id: requestId }
      const result = await window.archive.askCourse(
        selected,
        id,
        question,
        requestId,
        attachments.length ? attachments : undefined,
        imageSourceId,
        imageSourceVersion
      )
      if (generation.current !== token) return
      setData((previous) =>
        previous
          ? {
              ...previous,
              threads: [
                ...previous.threads.filter((thread) => thread.id !== id),
                result
              ]
            }
          : null
      )
      draftCache.current.set(`${selected}:${id}`, '')
      setDraft('')
      setAttachments([])
      setImageSourceId(undefined)
    } catch (failure) {
      if (generation.current === token) {
        setError(
          failure instanceof Error
            ? failure.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
            : 'Risposta non completata.'
        )
        await refresh().catch(() => {})
      }
    } finally {
      if (generation.current === token) setBusy(false)
      request.current = null
    }
  }
  const openPdf = async (sourceId: string, page?: number) => {
    try {
      const document = await window.archive.openCoursePdf(course, sourceId)
      setPdf({ document, sourceId, page })
    } catch {
      setError('PDF non disponibile. Controlla OneDrive e aggiorna le fonti.')
    }
  }
  const close = () => {
    void flushDraft()
    onClose()
  }
  if (!open) return null
  return (
    <div className="course-chat-overlay">
      <div
        className={`course-chat${isStart ? ' course-consultation-start' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={isStart ? 'Sala di consultazione' : 'Chat del corso'}
        tabIndex={-1}
        ref={panel}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !pdf) {
            event.stopPropagation()
            close()
          }
          if (event.key !== 'Tab') return
          const focusable = Array.from(
            panel.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled), select:not(:disabled), input:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]'
            ) ?? []
          ).filter(element => element.getClientRects().length && !element.closest('[hidden], [inert]'))
          const first = focusable[0],
            last = focusable.at(-1)
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === panel.current)
          ) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
      >
        {isStart ? <header className="course-consultation-toolbar">
          <div className="course-consultation-brand"><span className="brand-mark" aria-hidden="true">L</span><strong>Lezionify</strong><span>Sala di consultazione</span></div>
          <nav aria-label="Strumenti del corso">
            <button type="button" disabled={busy} aria-expanded={showHistory} aria-controls="course-history" onClick={() => { setShowHistory(value => !value); setShowSources(false) }}>Ricerche recenti</button>
            <button type="button" disabled={busy} aria-expanded={showSources} aria-controls="course-materials" onClick={() => { setShowSources(value => !value); setShowHistory(false) }}>Materiali del corso</button>
            <button onClick={close} aria-label="Chiudi chat del corso">Chiudi</button>
          </nav>
        </header> : <header>
          <h2>Chat del corso</h2>
          <select
            aria-label="Corso della chat"
            value={course}
            disabled={busy}
            onChange={(event) => {
              chooseCourse(event.target.value)
            }}
          >
            {courses.map((code) => (
              <option key={code} value={code}>{courseNames[code] || code}</option>
            ))}
          </select>
          <button onClick={() => setShowSources((value) => !value)}>
            Fonti ({data?.sources.length ?? 0})
          </button>
          <button type="button" disabled={busy} onClick={() => void createThread().catch(() => setError('Impossibile creare la ricerca.'))}>Nuova ricerca</button>
          <button onClick={close} aria-label="Chiudi chat del corso">Chiudi</button>
        </header>}
        {course && data && (!isStart || showSources) && <div className="course-coverage" aria-label="Copertura del corso">
          <strong>{courseNames[course] || course}</strong>
          <span>{data.sources.filter(source => source.status === 'ready' || source.status === 'partial').length} fonti consultabili · {data.sources.filter(source => source.status !== 'ready').length} fonti con limiti · {data.missingTranscripts ?? 0} trascrizioni mancanti</span>
          <button type="button" onClick={() => setShowSources(value => !value)}>Vedi copertura e lacune</button>
          <small>Le risposte usano i passaggi consultati: un concetto non trovato può essere presente in altre fonti o pagine non leggibili.</small>
        </div>}
        {!courses.length && <p>Aggiungi un corso per iniziare.</p>}
        {error && <p role="alert">{error}</p>}
        <p role="status" className="course-request-status">
          {busy || (showSources && (semanticBusy || data?.syncing)) ? status || 'Aggiornamento delle fonti…' : !data && course && !error ? 'Caricamento del corso…' : ''}
        </p>
        {showSources && (
          <section id="course-materials" className="course-chat-sources" aria-label="Fonti del corso">
            <p>
              Collega la cartella di questo corso: autorizzi download e
              indicizzazione dei PDF presenti e futuri mentre l’app è aperta. La
              ricerca locale non invia documenti all’AI.
            </p>
            <div className="course-chat-actions">
              <button
                disabled={!course}
                onClick={() =>
                  void perform(() => window.archive.linkCourseFolder(course))
                }
              >
                Collega cartella Notability
              </button>
              {data?.folderName && (
                <label>
                  <input
                    type="checkbox"
                    checked={data.enabled}
                    onChange={(event) =>
                      void perform(() =>
                        window.archive.setCourseFolderEnabled(
                          course,
                          event.target.checked
                        )
                      )
                    }
                  />{' '}
                  Sincronizza {data.folderName}
                </label>
              )}
              <button
                disabled={!course}
                onClick={() =>
                  void perform(() => window.archive.addCourseDocuments(course))
                }
              >
                Aggiungi PDF o testo
              </button>
              <button
                disabled={!course || data?.syncing}
                onClick={() =>
                  void perform(() => window.archive.syncCourseRag(course))
                }
              >
                Aggiorna indice
              </button>
            </div>
            <p>
              {data?.semantic?.status === 'ready' ? 'Ricerca ibrida locale disponibile. Prepara l’indice prima delle domande per ridurre l’attesa; i passaggi già pronti vengono riusati.' : 'Ricerca testuale attiva. Puoi aggiungere un modello multilingue per cercare anche parafrasi e concetti affini.'}
            </p>
            {data?.semantic?.status !== 'ready' && <button type="button" disabled={semanticBusy || busy || !course} onClick={() => {
              setSemanticBusy(true)
              void perform(() => window.archive.prepareCourseSemantic(course)).finally(() => setSemanticBusy(false))
            }}>{semanticBusy ? 'Preparazione modello locale…' : 'Scarica modello semantico locale (circa 140 MB)'}</button>}
            <small>Il download contatta Hugging Face per i pesi pubblici. Testi e vettori restano sul computer; domanda ed estratti vengono inviati a Gemini solo con il comando esplicito di consultazione.</small>
            {data?.semantic?.status === 'ready' && <div className="course-chat-actions">
              <button type="button" disabled={busy || data.indexing?.status === 'running'} onClick={() => void perform(() => window.archive.manageCourseIndex(course, 'start'))}>Prepara / riprendi indice locale</button>
              {data.indexing?.status === 'running' && <button type="button" onClick={() => void perform(() => window.archive.manageCourseIndex(course, 'cancel'))}>Interrompi preparazione</button>}
            </div>}
            {data?.indexing && <div aria-label="Preparazione indice locale" role="status">
              <p>{({ running: 'Preparazione in corso', paused: 'In pausa: puoi riprendere', cancelled: 'Preparazione interrotta', complete: 'Indice preparato', error: 'Preparazione da riprendere', stale: 'Fonti cambiate: aggiorna l’indice' })[data.indexing.status]} · {data.indexing.completed}/{data.indexing.total} passaggi</p>
              <progress max={Math.max(1, data.indexing.total)} value={data.indexing.completed} aria-label="Passaggi preparati" />
              {data.indexing.issue && <p>{data.indexing.issue}</p>}
              <details><summary>Copertura per fonte</summary><ul>{data.indexing.sources.map(source => <li key={source.sourceId}>{data.sources.find(item => item.id === source.sourceId)?.title ?? 'Fonte non più disponibile'}: {source.completed}/{source.total}</li>)}</ul></details>
            </div>}
            <details><summary>Spazio e derivazioni locali</summary>
              <p>Il modello e i vettori sono condivisi tra i corsi. La pulizia delle revisioni conserva quelle usate dai metadati attuali e dal backup; le citazioni storiche conservano i propri estratti.</p>
              <button type="button" onClick={() => void perform(() => window.archive.manageCourseIndex(course, 'storage'))}>Misura spazio locale</button>
              {data?.storage && <p>Modello {(data.storage.modelBytes / 1048576).toFixed(1)} MB · Vettori {(data.storage.vectorBytes / 1048576).toFixed(1)} MB · Revisioni del corso {data.storage.revisions} ({(data.storage.corpusBytes / 1048576).toFixed(1)} MB)</p>}
              <button type="button" disabled={busy || data?.indexing?.status === 'running'} onClick={() => void perform(() => window.archive.manageCourseIndex(course, 'clear-vectors'))}>Svuota vettori ricostruibili di tutti i corsi</button>
              <button type="button" disabled={busy || data?.syncing || data?.indexing?.status === 'running'} onClick={() => void perform(() => window.archive.manageCourseIndex(course, 'clean-revisions'))}>Pulisci revisioni non utilizzate del corso</button>
            </details>
            <details><summary>Numeri delle lezioni</summary>
              <p>I numeri assegnati restano legati alla lezione anche se cambia la data. Puoi impostare un numero ufficiale libero; i laboratori restano esclusi. Le citazioni precedenti conservano la numerazione originale.</p>
              {data?.sources.filter((source, index, all) => source.lectureId && source.lectureOrdinal && all.findIndex(item => item.lectureId === source.lectureId) === index).map(source => <form key={source.id} onSubmit={event => {
                event.preventDefault()
                const number = Number(new FormData(event.currentTarget).get('number'))
                void perform(() => window.archive.setCourseLectureNumber(course, source.lectureId!, number))
              }}><label>{source.title} · {source.numbering === 'official' ? 'ufficiale' : 'riferimento stabile'} {source.lectureOrdinal} · ordine cronologico {source.chronologicalOrdinal ?? source.lectureOrdinal}<input name="number" type="number" min={1} max={1000} defaultValue={source.lectureOrdinal} aria-label={`Numero ufficiale: ${source.title}`} /></label><button disabled={busy || data.indexing?.status === 'running'}>Imposta numero</button></form>)}
            </details>
            {data?.semantic?.issue && <p role="alert">{data.semantic.issue}</p>}
            {data?.issue && <p role="alert">{data.issue}</p>}
            <ul>
              {data?.sources.map((source) => (
                <li key={source.id}>
                  <strong>{source.title}</strong> {source.provenance === 'ai-derived' || source.kind === 'notes' ? '· Derivazione AI' : ''} ·{' '}
                  {source.status === 'ready'
                    ? 'Testo indicizzato; figure e annotazioni da consultare visivamente'
                    : source.status === 'partial'
                      ? 'Copertura parziale'
                      : source.status === 'missing'
                        ? 'Non più disponibile'
                        : 'Non leggibile'}
                  {source.unreadablePages?.length ? (
                    <span>
                      {' '}
                      · Pagine con poco testo:{' '}
                      {source.unreadablePages.slice(0, 30).join(', ')}
                      {source.unreadablePages.length > 30 ? '…' : ''}
                    </span>
                  ) : null}
                  {source.kind === 'pdf' && source.status !== 'missing' && (
                    <button onClick={() => void openPdf(source.id)}>
                      Apri / scegli pagine per Gemini
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        <div hidden={isStart && showSources} className={`course-chat-layout${isStart && showHistory ? ' with-history' : ''}`}>
          <aside id="course-history" aria-label="Conversazioni del corso" hidden={isStart && !showHistory}>
            <button
              disabled={!course || busy}
              onClick={() =>
                void createThread().catch(() =>
                  setError('Impossibile creare la conversazione.')
                )
              }
            >
              Nuova ricerca
            </button>
            {data?.threads.map((thread) => (
              <div key={thread.id}>
                <button
                  disabled={busy}
                  aria-pressed={thread.id === threadId}
                  onClick={() => {
                    void flushDraft()
                    setThreadId(thread.id)
                    setShowHistory(false)
                    setDraft(
                      draftCache.current.get(`${course}:${thread.id}`) ??
                        thread.draft
                    )
                  }}
                >
                  {thread.title}
                </button>
                <button
                  disabled={busy}
                  aria-label={`Elimina ${thread.title}`}
                  onClick={() =>
                    void window.archive
                      .deleteCourseThread(course, thread.id)
                      .then(async () => {
                        if (threadId === thread.id) {
                          setThreadId(null)
                          setDraft('')
                        }
                        await refresh()
                      })
                      .catch(() => setError('Eliminazione non riuscita.'))
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </aside>
          <section
            className="course-chat-conversation"
            aria-label="Conversazione del corso"
          >
            <div className="course-chat-messages" aria-label="Messaggi del corso">
            {isStart && <div className="course-consultation-intro">
              <div className="course-consultation-courses" role="group" aria-label="Corso da consultare">
                {courses.map(code => <button key={code} type="button" disabled={busy} aria-pressed={course === code} onClick={() => chooseCourse(code)}><strong>{code}</strong><span>{courseNames[code] || code}</span></button>)}
              </div>
              <div className="course-consultation-title"><div><h2>{courseNames[course] || course || 'I tuoi corsi'}</h2><p>Consulta lezioni e materiali del tuo corso.</p></div><button type="button" disabled={busy} onClick={() => { setShowSources(true); setShowHistory(false) }}>Materiali disponibili</button></div>
              {data && !data.sources.some(source => source.status === 'ready' || source.status === 'partial') && <p className="course-consultation-notice">Nessun materiale consultabile per questo corso. Aggiungi una trascrizione o apri Materiali disponibili.</p>}
              {(data?.issue || data?.indexing?.status === 'error') && <p className="course-consultation-notice" role="note">Alcuni materiali richiedono attenzione. Apri Materiali disponibili per controllarli.</p>}
            </div>}
            {active?.messages.map((message) => (
              <article
                key={message.id}
                className={`course-message ${message.role}`}
              >
                {message.visualPages && (
                  <p>
                    Pagine inviate come immagini:{' '}
                    {message.visualPages.pages.join(', ')}.
                  </p>
                )}
                <strong>{message.role === 'user' ? 'Tu' : 'Assistente'}</strong>
                {message.role === 'assistant' && <p className="course-answer-kind">{message.citations?.length ? 'Risposta con fonti del corso · verifica citazioni e deduzioni' : 'Nessuna citazione del corso verificata in questa risposta'}</p>}
                {message.evidence && <div className="course-answer-kind" aria-label="Evidenza consultata">
                  <p>{message.evidence.passages} passaggi consultati · {message.evidence.originalSources} fonti originali · {message.evidence.derivedSources} derivazioni AI · {message.evidence.independentGroups} gruppi di provenienza. La validità dei riferimenti non certifica il supporto di ogni affermazione.</p>
                  {message.evidence.requestedLessons.length > 0 && <p>Lezioni richieste: {message.evidence.requestedLessons.join(', ')}. Lezioni citate: {message.evidence.citedLessons.join(', ') || 'nessuna'}.</p>}
                  {message.evidence.missingLessons.length > 0 && <p role="note">Copertura incompleta: nessun estratto recuperato per le lezioni {message.evidence.missingLessons.join(', ')}. Non significa che l’argomento sia assente.</p>}
                </div>}
                {message.role === 'assistant' ? courseAnswerSections(message.text).map((part, index) => <section key={index} className={`course-answer-section kind-${part.kind}`} aria-label={part.kind === 'sources' ? 'Dalle fonti del corso' : part.kind === 'deduction' ? 'Deduzione' : part.kind === 'general' ? 'Integrazione generale' : 'Risposta'}><MarkdownViewer content={part.markdown} allowImages={false} /></section>) : <MarkdownViewer content={message.text} allowImages={false} />}
                {message.role === 'assistant' && <details className="course-grounding"><summary>{message.grounding?.status === 'reviewed' || message.grounding?.status === 'partial' ? `Controllo ${message.grounding.status === 'partial' ? 'parziale' : 'AI fallibile'} · ${message.grounding.claims.filter(claim => claim.support !== 'supported').length + (message.grounding.omittedClaims ?? 0)} affermazioni da verificare` : 'Supporto delle affermazioni non controllato semanticamente'}</summary>
                  <p>Il controllo AI delle principali affermazioni è fallibile e può non essere disponibile. Leggi i passaggi e controlla ipotesi, attribuzioni e conclusioni.</p>
                  {message.grounding?.status === 'partial' && <p>Controllo incompleto: può includere avvisi locali su copertura e cronologia. {message.grounding.omittedClaims ? `${message.grounding.omittedClaims} affermazioni non sono state collegate al testo e restano da verificare.` : ''}</p>}
                  {message.grounding?.claims.map((claim, index) => <div key={index}><blockquote>{claim.text}</blockquote><p>{claim.kind === 'course' ? 'Fonte del corso' : claim.kind === 'deduction' ? 'Deduzione' : 'Integrazione generale'} · {claim.support === 'supported' ? 'Supporto rilevato dal modello' : claim.support === 'unsupported' ? 'Supporto non rilevato' : 'Supporto incerto'}: {claim.reason}</p>{claim.passageIds.map(id => {
                    const item = message.citations?.find(citation => citation.passage.id === id)
                    return item ? <button type="button" key={id} onClick={() => setCitation(item)}>Leggi evidenza: {item.source.title}</button> : null
                  })}</div>)}
                  {message.grounding?.contradictions.map((text, index) => <p key={index} role="note">Conflitto segnalato: {text}</p>)}
                </details>}
                {message.requestedDocument && (
                  <div className="course-document-request">
                    <strong>Fonte richiesta</strong>
                    <p>{message.requestedDocument}</p>
                    <button
                      onClick={() => {
                        setShowSources(true)
                      }}
                    >
                      Scegli una fonte o pagine
                    </button>
                    <button
                      onClick={() =>
                        void perform(() =>
                          window.archive.addCourseDocuments(course)
                        )
                      }
                    >
                      Aggiungi documento
                    </button>
                  </div>
                )}
                <div className="course-citations">
                  {message.citations?.map((item, index) => {
                    const current = data?.sources.find(
                      (source) => source.id === item.source.id
                    )
                    const state =
                      !current || current.status === 'missing'
                        ? ' · fonte non più disponibile'
                        : current.version !== item.source.version
                          ? ' · fonte modificata'
                          : ''
                    return (
                      <button
                        key={item.passage.id}
                        onClick={() => setCitation(item)}
                      >
                        [{index + 1}] {item.source.title}
                        {item.passage.page ? ` · p. ${item.passage.page}` : ''}
                        {state}
                      </button>
                    )
                  })}
                </div>
                {message.trace && (
                  <details>
                    <summary>
                      Fonti inviate e ricerche ({message.trace.length})
                    </summary>
                    <ul>
                      {message.trace.map((step, i) => (
                        <li key={i}>
                          {step.action}
                          {step.detail ? ` (${step.detail})` : ''}:{' '}
                          {step.sourceIds
                            .map(
                              (id) =>
                                data?.sources.find((source) => source.id === id)
                                  ?.title ?? 'Fonte precedente'
                            )
                            .join(', ')}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </article>
            ))}
            {citation && (
              <section
                className="course-source-preview"
                aria-label="Passaggio citato"
              >
                <button onClick={() => setCitation(null)}>
                  Chiudi passaggio
                </button>
                <h3>{citation.source.title}</h3>
                <p>
                  Passaggio della versione usata nella risposta · posizione{' '}
                  {citation.passage.offset}
                  {citation.passage.page
                    ? ` · pagina ${citation.passage.page}`
                    : ''}
                </p>
                <pre>{citation.passage.text}</pre>
                {citation.passage.structuralBlock && <p>Estratto di un blocco {citation.passage.structuralBlock.kind === 'code' ? 'di codice' : 'matematico'} lungo, posizioni {citation.passage.structuralBlock.start}–{citation.passage.structuralBlock.end}. Il blocco prosegue oltre questo estratto: consulta la fonte completa.</p>}
                {citation.source.lectureId && (
                  <button
                    onClick={() => {
                      void flushDraft()
                      onOpenLecture(
                        citation.source.lectureId!,
                        citation.source.kind
                      )
                    }}
                  >
                    Apri lezione
                  </button>
                )}
                {citation.source.kind === 'pdf' && (
                  <button
                    onClick={() =>
                      void openPdf(citation.source.id, citation.passage.page)
                    }
                  >
                    Apri PDF attuale
                  </button>
                )}
              </section>
            )}
            </div>
            <div className="course-chat-composer">
            {!isStart && <details className="course-count-tool"><summary>Conteggio esatto locale nelle trascrizioni</summary>
            <form
              className="course-count"
              onSubmit={(event) => {
                event.preventDefault()
                void window.archive
                  .countCourseMentions(course, term)
                  .then(setCount)
                  .catch(() => setError('Conteggio non disponibile.'))
              }}
            >
              <label>
                Conteggio completo nelle trascrizioni{' '}
                <input
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  maxLength={160}
                  placeholder="es. John Nash"
                />
              </label>
              <button disabled={!term.trim() || !course}>Conta</button>
              {count && (
                <div>
                  <p>
                    {count.occurrences} occorrenze in {count.lessons} lezioni ·{' '}
                    {count.missingTranscripts} trascrizioni mancanti.
                    Corrispondenza esatta, senza distinzione maiuscole.
                  </p>
                  <ul>
                    {count.perLecture.map((item) => (
                      <li key={item.lectureId}>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenLecture(item.lectureId, 'transcript')
                          }
                        >
                          {item.title}
                        </button>
                        : {item.occurrences}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
            </details>}
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void send()
              }}
            >
              <label>
                {isStart ? 'Che cosa vuoi ritrovare nel corso?' : 'Domanda sul corso'}
                <textarea
                  aria-label="Domanda sul corso"
                  value={draft}
                  disabled={busy || !data}
                  maxLength={10000}
                  placeholder={isStart ? 'Un concetto, un confronto tra lezioni, un passaggio del docente…' : undefined}
                  onChange={(event) => {
                    updateDraft(event.target.value)
                  }}
                />
              </label>
              {attachments.length > 0 && (
                <p>
                  {attachments.length} pagine selezionate: verranno inviate come
                  immagini a Gemini.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAttachments([])
                      setImageSourceId(undefined)
                    }}
                  >
                    Rimuovi pagine
                  </button>
                </p>
              )}
              {!isStart && <p>
                Invia la domanda con gli estratti selezionati dal corso e fino a
                tre approfondimenti automatici. Include un controllo AI fallibile delle principali affermazioni, entro il medesimo limite di invii e tempo.
              </p>}
              <button className={isStart ? 'course-consultation-submit' : undefined} disabled={!course || !data || busy || !draft.trim()}>
                {error ? 'Riprova domanda' : isStart ? 'Consulta il corso' : 'Invia a Gemini'}
              </button>
              {busy && (
                <button
                  type="button"
                  onClick={() => {
                    const current = request.current
                    if (current)
                      void window.archive.stopCourseAnswer(
                        current.course,
                        current.id
                      )
                  }}
                >
                  Interrompi
                </button>
              )}
              {isStart && <p className="course-consultation-disclosure">Usa Gemini per riordinare gli estratti del corso. Invia la domanda e i passaggi pertinenti solo quando scegli Consulta il corso.</p>}
            </form>
            {isStart && <div className="course-consultation-examples"><p>Esempi di ricerca</p>{['Dove abbiamo introdotto questo concetto?', 'Come cambia questo argomento tra le lezioni?'].map(example => <button key={example} type="button" disabled={busy} onClick={() => { updateDraft(example); panel.current?.querySelector('textarea')?.focus() }}>{example}</button>)}</div>}
            </div>
          </section>
        </div>
        {pdf && (
          <div className="course-pdf-preview">
            <React.Suspense fallback={<p>Caricamento PDF…</p>}>
              <FocusPdfViewer
                source={pdf.document}
                lectureId={`course-${pdf.sourceId}`}
                startPage={pdf.page}
                onChange={() => setShowSources(true)}
                onHide={() => setPdf(null)}
                onAttachPages={async (images) => {
                  setAttachments(images)
                  setImageSourceId(pdf.sourceId)
                  setImageSourceVersion(pdf.document.sourceVersion)
                  setPdf(null)
                  setShowSources(false)
                }}
              />
            </React.Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
