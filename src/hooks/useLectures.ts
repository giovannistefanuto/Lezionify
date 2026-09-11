import { useState, useMemo, useEffect, useCallback } from 'react'
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
      setLectures(await window.archive.listLectures())
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
      const list = await window.archive.scanAndSyncLibrary()
      setLectures(list)
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

  const visibleLectures = useMemo(() => {
    const matches = new Set(searchMatchIds ?? [])
    return lectures.filter((lecture) => {
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
  }, [
    lectures,
    selectedCourse,
    selectedStudyStatus,
    searchQuery,
    searchMatchIds
  ])

  const transcriptCount = useMemo(
    () =>
      lectures.filter((lecture) => lecture.status === 'transcript-available')
        .length,
    [lectures]
  )
  const completedCount = useMemo(
    () =>
      lectures.filter((lecture) => lecture.studyStatus === 'completata').length,
    [lectures]
  )
  const inProgressCount = useMemo(
    () =>
      lectures.filter((lecture) => lecture.studyStatus === 'in-corso').length,
    [lectures]
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
      const list = await window.archive.scanAndSyncLibrary()
      setLectures(list)
      setNotice('✅ Cartelle audio e trascrizioni sincronizzate con successo!')
    } catch {
      await refreshLibrary()
    } finally {
      setIsLoading(false)
    }
  }, [refreshLibrary])

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
    courseStats,
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
