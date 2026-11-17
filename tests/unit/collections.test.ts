import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { CollectionsService, type CollectionsDependencies } from '../../electron/main/collections/service'
import { CollectionsRepository } from '../../electron/main/collections/repository'
import { COLLECTION_SYSTEM, SHORT_TRANSCRIPT_LIMIT, collectionFingerprint, collectionPassages, hashText, parseCollectionSection, parseThemes } from '../../electron/main/collections/profiles'
import { resolveCollectionConfiguration, sortCollectionItems, type CollectionItem, type CollectionMode } from '../../shared/collections'

let root: string
let deps: CollectionsDependencies
let service: CollectionsService
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'lezionify-collections-'))
  deps = {
    model: vi.fn(async () => 'synthetic-model'),
    prepareAudio: vi.fn(async (_source, dest) => { await writeFile(dest, 'converted-audio') }),
    transcribe: vi.fn(async () => 'Racconto sintetico. Una esperienza concreta e una riflessione distinta.'),
    complete: vi.fn(async (prompt, _model, _signal, map) => {
      const data = JSON.parse(prompt)
      return { model: 'synthetic-fallback', text: JSON.stringify(map ? { themes: [{ title: 'Primo tema', passageIds: data.passages.filter((_: unknown, i: number) => i % 2 === 0).map((p: { id: number }) => p.id) }, { title: 'Secondo tema', passageIds: data.passages.filter((_: unknown, i: number) => i % 2 === 1).map((p: { id: number }) => p.id) }] } : { markdown: `## ${data.theme.title}\n\nEsperienza concreta e riflessione, conservate nella scheda di lettura.`, quotes: [] }) }
    })
  }
  service = new CollectionsService(root, deps)
})
afterEach(async () => { await service.stop(); await rm(root, { recursive: true, force: true }) })
async function collection(mode: CollectionMode = 'podcast') {
  return service.repository.saveCollection({ name: 'Raccolta sintetica', mode, instructions: 'Conserva gli esempi.', archived: false })
}
async function imported(text = 'Una esperienza concreta. Il racconto conserva un dubbio.', extension = '.txt', mode: CollectionMode = 'podcast') {
  const c = await collection(mode)
  const file = join(root, randomUUID() + extension)
  await writeFile(file, text)
  const selection = await service.repository.selectFiles([file])
  const result = await service.repository.importFiles({ token: selection.token, fileIds: selection.files.map(f => f.id), collectionId: c.id, grouped: false, title: 'Episodio di prova', recordedAt: null, sourceUrl: '', mode: null, instructions: null })
  return { c, item: result.items[0], selection, file }
}
async function generate(id: string, resume = false) { await service.process([id], true, resume); await service.wait() }

describe('collection storage and consent', () => {
  it('retries initialization after a transient local error instead of caching the rejection forever', async () => {
    vi.spyOn(service.repository, 'initialize').mockRejectedValueOnce(new Error('Temporary disk error'))
    await expect(service.state()).rejects.toThrow('Temporary disk error')
    expect((await service.state()).items).toEqual([])
  })

  it('rejects invalid UTF-8 rather than silently replacing characters in a raw transcript', async () => {
    const c = await collection()
    const path = join(root, 'invalid.txt')
    await writeFile(path, Buffer.from([0x63, 0x61, 0x66, 0xe9]))
    const selected = await service.repository.selectFiles([path])
    await expect(service.repository.importFiles({ token: selected.token, fileIds: selected.files.map(f => f.id), collectionId: c.id, grouped: false, title: 'Encoded text', recordedAt: null, sourceUrl: '', mode: null, instructions: null })).rejects.toThrow()
    expect(await service.repository.items()).toEqual([])
    expect(await readFile(path)).toEqual(Buffer.from([0x63, 0x61, 0x66, 0xe9]))
  })

  it('reports duplicate sources within the same native selection', async () => {
    const c = await collection()
    const path = join(root, 'duplicate.txt')
    await writeFile(path, 'A source present twice in the same selection.')
    const selected = await service.repository.selectFiles([path, path])
    const result = await service.repository.importFiles({ token: selected.token, fileIds: selected.files.map(f => f.id), collectionId: c.id, grouped: false, title: 'Duplicate', recordedAt: null, sourceUrl: '', mode: null, instructions: null })
    expect(result.duplicates).toEqual(['duplicate.txt'])
    expect(result.items).toHaveLength(2)
  })
  it('keeps existing course data byte-identical, text-only imports local and the index independently reloadable', async () => {
    const library = '{"version":1,"lectures":[{"id":"existing"}]}'
    await writeFile(join(root, 'library.json'), library)
    const { c, item } = await imported()
    expect(await readFile(join(root, 'library.json'), 'utf8')).toBe(library)
    expect(deps.transcribe).not.toHaveBeenCalled()
    expect(deps.complete).not.toHaveBeenCalled()
    const reloaded = new CollectionsRepository(root)
    expect(await reloaded.items()).toEqual([item])
    await reloaded.saveCollection({ ...c, name: 'Nuovo nome', archived: true })
    expect((await reloaded.items())[0].collectionId).toBe(c.id)
    expect((await service.search('esperienza', undefined, true)).map(i => i.id)).toEqual([item.id])
    expect(await service.search('esperienza')).toEqual([])
    expect((await service.read(item.id)).transcript).toContain('esperienza')
  })
  it('validates IDs, dates, modes, native grants and does not publish incomplete imports', async () => {
    await expect(service.repository.item('../outside')).rejects.toThrow('Identificativo')
    await expect(service.repository.saveCollection({ name: 'x', mode: 'invalid' as CollectionMode, instructions: '', archived: false })).rejects.toThrow('Modalità')
    const { item } = await imported()
    await expect(service.repository.updateItem(item.id, { ...item, recordedAt: '2026-02-31' })).rejects.toThrow('Data')
    await expect(service.repository.updateItem(item.id, { ...item, sourceUrl: 'file:///secret' })).rejects.toThrow('Collegamento')
    await expect(service.repository.importFiles({ token: randomUUID() } as never)).rejects.toThrow('Selezione')
    await mkdir(join(service.repository.directory, 'items', '.import-incomplete'), { recursive: true })
    expect(await service.repository.items()).toHaveLength(1)
  })
  it('preserves source bytes and explicit part order, signals duplicates without merging them', async () => {
    const c = await collection()
    const paths = [join(root, 'a.txt'), join(root, 'b.txt')]
    await writeFile(paths[0], 'Prima parte con esempio.')
    await writeFile(paths[1], 'Seconda parte con conclusione.')
    const selection = await service.repository.selectFiles(paths)
    const request = { token: selection.token, fileIds: selection.files.map(f => f.id).reverse(), collectionId: c.id, grouped: true, title: 'Due parti', recordedAt: '2026-11-16', sourceUrl: 'https://example.org/reference', mode: null, instructions: null }
    const { items } = await service.repository.importFiles(request)
    expect(items[0].sources.map(s => s.name)).toEqual(['b.txt', 'a.txt'])
    expect(await service.repository.transcript(items[0].id)).toBe('Seconda parte con conclusione.\n\nPrima parte con esempio.')
    expect(await readFile(service.repository.sourcePath(items[0], items[0].sources[0].id), 'utf8')).toBe('Seconda parte con conclusione.')
    const second = await service.repository.selectFiles(paths)
    const result = await service.repository.importFiles({ ...request, token: second.token, fileIds: second.files.map(f => f.id), grouped: false })
    expect(result.items).toHaveLength(2)
    expect(result.duplicates).toEqual(['a.txt', 'b.txt'])
  })
  it('serializes collection writes and differentiates inherit from an empty override without AI', async () => {
    const { c, item } = await imported()
    expect(resolveCollectionConfiguration(c, item)).toEqual({ mode: 'podcast', instructions: 'Conserva gli esempi.' })
    const changed = await service.repository.updateItem(item.id, { ...item, mode: 'conference', instructions: '' })
    expect(resolveCollectionConfiguration(c, changed)).toEqual({ mode: 'conference', instructions: '' })
    await Promise.all([collection('meeting'), collection('personal')])
    expect(await service.repository.collections()).toHaveLength(3)
    expect(deps.complete).not.toHaveBeenCalled()
  })
})

describe('collection pipeline and versions', () => {
  it('reports a source-contract failure safely and supplies feedback only on explicit resume', async () => {
    const { item } = await imported()
    const complete = deps.complete
    deps.complete = vi.fn(async (...args) => {
      const payload = JSON.parse(args[0])
      if (payload.correction) return complete(...args)
      return { model: 'synthetic', text: JSON.stringify({ markdown: '## Esperienza\n\nUna scheda di lettura basata sulla fonte.', quotes: [{ text: 'Citazione inventata', passageId: 0 }] }) }
    })
    await generate(item.id)
    expect(deps.complete).toHaveBeenCalledTimes(1)
    expect((await service.state()).jobs[0].error).toContain('Citazione non presente')
    expect((await service.read(item.id)).generations).toHaveLength(0)
    await generate(item.id, true)
    expect(deps.complete).toHaveBeenCalledTimes(2)
    expect((await service.read(item.id)).generations).toHaveLength(1)
    const resumed = JSON.parse(vi.mocked(deps.complete).mock.calls[1][0])
    expect(resumed.correction.reason).toContain('Citazione non presente')
  })
  it('never re-transcribes a missing committed transcript and retains its previous scheda', async () => {
    const { item } = await imported('original-media', '.mp3')
    await generate(item.id)
    const previous = (await service.read(item.id)).item.currentGeneration
    await rm(join(service.repository.itemDirectory(item.id), 'transcript.txt'))
    await rm(join(service.repository.itemDirectory(item.id), 'derivatives', `${item.sources[0].id}.txt`))
    await generate(item.id)
    expect(deps.transcribe).toHaveBeenCalledTimes(1)
    expect((await service.read(item.id)).item.currentGeneration).toBe(previous)
    expect((await service.state()).jobs[0].state).toBe('failed')
  })
  it('waits for a concurrently accepted start instead of returning the preceding completed job', async () => {
    const { item } = await imported()
    const start = service.process([item.id], true)
    await service.wait()
    await start
    expect((await service.read(item.id)).generations).toHaveLength(1)
    expect((await service.state()).jobs[0].state).toBe('completed')
  })

  it('counts preparation as busy and cancels a job whose snapshot is still being prepared', async () => {
    const { item } = await imported()
    let resolveModel!: (value: string) => void
    deps.model = vi.fn(() => new Promise(resolve => { resolveModel = resolve }))
    const starting = service.process([item.id], true)
    expect(service.isBusy()).toBe(true)
    while (!resolveModel) await new Promise(resolve => setTimeout(resolve, 5))
    const stopping = service.stop()
    resolveModel('synthetic-model')
    await Promise.all([starting, stopping])
    expect(service.isBusy()).toBe(false)
    expect(deps.complete).not.toHaveBeenCalled()
    expect((await service.state()).jobs[0].state).toBe('cancelled')
  })
  it.each(['lecture', 'conference', 'podcast', 'meeting', 'personal'] as const)('generates %s without ASR, exam logistics or implicit translation', async mode => {
    const { item } = await imported(undefined, '.txt', mode)
    await generate(item.id)
    const read = await service.read(item.id)
    expect(read.markdown).toContain('Esperienza concreta')
    expect(read.generations[0].configuration.mode).toBe(mode)
    expect(read.generations[0].models).toEqual(['synthetic-fallback'])
    expect(deps.transcribe).not.toHaveBeenCalled()
    expect(deps.complete).toHaveBeenCalledTimes(1)
    expect((await service.state()).jobs[0].state).toBe('completed')
  })
  it('transcribes each media part once, reuses ASR after profile changes and performs explicit fresh regeneration', async () => {
    const { item } = await imported('original-media', '.mp3')
    await service.process([item.id], false); await service.wait()
    expect(deps.transcribe).toHaveBeenCalledTimes(1)
    expect(deps.complete).not.toHaveBeenCalled()
    await generate(item.id)
    const previous = (await service.read(item.id)).item.currentGeneration
    await service.repository.updateItem(item.id, { ...item, mode: 'meeting', instructions: '' })
    await generate(item.id)
    expect(deps.transcribe).toHaveBeenCalledTimes(1)
    expect(deps.complete).toHaveBeenCalledTimes(2)
    const read = await service.read(item.id)
    expect(read.item.currentGeneration).not.toBe(previous)
    expect(read.generations).toHaveLength(2)
    expect(read.generations[0].configuration.mode).toBe('meeting')
    await service.repository.activateGeneration(item.id, previous!)
    expect((await service.read(item.id)).item.currentGeneration).toBe(previous)
  })
  it('maps a long source completely and resumes only missing sections after a sanitized failure', async () => {
    const { item } = await imported('Un racconto con esempio e riflessione. '.repeat(500))
    const complete = deps.complete
    let calls = 0
    deps.complete = vi.fn(async (...args) => { calls++; if (calls === 3) throw new Error('private content and credential'); return complete(...args) })
    await generate(item.id)
    expect((await service.state()).jobs[0].state).toBe('failed')
    expect(JSON.stringify((await service.state()).jobs)).not.toContain('private content')
    expect((await service.read(item.id)).item.currentGeneration).toBeNull()
    await generate(item.id, true)
    expect(calls).toBe(4)
    expect((await service.read(item.id)).markdown).toContain('Secondo tema')
  })
  it('retains the previous version on invalid quotes, cancellation and source mutation', async () => {
    const { item } = await imported()
    await generate(item.id)
    const previous = (await service.read(item.id)).item.currentGeneration
    deps.complete = vi.fn(async () => ({ model: 'synthetic', text: JSON.stringify({ markdown: '## Un tema\n\nUna scheda sufficientemente lunga.', quotes: [{ text: 'inventato', passageId: 0 }] }) }))
    await generate(item.id)
    expect((await service.state()).jobs[0].state).toBe('failed')
    expect((await service.read(item.id)).item.currentGeneration).toBe(previous)
    let entered!: () => void
    const called = new Promise<void>(resolve => { entered = resolve })
    deps.complete = vi.fn((_prompt, _model, signal) => new Promise((_resolve, reject) => { entered(); signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }) }))
    await service.process([item.id], true)
    await called
    expect(service.isBusy()).toBe(true)
    await expect(service.process([item.id], true)).rejects.toThrow('Attendi')
    await service.stop()
    expect((await service.state()).jobs[0].state).toBe('cancelled')
    expect((await service.read(item.id)).item.currentGeneration).toBe(previous)
    await writeFile(service.repository.sourcePath(item, item.sources[0].id), 'changed')
    await generate(item.id)
    expect((await service.state()).jobs[0].state).toBe('failed')
    expect((await service.read(item.id)).item.currentGeneration).toBe(previous)
  })
  it('marks unfinished jobs interrupted after restart and keeps the immutable job configuration when resuming', async () => {
    const { item, c } = await imported()
    await writeFile(join(service.repository.itemDirectory(item.id), 'job.json'), JSON.stringify({ itemId: item.id, state: 'running', stage: 'processing', percent: 50, includeNotes: true, configuration: { mode: 'podcast', instructions: 'Old instructions' }, model: 'old-model', startedAt: '2026-11-16T12:00:00Z' }))
    service = new CollectionsService(root, deps)
    expect((await service.state()).jobs[0].state).toBe('interrupted')
    await service.repository.saveCollection({ ...c, mode: 'meeting', instructions: 'new' })
    await generate(item.id, true)
    const read = await service.read(item.id)
    expect(read.generations[0].configuration).toEqual({ mode: 'podcast', instructions: 'Old instructions' })
    expect(deps.complete).toHaveBeenCalledWith(expect.any(String), 'old-model', expect.any(AbortSignal), false)
  })

  it('preserves a user-selected version during generation while retaining the new result in history', async () => {
    const { item } = await imported()
    await generate(item.id)
    const first = (await service.read(item.id)).item.currentGeneration!
    await generate(item.id)
    const complete = deps.complete
    deps.complete = vi.fn(async (...args) => {
      await service.repository.activateGeneration(item.id, first)
      return complete(...args)
    })
    await generate(item.id)
    const read = await service.read(item.id)
    expect(read.generations).toHaveLength(3)
    expect(read.item.currentGeneration).toBe(first)
  })

  it('detects external edits to the current document and keeps the generated replacement separate', async () => {
    const { item } = await imported()
    await generate(item.id)
    const current = (await service.read(item.id)).item.currentGeneration!
    const complete = deps.complete
    deps.complete = vi.fn(async (...args) => {
      await writeFile(join(service.repository.itemDirectory(item.id), 'generations', current, 'document.md'), 'Annotazioni personali salvate durante il lavoro.')
      return complete(...args)
    })
    await generate(item.id)
    const read = await service.read(item.id)
    expect(read.item.currentGeneration).toBe(current)
    expect(read.markdown).toBe('Annotazioni personali salvate durante il lavoro.')
    expect(read.generations).toHaveLength(2)
  })

  it('rejects a stale source after generation and never converts silence into a scheda', async () => {
    const { item } = await imported()
    const complete = deps.complete
    deps.complete = vi.fn(async (...args) => {
      await writeFile(join(service.repository.itemDirectory(item.id), 'transcript.txt'), 'Changed source during generation')
      return complete(...args)
    })
    await generate(item.id)
    expect((await service.read(item.id)).item.currentGeneration).toBeNull()
    expect((await service.read(item.id)).generations).toHaveLength(0)
    const silent = await imported('[NESSUN_PARLATO]')
    await generate(silent.item.id)
    expect(deps.complete).toHaveBeenCalledTimes(1)
    expect((await service.state()).jobs.find(j => j.itemId === silent.item.id)?.state).toBe('failed')
  })
  it('recovers an atomic transcript whose metadata commit was interrupted', async () => {
    const { item } = await imported('audio', '.mp3')
    await writeFile(join(service.repository.itemDirectory(item.id), 'transcript.txt'), 'Trascrizione completa recuperabile dopo interruzione.')
    await generate(item.id)
    expect(deps.transcribe).not.toHaveBeenCalled()
    expect((await service.read(item.id)).item.transcriptHash).toBe(hashText('Trascrizione completa recuperabile dopo interruzione.'))
  })
})

describe('source fidelity contracts', () => {
  it('accepts exact quotes across adjacent passages only when they start in the referenced passage', () => {
    const passages = [{ id: 0, text: 'Un racconto contiene una frase ' }, { id: 1, text: 'che continua oltre il confine. Un altro passaggio.' }]
    const response = { markdown: '## Un racconto\n\nUna scheda sufficientemente lunga.', quotes: [{ text: 'una frase che continua oltre il confine.', passageId: 0 }] }
    expect(parseCollectionSection(JSON.stringify(response), passages)).toContain('> una frase che continua oltre il confine.')
    expect(() => parseCollectionSection(JSON.stringify({ ...response, quotes: [{ ...response.quotes[0], passageId: 1 }] }), passages)).toThrow('Citazione')
    expect(() => parseCollectionSection(JSON.stringify({ ...response, quotes: [{ text: 'una frase inventata oltre il confine.', passageId: 0 }] }), passages)).toThrow('Citazione')
  })
  it('does not split surrogate pairs at a source passage boundary', () => {
    const text = 'a'.repeat(1799) + '😀' + 'b'.repeat(2000)
    const passages = collectionPassages(text)
    const broken = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
    expect(passages.some(p => broken.test(p.text))).toBe(false)
    expect(passages.map(p => p.text).join('')).toBe(text)
  })
  it('keeps every character in stable source passages and rejects omitted or invented references', () => {
    const text = 'Esperienza e ragionamento. '.repeat(1500)
    const passages = collectionPassages(text)
    expect(passages.map(p => p.text).join('')).toBe(text)
    expect(text.length).toBeGreaterThan(SHORT_TRANSCRIPT_LIMIT)
    expect(() => parseThemes(JSON.stringify({ themes: [{ title: 'tema', passageIds: [0] }] }), passages)).toThrow('omette')
    expect(() => parseThemes(JSON.stringify({ themes: [{ title: 'tema', passageIds: [999] }] }), passages)).toThrow('Riferimento')
    expect(parseCollectionSection(JSON.stringify({ markdown: '## Esperienza\n\nUna parafrasi con contenuto sufficiente.', quotes: [{ text: 'Esperienza e ragionamento.', passageId: 0 }] }), passages)).toContain('> Esperienza e ragionamento.')
    expect(() => parseCollectionSection(JSON.stringify({ markdown: '## Esperienza\n\nHa detto “parole mai pronunciate”.', quotes: [] }), passages)).toThrow('Citazione inline')
    expect(COLLECTION_SYSTEM).toContain('Non aggiungere')
  })
  it('fingerprints mode, instructions and model independently from transcript hashes and sorts without mutation', () => {
    const config = { mode: 'podcast' as const, instructions: '' }
    expect(collectionFingerprint('text', config, 'a')).not.toBe(collectionFingerprint('text', { ...config, mode: 'meeting' }, 'a'))
    expect(collectionFingerprint('text', config, 'a')).not.toBe(collectionFingerprint('text', { ...config, instructions: 'x' }, 'a'))
    expect(collectionFingerprint('text', config, 'a')).not.toBe(collectionFingerprint('text', config, 'b'))
    const rows = [{ id: 'a', recordedAt: null, importedAt: '2026-11-16' }, { id: 'b', recordedAt: '2026-11-17', importedAt: '2026-11-01' }] as CollectionItem[]
    expect(sortCollectionItems(rows).map(i => i.id)).toEqual(['b', 'a'])
    expect(rows[0].id).toBe('a')
  })
})
