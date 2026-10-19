import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { CourseRagService } from '../../electron/main/courseRag'
import {
  CourseRetrieval,
  extractCoursePdf,
  ragHash,
  splitCourseSource,
  type IndexedCourseSource
} from '../../electron/main/courseRagIndex'
import { parseCourseAction, type CourseThread } from '../../shared/courseRag'

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true })
})
const thread = (id = 'thread'): CourseThread => ({
  id,
  title: 'Domande',
  draft: 'bozza',
  messages: [],
  updatedAt: ''
})
function source(
  id: string,
  text: string,
  kind: 'transcript' | 'notes' = 'transcript'
) {
  return {
    ...splitCourseSource(
      {
        id,
        title: id,
        kind,
        lectureId: id,
        version: ragHash(text),
        status: 'ready'
      },
      [{ text }]
    ),
    rawText: text
  }
}
async function fixture(
  complete: (
    prompt: string,
    signal: AbortSignal
  ) => Promise<string> = async () =>
    JSON.stringify({
      action: 'answer',
      text: 'Integrazione generale: risposta senza attribuzione.',
      passageIds: []
    })
) {
  const directory = await mkdtemp(join(tmpdir(), 'lezionify-course-rag-'))
  directories.push(directory)
  const folder = join(directory, 'slides')
  await mkdir(folder)
  const sources: IndexedCourseSource[] = [
    source(
      'L1',
      'John Nash introduce Nash. Nashiana non è una menzione di Nash.'
    ),
    source('L2', 'NASH e John Nash.'),
    source('derivata', 'Nash Nash Nash', 'notes')
  ]
  const calls: string[] = []
  const service = new CourseRagService(join(directory, 'profile'), {
    archiveSources: async (course) => ({
      sources:
        course === 'GAME'
          ? sources
          : [source('OTHER', 'materiale riservato altro corso')],
      missingTranscripts: 1
    }),
    extractPdf: async (bytes) => {
      calls.push(Buffer.from(bytes).toString())
      return [
        { page: 1, text: Buffer.from(bytes).toString() },
        { page: 2, text: '' }
      ]
    },
    complete
  })
  return { directory, folder, service, sources, calls }
}

describe('indice e copertura locale', () => {
  it('trova fonti trasversali per teorema, esercizio e indicazioni del laboratorio', () => {
    const sources = [
      source(
        'gioco',
        'La battaglia dei sessi presenta due equilibri puri e un equilibrio misto.'
      ),
      source(
        'teorema',
        'Il teorema A permette di calcolare una risposta ottima negli esercizi.'
      ),
      source(
        'esercizio',
        'Esercizio sette: applicare il teorema A alla battaglia dei sessi.'
      ),
      splitCourseSource(
        {
          id: 'laboratorio',
          title: 'Indicazioni del docente',
          kind: 'course',
          version: 'v1',
          status: 'ready'
        },
        [
          {
            text: 'Il laboratorio richiede un progetto e una relazione individuale.'
          }
        ]
      )
    ]
    const retrieval = new CourseRetrieval(sources)
    const combined = retrieval
      .search('battaglia sessi teorema A')
      .map((item) => item.source.id)
    expect(combined).toContain('gioco')
    expect(combined).toContain('teorema')
    expect(combined).toContain('esercizio')
    expect(retrieval.search('laboratorio docente')[0].source.id).toBe(
      'laboratorio'
    )
    expect(
      retrieval
        .search('esercizio sette')
        .some((item) => item.source.id === 'esercizio')
    ).toBe(true)
  })
  it('scopre solo dopo attivazione, aggiorna PDF nuovi modificati rimossi e non espone percorsi', async () => {
    const { service, folder, calls, directory } = await fixture()
    const file = join(folder, 'slide.pdf')
    await writeFile(file, 'Contenuto iniziale della slide di teoria dei giochi')
    expect(
      (await service.state('GAME')).sources.filter(
        (item) => item.kind === 'pdf'
      )
    ).toHaveLength(0)
    expect(calls).toHaveLength(0)
    await service.configure('GAME', folder, true)
    await service.waitForSync('GAME')
    let state = await service.state('GAME')
    expect(state.sources.find((item) => item.kind === 'pdf')).toMatchObject({
      status: 'partial',
      unreadablePages: [2]
    })
    expect(JSON.stringify(state)).not.toContain(directory)
    const initialVersion = state.sources.find(
      (item) => item.kind === 'pdf'
    )!.version
    service.startSync('GAME')
    await service.waitForSync('GAME')
    expect(calls).toHaveLength(1)
    await writeFile(
      file,
      'Nuova versione delle slide con esercizi aggiuntivi e modifiche'
    )
    await writeFile(
      join(folder, 'nuove.pdf'),
      'Nuove slide sul laboratorio e sulle regole di esame'
    )
    service.startSync('GAME')
    await service.waitForSync('GAME')
    state = await service.state('GAME')
    expect(
      state.sources.find((item) => item.title === 'slide.pdf')!.version
    ).not.toBe(initialVersion)
    expect(state.sources.filter((item) => item.kind === 'pdf')).toHaveLength(2)
    await rm(file)
    service.startSync('GAME')
    await service.waitForSync('GAME')
    expect(
      (await service.state('GAME')).sources.find(
        (item) => item.title === 'slide.pdf'
      )!.status
    ).toBe('missing')
    await service.configure('GAME', null, false)
    expect(
      (await service.state('GAME')).sources
        .filter((item) => item.kind === 'pdf')
        .every((item) => item.status === 'missing')
    ).toBe(true)
  })
  it('riprende collegamenti e conversazioni da disco e conserva file espliciti, isolando i corsi', async () => {
    const { service, directory } = await fixture()
    const file = join(directory, 'regole.md')
    await writeFile(file, 'Esame scritto e progetto di laboratorio')
    await service.addFiles('GAME', [file])
    await service.waitForSync('GAME')
    await service.saveThread('GAME', thread())
    await service.saveThread('GAME', { ...thread(), draft: 'bozza aggiornata' })
    const restarted = new CourseRagService(join(directory, 'profile'), {
      archiveSources: async () => ({ sources: [], missingTranscripts: 0 }),
      complete: async () => ''
    })
    expect((await restarted.state('GAME')).threads[0].draft).toBe(
      'bozza aggiornata'
    )
    expect((await restarted.state('OTHER')).threads).toHaveLength(0)
    await rm(file)
    restarted.startSync('GAME')
    await restarted.waitForSync('GAME')
    expect((await restarted.state('GAME')).sources[0].status).toBe('missing')
  })
  it('conteggia occorrenze esatte per lezione senza duplicare derivazioni o sovrapposizioni', async () => {
    const { service } = await fixture()
    const count = await service.count('GAME', 'Nash')
    expect(count).toMatchObject({
      occurrences: 5,
      lessons: 2,
      missingTranscripts: 1
    })
    expect(count.perLecture.map((item) => item.occurrences)).toEqual([3, 2])
    expect((await service.count('GAME', 'John Nash')).occurrences).toBe(2)
    expect((await service.count('OTHER', 'Nash')).occurrences).toBe(0)
    expect((await service.count('GAME', 'Nash.*')).occurrences).toBe(0)
  })
  it('recupera passaggi multipli con provenienza e non restituisce fonti rimosse', () => {
    const a = source('a', 'Un teorema sugli equilibri di Nash. '.repeat(150))
    const b = source('b', 'Esercizio di Nash nel laboratorio')
    const retrieval = new CourseRetrieval([
      a,
      b,
      { ...source('removed', 'Nash'), status: 'missing' }
    ])
    const found = retrieval.search('Nash')
    expect(found.some((item) => item.source.id === 'b')).toBe(true)
    expect(
      found.filter((item) => item.source.id === 'a').length
    ).toBeLessThanOrEqual(3)
    expect(found.some((item) => item.source.id === 'removed')).toBe(false)
    expect(
      found.every(
        (item) => item.passage.offset >= 0 && !('rawText' in item.source)
      )
    ).toBe(true)
  })
})

describe('orchestrazione delle richieste strutturate', () => {
  it('recupera una pagina richiesta senza attraversare il corso e conserva la provenienza visiva', async () => {
    let round = 0
    const f = await fixture(async (prompt) => {
      const input = JSON.parse(prompt)
      if (++round === 1)
        return JSON.stringify({
          action: 'get_passage',
          sourceId: 'OTHER',
          page: 1
        })
      expect(input.toolResult).toBe('Passaggio non disponibile nel corso.')
      expect(prompt).not.toContain('materiale riservato altro corso')
      const visual = input.passages.find((item: { passage: { id: string } }) =>
        item.passage.id.startsWith('image:')
      )
      expect(visual.passage.page).toBe(2)
      return JSON.stringify({
        action: 'answer',
        text: 'Dalle immagini: schema della pagina 2.',
        passageIds: [visual.passage.id]
      })
    })
    await writeFile(
      join(f.folder, 'slide.pdf'),
      'Documento delle slide con pagina grafica aggiuntiva'
    )
    await f.service.configure('GAME', f.folder, true)
    await f.service.waitForSync('GAME')
    const pdf = (await f.service.state('GAME')).sources.find(
      (item) => item.kind === 'pdf'
    )!
    await f.service.saveThread('GAME', thread())
    const result = await f.service.ask(
      'GAME',
      'thread',
      'Spiega la figura',
      'visual-request',
      [{ page: 2, data: 'synthetic-image' }],
      pdf.id,
      pdf.version
    )
    expect(result.messages[0].visualPages).toEqual({
      sourceId: pdf.id,
      version: pdf.version,
      pages: [2]
    })
    expect(result.messages[1].citations?.[0].passage.page).toBe(2)
    await expect(
      f.service.ask(
        'GAME',
        'thread',
        'Fonte cambiata',
        'stale-page',
        [{ page: 2, data: 'synthetic-image' }],
        pdf.id,
        'old-version'
      )
    ).rejects.toThrow('Pagine')
    await expect(
      f.service.ask(
        'GAME',
        'thread',
        'Pagina inesistente',
        'bad-page',
        [{ page: 3, data: 'synthetic-image' }],
        pdf.id,
        pdf.version
      )
    ).rejects.toThrow('Pagine')
  })
  it('non propaga testo privato da errori del provider', async () => {
    const f = await fixture(async () => {
      throw new SyntaxError('private provider payload should never appear')
    })
    await f.service.saveThread('GAME', thread())
    await expect(
      f.service.ask('GAME', 'thread', 'Domanda', 'request')
    ).rejects.toThrow('Risposta non completata')
    expect((await f.service.state('GAME')).threads[0].messages).toHaveLength(1)
  })
  it('esegue una ricerca aggiuntiva e un conteggio, salva solo citazioni verificate e traccia il contesto', async () => {
    let calls = 0
    const f = await fixture(async (prompt) => {
      const input = JSON.parse(prompt)
      calls++
      expect(prompt).not.toContain(f.directory)
      expect(prompt).not.toContain('materiale riservato altro corso')
      if (calls === 1)
        return JSON.stringify({ action: 'search_course', query: 'Nash' })
      if (calls === 2)
        return JSON.stringify({ action: 'count_mentions', term: 'Nash' })
      expect(input.toolResult.occurrences).toBe(5)
      return JSON.stringify({
        action: 'answer',
        text: 'Dalle fonti: 5 menzioni in 2 lezioni.',
        passageIds: [input.passages[0].passage.id]
      })
    })
    await f.service.saveThread('GAME', thread())
    const result = await f.service.ask('GAME', 'thread', 'Nash', 'request')
    expect(calls).toBe(3)
    expect(result.messages).toHaveLength(2)
    expect(result.messages[1].citations).toHaveLength(1)
    expect(
      result.messages[1].trace?.filter((item) => item.action === 'send_context')
    ).toHaveLength(3)
    const stored = JSON.parse(
      await readFile(
        join(f.directory, 'profile', ragHash('GAME') + '.json'),
        'utf8'
      )
    )
    expect(
      stored.threads[0].messages[1].citations[0].source
    ).not.toHaveProperty('rawText')
    expect(stored.threads[0].draft).toBe('')
  })
  it('limita a tre approfondimenti, rifiuta azioni e citazioni inventate e conserva la domanda fallita', async () => {
    let calls = 0
    const f = await fixture(async () => {
      calls++
      return JSON.stringify({ action: 'search_course', query: 'Nash' })
    })
    await f.service.saveThread('GAME', thread())
    await expect(
      f.service.ask('GAME', 'thread', 'Domanda', 'request')
    ).rejects.toThrow('Limite')
    expect(calls).toBe(4)
    expect((await f.service.state('GAME')).threads[0].messages).toHaveLength(1)
    for (const invalid of [
      'null',
      '{}',
      '{"action":"read_file","path":"private"}',
      '{"action":"answer","text":"ok","passageIds":[123]}'
    ])
      expect(() => parseCourseAction(invalid)).toThrow()
    const bad = await fixture(async () =>
      JSON.stringify({
        action: 'answer',
        text: 'Inventata',
        passageIds: ['non-inviato']
      })
    )
    await bad.service.saveThread('GAME', thread())
    await expect(
      bad.service.ask('GAME', 'thread', 'Domanda', 'request')
    ).rejects.toThrow('citazioni')
  })
  it('permette richieste di nuovi documenti senza aprire percorsi suggeriti dal modello', async () => {
    const f = await fixture(async () =>
      JSON.stringify({
        action: 'request_document',
        description: 'Servono le pagine con il testo dell’esercizio.'
      })
    )
    await f.service.saveThread('GAME', thread())
    const result = await f.service.ask(
      'GAME',
      'thread',
      'Risolvi esercizio',
      'request'
    )
    expect(result.messages[1].requestedDocument).toContain('esercizio')
    expect(result.messages[1].citations).toBeUndefined()
  })
  it('annulla, isola l annullamento tra corsi e non salva risposte tardive', async () => {
    let started!: () => void
    const ready = new Promise<void>((resolve) => {
      started = resolve
    })
    const f = await fixture(async (_prompt, signal) => {
      started()
      return new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(new Error('abort')))
      )
    })
    await f.service.saveThread('GAME', thread())
    const running = f.service.ask('GAME', 'thread', 'Nash', 'request')
    await ready
    f.service.stop('OTHER', 'request')
    await expect(
      f.service.ask('GAME', 'thread', 'seconda', 'second')
    ).rejects.toThrow('già')
    f.service.stop('GAME', 'request')
    await expect(running).rejects.toThrow('interrotta')
    expect(
      (await f.service.state('GAME')).threads[0].messages.map(
        (item) => item.role
      )
    ).toEqual(['user'])
  })
})

// A real PDF.js worker cold start can exceed Vitest's 5s default on shared Windows CI.
it('estrae testo e pagine con PDFjs reale, incluse pagine grafiche senza testo', async () => {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    '<< /Length 64 >>\nstream\nBT /F1 12 Tf 50 700 Td (John Nash equilibrio nel corso) Tj ET\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << >> >>'
  ]
  let pdf = '%PDF-1.7\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = pdf.length
  pdf +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
      .join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  const pages = await extractCoursePdf(new Uint8Array(Buffer.from(pdf)))
  expect(pages).toHaveLength(2)
  expect(pages[0].text).toContain('John Nash')
  expect(pages[1].text).toBe('')
}, 30_000)
