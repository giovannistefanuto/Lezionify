import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { LocalDictionaryService } from '../../electron/main/localDictionary'
import { markdownSections } from '../../shared/sectionRevision'
import { SectionRevisionService } from '../../electron/main/sectionRevision'
import { paragraphFeatures, paragraphModel, type ParagraphSample } from '../../src/utils/paragraphEstimate'
import { proposedInactivityMinutes } from '../../src/utils/studyInactivity'
import { describeReminder } from '../../src/components/FocusReminders'

it('aggiorna residuo sveglia, singolare, scadenza e passaggio a domani', () => {
  const now = new Date(2026, 9, 28, 23, 50).getTime()
  const alarm: any = { kind: 'alarm', status: 'active', dueAt: new Date(now + 35 * 60_000).toISOString() }
  expect(describeReminder(alarm, now)).toContain('domani (35 minuti rimanenti)')
  expect(describeReminder(alarm, now + 34 * 60_000)).toContain('(1 minuto rimanente)')
  expect(describeReminder(alarm, now + 34 * 60_000 + 1000)).toContain('(meno di un minuto rimanente)')
  expect(describeReminder(alarm, now + 35 * 60_000)).toContain('(scaduta)')
  expect(describeReminder({ ...alarm, status: 'completed' }, now)).toBe('Concluso')
})

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

it('distribuisce definizioni italiane e flessioni reali senza alcun accesso rete', async () => {
  const dictionary = new LocalDictionaryService(resolve('public/dictionaries'))
  for (const word of ['casa', 'probabilità', 'algoritmo', 'derivata', 'entropia', 'gradiente', 'collusione']) {
    const result = await dictionary.lookup(word, 'it-it')
    expect(result.entries.length, word).toBeGreaterThan(0)
    expect(result.entries.some(entry => entry.senses.some(sense => sense.definitions.join(' ').length > 10))).toBe(true)
  }
  for (const [word, lemma] of [['trascrivi', 'trascrivere'], ['andavo', 'andare'], ['case', 'casa']]) expect((await dictionary.lookup(word, 'it-it')).entries.map(entry => entry.word)).toContain(lemma)
  expect((await dictionary.lookup('ragazzi', 'it-it')).entries.map(entry => entry.word)).toEqual(expect.arrayContaining(['ragazzo', 'ragazza']))
  expect((await dictionary.lookup('zzzzxyxy', 'it-it')).entries).toEqual([])
  await expect(dictionary.lookup('casa', 'it-xx')).rejects.toThrow('non valida')
})

it('stima con baseline provvisoria e seleziona pesi solo con miglioramento fuori lezione', () => {
  expect(paragraphFeatures('Tre numeri: 12, 3.4, 5 e una formula', 1)).toMatchObject({ numbers: 3, formulas: 1 })
  expect(paragraphModel([], 'oggi')).toBeNull()
  const partial: ParagraphSample[] = [1, 2].map(() => ({ document: 'A', day: 'oggi', words: 100, numbers: 0, formulas: 0, seconds: 60 }))
  expect(paragraphModel(partial, 'oggi')).toMatchObject({ provisional: true, factor: 0 })
  const samples = ['A', 'B', 'C', 'D'].flatMap(document => [0, 1, 2, 4].map(formulas => ({ document, day: 'ieri', words: 100, numbers: 0, formulas, seconds: (100 + 16 * formulas) * 0.5 })))
  const model = paragraphModel(samples, 'oggi')!
  expect(model.provisional).toBe(false)
  expect(model.factor).toBeGreaterThan(0)
  expect(model.validationError!).toBeLessThan(model.baselineError!)
  expect(model.predict({ words: 100, numbers: 0, formulas: 4 })).toBeGreaterThan(model.predict({ words: 100, numbers: 0, formulas: 0 }))
})

it('non propone una soglia personale prima delle sessioni e del tempo richiesti', () => {
  const base = { observing: true, sessions: { A: 1200, B: 1200, C: 1200 }, gaps: Array(20).fill(300), thresholdMinutes: null }
  expect(proposedInactivityMinutes({ ...base, sessions: { A: 3600 } })).toBeNull()
  expect(proposedInactivityMinutes({ ...base, sessions: { A: 100, B: 100, C: 100 } })).toBeNull()
  expect(proposedInactivityMinutes(base)).toBe(8)
  expect(base.thresholdMinutes).toBeNull()
})

it('rigenera soltanto la sezione, richiede conferma, conserva ripristino e rifiuta fonti cambiate', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lezionify-section-')); roots.push(directory)
  const original = '# Titolo\n\n## Uno\n\nTesto precedente.\n\n### Dettaglio\n\nFonte.\n\n## Due\n\nIntatto.\n'
  let markdown = original, transcript = 'Trascrizione grezza invariata.'
  const generate = vi.fn(async () => '## Uno\n\nRiscrittura chiara.')
  const commit = vi.fn(async (_id, expected, content) => { expect(markdown).toBe(expected); markdown = content })
  const service = new SectionRevisionService(directory, { read: async () => markdown, transcript: async () => transcript, generate, commit })
  const section = markdownSections(original)[1]
  const preview = await service.preview('A', original, section.start, 'Più chiaro')
  expect(markdown).toBe(original)
  expect(generate.mock.calls[0][2]).toBe(transcript)
  expect(preview.before).toContain('### Dettaglio')
  await service.apply('A', preview.token)
  expect(markdown).toContain('Riscrittura chiara.')
  expect(markdown.slice(markdown.indexOf('## Due'))).toBe(original.slice(original.indexOf('## Due')))
  expect(await service.restore('A')).toBe(original)
  const stale = await service.preview('A', original, section.start, 'Più chiaro')
  transcript += ' Modifica concorrente.'
  await expect(service.apply('A', stale.token)).rejects.toThrow('fonti sono cambiate')
  expect(commit).toHaveBeenCalledTimes(2)
  expect(markdownSections('# A\n```\n## Ignorato\n```\n## B')).toHaveLength(2)
})

it('serializza applicazioni concorrenti senza perdere il ripristino della versione riuscita', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lezionify-section-race-')); roots.push(directory)
  const original = '# Titolo\n\n## Uno\nOriginale\n'
  let markdown = original
  const service = new SectionRevisionService(directory, {
    read: async () => markdown, transcript: async () => 'Fonte grezza', generate: async () => '## Uno\nNuovo',
    commit: async (_id, expected, content) => { if (markdown !== expected) throw new Error('concurrent change'); markdown = content }
  })
  const section = markdownSections(original)[1]
  const a = await service.preview('A', original, section.start, 'Chiaro')
  const b = await service.preview('A', original, section.start, 'Chiaro')
  const results = await Promise.allSettled([service.apply('A', a.token), service.apply('A', b.token)])
  expect(results.filter(item => item.status === 'fulfilled')).toHaveLength(1)
  expect(await service.restore('A')).toBe(original)
})

it('rifiuta una rigenerazione con solo titolo invece di cancellare il contenuto della sezione', async () => {
  const original = '# Titolo\n\n## Uno\nContenuto da conservare'
  const commit = vi.fn()
  const service = new SectionRevisionService('unused-no-write', { read: async () => original, transcript: async () => 'Fonte', generate: async () => '## Uno', commit })
  await expect(service.preview('A', original, markdownSections(original)[1].start, 'Chiarisci')).rejects.toThrow('solo il titolo')
  expect(commit).not.toHaveBeenCalled()
})
