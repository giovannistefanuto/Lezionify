import type { Lecture } from '../../shared/archive'
import { lectureRecordingTimes } from '../utils/lectureRecordingTimes'

export function LectureRecordingTimes({ lecture }: { lecture: Lecture }) {
  const times = lectureRecordingTimes(lecture)
  return (
    <section
      className="recording-times"
      aria-label="Orari della registrazione audio"
    >
      <dl>
        <div>
          <dt>Inizio audio</dt>
          <dd>
            {times.start ? (
              <time dateTime={times.start.toISOString()}>
                {times.startLabel}
              </time>
            ) : (
              times.startLabel
            )}
          </dd>
        </div>
        <div>
          <dt>
            Fine audio <span>(calcolata)</span>
          </dt>
          <dd>
            {times.end ? (
              <time dateTime={times.end.toISOString()}>{times.endLabel}</time>
            ) : (
              times.endLabel
            )}
          </dd>
        </div>
      </dl>
      <p>
        {lecture.videoImport
          ? "Inizio assegnato all'importazione del video."
          : 'Inizio dai metadati della registrazione.'}{' '}
        Fine calcolata dalla durata audio disponibile.
      </p>
    </section>
  )
}
