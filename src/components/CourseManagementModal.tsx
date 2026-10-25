import React, { useState, useEffect } from 'react'
import type {
  CourseDefinition,
  CourseScheduleMatch,
  CourseTimeSlot,
  DayOfWeek,
  Lecture
} from '../../shared/archive'
import { getLectureDurationSeconds } from '../../shared/archive'

interface CourseManagementModalProps {
  isOpen: boolean
  onClose: () => void
  lectures: Lecture[]
  onRefreshLibrary: () => Promise<void>
  onNotice: (msg: string) => void
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  1: 'Lunedì',
  2: 'Martedì',
  3: 'Mercoledì',
  4: 'Giovedì',
  5: 'Venerdì',
  6: 'Sabato',
  0: 'Domenica'
}

const COLOR_PRESETS = [
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#ef4444',
  '#6366f1'
]

export function CourseManagementModal({
  isOpen,
  onClose,
  lectures,
  onRefreshLibrary,
  onNotice
}: CourseManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'edit' | 'auto-assign'>('list')
  const [courses, setCourses] = useState<CourseDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingCourseCode, setEditingCourseCode] = useState<string | null>(null)

  const [formCode, setFormCode] = useState('')
  const [formPublishing, setFormPublishing] = useState<boolean | null>(null)
  const [formName, setFormName] = useState('')
  const [formCfu, setFormCfu] = useState<number>(6)
  const [formColor, setFormColor] = useState('#10b981')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formExamDate, setFormExamDate] = useState('')
  const [formSchedule, setFormSchedule] = useState<CourseTimeSlot[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const [isMatching, setIsMatching] = useState(false)
  const [matches, setMatches] = useState<CourseScheduleMatch[]>([])
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set())

  const loadCourses = React.useCallback(async () => {
    if (!window.archive) return
    setIsLoading(true)
    try {
      const list = await window.archive.getCourses()
      setCourses(list)
    } catch (err) {
      console.error('Error loading courses:', err)
      onNotice('Errore nel caricamento dei corsi.')
    } finally {
      setIsLoading(false)
    }
  }, [onNotice])

  useEffect(() => {
    if (!isOpen) return
    loadCourses()
  }, [isOpen, loadCourses])

  function handleOpenCreate() {
    setEditingCourseCode(null)
    setFormPublishing(null)
    setFormCode('')
    setFormName('')
    setFormCfu(6)
    setFormColor(COLOR_PRESETS[courses.length % COLOR_PRESETS.length])
    const year = new Date().getFullYear()
    setFormStartDate(`${year}-10-01`)
    setFormEndDate(`${year + 1}-01-31`)
    setFormExamDate(`${year + 1}-02-15`)
    setFormSchedule([
      {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        dayOfWeek: 1,
        startTime: '10:30',
        endTime: '12:30',
        room: ''
      }
    ])
    setFormError(null)
    setActiveTab('edit')
  }

  function handleOpenEdit(course: CourseDefinition) {
    setEditingCourseCode(course.code)
    setFormPublishing(course.publishToGithub ?? true)
    setFormCode(course.code)
    setFormName(course.name || '')
    setFormCfu(course.cfu ?? 6)
    setFormColor(course.color || '#10b981')
    setFormStartDate(course.startDate || '')
    setFormEndDate(course.endDate || '')
    setFormExamDate(course.examDate || '')
    setFormSchedule(course.schedule && course.schedule.length > 0 ? [...course.schedule] : [])
    setFormError(null)
    setActiveTab('edit')
  }

  function handleAddSlot() {
    const newSlot: CourseTimeSlot = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      dayOfWeek: 2,
      startTime: '09:00',
      endTime: '11:00',
      room: ''
    }
    setFormSchedule([...formSchedule, newSlot])
  }

  function handleRemoveSlot(slotId: string) {
    setFormSchedule(formSchedule.filter((s) => s.id !== slotId))
  }

  function handleUpdateSlot(slotId: string, updates: Partial<CourseTimeSlot>) {
    setFormSchedule(
      formSchedule.map((s) => (s.id === slotId ? { ...s, ...updates } : s))
    )
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault()
    const trimmedCode = formCode.trim()
    if (formPublishing === null) { setFormError('Scegli se pubblicare le lezioni di questo corso su GitHub.'); return }
    if (!trimmedCode) {
      setFormError('Il codice / sigla del corso è obbligatorio.')
      return
    }
    if (!Number.isFinite(formCfu) || formCfu < 0) {
      setFormError('I CFU devono essere un numero maggiore o uguale a 0.')
      return
    }
    if (!formStartDate || !formEndDate) {
      setFormError('Il periodo di svolgimento (Data Inizio e Data Fine) è obbligatorio.')
      return
    }
    if (formStartDate > formEndDate) {
      setFormError('La data di inizio semestre deve precedere la data di fine.')
      return
    }
    if (!formExamDate) {
      setFormError('La data prevista dell’esame è obbligatoria.')
      return
    }
    if (formSchedule.length === 0) {
      setFormError('Inserisci almeno uno slot orario settimanale per il matching.')
      return
    }
    for (const slot of formSchedule) {
      if (!slot.startTime || !slot.endTime) {
        setFormError('Tutti gli slot orari devono avere un orario di inizio e fine.')
        return
      }
      if (slot.startTime >= slot.endTime) {
        setFormError(`L’orario di fine (${slot.endTime}) deve essere successivo all’inizio (${slot.startTime}).`)
        return
      }
    }

    setFormError(null)
    setIsLoading(true)

    const cfu = formCfu
    const lectureHours = cfu * 7
    const individualStudyHours = cfu * 18
    const totalHours = cfu * 25

    const courseDef: CourseDefinition = {
      code: trimmedCode,
      publishToGithub: formPublishing,
      name: formName.trim() || undefined,
      cfu,
      lectureHours,
      individualStudyHours,
      totalHours,
      color: formColor,
      startDate: formStartDate,
      endDate: formEndDate,
      examDate: formExamDate,
      schedule: formSchedule,
      laboratorySchedule: courses.find(course => course.code === editingCourseCode)?.laboratorySchedule
    }

    try {
      await window.archive.saveCourse(courseDef, editingCourseCode || undefined)
      onNotice(`Corso "${trimmedCode}" salvato con successo.`)
      await loadCourses()
      await onRefreshLibrary()
      setActiveTab('list')
    } catch (err) {
      console.error('Error saving course:', err)
      const msg = err instanceof Error ? err.message : 'Errore nel salvataggio del corso.'
      setFormError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteCourse(code: string) {
    if (!window.confirm(`Sei sicuro di voler eliminare il corso "${code}"? Le lezioni associate rimarranno ma non avranno più un corso assegnato.`)) {
      return
    }
    setIsLoading(true)
    try {
      await window.archive.deleteCourse(code, { keepLectures: false })
      onNotice(`Corso "${code}" eliminato.`)
      await loadCourses()
      await onRefreshLibrary()
    } catch (err) {
      console.error('Error deleting course:', err)
      onNotice('Errore durante l’eliminazione del corso.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleScanMatches() {
    setIsMatching(true)
    setMatches([])
    setSelectedMatchIds(new Set())

    try {
      const unassigned = lectures.filter((l) => !l.courseCode && l.recordedAt)
      const foundMatches: CourseScheduleMatch[] = []

      for (const lec of unassigned) {
        if (!lec.recordedAt) continue
        const durationSecs = getLectureDurationSeconds(lec)
        const match = await window.archive.matchLectureToCourse(lec.recordedAt, durationSecs)
        if (match && match.confidencePercentage >= 60) {
          foundMatches.push({
            ...match,
            lectureId: lec.id,
            lectureTitle: lec.title || lec.sourceAudioFileName
          })
        }
      }

      setMatches(foundMatches)
      setSelectedMatchIds(new Set(foundMatches.map((m) => m.lectureId)))
    } catch (err) {
      console.error('Error scanning matches:', err)
      onNotice('Errore durante la scansione delle corrispondenze orarie.')
    } finally {
      setIsMatching(false)
    }
  }

  function toggleMatchSelection(lectureId: string) {
    setSelectedMatchIds((prev) => {
      const next = new Set(prev)
      if (next.has(lectureId)) next.delete(lectureId)
      else next.add(lectureId)
      return next
    })
  }

  function handleSelectAllMatches(select: boolean) {
    if (select) {
      setSelectedMatchIds(new Set(matches.map((m) => m.lectureId)))
    } else {
      setSelectedMatchIds(new Set())
    }
  }

  async function handleApplyMatches() {
    const idsToAssign = Array.from(selectedMatchIds)
    if (idsToAssign.length === 0) return

    setIsLoading(true)
    try {
      const res = await window.archive.autoAssignCoursesBySchedule(idsToAssign, 60)
      onNotice(`Assegnate con successo ${res.assigned.length} lezioni ai rispettivi corsi!`)
      await onRefreshLibrary()
      await loadCourses()
      setActiveTab('list')
    } catch (err) {
      console.error('Error applying matches:', err)
      onNotice('Errore durante l’assegnazione delle lezioni.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const unassignedCount = lectures.filter((l) => !l.courseCode).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content course-management-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <h2>🏛️ Gestione Corsi, CFU & Orario Lezioni</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color, #e5e7eb)', paddingBottom: '10px', marginBottom: '16px' }}>
          <button
            className={`tab-btn ${activeTab === 'list' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            📚 I Miei Corsi ({courses.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'edit' ? 'is-active' : ''}`}
            onClick={handleOpenCreate}
          >
            ➕ {editingCourseCode ? 'Modifica Corso' : 'Aggiungi Nuovo Corso'}
          </button>
          <button
            className={`tab-btn ${activeTab === 'auto-assign' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('auto-assign')
              handleScanMatches()
            }}
          >
            🪄 Auto-Assegna per Orario {unassignedCount > 0 && `(${unassignedCount} pendenti)`}
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="course-list-view">
            {courses.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '30px' }}>
                <p>Nessun corso configurato.</p>
                <p className="help-text">Aggiungi il tuo primo corso per impostare i CFU e gli orari settimanali delle lezioni.</p>
                <button className="primary-button" onClick={handleOpenCreate} style={{ marginTop: '12px' }}>
                  ➕ Aggiungi Corso
                </button>
              </div>
            ) : (
              <div className="course-cards-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                {courses.map((course) => {
                  const courseLectures = lectures.filter((l) => l.courseCode === course.code)
                  const totalAudioMins = Math.round(
                    courseLectures.reduce((acc, l) => acc + getLectureDurationSeconds(l), 0) / 60
                  )
                  const audioHours = (totalAudioMins / 60).toFixed(1)

                  return (
                    <div
                      key={course.code}
                      className="course-config-card"
                      style={{
                        border: '1px solid var(--border-color, #e5e7eb)',
                        borderRadius: '8px',
                        padding: '14px 18px',
                        background: 'var(--card-bg, #ffffff)',
                        borderLeft: `5px solid ${course.color || '#10b981'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>{course.code}</h3>
                            <span
                              className="badge"
                              style={{
                                background: course.color ? `${course.color}22` : '#10b98122',
                                color: course.color || '#10b981',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}
                            >
                              {course.cfu} CFU
                            </span>
                          </div>
                          {course.name && (
                            <p style={{ margin: '4px 0 8px', color: 'var(--text-secondary, #6b7280)', fontSize: '14px' }}>
                              {course.name}
                            </p>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="secondary-button small"
                            onClick={() => handleOpenEdit(course)}
                            title="Modifica anagrafica e orario"
                          >
                            ✏️ Modifica
                          </button>
                          <button
                            className="danger-button small"
                            onClick={() => handleDeleteCourse(course.code)}
                            title="Elimina corso"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <p className="course-publication-status">GitHub: {course.publishToGithub === false ? 'disattivato' : 'abilitato'}</p>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '8px',
                          background: 'var(--hover-bg, #f9fafb)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          margin: '10px 0',
                          fontSize: '13px'
                        }}
                      >
                        <div>
                          <strong>🏫 Aula ({course.cfu} × 7h):</strong> {course.lectureHours}h attese
                          <div style={{ color: 'var(--text-secondary, #6b7280)', fontSize: '12px' }}>
                            Registrate: {audioHours}h ({courseLectures.length} lezioni)
                          </div>
                        </div>
                        <div>
                          <strong>📖 Studio ({course.cfu} × 18h):</strong> {course.individualStudyHours}h attese
                        </div>
                        <div>
                          <strong>🏁 Totale ({course.cfu} × 25h):</strong> {course.totalHours}h impegno
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: 'var(--text-secondary, #4b5563)' }}>
                        {course.startDate && course.endDate && (
                          <div>
                            📅 <strong>Semestre:</strong> {course.startDate} ➔ {course.endDate}
                          </div>
                        )}
                        {course.examDate && (
                          <div>
                            🎯 <strong>Esame:</strong> {course.examDate}
                          </div>
                        )}
                      </div>

                      {course.schedule && course.schedule.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          <strong style={{ fontSize: '12px', color: 'var(--text-secondary, #6b7280)' }}>Orario Settimanale:</strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                            {course.schedule.map((slot, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: 'var(--tag-bg, #e5e7eb)',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 500
                                }}
                              >
                                🕒 {DAY_LABELS[slot.dayOfWeek]} {slot.startTime}-{slot.endTime}
                                {slot.room && ` (${slot.room})`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'edit' && (
          <form onSubmit={handleSaveCourse} className="course-edit-form">
            {formError && (
              <div className="error-banner" style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', marginBottom: '14px' }}>
                ⚠️ {formError}
              </div>
            )}

            <fieldset className="course-publication-choice">
              <legend>Vuoi che queste lezioni vadano su GitHub?</legend>
              <label><input type="radio" name="course-publication" checked={formPublishing === true} onChange={() => setFormPublishing(true)} required /> Sì, pubblica le lezioni</label>{' '}
              <label><input type="radio" name="course-publication" checked={formPublishing === false} onChange={() => setFormPublishing(false)} required /> No, solo sul computer</label>
              <p>Si applica ai prossimi invii automatici. I file già pubblicati non vengono eliminati.</p>
            </fieldset>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label>
                  <strong>Codice / Sigla Corso *</strong>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="Es. Sistemi Distribuiti o SD"
                    required
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </label>
                {editingCourseCode && editingCourseCode !== formCode.trim() && (
                  <p style={{ fontSize: '12px', color: '#d97706', margin: '4px 0 0' }}>
                    ⚠️ Modificando il codice, tutte le lezioni esistenti con "{editingCourseCode}" verranno aggiornate automaticamente.
                  </p>
                )}
              </div>

              <div>
                <label>
                  <strong>Nome Esteso (Opzionale)</strong>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Es. Sistemi Distribuiti e Cloud Computing"
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginTop: '14px', alignItems: 'center' }}>
              <div>
                <label>
                  <strong>Crediti Formativi (CFU) *</strong>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={formCfu}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setFormCfu(Number.isFinite(value) ? Math.max(0, value) : 0)
                    }}
                    required
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </label>
              </div>

              <div style={{ background: 'var(--hover-bg, #f3f4f6)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                <strong>Formula di impegno ({formCfu} CFU):</strong>
                <div>🏫 <strong>{formCfu * 7}h</strong> lezioni in aula (7h/CFU)</div>
                <div>📖 <strong>{formCfu * 18}h</strong> studio autonomo (18h/CFU)</div>
                <div>🏁 <strong>{formCfu * 25}h</strong> carico totale (25h/CFU)</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginTop: '14px' }}>
              <div>
                <label>
                  <strong>Data Inizio Semestre *</strong>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    required
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </label>
              </div>

              <div>
                <label>
                  <strong>Data Fine Semestre *</strong>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    required
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </label>
              </div>

              <div>
                <label>
                  <strong>Data Appello Esame *</strong>
                  <input
                    type="date"
                    value={formExamDate}
                    onChange={(e) => setFormExamDate(e.target.value)}
                    required
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #6b7280)' }}>Scorciatoie Semestre:</span>
              <button
                type="button"
                className="text-button"
                style={{ fontSize: '12px', padding: '2px 6px' }}
                onClick={() => {
                  const y = new Date().getFullYear()
                  setFormStartDate(`${y}-10-01`)
                  setFormEndDate(`${y + 1}-01-31`)
                  setFormExamDate(`${y + 1}-02-15`)
                }}
              >
                1° Semestre (1 Ott - 31 Gen)
              </button>
              <button
                type="button"
                className="text-button"
                style={{ fontSize: '12px', padding: '2px 6px' }}
                onClick={() => {
                  const y = new Date().getFullYear()
                  setFormStartDate(`${y}-03-01`)
                  setFormEndDate(`${y}-06-15`)
                  setFormExamDate(`${y}-07-05`)
                }}
              >
                2° Semestre (1 Mar - 15 Giu)
              </button>
            </div>

            <div style={{ marginTop: '14px' }}>
              <label><strong>Colore Identificativo</strong></label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormColor(color)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: color,
                      border: formColor === color ? '3px solid #000000' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  style={{ width: '32px', height: '32px', cursor: 'pointer', padding: 0, border: 'none' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '18px', borderTop: '1px solid var(--border-color, #e5e7eb)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h4 style={{ margin: 0 }}>🕒 Orario Settimanale delle Lezioni *</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #6b7280)' }}>
                    Serve all'algoritmo per riconoscere automaticamente l'orario di registrazione e assegnare il corso.
                  </p>
                </div>
                <button type="button" className="secondary-button small" onClick={handleAddSlot}>
                  ➕ Aggiungi Slot
                </button>
              </div>

              {formSchedule.length === 0 ? (
                <div style={{ padding: '14px', background: 'var(--hover-bg, #fef2f2)', color: '#991b1b', borderRadius: '6px', fontSize: '13px' }}>
                  ⚠️ Aggiungi almeno uno slot settimanale (es. Martedì 10:30-12:30).
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {formSchedule.map((slot, index) => (
                    <div
                      key={slot.id || index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '140px 110px 110px 1fr 40px',
                        gap: '8px',
                        alignItems: 'center',
                        background: 'var(--hover-bg, #f9fafb)',
                        padding: '8px',
                        borderRadius: '6px'
                      }}
                    >
                      <select
                        value={slot.dayOfWeek}
                        onChange={(e) =>
                          handleUpdateSlot(slot.id, {
                            dayOfWeek: parseInt(e.target.value, 10) as DayOfWeek
                          })
                        }
                      >
                        <option value="1">Lunedì</option>
                        <option value="2">Martedì</option>
                        <option value="3">Mercoledì</option>
                        <option value="4">Giovedì</option>
                        <option value="5">Venerdì</option>
                        <option value="6">Sabato</option>
                        <option value="0">Domenica</option>
                      </select>

                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => handleUpdateSlot(slot.id, { startTime: e.target.value })}
                        required
                      />

                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => handleUpdateSlot(slot.id, { endTime: e.target.value })}
                        required
                      />

                      <input
                        type="text"
                        placeholder="Aula (es. Aula Magna, Lab 3)"
                        value={slot.room || ''}
                        onChange={(e) => handleUpdateSlot(slot.id, { room: e.target.value })}
                      />

                      <button
                        type="button"
                        className="text-button"
                        onClick={() => handleRemoveSlot(slot.id)}
                        title="Rimuovi questo slot"
                        style={{ color: '#ef4444' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setActiveTab('list')}
                disabled={isLoading}
              >
                Annulla
              </button>
              <button type="submit" className="primary-button" disabled={isLoading}>
                {isLoading ? 'Salvataggio in corso…' : '💾 Salva Corso & Orari'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'auto-assign' && (
          <div className="auto-assign-wizard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0 }}>🪄 Corrispondenze Orarie Rilevate</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #6b7280)' }}>
                  L'algoritmo analizza data, ora e durata delle registrazioni confrontandole con gli orari dei corsi attivi.
                </p>
              </div>
              <button
                className="secondary-button small"
                onClick={handleScanMatches}
                disabled={isMatching}
              >
                🔄 Rianalizza
              </button>
            </div>

            {isMatching ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <div className="ai-pulse-spinner" style={{ margin: '0 auto 12px' }} />
                <p>Scansione delle registrazioni e calcolo sovrapposizioni orarie in corso…</p>
              </div>
            ) : matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', background: 'var(--hover-bg, #f9fafb)', borderRadius: '8px' }}>
                <p>Nessuna registrazione pendente trovata compatibile con gli orari dei corsi attivi.</p>
                <p className="help-text">
                  Verifica che i corsi abbiano slot orari e date di inizio/fine coerenti con le registrazioni.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '13px' }}>
                  <span>
                    Trovate <strong>{matches.length}</strong> registrazioni compatibili ({selectedMatchIds.size} selezionate):
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="text-button" onClick={() => handleSelectAllMatches(true)}>Seleziona tutte</button>
                    <button className="text-button" onClick={() => handleSelectAllMatches(false)}>Deseleziona tutte</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                  {matches.map((m) => {
                    const isChecked = selectedMatchIds.has(m.lectureId)
                    return (
                      <div
                        key={m.lectureId}
                        onClick={() => toggleMatchSelection(m.lectureId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          border: isChecked ? '1px solid #10b981' : '1px solid var(--border-color, #e5e7eb)',
                          borderRadius: '6px',
                          background: isChecked ? '#10b9810d' : 'var(--card-bg, #ffffff)',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleMatchSelection(m.lectureId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{m.lectureTitle}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #6b7280)' }}>
                            📅 {m.recordedAt} ({m.durationMinutes} min)
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            className="badge"
                            style={{
                              background: '#10b98122',
                              color: '#10b981',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          >
                            🎯 {m.confidencePercentage}% ➔ {m.matchedCourseCode}
                          </span>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary, #6b7280)', marginTop: '2px' }}>
                            {m.reason}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button
                    className="primary-button"
                    onClick={handleApplyMatches}
                    disabled={isLoading || selectedMatchIds.size === 0}
                  >
                    🪄 Applica Assegnazioni ({selectedMatchIds.size} lezioni)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
