import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  AppSettings,
  BatchTranslationSummary,
  GenerationProgress,
  Lecture
} from '../../shared/archive'

interface UseGeminiGenerationProps {
  selectedLecture: Lecture | null
  candidateLectures: Lecture[]
  candidateTranslationLectures?: Lecture[]
  settings: AppSettings
  onOpenSettingsModal: () => void
  onNotice: (msg: string | null) => void
  onRefreshLibrary: () => Promise<void>
  onSyncAndRefreshLibrary: () => Promise<void>
  onSetMarkdownText: (text: string) => void
  onSetMarkdownEnText?: (text: string | null) => void
  onSetTranscriptText: (text: string) => void
  onSetActiveTab: (tab: 'markdown' | 'transcript' | 'info') => void
}

export function useGeminiGeneration({
  selectedLecture,
  candidateLectures,
  candidateTranslationLectures = [],
  settings,
  onOpenSettingsModal,
  onNotice,
  onRefreshLibrary,
  onSyncAndRefreshLibrary,
  onSetMarkdownText,
  onSetMarkdownEnText,
  onSetTranscriptText,
  onSetActiveTab
}: UseGeminiGenerationProps) {
  const currentLecture = useRef(selectedLecture?.id)
  const activeProgressJobIds = useRef(new Set<string>())
  currentLecture.current = selectedLecture?.id

  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] =
    useState<GenerationProgress | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [isBatchGenerating, setIsBatchGenerating] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState<string | null>(null)
  const [isBatchTranslating, setIsBatchTranslating] = useState(false)
  const [showSelectionModal, setShowSelectionModal] = useState(false)
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([])
  const [selectedTranslationBatchIds, setSelectedTranslationBatchIds] =
    useState<string[]>([])
  const [translationBatchSummary, setTranslationBatchSummary] =
    useState<BatchTranslationSummary | null>(null)

  useEffect(() => {
    setGenerationProgress(null)
    setGenerationError(null)
    setTranscribeError(null)
    setTranslationError(null)
  }, [selectedLecture?.id])

  useEffect(() => {
    if (!window.archive?.onGenerationProgress) return
    const unsubscribe = window.archive.onGenerationProgress((progress) => {
      if (
        progress.lectureId === currentLecture.current &&
        activeProgressJobIds.current.has(progress.jobId)
      ) {
        setGenerationProgress(progress)
        if (progress.phase === 'completed') {
          setTimeout(() => {
            setGenerationProgress((prev) =>
              prev?.jobId === progress.jobId ? null : prev
            )
          }, 3000)
        }
      }
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const handleGenerateLectureNotes = useCallback(async (): Promise<void> => {
    if (!window.archive || !selectedLecture) return
    if (!settings.apiKey && settings.apiKeys.length === 0) {
      onOpenSettingsModal()
      onNotice(
        'Aggiungi prima almeno una chiave API Gemini nel pool delle Impostazioni.'
      )
      return
    }

    if (isGenerating) return
    setIsGenerating(true)
    const jobId = crypto.randomUUID()
    activeProgressJobIds.current.add(jobId)
    setGenerationError(null)
    try {
      const res = await window.archive.generateLectureNotes(selectedLecture.id, jobId)
      if (res.success && res.markdown) {
        if (currentLecture.current === selectedLecture?.id)
          onSetMarkdownText(res.markdown)
        if (currentLecture.current === selectedLecture?.id)
          onSetActiveTab('markdown')
        onNotice('⚡ Dispensa generata con successo da Gemini!')
        await onRefreshLibrary()
      } else {
        if (currentLecture.current === selectedLecture.id)
          setGenerationError(
            res.error ?? 'Errore sconosciuto durante la generazione.'
          )
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Errore di connessione con l’API Gemini.'
      console.error('Generate notes error:', err)
      if (currentLecture.current === selectedLecture.id) setGenerationError(msg)
    } finally {
      activeProgressJobIds.current.delete(jobId)
      setIsGenerating(false)
    }
  }, [
    selectedLecture,
    isGenerating,
    settings,
    onOpenSettingsModal,
    onNotice,
    onSetMarkdownText,
    onSetActiveTab,
    onRefreshLibrary
  ])

  const openSelectionModal = useCallback((): void => {
    const readyIds = candidateLectures.map((l) => l.id)
    setSelectedBatchIds(readyIds)
    const translationIds = candidateTranslationLectures.map((l) => l.id)
    setSelectedTranslationBatchIds(translationIds)
    setTranslationBatchSummary(null)
    setShowSelectionModal(true)
  }, [candidateLectures, candidateTranslationLectures])

  const handleGenerateSelected = useCallback(async (): Promise<void> => {
    if (!window.archive || selectedBatchIds.length === 0) return
    if (!settings.apiKey && settings.apiKeys.length === 0) {
      setShowSelectionModal(false)
      onOpenSettingsModal()
      onNotice(
        'Aggiungi prima almeno una chiave API Gemini nel pool delle Impostazioni.'
      )
      return
    }

    setIsBatchGenerating(true)
    const jobId = crypto.randomUUID()
    activeProgressJobIds.current.add(jobId)
    onNotice(
      `Avviata generazione batch per ${selectedBatchIds.length} lezioni selezionate...`
    )
    try {
      const summary =
        await window.archive.generateSelectedNotes(selectedBatchIds, jobId)
      await onSyncAndRefreshLibrary()
      if (selectedLecture && selectedBatchIds.includes(selectedLecture.id)) {
        const md = await window.archive.readMarkdown(selectedLecture.id)
        if (md) {
          if (currentLecture.current === selectedLecture?.id)
            onSetMarkdownText(md)
          if (currentLecture.current === selectedLecture?.id)
            onSetActiveTab('markdown')
        }
      }
      setShowSelectionModal(false)
      onNotice(
        `⚡ Generazione completata: ${summary.succeeded} dispense create con successo${
          summary.failed > 0 ? `, ${summary.failed} fallite` : ''
        }.`
      )
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Errore durante la generazione batch.'
      console.error('Batch generation error:', err)
      onNotice(`Errore generazione: ${msg}`)
    } finally {
      activeProgressJobIds.current.delete(jobId)
      setIsBatchGenerating(false)
    }
  }, [
    selectedBatchIds,
    settings,
    selectedLecture,
    onOpenSettingsModal,
    onNotice,
    onSyncAndRefreshLibrary,
    onSetMarkdownText,
    onSetActiveTab
  ])

  const handleTranslateSelected = useCallback(async (): Promise<void> => {
    if (!window.archive || selectedTranslationBatchIds.length === 0) return
    if (!settings.apiKey && settings.apiKeys.length === 0) {
      setShowSelectionModal(false)
      onOpenSettingsModal()
      onNotice(
        'Aggiungi prima almeno una chiave API Gemini nel pool delle Impostazioni.'
      )
      return
    }

    setIsBatchTranslating(true)
    setTranslationBatchSummary(null)
    const jobId = crypto.randomUUID()
    activeProgressJobIds.current.add(jobId)
    onNotice(
      `Avviata traduzione batch per ${selectedTranslationBatchIds.length} dispense in inglese...`
    )
    try {
      const summary = await window.archive.translateSelectedNotes(
        selectedTranslationBatchIds,
        jobId
      )
      await onSyncAndRefreshLibrary()
      if (
        selectedLecture &&
        selectedTranslationBatchIds.includes(selectedLecture.id)
      ) {
        const enMd = await window.archive.readMarkdownEn(selectedLecture.id)
        if (enMd && onSetMarkdownEnText) {
          if (currentLecture.current === selectedLecture?.id)
            onSetMarkdownEnText(enMd)
        }
      }
      setTranslationBatchSummary(summary)
      const firstFailure = summary.results.find((result) => !result.success)
      onNotice(
        `🌐 Traduzione completata: ${summary.succeeded} dispense tradotte in inglese${
          summary.failed > 0 ? `, ${summary.failed} fallite` : ''
        }.${firstFailure?.error ? ` Prima causa: ${firstFailure.error}` : ''}`
      )
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Errore durante la traduzione batch.'
      console.error('Batch translation error:', err)
      onNotice(`Errore traduzione: ${msg}`)
    } finally {
      activeProgressJobIds.current.delete(jobId)
      setIsBatchTranslating(false)
    }
  }, [
    selectedTranslationBatchIds,
    settings,
    selectedLecture,
    onOpenSettingsModal,
    onNotice,
    onSyncAndRefreshLibrary,
    onSetMarkdownEnText
  ])

  const handleTranslateLectureNotes = useCallback(async (): Promise<void> => {
    if (!window.archive || !selectedLecture) return
    if (!settings.apiKey && settings.apiKeys.length === 0) {
      onOpenSettingsModal()
      onNotice(
        'Aggiungi prima almeno una chiave API Gemini nel pool delle Impostazioni.'
      )
      return
    }

    setIsTranslating(true)
    const jobId = crypto.randomUUID()
    activeProgressJobIds.current.add(jobId)
    setTranslationError(null)
    try {
      const res = await window.archive.translateLectureNotes(selectedLecture.id, jobId)
      if (res.success && res.markdown) {
        if (currentLecture.current === selectedLecture?.id)
          onSetMarkdownEnText?.(res.markdown)
        onNotice('🌐 Dispensa tradotta in inglese con successo!')
        await onRefreshLibrary()
      } else {
        if (currentLecture.current === selectedLecture.id)
          setTranslationError(res.error ?? 'Errore durante la traduzione.')
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Errore di connessione con l’API Gemini.'
      console.error('Translate lecture notes error:', err)
      if (currentLecture.current === selectedLecture.id)
        setTranslationError(msg)
    } finally {
      activeProgressJobIds.current.delete(jobId)
      setIsTranslating(false)
    }
  }, [
    selectedLecture,
    settings,
    onOpenSettingsModal,
    onNotice,
    onSetMarkdownEnText,
    onRefreshLibrary
  ])

  const handleTranscribeAudio = useCallback(async (): Promise<void> => {
    if (!window.archive || !selectedLecture) return
    if (!settings.apiKey && settings.apiKeys.length === 0) {
      onOpenSettingsModal()
      onNotice(
        'Aggiungi prima almeno una chiave API Gemini nel pool delle Impostazioni.'
      )
      return
    }

    setIsTranscribing(true)
    const jobId = crypto.randomUUID()
    activeProgressJobIds.current.add(jobId)
    setTranscribeError(null)
    try {
      const res = await window.archive.transcribeAudio(selectedLecture.id, jobId)
      if (res.success) {
        if (res.transcript && currentLecture.current === selectedLecture?.id) {
          onSetTranscriptText(res.transcript)
          onSetActiveTab('transcript')
        }
        onNotice('🎙️ Trascrizione generata direttamente dall’audio!')
        await onRefreshLibrary()
      } else {
        if (currentLecture.current === selectedLecture.id)
          setTranscribeError(
            res.error ?? 'Errore durante la trascrizione audio.'
          )
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Errore di connessione durante la trascrizione.'
      console.error('Transcribe audio error:', err)
      if (currentLecture.current === selectedLecture.id) setTranscribeError(msg)
    } finally {
      activeProgressJobIds.current.delete(jobId)
      setIsTranscribing(false)
    }
  }, [
    selectedLecture,
    settings,
    onOpenSettingsModal,
    onNotice,
    onSetTranscriptText,
    onSetActiveTab,
    onRefreshLibrary
  ])

  return {
    isGenerating,
    generationProgress,
    generationError,
    isBatchGenerating,
    isTranscribing,
    transcribeError,
    isTranslating,
    translationError,
    isBatchTranslating,
    showSelectionModal,
    setShowSelectionModal,
    selectedBatchIds,
    setSelectedBatchIds,
    selectedTranslationBatchIds,
    setSelectedTranslationBatchIds,
    translationBatchSummary,
    handleGenerateLectureNotes,
    handleTranslateLectureNotes,
    openSelectionModal,
    handleGenerateSelected,
    handleTranslateSelected,
    handleTranscribeAudio
  }
}
