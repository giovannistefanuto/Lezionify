import React from 'react'

interface SemesterReminderBannerProps {
  onOpenCourseManagement: () => void
  onDismiss: () => void
}

export function isSemesterStartupPeriod(date = new Date()): { isStartup: boolean; semesterName: string } {
  const month = date.getMonth() // 0-indexed: 0 = Jan, 8 = Sept, 9 = Oct, 1 = Feb, 2 = Mar
  const day = date.getDate()

  // 1° Semestre: 20 Settembre (8, 20) -> 10 Ottobre (9, 10)
  if ((month === 8 && day >= 20) || (month === 9 && day <= 10)) {
    return { isStartup: true, semesterName: '1° Semestre (Autunno/Inverno)' }
  }

  // 2° Semestre: 26 Febbraio (1, 26) -> 9 Marzo (2, 9)
  if ((month === 1 && day >= 26) || (month === 2 && day <= 9)) {
    return { isStartup: true, semesterName: '2° Semestre (Primavera/Estate)' }
  }

  return { isStartup: false, semesterName: '' }
}

export function SemesterReminderBanner({
  onOpenCourseManagement,
  onDismiss
}: SemesterReminderBannerProps) {
  const { isStartup, semesterName } = isSemesterStartupPeriod()

  if (!isStartup) return null

  return (
    <aside className="semester-reminder-banner" aria-label="Promemoria inizio semestre">
      <div className="banner-content">
        <span className="banner-icon">📅</span>
        <div className="banner-text">
          <strong>Inizio {semesterName}</strong>
          <p>
            Verifica e aggiorna gli <strong>orari dei corsi</strong> per consentire a Lezionify di
            assegnare automaticamente le registrazioni alle materie corrette!
          </p>
        </div>
      </div>
      <div className="banner-actions">
        <button
          className="primary-button small"
          onClick={onOpenCourseManagement}
          title="Apri gestione corsi e orario"
        >
          ⚙️ Imposta Orari Corsi
        </button>
        <button
          className="secondary-button small"
          onClick={onDismiss}
          title="Nascondi promemoria per oggi"
        >
          Nascondi per oggi
        </button>
      </div>
    </aside>
  )
}
