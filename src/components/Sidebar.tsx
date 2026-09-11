import React, { useMemo, useState } from 'react'

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
  onOpenQuickCapture?: () => void
  onOpenLogViewer?: () => void
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
  onOpenQuickCapture,
  onOpenLogViewer
}: SidebarProps) {
  
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})

  const toggleFolder = (folder: string) => {
    setCollapsedFolders(prev => ({ ...prev, [folder]: !prev[folder] }))
  }

  // Build a simple 1-level folder tree by splitting courseCode on " / " or " - "
  const courseTree = useMemo(() => {
    const tree: Record<string, string[]> = {}
    
    coursesWithCounts.forEach(course => {
      const match = course.match(/^(.*?)\s*(\/|-)\s*(.*)$/)
      if (match && match[1].trim()) {
        const folder = match[1].trim()
        if (!tree[folder]) tree[folder] = []
        tree[folder].push(course)
      } else {
        const folder = 'Altri Corsi'
        if (!tree[folder]) tree[folder] = []
        tree[folder].push(course)
      }
    })
    
    return tree
  }, [coursesWithCounts])

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
              {onOpenQuickCapture && (
                <button
                  className="settings-gear-btn"
                  onClick={onOpenQuickCapture}
                  title="Note Rapide & Brain Dump (Ctrl+M o Ctrl+P)"
                  aria-label="Apri note rapide"
                >
                  📌
                </button>
              )}

              {onOpenLogViewer && (
                <button
                  className="settings-gear-btn"
                  onClick={onOpenLogViewer}
                  title="Log di Sistema & Diagnostica (Ctrl+L)"
                  aria-label="Apri log di sistema"
                >
                  📜
                </button>
              )}

              <button
                className="settings-gear-btn"
                onClick={onOpenSettings}
                title="Impostazioni AI"
                aria-label="Apri impostazioni"
              >
                ⚙️
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
              Tutte le lezioni <span>{totalLecturesCount}</span>
            </button>

            <nav aria-label="Corsi" className="course-tree">
              {Object.keys(courseTree).length === 0 ? (
                <p className="empty-courses">I corsi compariranno qui.</p>
              ) : (
                Object.entries(courseTree)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([folder, courses]) => (
                    <div key={folder} className="folder-group">
                      <button className="folder-toggle" onClick={() => toggleFolder(folder)}>
                        <span className="folder-icon">
                          {collapsedFolders[folder] ? '📁' : '📂'}
                        </span>
                        <span className="folder-name">{folder}</span>
                      </button>

                      {!collapsedFolders[folder] && (
                        <div className="folder-children">
                          {courses.map((course) => {
                            let displayTitle = course
                            if (
                              course.startsWith(folder + '/') ||
                              course.startsWith(folder + ' - ')
                            ) {
                              displayTitle = course
                                .substring(
                                  folder.length + (course.includes('/') ? 1 : 3)
                                )
                                .trim()
                            }

                            return (
                              <button
                                className={`course-button child-course ${selectedCourse === course ? 'is-active' : ''}`}
                                key={course}
                                onClick={() => {
                                  setSelectedCourse(course)
                                  if (mainView !== 'archive') setMainView('archive')
                                }}
                              >
                                <span className="course-name-trunc" title={displayTitle}>
                                  {displayTitle}
                                </span>
                                <span>{getCourseLecturesCount(course)}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </nav>
          </div>
        </>
      )}

      {/* Collapsed sidebar: show icon-only nav */}
      {isCollapsed && (
        <div className="sidebar-collapsed-nav">
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
              title="Note Rapide & Brain Dump (Ctrl+M o Ctrl+P)"
              aria-label="Note Rapide"
            >
              📌
            </button>
          )}
          {onOpenLogViewer && (
            <button
              className="sidebar-icon-btn"
              onClick={onOpenLogViewer}
              title="Log di Sistema (Ctrl+L)"
              aria-label="Log di Sistema"
            >
              📜
            </button>
          )}
          <button
            className="sidebar-icon-btn"
            onClick={onOpenSettings}
            title="Impostazioni AI"
            aria-label="Impostazioni AI"
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
    </aside>
  )
}

