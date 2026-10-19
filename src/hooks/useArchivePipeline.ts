import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ArchivePipelineStartResult,
  ArchivePipelineStatus
} from '../../shared/archive'

interface UseArchivePipelineProps {
  onRefreshLibrary: () => Promise<void>
  onNotice: (message: string | null) => void
}

export function useArchivePipeline({
  onRefreshLibrary,
  onNotice
}: UseArchivePipelineProps) {
  const [pipelineStatus, setPipelineStatus] =
    useState<ArchivePipelineStatus | null>(null)
  const lastTransition = useRef<string | null>(null)
  const progressRevision = useRef(0)

  useEffect(() => {
    if (!window.archive) return
    let mounted = true
    let receivedProgress = false
    const receive = (status: ArchivePipelineStatus) => {
      if (!mounted) return
      setPipelineStatus(status)
      const transition = `${status.runId}:${status.status}`
      const changed = lastTransition.current !== transition
      lastTransition.current = transition
      if (
        changed &&
        ['paused', 'completed', 'completed_with_errors', 'stopped'].includes(
          status.status
        )
      ) {
        void onRefreshLibrary().catch(() => {})
      }
    }
    void window.archive
      .getArchivePipelineStatus()
      .then((status) => {
        if (!receivedProgress) receive(status)
      })
      .catch(() => {
        // La normale UI dell'archivio mostrerà l'eventuale indisponibilità IPC.
      })
    const unsubscribe = window.archive.onArchivePipelineProgress((status) => {
      if (!mounted) return
      progressRevision.current++
      receivedProgress = true
      receive(status)
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [onRefreshLibrary])

  const applyResult = useCallback(
    (result: ArchivePipelineStartResult, revision: number) => {
      // Gli eventi ricevuti durante IPC descrivono uno stato successivo al risultato.
      if (progressRevision.current === revision) setPipelineStatus(result.status)
      if (!result.started && result.status.message) {
        onNotice(`⚠️ ${result.status.message}`)
      } else if (result.started) {
        onNotice('⚡ Elaborazione dell’archivio avviata in background.')
      }
    },
    [onNotice]
  )

  const startPipeline = useCallback(async (): Promise<void> => {
    if (!window.archive) return
    const revision = progressRevision.current
    try {
      applyResult(await window.archive.startArchivePipeline(), revision)
    } catch (error) {
      onNotice(
        `❌ Impossibile avviare l’elaborazione: ${
          error instanceof Error ? error.message : 'errore sconosciuto'
        }`
      )
    }
  }, [applyResult, onNotice])

  const resumePipeline = useCallback(async (): Promise<void> => {
    if (!window.archive) return
    const revision = progressRevision.current
    try {
      applyResult(await window.archive.resumeArchivePipeline(), revision)
    } catch (error) {
      onNotice(
        `❌ Impossibile riprendere l’elaborazione: ${
          error instanceof Error ? error.message : 'errore sconosciuto'
        }`
      )
    }
  }, [applyResult, onNotice])

  const stopPipeline = useCallback(async (): Promise<void> => {
    if (!window.archive) return
    const revision = progressRevision.current
    try {
      const status = await window.archive.requestArchivePipelineStop()
      if (progressRevision.current === revision) setPipelineStatus(status)
    } catch (error) {
      onNotice(
        `❌ Impossibile interrompere l’elaborazione: ${
          error instanceof Error ? error.message : 'errore sconosciuto'
        }`
      )
    }
  }, [onNotice])

  return {
    pipelineStatus,
    startPipeline,
    resumePipeline,
    stopPipeline
  }
}
