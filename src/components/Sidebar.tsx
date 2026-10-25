import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MusicButton } from './MusicButton'
import type { CourseDefinition } from '../../shared/archive'
import { formatCourseDisplayName } from '../utils/courseFormat'

interface SidebarProps {
  mainView: 'archive' | 'dashboard'
  setMainView: (view: 'archive' | 'dashboard') => void
  selectedCourse: string
  setSelectedCourse: (course: string) => void
  selectedStudyStatus: string
  setSelectedStudyStatus: (status: string) => void
  totalLecturesCount: number
  coursesWithCounts: string[]
  getCourseLecturesCount: (course: string) => number
  courses?: CourseDefinition[]
  archivedCourseCodes?: string[]
  isSavingCourseArchive?: boolean
  onCourseArchive?: (course: string, archived: boolean) => void
  onOpenSettings: () => void
  hasConfiguredKey: boolean
  searchQuery: string
  setSearchQuery: (query: string) => void
  onRefreshStats: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onOpenCourseManagement: () => void
  onOpenCourseChat?: () => void
  onOpenQuickCapture?: () => void
  onOpenLogViewer?: () => void
  onOpenUsbRecorder?: () => void
  isUsbConnected?: boolean
}

export function Sidebar({
  mainView,
  setMainView,
  selectedCourse,
  setSelectedCourse,
  selectedStudyStatus,
  setSelectedStudyStatus,
  totalLecturesCount,
  coursesWithCounts,
  getCourseLecturesCount,
  courses: courseDefinitions = [],
  archivedCourseCodes = [],
  isSavingCourseArchive = false,
  onCourseArchive,
  onOpenSettings,
  hasConfiguredKey,
  searchQuery,
  setSearchQuery,
  onRefreshStats,
  isCollapsed,
  onToggleCollapse,
  searchInputRef,
  theme,
  onToggleTheme,
  onOpenCourseManagement,
  onOpenCourseChat,
  onOpenQuickCapture,
  onOpenLogViewer,
  onOpenUsbRecorder,
  isUsbConnected
}: SidebarProps) {
  
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})
  const [courseMenu, setCourseMenu] = useState<{
    course: string; x: number; y: number; trigger: HTMLButtonElement
  } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const archivedCourses = useMemo(() => new Set(archivedCourseCodes), [archivedCourseCodes])

  useEffect(() => {
    if (!courseMenu) return
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const dismiss = () => setCourseMenu(null)
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) dismiss()
    }
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Tab') {
        dismiss()
        if (event.key === 'Escape') {
          event.preventDefault()
          courseMenu.trigger.focus()
        }
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', keyboard)
    window.addEventListener('resize', dismiss)
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('blur', dismiss)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', keyboard)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('blur', dismiss)
    }
  }, [courseMenu])

  const openCourseMenu = (course: string, trigger: HTMLButtonElement, x: number, y: number) => {
    if (!onCourseArchive || isSavingCourseArchive ||
      (course === 'Senza corso' && !courseDefinitions.some(c => c.code === course))) return
    setCourseMenu({ course, trigger,
      x: Math.max(8, Math.min(x, window.innerWidth - 248)),
      y: Math.max(8, Math.min(y, window.innerHeight - 105)) })
  }

  const toggleFolder = (folder: string) => {
    setCollapsedFolders(prev => ({ ...prev, [folder]: !prev[folder] }))
  }

  // Build a simple 1-level folder tree by splitting courseCode on " / " or " - " (excluding course format codes)
  const courseTree = useMemo(() => {
    const tree: Record<string, string[]> = {}
    
    const allCourses = [...new Set([...coursesWithCounts,
      ...courseDefinitions.map(course => course.code), ...archivedCourseCodes])].sort()
    allCourses.filter(course => !archivedCourses.has(course)).forEach((course) => {
      let folder = ''
      if (course.includes('/')) {
        const parts = course.split('/')
        if (parts[0].trim()) {
          folder = parts[0].trim()
        }
      } else if (
        course.includes(' - ') &&
        !course.startsWith('(') &&
        !course.match(/^[A-Za-z0-9_-]{1,8}\s*-\s*/)
      ) {
        const parts = course.split(' - ')
        if (parts[0].trim()) {
          folder = parts[0].trim()
        }
      }

      if (!tree[folder]) tree[folder] = []
      tree[folder].push(course)
    })
    
    return { active: tree, archived: allCourses.filter(course => archivedCourses.has(course)) }
  }, [coursesWithCounts, courseDefinitions, archivedCourseCodes, archivedCourses])

  const renderCourse = (course: string, folder = '') => {
    let rawTitle = course
    if (folder && (course.startsWith(folder + '/') || course.startsWith(folder + ' - '))) {
      rawTitle = course.substring(folder.length + (course.includes('/') ? 1 : 3)).trim()
    }
    const displayTitle = formatCourseDisplayName(rawTitle, courseDefinitions)
    return (
      <button
        className={`course-button child-course ${selectedCourse === course ? 'is-active' : ''}`}
        key={course}
        onClick={() => {
          setSelectedCourse(course)
          if (archivedCourses.has(course)) setSelectedStudyStatus('tutti')
          if (mainView !== 'archive') setMainView('archive')
        }}
        onContextMenu={event => {
          event.preventDefault()
          openCourseMenu(course, event.currentTarget, event.clientX, event.clientY)
        }}
        onKeyDown={event => {
          if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
            event.preventDefault()
            const rect = event.currentTarget.getBoundingClientRect()
            openCourseMenu(course, event.currentTarget, rect.left, rect.bottom)
          }
        }}
        aria-haspopup={onCourseArchive && course !== 'Senza corso' ? 'menu' : undefined}
        title={displayTitle}
      >
        <span className="course-name-trunc">{displayTitle}</span>
        <span className="course-count-badge">{getCourseLecturesCount(course)}</span>
      </button>
    )
  }

  const renderFolder = (key: string, label: string, children: React.ReactNode) => (
    <div key={key} className="folder-group">
      <button className="folder-toggle" aria-expanded={!collapsedFolders[key]}
        onClick={() => toggleFolder(key)}>
        <span className="folder-icon" aria-hidden="true">{collapsedFolders[key] ? '📁' : '📂'}</span>
        <span className="folder-name">{label}</span>
      </button>
      {!collapsedFolders[key] && <div className="folder-children">{children}</div>}
    </div>
  )

  return (
    <aside className={`sidebar ${isCollapsed ? 'is-collapsed' : ''}`}>
      {/* Expanded Sidebar Header */}
      {!isCollapsed && (
        <div className="sidebar-header">
          <div className="sidebar-brand-row">
            <div className="brand">
              <span className="brand-mark">L</span>
              <span className="brand-title">Lezionify</span>
            </div>

            <button
              className="sidebar-collapse-btn"
              onClick={onToggleCollapse}
              title="Comprimi barra laterale"
              aria-label="Comprimi barra laterale"
            >
              ‹
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="sidebar-action-bar">
            <div className="sidebar-action-group">
              {onOpenUsbRecorder && (
                <button
                  className="settings-gear-btn"
                  onClick={onOpenUsbRecorder}
                  title={
                    isUsbConnected
                      ? 'Registratore USB Connesso (D:\\RECORD)'
                      : 'Acquisizione Registratore USB'
                  }
                  aria-label="Apri registratore USB"
                >
                  🎙️<span className="sidebar-action-label">Audio</span>
                  {isUsbConnected && (
                    <span
                      className="usb-indicator-dot"
                      title="Registratore collegato"
                    />
                  )}
                </button>
              )}

              {onOpenCourseChat && <button className="settings-gear-btn" onClick={onOpenCourseChat}
                title="Sala di consultazione" aria-label="Apri consultazione del corso">💬<span className="sidebar-action-label">Consulta</span></button>}
              {onOpenQuickCapture && (
                <button
                  className="settings-gear-btn"
                  onClick={onOpenQuickCapture}
                  title="Memo (Ctrl+M o Ctrl+P)"
                  aria-label="Apri Memo"
                >
                  📌<span className="sidebar-action-label">Memo</span>
                </button>
              )}

              {onOpenLogViewer && (<details className="sidebar-more-actions"><summary aria-label="Altri strumenti">⋯</summary>
                <button
                  className="settings-gear-btn"
                  onClick={onOpenLogViewer}
                  title="Log di Sistema & Diagnostica (Ctrl+Shift+L)"
                  aria-label="Apri log di sistema"
                >
                  📜 Log di sistema
                </button>
              </details>)}

              <button
                className="settings-gear-btn"
                onClick={onOpenSettings}
                title="Impostazioni"
                aria-label="Apri impostazioni"
              >
                ⚙️<span className="sidebar-action-label">Impostazioni</span>
                {!hasConfiguredKey && (
                  <span className="settings-warning-dot" title="Nessuna chiave API configurata">
                    •
                  </span>
                )}
              </button>
            </div>

            {/* Animated Sun / Moon Theme Toggle */}
            <button
              className={`theme-toggle-btn is-${theme}`}
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Passa alla modalità giorno (Sole)' : 'Passa alla modalità notte (Luna)'}
              aria-label={theme === 'dark' ? 'Passa alla modalità giorno' : 'Passa alla modalità notte'}
            >
              <div className="theme-toggle-track">
                <span className="theme-icon sun-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" fill="#facc15" stroke="#facc15" />
                    <line x1="12" y1="1" x2="12" y2="3" stroke="#facc15" />
                    <line x1="12" y1="21" x2="12" y2="23" stroke="#facc15" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="#facc15" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="#facc15" />
                    <line x1="1" y1="12" x2="3" y2="12" stroke="#facc15" />
                    <line x1="21" y1="12" x2="23" y2="12" stroke="#facc15" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="#facc15" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="#facc15" />
                  </svg>
                </span>
                <span className="theme-icon moon-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#93c5fd" stroke="#60a5fa" />
                  </svg>
                </span>
                <div className="theme-toggle-thumb" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Collapsed Sidebar Header */}
      {isCollapsed && (
        <div className="sidebar-collapsed-header">
          <div className="brand-mark" title="Lezionify">
            L
          </div>
          <button
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title="Espandi barra laterale"
            aria-label="Espandi barra laterale"
          >
            ›
          </button>
        </div>
      )}

      {!isCollapsed && (
        <>
          <div className="sidebar-music-access">
            <MusicButton />
          </div>
          <div className="sidebar-search">
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Cerca lezioni… (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cerca lezioni"
            />
          </div>

          <div className="view-toggle">
            <button
              className={mainView === 'archive' ? 'is-active' : ''}
              onClick={() => setMainView('archive')}
            >
              📚 Archivio
            </button>
            <button
              className={mainView === 'dashboard' ? 'is-active' : ''}
              onClick={() => {
                setMainView('dashboard')
                onRefreshStats()
              }}
            >
              📊 Statistiche
            </button>
          </div>

          <div className="sidebar-scrollable">
            <p className="sidebar-label">STATO STUDIO</p>
            <div className="study-filter-group">
              {(['tutti', 'da-studiare', 'in-corso', 'completata'] as const).map((st) => (
                <button
                  key={st}
                  className={`study-filter-btn ${selectedStudyStatus === st ? 'is-active' : ''}`}
                  onClick={() => {
                    if (archivedCourses.has(selectedCourse)) setSelectedCourse('tutti')
                    setSelectedStudyStatus(st)
                    if (mainView !== 'archive') setMainView('archive')
                  }}
                >
                  {st === 'tutti' && 'Tutti gli stati'}
                  {st === 'da-studiare' && '🟡 Da studiare'}
                  {st === 'in-corso' && '🔵 In corso'}
                  {st === 'completata' && '🟢 Completata'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="sidebar-label" style={{ margin: 0 }}>MATERIE</p>
              <button
                className="text-button"
                onClick={onOpenCourseManagement}
                title="Gestione Corsi, CFU e Orari"
                style={{ fontSize: '11px', padding: '2px 4px', color: 'var(--primary-color, #10b981)' }}
              >
                ⚙️ Gestisci
              </button>
            </div>
            <button
              className={`course-button ${selectedCourse === 'tutti' ? 'is-active' : ''}`}
              onClick={() => {
                setSelectedCourse('tutti')
                if (mainView !== 'archive') setMainView('archive')
              }}
            >
              <span>Tutte le lezioni</span>
              <span className="course-count-badge">{totalLecturesCount}</span>
            </button>

            <nav aria-label="Corsi" className="course-tree">
              {renderFolder('active', 'Corsi attivi',
                Object.keys(courseTree.active).length === 0 ?
                  <p className="empty-courses">Nessun corso attivo.</p> :
                  Object.entries(courseTree.active)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([folder, folderCourses]) => folder ?
                      renderFolder(`active:${folder}`, folder,
                        folderCourses.map(course => renderCourse(course, folder))) :
                      folderCourses.map(course => renderCourse(course)))
              )}
              {renderFolder('archived', 'Corsi archiviati', courseTree.archived.length === 0 ?
                <p className="empty-courses">Nessun corso archiviato.</p> :
                courseTree.archived.map(course => renderCourse(course))
              )}
            </nav>
          </div>
        </>
      )}

      {/* Collapsed sidebar: show icon-only nav */}
      {isCollapsed && (
        <div className="sidebar-collapsed-nav">
          <MusicButton compact />
          <button
            className={`sidebar-icon-btn ${mainView === 'archive' ? 'is-active' : ''}`}
            onClick={() => setMainView('archive')}
            title="Archivio"
            aria-label="Archivio"
          >
            📚
          </button>
          <button
            className={`sidebar-icon-btn ${mainView === 'dashboard' ? 'is-active' : ''}`}
            onClick={() => {
              setMainView('dashboard')
              onRefreshStats()
            }}
            title="Statistiche"
            aria-label="Statistiche"
          >
            📊
          </button>
          {onOpenQuickCapture && (
            <button
              className="sidebar-icon-btn"
              onClick={onOpenQuickCapture}
              title="Memo (Ctrl+M o Ctrl+P)"
              aria-label="Memo"
            >
              📌
            </button>
          )}
          {onOpenLogViewer && (
            <button
              className="sidebar-icon-btn"
              onClick={onOpenLogViewer}
              title="Log di Sistema (Ctrl+Shift+L)"
              aria-label="Log di Sistema"
            >
              📜
            </button>
          )}
          <button
            className="sidebar-icon-btn"
            onClick={onOpenSettings}
            title="Impostazioni"
            aria-label="Impostazioni"
            style={{ position: 'relative' }}
          >
            ⚙️
            {!hasConfiguredKey && (
              <span className="settings-warning-dot" style={{ top: 2, right: 2 }} title="Nessuna chiave API configurata">
                •
              </span>
            )}
          </button>
          <button
            className="sidebar-icon-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Modalità giorno' : 'Modalità notte'}
            aria-label={theme === 'dark' ? 'Modalità giorno' : 'Modalità notte'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      )}
      {courseMenu && !isCollapsed && createPortal(
        <div className="course-context-menu" ref={menuRef} role="menu"
          aria-label={`Azioni corso ${formatCourseDisplayName(courseMenu.course, courseDefinitions)}`}
          style={{ left: courseMenu.x, top: courseMenu.y }}>
          <p className="course-context-title">{formatCourseDisplayName(courseMenu.course, courseDefinitions)}</p>
          <button role="menuitem" disabled={isSavingCourseArchive} onClick={() => {
            onCourseArchive?.(courseMenu.course, !archivedCourses.has(courseMenu.course))
            setCourseMenu(null)
          }}>
            {archivedCourses.has(courseMenu.course) ? 'Ripristina corso' : 'Archivia corso'}
          </button>
        </div>, document.body
      )}
    </aside>
  )
}

