import { captureGroups } from '../utils/quickCapture'
import { StudyTimeRemovalDialog } from './StudyTimeRemovalDialog'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  CourseStats,
  AppSettings,
  StudyAnalytics,
  ScratchpadData
} from '../../shared/archive'
import { MarkdownViewer } from './MarkdownViewer'
import {
  calendarDayDifference,
  formatLocalCalendarDate
} from '../../shared/calendarDate'

interface DashboardProps {
  archivedCourseCodes?: string[]
  courseStats: CourseStats[]
  selectedCourseInfo: { courseCode: string; markdown: string | null } | null
  setSelectedCourseInfo: (
    info: { courseCode: string; markdown: string | null } | null
  ) => void
  onOpenCourseInfo: (courseCode: string) => void
  formatDuration: (seconds: number) => string
  settings: AppSettings
  saveCourseConfig: (
    courseCode: string,
    config: { examDate?: string; expectedHours?: number }
  ) => Promise<void>
  onOpenCourseManagement?: () => void
  onOpenQuickCapture?: () => void
  scratchpadData?: ScratchpadData
}

function RingProgress({
  percent,
  size = 72,
  strokeWidth = 7
}: {
  percent: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(percent, 0), 100)
  const strokeDashoffset = circumference - (clamped / 100) * circumference

  return (
    <div className="ring-progress-wrap" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="ring-progress-svg"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="ring-bg"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="ring-bar"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-progress-label">
        <span className="ring-pct">{clamped}%</span>
      </div>
    </div>
  )
}

function formatHoursMinutes(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0 min'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim()
  }
  return `${minutes} min`
}

export function Dashboard({
  courseStats: allCourseStats,
  archivedCourseCodes,
  selectedCourseInfo,
  setSelectedCourseInfo,
  onOpenCourseInfo,
  formatDuration,
  settings,
  saveCourseConfig,
  onOpenCourseManagement,
  onOpenQuickCapture,
  scratchpadData
}: DashboardProps) {
  const courseStats = useMemo(() => {
    const archived = new Set(archivedCourseCodes ?? settings.archivedCourseCodes ?? [])
    return allCourseStats.filter(course => !archived.has(course.courseCode))
  }, [allCourseStats, archivedCourseCodes, settings.archivedCourseCodes])
  const [editingConfigFor, setEditingConfigFor] = useState<string | null>(null)
  const [draftExamDate, setDraftExamDate] = useState('')
  const [draftExpectedHours, setDraftExpectedHours] = useState('')

  // Study Analytics State
  const [analytics, setAnalytics] = useState<StudyAnalytics | null>(null)
  const analyticsRevision = React.useRef(0)
  const [storedScratchpad, setStoredScratchpad] = useState<ScratchpadData | null>(null)
  const scratchpad = scratchpadData ?? storedScratchpad
  const [showManualModal, setShowManualModal] = useState(false)
  const [showRemovalModal, setShowRemovalModal] = useState(false)
  const [manualCourse, setManualCourse] = useState(
    courseStats[0]?.courseCode || ''
  )
  const [manualMinutes, setManualMinutes] = useState('60')
  const [manualDate, setManualDate] = useState(formatLocalCalendarDate())
  const [isSavingManualTime, setIsSavingManualTime] = useState(false)
  const [manualTimeError, setManualTimeError] = useState<string | null>(null)
  const manualCourseTouchedRef = React.useRef(false)

  useEffect(() => {
    if (!showManualModal) return
    const courseExists = courseStats.some((course) => course.courseCode === manualCourse)
    const keepGeneral = manualCourse === 'Generale' && manualCourseTouchedRef.current
    if (!courseExists && !keepGeneral) {
      setManualCourse(courseStats[0]?.courseCode || 'Generale')
    }
  }, [courseStats, manualCourse, showManualModal])

  const loadAnalytics = useCallback(async () => {
    const revision = ++analyticsRevision.current
    if (window.archive?.getStudyAnalytics) {
      try {
        const data = await window.archive.getStudyAnalytics()
        if (revision === analyticsRevision.current) setAnalytics(data)
      } catch (err) {
        console.error(
          'Errore nel caricamento delle statistiche di studio:',
          err
        )
      }
    }
  }, [])

  const invalidateAnalytics = useCallback(() => { analyticsRevision.current++ }, [])

  const loadScratchpad = useCallback(async () => {
    if (window.archive?.getScratchpad) {
      try {
        const data = await window.archive.getScratchpad()
        setStoredScratchpad(data)
      } catch (err) {
        console.error('Errore nel caricamento dello scratchpad:', err)
      }
    }
  }, [])

  useEffect(() => {
    setAnalytics(null)
    void loadAnalytics()
    return invalidateAnalytics
  }, [loadAnalytics, invalidateAnalytics, courseStats])

  useEffect(() => {
    void loadScratchpad()
  }, [loadScratchpad])

  // Calcolo countdown per tutti gli esami configurati
  const examCountdowns = useMemo(() => {
    const list: {
      courseCode: string
      examDate: string
      daysLeft: number
      color?: string
      cfu?: number
      completedLectures: number
      totalLectures: number
      pace: string
      pacingColor: string
      pacingMessage: string
    }[] = []

    for (const stats of courseStats) {
      const courseDef = settings.courses?.[stats.courseCode]
      const config = settings.courseConfigs?.[stats.courseCode]
      const targetExamDate = courseDef?.examDate || config?.examDate
      if (!targetExamDate) continue

      const daysLeft = calendarDayDifference(
        formatLocalCalendarDate(),
        targetExamDate
      )
      if (daysLeft === null) continue
      const lecturesLeft = Math.max(
        stats.totalLectures - stats.completedLectures,
        0
      )
      const pace = (lecturesLeft / Math.max(daysLeft, 1)).toFixed(1)

      let pacingMessage: string
      let pacingColor: string
      if (daysLeft < 0) {
        pacingMessage = 'Esame passato'
        pacingColor = '#8c9e95'
      } else if (daysLeft === 0) {
        pacingMessage = 'Esame oggi!'
        pacingColor = '#c93b3b'
      } else {
        pacingMessage = `${daysLeft} giorni rimanenti`
        if (daysLeft <= 7) pacingColor = '#c93b3b'
        else if (daysLeft <= 21) pacingColor = '#d98b28'
        else pacingColor = '#226649'
      }

      list.push({
        courseCode: stats.courseCode,
        examDate: targetExamDate,
        daysLeft,
        color: courseDef?.color,
        cfu: courseDef?.cfu,
        completedLectures: stats.completedLectures,
        totalLectures: stats.totalLectures,
        pace,
        pacingColor,
        pacingMessage
      })
    }

    return list.sort((a, b) => {
      if (a.daysLeft >= 0 && b.daysLeft >= 0) return a.daysLeft - b.daysLeft
      if (a.daysLeft >= 0 && b.daysLeft < 0) return -1
      if (a.daysLeft < 0 && b.daysLeft >= 0) return 1
      return b.daysLeft - a.daysLeft
    })
  }, [courseStats, settings.courses, settings.courseConfigs])

  // Aggregate global stats for the hero overview
  const totalAudioSeconds = courseStats.reduce(
    (acc, c) => acc + c.totalAudioSeconds,
    0
  )
  const totalLecturesCount = courseStats.reduce(
    (acc, c) => acc + c.totalLectures,
    0
  )
  const totalCompletedCount = courseStats.reduce(
    (acc, c) => acc + c.completedLectures,
    0
  )
  const totalDispenseCount = courseStats.reduce(
    (acc, c) => acc + c.pipelineStatus.markdownReady,
    0
  )

  const handleEditConfig = (courseCode: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const config = settings.courseConfigs?.[courseCode]
    setDraftExamDate(config?.examDate || '')
    setDraftExpectedHours(
      config?.expectedHours ? String(config.expectedHours) : ''
    )
    setEditingConfigFor(courseCode)
  }

  const handleSaveConfig = async (courseCode: string) => {
    await saveCourseConfig(courseCode, {
      examDate: draftExamDate || undefined,
      expectedHours: draftExpectedHours ? Number(draftExpectedHours) : undefined
    })
    setEditingConfigFor(null)
  }

  const handleAddManualTime = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSavingManualTime) return
    const mins = parseInt(manualMinutes, 10)
    if (!manualCourse || !manualDate || !Number.isInteger(mins) || mins < 1 || mins > 720) {
      setManualTimeError('Seleziona un corso, una data valida e una durata tra 1 e 720 minuti.')
      return
    }
    if (!window.archive?.addManualStudyTime) {
      setManualTimeError('Il salvataggio del tempo di studio non è disponibile.')
      return
    }
    setIsSavingManualTime(true)
    setManualTimeError(null)
    try {
      await window.archive.addManualStudyTime(manualCourse, mins, manualDate)
      await loadAnalytics()
      setShowManualModal(false)
    } catch (err) {
      console.error('Errore nel salvataggio del tempo di studio:', err)
      setManualTimeError('Salvataggio non riuscito. Riprova.')
    } finally {
      setIsSavingManualTime(false)
    }
  }

  const openManualTimeModal = () => {
    manualCourseTouchedRef.current = false
    setManualCourse((current) =>
      courseStats.some((course) => course.courseCode === current)
        ? current
        : courseStats[0]?.courseCode || 'Generale'
    )
    setManualTimeError(null)
    setShowManualModal(true)
  }

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    action: () => void
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      action()
    }
  }

  // Calcolo scala massima per il grafico a barre (minimo 1 ora)
  const maxDaySeconds = Math.max(
    ...(analytics?.weekDays?.map((d) => d.totalSeconds) || [0]),
    3600
  )

  return (
    <>
      <section className="dashboard-view">
        <header className="dashboard-header">
          <div>
            <h1>Cruscotto Statistiche</h1>
            <p>
              Monitora il tuo avanzamento didattico, traccia il tempo di
              concentrazione e controlla il ritmo di studio.
            </p>
          </div>
        </header>

        {/* --- WIDGET COUNTDOWN ESAMI --- */}
        <div className="exam-countdown-container">
          <div className="exam-countdown-header">
            <div className="exam-countdown-title">
              <h2>🎯 Prossimi Appelli & Countdown Esami</h2>
              <span className="exam-countdown-subtitle">
                Calcolo automatico dei giorni rimanenti e del ritmo di
                lezioni/giorno
              </span>
            </div>
            {onOpenCourseManagement && (
              <button
                className="secondary-button small"
                onClick={onOpenCourseManagement}
                title="Gestisci date appelli e CFU"
              >
                ⚙️ Date Appelli
              </button>
            )}
          </div>

          {examCountdowns.length > 0 ? (
            <div className="exam-countdown-grid">
              {examCountdowns.map((item) => (
                <div
                  key={item.courseCode}
                  className="exam-countdown-card"
                  onClick={() => onOpenCourseInfo(item.courseCode)}
                  onKeyDown={(event) =>
                    handleCardKeyDown(event, () => onOpenCourseInfo(item.courseCode))
                  }
                  role="button"
                  tabIndex={0}
                  aria-label={`Visualizza logistica ${item.courseCode}`}
                  style={
                    item.color
                      ? { borderLeft: `4px solid ${item.color}` }
                      : undefined
                  }
                >
                  <div className="exam-card-top">
                    <div className="exam-course-badge-row">
                      <strong className="exam-course-name">
                        {item.courseCode}
                      </strong>
                      {item.cfu && (
                        <span className="exam-cfu-pill">{item.cfu} CFU</span>
                      )}
                    </div>
                    <span
                      className="exam-days-tag"
                      style={{
                        backgroundColor: `${item.pacingColor}22`,
                        color: item.pacingColor,
                        borderColor: item.pacingColor
                      }}
                    >
                      {item.daysLeft === 0
                        ? 'Oggi!'
                        : item.daysLeft < 0
                          ? 'Passato'
                          : `tra ${item.daysLeft} gg`}
                    </span>
                  </div>

                  <div className="exam-date-row">
                    <span>📅 Appello:</span>
                    <strong>
                      {item.examDate.split('-').reverse().join('/')}
                    </strong>
                  </div>

                  <div className="exam-progress-row">
                    <span>Lezioni completate:</span>
                    <strong>
                      {item.completedLectures} / {item.totalLectures}
                    </strong>
                  </div>

                  {item.daysLeft > 0 && (
                    <div
                      className="exam-pace-row"
                      style={{ color: item.pacingColor }}
                    >
                      <span>⏱️ Ritmo consigliato:</span>
                      <strong>{item.pace} lez/giorno</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="exam-countdown-empty">
              <span>Nessun appello d'esame programmato con data.</span>
              {onOpenCourseManagement && (
                <button
                  className="secondary-button small"
                  onClick={onOpenCourseManagement}
                  style={{ marginLeft: '12px' }}
                >
                  ➕ Imposta Date Esami
                </button>
              )}
            </div>
          )}
        </div>

        {/* --- SEZIONE TEMPO DI STUDIO & FOCUS TRACKER --- */}
        <div className="study-analytics-container">
          <div className="study-analytics-header">
            <div className="study-analytics-title">
              <h2>⏱️ Analisi del Tempo di Studio</h2>
              <span className="study-analytics-subtitle">
                Tracciato in modalità Focus e consultazione attiva (zero falsi
                positivi)
              </span>
            </div>
            <button
              className="secondary-button small add-manual-btn"
              onClick={openManualTimeModal}
              title="Aggiungi sessione di studio svolta su carta o libri"
            >
              ➕ Aggiungi Studio Manuale
            </button>
            <button className="secondary-button small" onClick={() => setShowRemovalModal(true)}>Togli tempo di studio</button>
          </div>

          {/* Hero KPI Studio */}
          <div className="dashboard-hero-grid study-kpi-grid">
            <div className="hero-kpi-card hero-hours-card">
              <div className="hero-kpi-icon">⏱️</div>
              <div className="hero-kpi-info">
                <span className="hero-kpi-label">Studiato Oggi</span>
                <strong className="hero-kpi-val">
                  {formatHoursMinutes(analytics?.todaySeconds || 0)}
                </strong>
              </div>
            </div>

            <div className="hero-kpi-card">
              <div className="hero-kpi-icon">🔥</div>
              <div className="hero-kpi-info">
                <span className="hero-kpi-label">Streak di Studio</span>
                <strong className="hero-kpi-val">
                  {analytics?.currentStreakDays || 0}{' '}
                  {analytics?.currentStreakDays === 1 ? 'giorno' : 'giorni'}
                </strong>
              </div>
            </div>

            <div className="hero-kpi-card">
              <div className="hero-kpi-icon">📊</div>
              <div className="hero-kpi-info">
                <span className="hero-kpi-label">Media Settimanale</span>
                <strong className="hero-kpi-val">
                  {formatHoursMinutes(analytics?.weekAvgDailySeconds || 0)} /
                  giorno
                </strong>
              </div>
            </div>

            <div className="hero-kpi-card">
              <div className="hero-kpi-icon">📅</div>
              <div className="hero-kpi-info">
                <span className="hero-kpi-label">Totale Semestre</span>
                <strong className="hero-kpi-val">
                  {formatHoursMinutes(analytics?.totalSemesterSeconds || 0)}
                </strong>
              </div>
            </div>
          </div>

          {/* Grafico a Barre 7 Giorni & Breakdown Materie */}
          <div className="study-charts-grid">
            {/* Grafico a barre verticali */}
            <div className="chart-card week-chart-card">
              <div className="chart-card-header">
                <h3>Ultimi 7 Giorni</h3>
                <span className="chart-legend">
                  Media:{' '}
                  {formatHoursMinutes(analytics?.weekAvgDailySeconds || 0)}/g
                </span>
              </div>

              <div className="bar-chart-container">
                {analytics?.weekDays?.map((day) => {
                  const heightPct = Math.round(
                    (day.totalSeconds / maxDaySeconds) * 100
                  )
                  const isToday = day.date === formatLocalCalendarDate()

                  return (
                    <div
                      key={day.date}
                      className={`bar-chart-col ${isToday ? 'is-today' : ''}`}
                    >
                      <div
                        className="bar-wrapper"
                        title={`${day.dayLabel}: ${formatHoursMinutes(day.totalSeconds)}`}
                      >
                        <div
                          className="bar-fill"
                          style={{ height: `${Math.max(heightPct, 4)}%` }}
                        >
                          {day.totalSeconds > 0 && (
                            <span className="bar-tooltip">
                              {formatHoursMinutes(day.totalSeconds)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="bar-label">{day.dayLabel}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Ripartizione per Materia */}
            <div className="chart-card breakdown-chart-card">
              <div className="chart-card-header">
                <h3>Tempo per Materia</h3>
                <span className="chart-legend">Ripartizione totale</span>
              </div>

              <div className="course-breakdown-list">
                {analytics?.courseBreakdown &&
                analytics.courseBreakdown.length > 0 ? (
                  analytics.courseBreakdown.map((item) => (
                    <div
                      key={item.courseCode}
                      className="course-breakdown-item"
                    >
                      <div className="breakdown-info-row">
                        <span className="breakdown-course-name">
                          {item.courseCode}
                        </span>
                        <span className="breakdown-time-val">
                          {formatHoursMinutes(item.totalSeconds)} (
                          {item.percentage}%)
                        </span>
                      </div>
                      <div className="breakdown-track">
                        <div
                          className="breakdown-bar"
                          style={{ width: `${Math.max(item.percentage, 5)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-analytics-msg">
                    Inizia una sessione in Focus Mode per registrare il tempo
                    dedicato a ciascuna materia!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- SEZIONE AVANZAMENTO LEZIONI & CORSI --- */}
        <div
          className="study-analytics-header"
          style={{
            marginTop: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div className="study-analytics-title">
            <h2>📚 Avanzamento Corsi & Dispense</h2>
            <span className="study-analytics-subtitle">
              Stato della pipeline didattica e date degli esami
            </span>
          </div>
          {onOpenCourseManagement && (
            <button
              className="secondary-button"
              onClick={onOpenCourseManagement}
              title="Apri pannello di gestione corsi, CFU e orari"
            >
              🏛️ Gestisci Corsi & Orario
            </button>
          )}
        </div>

        {/* Hero KPI Cards Lezioni */}
        {courseStats.length > 0 && (
          <div className="dashboard-hero-grid">
            <div className="hero-kpi-card hero-hours-card">
              <div className="hero-kpi-icon">🎙️</div>
              <div className="hero-kpi-info">
                <span className="hero-kpi-label">
                  Ore di Lezione Registrate
                </span>
                <strong className="hero-kpi-val">
                  {formatDuration(totalAudioSeconds)}
                </strong>
              </div>
            </div>

            <div className="hero-kpi-card">
              <div className="hero-kpi-icon">📚</div>
              <div className="hero-kpi-info">
                <span className="hero-kpi-label">Lezioni Archiviate</span>
                <strong className="hero-kpi-val">{totalLecturesCount}</strong>
              </div>
            </div>

            <div className="hero-kpi-card">
              <div className="hero-kpi-icon">✨</div>
              <div className="hero-kpi-info">
                <span className="hero-kpi-label">Dispense AI Generate</span>
                <strong className="hero-kpi-val">{totalDispenseCount}</strong>
              </div>
            </div>

            <div className="hero-kpi-card">
              <div className="hero-kpi-icon">🎯</div>
              <div className="hero-kpi-info">
                <span className="hero-kpi-label">Lezioni Completate</span>
                <strong className="hero-kpi-val">
                  {totalCompletedCount} / {totalLecturesCount}
                </strong>
              </div>
            </div>
          </div>
        )}

        <div className="dashboard-grid">
          {courseStats.map((stats) => {
            const studyAverage = analytics?.courseLectureAverages?.find(item => item.courseCode === stats.courseCode)
            const courseDef = settings.courses?.[stats.courseCode]
            const config = settings.courseConfigs?.[stats.courseCode]
            const total = stats.totalLectures || 1
            const progressPct = Math.round(
              (stats.completedLectures / total) * 100
            )
            const targetExamDate = courseDef?.examDate || config?.examDate

            let pacingMessage = ''
            let pacingColor = '#607069'

            if (targetExamDate) {
              const daysLeft = calendarDayDifference(
                formatLocalCalendarDate(),
                targetExamDate
              )
              if (daysLeft === null) return null
              if (daysLeft < 0) {
                pacingMessage = 'Esame passato'
              } else if (daysLeft === 0) {
                pacingMessage = 'Esame oggi!'
                pacingColor = '#c93b3b'
              } else {
                const lecturesLeft =
                  stats.totalLectures - stats.completedLectures
                const pace = (lecturesLeft / Math.max(daysLeft, 1)).toFixed(1)
                pacingMessage = `${daysLeft} giorni all'esame. Ritmo: ${pace} lez/giorno`
                if (Number(pace) > 2) pacingColor = '#c93b3b'
                else if (Number(pace) > 1) pacingColor = '#d98b28'
                else pacingColor = '#226649'
              }
            }

            return (
              <div
                key={stats.courseCode}
                className="course-stat-card"
                onClick={() => onOpenCourseInfo(stats.courseCode)}
                onKeyDown={(event) =>
                  handleCardKeyDown(event, () => onOpenCourseInfo(stats.courseCode))
                }
                role="button"
                tabIndex={0}
                aria-label={`Visualizza logistica corso ${stats.courseCode}`}
                style={
                  courseDef?.color
                    ? { borderLeft: `5px solid ${courseDef.color}` }
                    : undefined
                }
              >
                <div className="card-top-bar">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span className="course-badge-tag">{stats.courseCode}</span>
                    {courseDef?.cfu && (
                      <span
                        className="badge"
                        style={{
                          background: courseDef.color
                            ? `${courseDef.color}22`
                            : '#10b98122',
                          color: courseDef.color || '#10b981',
                          fontWeight: 700,
                          fontSize: '11px',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        {courseDef.cfu} CFU
                      </span>
                    )}
                  </div>
                  <button
                    className="setup-config-btn"
                    onClick={(e) => {
                      if (onOpenCourseManagement) {
                        e.stopPropagation()
                        onOpenCourseManagement()
                      } else {
                        handleEditConfig(stats.courseCode, e)
                      }
                    }}
                    title="Imposta corso, CFU, date e orario"
                    aria-label={`Imposta parametri per ${stats.courseCode}`}
                  >
                    ⚙️ Setup
                  </button>
                </div>

                {editingConfigFor === stats.courseCode ? (
                  <div
                    className="config-editor"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label>
                      Data Esame:
                      <input
                        type="date"
                        value={draftExamDate}
                        onChange={(e) => setDraftExamDate(e.target.value)}
                      />
                    </label>
                    <label>
                      Ore totali previste (es. 45 per 9 CFU):
                      <input
                        type="number"
                        value={draftExpectedHours}
                        onChange={(e) => setDraftExpectedHours(e.target.value)}
                      />
                    </label>
                    <div className="config-editor-actions">
                      <button
                        className="primary-button small"
                        onClick={() => handleSaveConfig(stats.courseCode)}
                      >
                        Salva
                      </button>
                      <button
                        className="secondary-button small"
                        onClick={() => setEditingConfigFor(null)}
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="card-progress-section">
                      <RingProgress percent={progressPct} />
                      <div className="progress-details">
                        <div className="progress-title-row">
                          <span className="progress-label">
                            Avanzamento Studio
                          </span>
                          <span className="progress-count">
                            {stats.completedLectures} di {stats.totalLectures}{' '}
                            lezioni
                          </span>
                        </div>
                        <div className="stat-subrows">
                          <span className="subrow-item status-done-text">
                            🟢 {stats.completedLectures} completate
                          </span>
                          <span className="subrow-item status-inprog-text">
                            🔘 {stats.inProgressLectures} in corso
                          </span>
                          <span className="subrow-item status-todo-text">
                            🟡 {stats.toStudyLectures} da studiare
                          </span>
                        </div>
                      </div>
                    </div>

                    {pacingMessage && (
                      <div
                        className="pacing-badge"
                        style={{ color: pacingColor }}
                      >
                        ⏱️ {pacingMessage}
                      </div>
                    )}
                  </>
                )}

                <div className="hours-row">
                  <span>🎙️ Ore registrate:</span>
                  <strong>
                    {formatDuration(stats.totalAudioSeconds)}
                    {config?.expectedHours ? ` / ${config.expectedHours}h` : ''}
                  </strong>
                </div>

                <div className="lecture-study-average" title="Somma di tutte le sessioni per ciascuna lezione completata, divisa per il numero di lezioni completate con tempo registrato. Il tempo manuale generico del corso è escluso.">
                  <div className="hours-row">
                    <span>⏱️ Studio medio / lezione:</span>
                    <strong>{studyAverage?.averageStudySeconds != null
                      ? formatHoursMinutes(studyAverage.averageStudySeconds)
                      : analytics ? 'Dati insufficienti' : 'Caricamento…'}</strong>
                  </div>
                  <small>{studyAverage?.timedCompletedLectures
                    ? `Su ${studyAverage.timedCompletedLectures} ${studyAverage.timedCompletedLectures === 1 ? 'lezione completata' : 'lezioni completate'} con tempo registrato`
                    : 'Completa una lezione con tempo di studio registrato'}</small>
                </div>

                <div className="pipeline-stats">
                  <div className="pipeline-stat-box pipeline-audio-box">
                    <span className="val">
                      {stats.pipelineStatus.audioOnly}
                    </span>
                    <span className="lbl">Da Trascrivere</span>
                  </div>
                  <div className="pipeline-stat-box pipeline-txt-box">
                    <span className="val">
                      {stats.pipelineStatus.transcriptAvailable}
                    </span>
                    <span className="lbl">Da Generare</span>
                  </div>
                  <div className="pipeline-stat-box pipeline-md-box">
                    <span className="val">
                      {stats.pipelineStatus.markdownReady}
                    </span>
                    <span className="lbl">Dispense OK</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* --- SEZIONE SCRATCHPAD & NOTE RAPIDE --- */}
        {scratchpad &&
          (scratchpad.todos.length > 0 ||
            captureGroups(scratchpad).some(group => group.notes.trim().length > 0)) && (
            <div className="dashboard-scratchpad-section">
              <div className="study-analytics-header">
                <div className="study-analytics-title">
                  <h2>📝 Memo</h2>
                  <span className="study-analytics-subtitle">
                    Raccolti durante le sessioni con il Memo (premi Ctrl+M
                    o Ctrl+P)
                  </span>
                </div>
                {onOpenQuickCapture && (
                  <button
                    className="secondary-button small"
                    onClick={onOpenQuickCapture}
                    title="Apri Memo (Ctrl+M)"
                  >
                    📌 Apri Memo
                  </button>
                )}
              </div>

              <div className="dashboard-scratchpad-grid">
                <div className="dashboard-scratchpad-card">
                  <div className="dash-card-header">
                    <strong>⚡ Cose da fare dopo</strong>
                    <span className="dash-count-badge">
                      {scratchpad.todos.filter((t) => t.completed).length}/
                      {scratchpad.todos.length}
                    </span>
                  </div>
                  <div className="dash-todo-list">
                    {scratchpad.todos.slice(0, 10).map((todo) => (
                      <div
                        key={todo.id}
                        className={`dash-todo-item ${todo.completed ? 'is-completed' : ''}`}
                      >
                        <span className="dash-todo-check">
                          {todo.completed ? '✓' : '☐'}
                        </span>
                        <span className="dash-todo-text">{todo.groupId && `${scratchpad.groups?.find(group => group.id === todo.groupId)?.name ?? 'Senza tag'}: `}{todo.text}</span>
                      </div>
                    ))}
                    {scratchpad.todos.length === 0 && (
                      <p className="empty-hint">Nessun to-do registrato.</p>
                    )}
                  </div>
                </div>

                <div className="dashboard-scratchpad-card">
                  <div className="dash-card-header">
                    <strong>💡 Idee & Note Sparse</strong>
                  </div>
                  <div className="dash-notes-preview">
                    {captureGroups(scratchpad).some(group => group.notes.trim()) ? (
                      <pre className="dash-notes-pre">{captureGroups(scratchpad).filter(group => group.notes.trim()).map(group => `${group.name}\n${group.notes}`).join('\n\n')}</pre>
                    ) : (
                      <p className="empty-hint">Nessuna nota registrata.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
      </section>

      {/* Manual Study Time Modal */}
      {showRemovalModal && <StudyTimeRemovalDialog onClose={() => setShowRemovalModal(false)} onSaved={loadAnalytics} />}
      {showManualModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowManualModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h2>➕ Aggiungi Sessione di Studio</h2>
              <button
                className="text-btn modal-close"
                onClick={() => setShowManualModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualTime} className="manual-study-form">
              <p className="modal-subtitle">
                Registra il tempo dedicato allo studio cartaceo, libri o
                esercizi svolti offline.
              </p>

              <label className="input-label">
                Materia / Corso:
                <select
                  className="select-input"
                  value={manualCourse}
                  onChange={(e) => {
                    manualCourseTouchedRef.current = true
                    setManualCourse(e.target.value)
                  }}
                >
                  {courseStats.map((c) => (
                    <option key={c.courseCode} value={c.courseCode}>
                      {c.courseCode}
                    </option>
                  ))}
                  <option value="Generale">Studio Generale / Altro</option>
                </select>
              </label>

              <label className="input-label">
                Durata (in minuti):
                <input
                  type="number"
                  min="1"
                  max="720"
                  className="text-input"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  placeholder="Es. 60"
                  required
                />
              </label>

              <label className="input-label">
                Data dello studio:
                <input
                  type="date"
                  className="text-input"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  required
                />
              </label>

              {manualTimeError && <p role="alert">{manualTimeError}</p>}

              <div className="modal-actions">
                <button type="submit" className="primary-button" disabled={isSavingManualTime}>
                  {isSavingManualTime ? 'Salvataggio…' : 'Salva Sessione'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowManualModal(false)}
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Info Modal */}
      {selectedCourseInfo && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedCourseInfo(null)}
        >
          <div
            className="modal-content course-info-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Informazioni corso ${selectedCourseInfo.courseCode}`}
          >
            <div className="course-info-modal-header">
              <h2>
                {selectedCourseInfo.courseCode} - Informazioni e Logistica
              </h2>
              <button
                className="text-btn modal-close"
                onClick={() => setSelectedCourseInfo(null)}
                aria-label="Chiudi finestra informazioni corso"
              >
                ✕
              </button>
            </div>
            <div className="course-info-modal-body">
              {selectedCourseInfo.markdown ? (
                <MarkdownViewer content={selectedCourseInfo.markdown} />
              ) : (
                <p>
                  Nessuna informazione logistica o regola d'esame ancora
                  estratta per questo corso. Verranno generate automaticamente
                  leggendo le trascrizioni delle prime lezioni.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
