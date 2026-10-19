import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { ArchivePipelinePanel } from '../../src/components/ArchivePipelinePanel'
import type { ArchivePipelineStatus } from '../../shared/archive'

const empty = { total: 0, pending: 0, running: 0, succeeded: 0, failed: 0, blocked: 0, skipped: 0 }
function snapshot(overrides: Partial<ArchivePipelineStatus> = {}): ArchivePipelineStatus {
  return { version: 1, runId: 'test', trigger: 'manual', status: 'running', activeStage: 'notes', currentLectureId: null, currentLectureTitle: null, message: 'Elaborazione', startedAt: null, updatedAt: '', completedAt: null, stopRequested: false, includeTranslation: true,
    tasks: [{ lectureId: 'one', title: 'Lezione sintetica', courseCode: null, stage: 'translation', status: 'pending' }],
    stageSummaries: { transcription: { ...empty }, notes: { ...empty }, translation: { ...empty, total: 1, pending: 1 } }, ...overrides }
}
const render = (status: ArchivePipelineStatus) => renderToStaticMarkup(createElement(ArchivePipelinePanel, { status, onResume() {}, onStop() {} }))

it('distingue ENG non richiesto all importazione da traduzione in attesa', () => {
  const automatic = render(snapshot({ trigger: 'import', includeTranslation: false, tasks: [{ lectureId: 'one', title: 'Sintetica', courseCode: null, stage: 'notes', status: 'succeeded' }], stageSummaries: { transcription: { ...empty }, notes: { ...empty, total: 1, succeeded: 1 }, translation: { ...empty } } }))
  expect(automatic).toContain('Non richieste')
  expect(automatic).toContain('Elabora tutto')
  expect(automatic).toContain('Questa elaborazione non include le versioni ENG')
  expect(automatic).not.toContain('L’importazione automatica crea trascrizioni e dispense ITA.')
  expect(automatic).not.toContain('Versioni ENG</span><strong>0/0')
  const queued = render(snapshot())
  expect(queued).toContain('1 in attesa')
  expect(queued).toContain('dopo le trascrizioni e le dispense ITA')
  expect(queued).not.toContain('Non richieste')
})

it('mostra il motivo della traduzione fallita separato dalle dipendenze bloccate', () => {
  const failed = render(snapshot({ status: 'completed_with_errors', activeStage: null,
    tasks: [{ lectureId: 'one', title: 'Sintetica', courseCode: null, stage: 'translation', status: 'failed', failureKind: 'input', error: 'Traduzione non salvata: risposta incompleta.' },
      { lectureId: 'two', title: 'Altra sintetica', courseCode: null, stage: 'translation', status: 'blocked', error: 'Dispensa italiana non disponibile.' }],
    stageSummaries: { transcription: { ...empty }, notes: { ...empty }, translation: { ...empty, total: 2, failed: 1, blocked: 1 } } }))
  expect(failed).toContain('1 non riuscite')
  expect(failed).toContain('1 bloccate dalla fase precedente')
  expect(failed).toContain('Traduzione non salvata: risposta incompleta.')
  expect(failed).toContain('Dispensa italiana non disponibile.')
  expect(failed).toContain('usa “Elabora tutto”')
})

it('mantiene la ripresa esplicita dopo un problema di quota della traduzione', () => {
  const paused = render(snapshot({ status: 'paused', activeStage: null,
    tasks: [{ lectureId: 'one', title: 'Sintetica', courseCode: null, stage: 'translation', status: 'failed', failureKind: 'quota_exhausted', error: 'Quota esaurita.' }],
    stageSummaries: { transcription: { ...empty }, notes: { ...empty }, translation: { ...empty, total: 1, failed: 1 } } }))
  expect(paused).toContain('Quota esaurita.')
  expect(paused).toContain('▶ Riprendi elaborazione')
  expect(paused).not.toContain('usa “Elabora tutto”')
})
