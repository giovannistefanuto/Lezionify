import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { legacyExamDates, resolveExamTargets, type ExamSessionDraft } from '../../shared/sessione'
import { SessionStore } from '../../electron/main/sessioneStore'

function makeDraft(): ExamSessionDraft {
  return {
    id: 'winter', name: 'Invernale', start: '2027-01-01', end: '2027-03-31', unavailable: [],
    courses: [{ code: 'RL', paths: [{ id: 'partial', kind: 'partial', name: 'Parziali', steps: [
      { id: 'first', label: 'Primo parziale', completed: true, number: 1, appointments: [] },
      { id: 'second', label: 'Secondo parziale', completed: false, number: 2, appointments: [
        { id: 'appointment', date: '2027-02-03', number: 3 }
      ] }
    ] }] }, { code: 'OS', paths: [] }],
    plans: [{ id: 'main', name: 'Principale', choices: [
      { course: 'RL', pathId: 'partial', appointments: ['appointment'], locks: ['appointment'] },
      { course: 'OS', pathId: null, appointments: [], locks: [] }
    ] }]
  }
}
const save = (draft = makeDraft(), commandId = 'save', baseRevision = 0) => ({
  type: 'save', draft, commandId, baseRevision
})
const confirm = { type: 'confirm', sessionId: 'winter', planId: 'main', commandId: 'confirm', baseRevision: 1 }

describe('Sessione archive', () => {
  let temp: string
  let file: string
  beforeEach(async () => {
    temp = await mkdtemp(join(tmpdir(), 'lezionify-sessione-'))
    file = join(temp, 'sessione.json')
  })
  afterEach(() => rm(temp, { recursive: true, force: true }))

  it('shares only a confirmed snapshot and preserves exclusions across restart and edits', async () => {
    const service = new SessionStore(file)
    await service.apply(save())
    expect((await new SessionStore(file).state()).activeSessionId).toBeNull()
    await service.apply(confirm)
    const amended = makeDraft()
    amended.courses[0].paths[0].steps[1].appointments[0].date = '2027-02-04'
    await service.apply(save(amended, 'move', 2))
    const state = await new SessionStore(file).state()
    expect(resolveExamTargets(state, {
      courseConfigs: { RL: { examDate: '2027-03-01' }, OS: { examDate: '2027-03-02' }, OTHER: { examDate: '2027-03-03' } }
    }).map(({ course, date }) => [course, date])).toEqual([['RL', '2027-02-03'], ['OTHER', '2027-03-03']])
    expect(state.sessions[0].draft.courses).toEqual(amended.courses)
  })

  it('serializes writers, accepts a retry and rejects a conflicting revision', async () => {
    const first = new SessionStore(file)
    const won = save()
    const results = await Promise.all([first.apply(won), first.apply(save(makeDraft(), 'different'))])
    expect(results.map(result => result.status)).toEqual(['saved', 'conflict'])
    expect((await first.apply(won)).archive.revision).toBe(1)
  })

  it('preserves the last good data on write error and recovers a schema-invalid primary from a backup', async () => {
    const service = new SessionStore(file)
    await service.apply(save())
    const failing = new SessionStore(file, async () => { throw new Error('Dati non scrivibili') })
    await expect(failing.apply(confirm)).rejects.toThrow('Dati non scrivibili')
    expect((await service.state()).revision).toBe(1)
    await service.apply(confirm)
    await writeFile(file, '{"version":301}')
    expect((await service.state()).revision).toBe(1)
    await service.apply(confirm)
    await writeFile(file, 'rotto')
    expect((await service.state()).revision).toBe(1)
  })

  it('refuses incomplete plans and reports both valid legacy sources', async () => {
    const service = new SessionStore(file)
    const draft = makeDraft()
    draft.plans[0].choices[0].appointments = []
    draft.plans[0].choices[0].locks = []
    await service.apply(save(draft))
    await expect(service.apply(confirm)).rejects.toThrow('Secondo parziale')
    expect(legacyExamDates({ courseConfigs: { RL: { examDate: '2028-02-29' } } }, 'RL')).toEqual([
      { source: 'dashboard', date: '2028-02-29' }
    ])
  })
})
