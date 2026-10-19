import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import type { CourseStats, ImportSummary, Lecture } from '../../shared/archive'

function importMessage(summary: ImportSummary): string {
  const imported = summary.imported.length
  const skipped = summary.skipped.length

  if (skipped === 0) {
    return `✅ ${imported} ${imported === 1 ? 'lezione importata con successo' : 'lezioni importate con successo'}!`
  }

  const details = summary.skipped
    .slice(0, 5)
    .map((s) => `• ${s.sourceFileName}: ${s.reason}`)
    .join('\n')
  const moreText =
    summary.skipped.length > 5
      ? `\n... e altri ${summary.skipped.length - 5} file.`
      : ''

  if (imported === 0) {
    return `⚠️ Nessun file importato (${skipped} non validi o già presenti):\n${details}${moreText}`
  }

  return `ℹ️ ${imported} lezioni importate, ${skipped} non importate:\n${details}${moreText}`
}

export function useLectures() {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [archivedCourseCodes, setArchivedCourseCodes] = useState<string[] | null>(null)
  const [isSavingCourseArchive, setIsSavingCourseArchive] = useState(false)
  const archiveRevision = useRef(0)
  const archiveSavePending = useRef(false)
  const [selectedCourse, setSelectedCourse] = useState<string>('tutti')
  const [selectedStudyStatus, setSelectedStudyStatus] =
    useState<string>('tutti')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchMatchIds, setSearchMatchIds] = useState<string[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [courseStats, setCourseStats] = useState<CourseStats[]>([])
  const [selectedCourseInfo, setSelectedCourseInfo] = useState<{
    courseCode: string
    markdown: string | null
  } | null>(null)

  const refreshCourseStats = useCallback(async (): Promise<void> => {
    if (!window.archive) return
    try {
      setCourseStats(await window.archive.getCourseStats())
    } catch (err) {
      console.error('Failed to load course stats:', err)
    }
  }, [])

  const refreshLibrary = useCallback(async (): Promise<void> => {
    if (!window.archive) {
      setIsLoading(false)
      setNotice(
        '⚠️ Finestra Electron nativa non rilevata. Assicurati di usare l\'applicazione nella finestra desktop aperta da "npm run dev", non in una scheda di Chrome/Edge.'
      )
      return
    }
    setIsLoading(true)
    try {
      const revision = archiveRevision.current
      const [list, archived] = await Promise.all([
        window.archive.listLectures(), window.archive.getArchivedCourseCodes()
      ])
      setLectures(list)
      if (revision === archiveRevision.current) setArchivedCourseCodes(archived)
      await refreshCourseStats()
    } catch (err) {
      console.error('Errore lettura archivio:', err)
      setNotice('Non riesco a leggere l’archivio locale.')
    } finally {
      setIsLoading(false)
    }
  }, [refreshCourseStats])

  const syncAndRefreshLibrary = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      const revision = archiveRevision.current
      const [list, archived] = await Promise.all([
        window.archive.scanAndSyncLibrary(), window.archive.getArchivedCourseCodes()
      ])
      setLectures(list)
      if (revision === archiveRevision.current) setArchivedCourseCodes(archived)
      await refreshCourseStats()
    } catch {
      await refreshLibrary()
    } finally {
      setIsLoading(false)
    }
  }, [refreshCourseStats, refreshLibrary])

  const updateLectureInState = useCallback(
    (id: string, updates: Partial<Lecture>) => {
      setLectures((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
      )
    },
    []
  )

  // Initial load
  useEffect(() => {
    void syncAndRefreshLibrary()
  }, [syncAndRefreshLibrary])

  // Listen for background generation/transcription completion to keep library in sync
  useEffect(() => {
    if (!window.archive?.onGenerationProgress) return
    const unsubscribe = window.archive.onGenerationProgress((progress) => {
      if (progress.phase === 'completed') {
        void refreshLibrary()
        setNotice(`⚡ ${progress.message}`)
      } else if (progress.phase === 'error' && progress.message) {
        void refreshLibrary()
        setNotice(`⚠️ ${progress.message}`)
      }
    })
    return () => {
      unsubscribe()
    }
  }, [refreshLibrary])

  // B-05: Auto-dismiss success notices after 5 seconds
  useEffect(() => {
    if (!notice) return
    const isSuccess =
      notice.startsWith('✅') ||
      notice.startsWith('⚡') ||
      notice.startsWith('🎯') ||
      notice.startsWith('🎙️') ||
      notice.startsWith('ℹ️')
    if (!isSuccess) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  // Full text search debounced with in-memory fast indexing
  useEffect(() => {
    let cancelled = false
    setSearchMatchIds(null)
    const query = searchQuery.trim()
    if (!query) {
      setSearchMatchIds(null)
      return
    }

    const timer = setTimeout(() => {
      window.archive
        .searchFullText(query)
        .then((ids) => {
          if (!cancelled) setSearchMatchIds(ids)
        })
        .catch((err) => {
          console.error('Search error:', err)
          if (!cancelled) setSearchMatchIds([])
        })
    }, 150)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery])

  const existingCourses = useMemo(() => {
    const list = Array.from(
      new Set(lectures.map((lecture) => lecture.courseCode).filter(Boolean))
    ) as string[]
    return list.sort()
  }, [lectures])

  const coursesWithCounts = useMemo(() => {
    const allCourses = Array.from(
      new Set(lectures.map((lecture) => lecture.courseCode ?? 'Senza corso'))
    ).sort()
    return allCourses
  }, [lectures])

  const archivedCourses = useMemo(() => new Set(archivedCourseCodes || []), [archivedCourseCodes])
  const activeLectures = useMemo(() => archivedCourseCodes === null ? [] :
    lectures.filter(lecture => !lecture.courseCode || !archivedCourses.has(lecture.courseCode)),
    [lectures, archivedCourses, archivedCourseCodes])
  const isSelectedCourseArchived = selectedCourse !== 'tutti' && archivedCourses.has(selectedCourse)

  const handleCourseArchive = useCallback(async (code: string, archived: boolean): Promise<boolean> => {
    if (archiveSavePending.current) return false
    archiveSavePending.current = true
    setIsSavingCourseArchive(true)
    try {
      const codes = await window.archive.setCourseArchived(code, archived)
      archiveRevision.current++
      setArchivedCourseCodes(codes)
      if (archived) setSelectedCourse(current => current === code ? 'tutti' : current)
      setNotice(archived ? '✅ Corso archiviato. Le lezioni restano disponibili in Corsi archiviati.' :
        '✅ Corso ripristinato in Corsi attivi.')
      await refreshCourseStats()
      return true
    } catch {
      setNotice('❌ Impossibile salvare lo stato del corso. Riprova.')
      return false
    } finally {
      archiveSavePending.current = false
      setIsSavingCourseArchive(false)
    }
  }, [refreshCourseStats])

  const visibleLectures = useMemo(() => {
    const matches = new Set(searchMatchIds ?? [])
    const collection = isSelectedCourseArchived && selectedStudyStatus === 'tutti' ? lectures : activeLectures
    const filtered = collection.filter((lecture) => {
      const course = lecture.courseCode ?? 'Senza corso'
      if (selectedCourse !== 'tutti' && course !== selectedCourse) return false
      if (
        selectedStudyStatus !== 'tutti' &&
        lecture.studyStatus !== selectedStudyStatus
      )
        return false

      if (searchQuery.trim()) {
        if (searchMatchIds !== null) {
          return matches.has(lecture.id)
        }
        const query = searchQuery.toLowerCase()
        const matchesName = lecture.sourceAudioFileName
          .toLowerCase()
          .includes(query)
        const matchesCourse = (lecture.courseCode ?? '')
          .toLowerCase()
          .includes(query)
        return matchesName || matchesCourse
      }

      return true
    })
    if (selectedCourse !== 'tutti') return filtered
    const rank = (status: Lecture['studyStatus']) =>
      status === 'in-corso' ? 0 : status === 'completata' ? 2 : 1
    return filtered.sort((a, b) => rank(a.studyStatus) - rank(b.studyStatus))
  }, [
    lectures,
    activeLectures,
    isSelectedCourseArchived,
    selectedCourse,
    selectedStudyStatus,
    searchQuery,
    searchMatchIds
  ])

  const activeCourseStats = useMemo(() => archivedCourseCodes === null ? [] : courseStats.filter(stats =>
    !archivedCourses.has(stats.courseCode)), [courseStats, archivedCourses, archivedCourseCodes])

  const transcriptCount = useMemo(
    () =>
      activeLectures.filter((lecture) => lecture.status === 'transcript-available')
        .length,
    [activeLectures]
  )
  const completedCount = useMemo(
    () =>
      activeLectures.filter((lecture) => lecture.studyStatus === 'completata').length,
    [activeLectures]
  )
  const inProgressCount = useMemo(
    () =>
      activeLectures.filter((lecture) => lecture.studyStatus === 'in-corso').length,
    [activeLectures]
  )
  const candidateLectures = useMemo(
    () =>
      lectures.filter(
        (l) => l.status === 'transcript-available' && !l.markdownFileName
      ),
    [lectures]
  )
  const missingNotesCount = candidateLectures.length

  const candidateTranslationLectures = useMemo(
    () =>
      lectures.filter(
        (l) => Boolean(l.markdownFileName) && !l.markdownEnFileName
      ),
    [lectures]
  )
  const missingTranslationsCount = candidateTranslationLectures.length

  const handleImport = useCallback(
    async (kind: 'files' | 'folder'): Promise<void> => {
      if (!window.archive) {
        setNotice(
          "⚠️ Finestra Electron nativa non rilevata. Esegui l'applicazione tramite la finestra desktop di Electron."
        )
        return
      }
      setIsImporting(true)
      setNotice(null)
      try {
        const summary =
          kind === 'files'
            ? await window.archive.importFiles()
            : await window.archive.importFolder()
        if (!summary) return
        setNotice(importMessage(summary))
        await refreshLibrary()
      } catch (err) {
        console.error('Import error:', err)
        const msg =
          err instanceof Error ? err.message : 'Errore I/O sconosciuto'
        setNotice(
          `❌ Errore durante l'importazione: ${msg}. Verifica che i file siano audio .mp3 validi e accessibili.`
        )
      } finally {
        setIsImporting(false)
      }
    },
    [refreshLibrary]
  )

  const handleOpenFolder = useCallback(async (): Promise<void> => {
    if (!window.archive) {
      setNotice(
        "⚠️ Finestra Electron nativa non rilevata. Esegui l'applicazione tramite la finestra desktop di Electron."
      )
      return
    }
    try {
      const res = await window.archive.openLibraryFolder()
      if (!res.success) {
        setNotice(
          `⚠️ Impossibile aprire automaticamente Esplora Risorse (${res.error ?? 'Errore di sistema'}).\n📂 Percorso locale: ${res.path}`
        )
      }
    } catch (err) {
      console.error('Open folder error:', err)
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto'
      setNotice(`⚠️ Impossibile aprire la cartella in Esplora Risorse: ${msg}`)
    }
  }, [])

  const handleManualSync = useCallback(async (): Promise<void> => {
    if (!window.archive) {
      setNotice(
        "⚠️ Finestra Electron nativa non rilevata. Esegui l'applicazione tramite la finestra desktop di Electron."
      )
      return
    }
    setIsLoading(true)
    try {
      await syncAndRefreshLibrary()
      setNotice('✅ Cartelle audio e trascrizioni sincronizzate con successo!')
    } catch {
      await refreshLibrary()
    } finally {
      setIsLoading(false)
    }
  }, [refreshLibrary, syncAndRefreshLibrary])

  const handleOpenCourseInfo = useCallback(
    async (courseCode: string): Promise<void> => {
      try {
        const info = await window.archive.readCourseInfo(courseCode)
        setSelectedCourseInfo({ courseCode, markdown: info })
      } catch (err) {
        console.error('Read course info error:', err)
        setNotice('Errore durante il caricamento delle info del corso.')
      }
    },
    []
  )

  return {
    lectures,
    activeLectures,
    archivedCourseCodes: archivedCourseCodes || [],
    isSelectedCourseArchived,
    isSavingCourseArchive,
    handleCourseArchive,
    setLectures,
    selectedCourse,
    setSelectedCourse,
    selectedStudyStatus,
    setSelectedStudyStatus,
    searchQuery,
    setSearchQuery,
    searchMatchIds,
    isLoading,
    isImporting,
    notice,
    setNotice,
    courseStats: activeCourseStats,
    selectedCourseInfo,
    setSelectedCourseInfo,
    existingCourses,
    coursesWithCounts,
    visibleLectures,
    transcriptCount,
    completedCount,
    inProgressCount,
    candidateLectures,
    missingNotesCount,
    candidateTranslationLectures,
    missingTranslationsCount,
    refreshCourseStats,
    refreshLibrary,
    syncAndRefreshLibrary,
    updateLectureInState,
    handleImport,
    handleOpenFolder,
    handleManualSync,
    handleOpenCourseInfo
  }
}
