import { expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ArchiveService } from '../../electron/main/archive'
import { validateScratchpad } from '../../electron/main/archiveValidation'
import { captureGroups, copyCapture } from '../../src/utils/quickCapture'
import type { ScratchpadData } from '../../shared/archive'

const legacy: ScratchpadData = {
  todos: [
    { id: 'old', text: 'Vecchia attività', completed: true, createdAt: '' }
  ],
  notes: 'Note storiche',
  updatedAt: '2026-10-17T08:00:00.000Z'
}
const grouped: ScratchpadData = {
  ...legacy,
  selectedGroupId: 'g1',
  groups: [
    { id: 'g1', name: 'Studio', shortcut: 'S', notes: '**Formula**' },
    { id: 'g2', name: 'Casa', shortcut: 'C', notes: 'Nota casa' }
  ],
  todos: [
    ...legacy.todos,
    {
      id: 'new',
      text: 'Ripassare',
      completed: false,
      createdAt: '',
      groupId: 'g1'
    }
  ]
}
it('legge dati storici senza migrazione distruttiva e copia tutti i gruppi e gli stati', () => {
  expect(() => validateScratchpad(legacy)).not.toThrow()
  expect(captureGroups(legacy)[0].notes).toBe('Note storiche')
  expect(copyCapture(grouped)).toContain('- [x] Vecchia attività')
  expect(copyCapture(grouped, 'g1')).toBe(
    '## Studio\n\n- [ ] Ripassare\n\n**Formula**'
  )
  expect(copyCapture(grouped, 'g2')).not.toContain('Ripassare')
})
it('rifiuta lettere duplicate, riferimenti orfani e nomi duplicati', () => {
  expect(() => validateScratchpad(grouped)).not.toThrow()
  expect(() =>
    validateScratchpad({
      ...grouped,
      groups: grouped.groups!.map((group) => ({ ...group, shortcut: 'S' }))
    })
  ).toThrow()
  expect(() =>
    validateScratchpad({ ...grouped, selectedGroupId: 'missing' })
  ).toThrow()
  expect(() =>
    validateScratchpad({
      ...grouped,
      todos: [{ ...legacy.todos[0], groupId: 'missing' }]
    })
  ).toThrow()
  expect(() =>
    validateScratchpad({
      ...grouped,
      groups: grouped.groups!.map((group) => ({ ...group, name: 'Studio' }))
    })
  ).toThrow()
})
it('conserva gruppi, note, assegnazioni e selezione dopo un nuovo avvio del servizio', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lezionify-capture-groups-'))
  try {
    const first = new ArchiveService(directory)
    await first.initialize()
    await first.saveScratchpad(legacy)
    expect(await first.getScratchpad()).toMatchObject(legacy)
    await first.saveScratchpad(grouped)
    const restarted = new ArchiveService(directory)
    await restarted.initialize()
    expect(await restarted.getScratchpad()).toMatchObject(grouped)
    await expect(
      restarted.saveScratchpad({ ...grouped, groups: [] })
    ).rejects.toThrow()
    expect(await restarted.getScratchpad()).toMatchObject(grouped)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
