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
  const [course, setCourse] = useState(
    initialCourse && courses.includes(initialCourse)
      ? initialCourse
      : (courses[0] ?? '')
  )
  const [data, setData] = useState<CourseRagState | null>(null)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showSources, setShowSources] = useState(false)
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
        if (!result.threads.length) {
          const initial: CourseThread = {
            id: crypto.randomUUID(),
            title: 'Nuova conversazione',
            messages: [],
            draft: '',
            updatedAt: new Date().toISOString()
          }
          await window.archive.saveCourseThread(course, initial)
          if (generation.current !== token) return
          result.threads = [initial]
        }
        setData(result)
        const first = result.threads.at(-1)
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
        event.message === 'Aggiornamento delle fonti terminato.'
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
      title: 'Nuova conversazione',
      messages: [],
      draft: '',
      updatedAt: new Date().toISOString()
    }
    await window.archive.saveCourseThread(course, next)
    await refresh()
    setThreadId(next.id)
    setDraft('')
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
            ? failure.message
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
        className="course-chat"
        role="dialog"
        aria-modal="true"
        aria-label="Chat del corso"
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
              'button:not(:disabled), select:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
            ) ?? []
          )
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
        <header>
          <h2>Chat del corso</h2>
          <select
            aria-label="Corso della chat"
            value={course}
            disabled={busy}
            onChange={(event) => {
              void flushDraft()
              setCourse(event.target.value)
              setPdf(null)
            }}
          >
            {courses.map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
          <button onClick={() => setShowSources((value) => !value)}>
            Fonti ({data?.sources.length ?? 0})
          </button>
          <button onClick={close}>Chiudi</button>
        </header>
        {!courses.length && <p>Aggiungi un corso per iniziare.</p>}
        {error && <p role="alert">{error}</p>}
        <p role="status">
          {busy || data?.syncing ? status || 'Aggiornamento delle fonti…' : ''}
        </p>
        {showSources && (
          <section className="course-chat-sources" aria-label="Fonti del corso">
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
            {data?.issue && <p role="alert">{data.issue}</p>}
            <ul>
              {data?.sources.map((source) => (
                <li key={source.id}>
                  <strong>{source.title}</strong> ·{' '}
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
        <div className="course-chat-layout">
          <aside aria-label="Conversazioni del corso">
            <button
              disabled={!course || busy}
              onClick={() =>
                void createThread().catch(() =>
                  setError('Impossibile creare la conversazione.')
                )
              }
            >
              + Conversazione
            </button>
            {data?.threads.map((thread) => (
              <div key={thread.id}>
                <button
                  disabled={busy}
                  aria-pressed={thread.id === threadId}
                  onClick={() => {
                    void flushDraft()
                    setThreadId(thread.id)
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
            className="course-chat-messages"
            aria-label="Messaggi del corso"
          >
            {!active?.messages.length && (
              <p>
                Confronta lezioni, cerca esercizi o chiedi cosa ha detto il
                docente. Le risposte distinguono fonti, deduzioni e integrazioni
                generali.
              </p>
            )}
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
                <MarkdownViewer content={message.text} allowImages={false} />
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
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void send()
              }}
            >
              <label>
                Domanda sul corso
                <textarea
                  aria-label="Domanda sul corso"
                  value={draft}
                  disabled={busy}
                  maxLength={10000}
                  onChange={(event) => {
                    setDraft(event.target.value)
                    if (active)
                      draftCache.current.set(
                        `${course}:${active.id}`,
                        event.target.value
                      )
                    setData((previous) =>
                      previous
                        ? {
                            ...previous,
                            threads: previous.threads.map((thread) =>
                              thread.id === threadId
                                ? { ...thread, draft: event.target.value }
                                : thread
                            )
                          }
                        : previous
                    )
                    if (active)
                      pendingDraft.current = {
                        course,
                        thread: { ...active, draft: event.target.value }
                      }
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
              <p>
                Invia la domanda con gli estratti selezionati dal corso e fino a
                tre approfondimenti automatici.
              </p>
              <button disabled={!course || !data || busy || !draft.trim()}>
                Invia a Gemini
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
            </form>
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
                }}
              />
            </React.Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
