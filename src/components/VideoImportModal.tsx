import { useEffect, useRef, useState } from 'react'
import type {
  CourseDefinition,
  Lecture,
  VideoImportReady,
  VideoImportSelection
} from '../../shared/archive'
import { formatLocalCalendarDate } from '../../shared/calendarDate'
import {
  gameTheoryCourse,
  nearestMonday,
  reorderVideoFiles
} from '../utils/videoImport'
import { formatCourseDisplayName } from '../utils/courseFormat'

interface Props {
  selection: VideoImportSelection
  courses: CourseDefinition[]
  onClose: () => void
  onImported: (lecture: Lecture) => void
}

export function VideoImportModal({
  selection,
  courses,
  onClose,
  onImported
}: Props) {
  const [files, setFiles] = useState(selection.files)
  const [phase, setPhase] = useState<
    'order' | 'converting' | 'destination' | 'saving'
  >('order')
  const [ready, setReady] = useState<VideoImportReady | null>(null)
  const [progress, setProgress] = useState({
    percent: 0,
    message: 'Preparazione…'
  })
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const draggedId = useRef<string | null>(null)
  const shortcutCourse = gameTheoryCourse(courses)
  const [courseCode, setCourseCode] = useState('')
  const [date, setDate] = useState(formatLocalCalendarDate())
  const [startTime, setStartTime] = useState('16:30')
  const [endTime, setEndTime] = useState('18:00')
  const [title, setTitle] = useState('')

  useEffect(
    () =>
      window.archive.onVideoImportProgress((value) => {
        if (value.sessionId === selection.sessionId && !closingRef.current)
          setProgress(value)
      }),
    [selection.sessionId]
  )

  useEffect(() => {
    modalRef.current?.focus()
  }, [])

  async function close() {
    if (phase === 'saving' || closingRef.current) return
    closingRef.current = true
    setClosing(true)
    try {
      await window.archive.cancelVideoImport(selection.sessionId)
      onClose()
    } catch (err) {
      closingRef.current = false
      setClosing(false)
      setError(
        err instanceof Error
          ? err.message
          : 'Impossibile annullare l’importazione.'
      )
    }
  }

  async function convert() {
    setError('')
    setPhase('converting')
    try {
      const result = await window.archive.convertVideos(
        selection.sessionId,
        files.map((file) => file.id)
      )
      if (closingRef.current) return
      setReady(result)
      setPhase('destination')
    } catch (err) {
      if (closingRef.current) return
      setError(
        err instanceof Error
          ? err.message
          : 'Conversione non riuscita. Puoi riprovare.'
      )
      setPhase('order')
    }
  }

  async function save() {
    setError('')
    setPhase('saving')
    let lecture: Lecture
    try {
      lecture = await window.archive.saveVideoImport(selection.sessionId, {
        courseCode,
        date,
        startTime,
        endTime,
        title
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Salvataggio non riuscito. Puoi riprovare senza riconvertire.'
      )
      setPhase('destination')
      return
    }
    onImported(lecture)
    onClose()
  }

  const busy = phase === 'converting' || phase === 'saving' || closing
  return (
    <div className="modal-overlay">
      <div
        className="modal-content video-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-import-title"
        ref={modalRef}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            void close()
          }
          if (event.key === 'Tab') {
            const elements = modalRef.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled)'
            )
            const first = elements?.[0]
            const last = elements?.[elements.length - 1]
            if (
              event.shiftKey &&
              (document.activeElement === first ||
                document.activeElement === modalRef.current)
            ) {
              event.preventDefault()
              last?.focus()
            } else if (
              !event.shiftKey &&
              (document.activeElement === last ||
                document.activeElement === modalRef.current)
            ) {
              event.preventDefault()
              first?.focus()
            }
          }
        }}
      >
        <div className="modal-header">
          <h3 id="video-import-title">Importa uno o più video</h3>
          <button
            className="modal-close"
            aria-label="Chiudi importazione video"
            disabled={phase === 'saving' || closing}
            onClick={() => void close()}
          >
            ✕
          </button>
        </div>
        {phase === 'order' && (
          <>
            <p>
              Trascina i video nell’ordine della lezione, oppure usa le frecce.
              Verrà creato un unico audio MP3.
            </p>
            <ol className="video-import-files" aria-label="Ordine dei video">
              {files.map((file, index) => (
                <li
                  key={file.id}
                  draggable={!busy}
                  onDragStart={(event) => {
                    draggedId.current = file.id
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', file.id)
                  }}
                  onDragEnd={() => {
                    draggedId.current = null
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const sourceId = draggedId.current
                    if (sourceId)
                      setFiles((current) =>
                        reorderVideoFiles(current, sourceId, file.id)
                      )
                    draggedId.current = null
                  }}
                >
                  <span className="video-import-file-name">
                    <strong>
                      {index + 1}. {file.name}
                    </strong>
                    <small>{(file.byteSize / 1024 / 1024).toFixed(1)} MB</small>
                  </span>
                  <button
                    className="secondary-button small"
                    aria-label={`Sposta su ${file.name}`}
                    disabled={index === 0 || busy}
                    onClick={() =>
                      setFiles((current) =>
                        reorderVideoFiles(
                          current,
                          file.id,
                          current[index - 1].id
                        )
                      )
                    }
                  >
                    ↑
                  </button>
                  <button
                    className="secondary-button small"
                    aria-label={`Sposta giù ${file.name}`}
                    disabled={index === files.length - 1 || busy}
                    onClick={() =>
                      setFiles((current) =>
                        reorderVideoFiles(
                          current,
                          file.id,
                          current[index + 1].id
                        )
                      )
                    }
                  >
                    ↓
                  </button>
                </li>
              ))}
            </ol>
            <p className="modal-description">
              I video originali restano dove sono. Le tracce audio vengono
              uniformate e unite per intero, senza tagli o pause aggiunte. Si
              usa la prima traccia audio di ciascun video.
            </p>
          </>
        )}
        {phase === 'converting' && (
          <div
            className="video-import-progress"
            role="status"
            aria-live="polite"
          >
            <p>{progress.message}</p>
            <progress max={100} value={progress.percent} />
            <p>
              La conversione avviene sul computer. Puoi annullarla; nessuna
              lezione viene salvata finché non confermi la destinazione.
            </p>
          </div>
        )}
        {(phase === 'destination' || phase === 'saving') && (
          <>
            <p>
              Audio pronto: {Math.round((ready?.durationSeconds ?? 0) / 60)}{' '}
              minuti · {((ready?.byteSize ?? 0) / 1024 / 1024).toFixed(1)} MB
            </p>
            <button
              className="secondary-button video-import-shortcut"
              disabled={!shortcutCourse || busy}
              onClick={() => {
                setCourseCode(shortcutCourse!.code)
                setDate(nearestMonday(date))
                setStartTime('16:30')
                setEndTime('18:00')
              }}
            >
              ⚡ Game Theory · lunedì 16:30–18:00
            </button>
            <p className="modal-description">
              {shortcutCourse
                ? 'La scorciatoia seleziona il lunedì più vicino alla data indicata: da venerdì a domenica sceglie quello successivo. Controlla la data della lezione prima di salvare.'
                : 'Configura un corso chiamato Game Theory (o con sigla GT) per usare la scorciatoia.'}
            </p>
            <fieldset disabled={busy} className="video-import-destination">
              <legend>Dove salvare la lezione</legend>
              <label>
                Corso
                <select
                  value={courseCode}
                  onChange={(event) => setCourseCode(event.target.value)}
                >
                  <option value="">Scegli un corso</option>
                  {courses.map((course) => (
                    <option key={course.code} value={course.code}>
                      {formatCourseDisplayName(course.code, courses)}
                    </option>
                  ))}
                </select>
              </label>
              {!courses.length && (
                <p>
                  Prima di importare, aggiungi un corso dalla gestione corsi.
                </p>
              )}
              <label>
                Data della lezione
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </label>
              <label>
                Ora di inizio
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                />
              </label>
              <label>
                Ora di fine
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  required
                />
              </label>
              <label className="video-import-title-field">
                Titolo (facoltativo)
                <input
                  value={title}
                  maxLength={240}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Es. Equilibri di Nash"
                />
              </label>
            </fieldset>
            <p className="modal-description">
              L’audio viene salvato nell’archivio locale e associato al corso e
              alla data scelti. L’orario è quello della lezione: la durata audio
              resta quella effettiva dei video. Poi usa “Elabora archivio” per
              trascrizione, dispensa e traduzione.
            </p>
          </>
        )}
        {error && (
          <p className="video-import-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="secondary-button small"
            disabled={phase === 'saving' || closing}
            onClick={() => void close()}
          >
            {closing ? 'Annullamento…' : 'Annulla'}
          </button>
          {phase === 'order' && (
            <button
              className="primary-button small"
              disabled={busy}
              onClick={() => void convert()}
            >
              Converti {files.length === 1 ? 'video' : `${files.length} video`}
            </button>
          )}
          {(phase === 'destination' || phase === 'saving') && (
            <button
              className="primary-button small"
              disabled={
                busy ||
                !courseCode ||
                !date ||
                !startTime ||
                !endTime ||
                endTime <= startTime
              }
              onClick={() => void save()}
            >
              {phase === 'saving' ? 'Salvataggio…' : 'Salva nell’archivio'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
