import { afterEach, expect, it, vi } from 'vitest'
import { creditFocusRagStudy } from '../../src/utils/focusRagPreparation'
afterEach(() => vi.unstubAllGlobals())
it('attende 600 secondi accreditati e prepara solo il corso corrente con modello locale', async () => {
  const start = vi.fn(async () => ({}))
  const state = vi.fn(async () => ({ semantic: { status: 'ready' }, indexing: { status: 'stale' } }))
  vi.stubGlobal('window', { archive: { getCourseRag: state, manageCourseIndex: start } })
  for (let i = 0; i < 599; i++) creditFocusRagStudy('A')
  creditFocusRagStudy('B')
  expect(state).not.toHaveBeenCalled()
  creditFocusRagStudy('A')
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(start).toHaveBeenCalledExactlyOnceWith('A', 'start')
})
it('modello mancante e indice già completo non provocano avvii o download', async () => {
  const start = vi.fn()
  const state = vi.fn(async () => ({ semantic: { status: 'missing' } }))
  vi.stubGlobal('window', { archive: { getCourseRag: state, manageCourseIndex: start } })
  for (let i = 0; i < 600; i++) creditFocusRagStudy('C')
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(start).not.toHaveBeenCalled()
})

it('non riavvia indici completi o già in esecuzione', async () => {
  const start = vi.fn()
  for (const status of ['complete', 'running']) {
    vi.stubGlobal('window', { archive: { getCourseRag: async () => ({ semantic: { status: 'ready' }, indexing: { status } }), manageCourseIndex: start } })
    for (let i = 0; i < 600; i++) creditFocusRagStudy(status)
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  expect(start).not.toHaveBeenCalled()
})
