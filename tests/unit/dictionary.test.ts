import { expect, it, vi, afterEach } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { detectDictionaryDirection, DictionaryIndex, type DictionaryEntry } from '../../shared/dictionary'
import { LocalDictionaryService } from '../../electron/main/localDictionary'

const entry = (word: string, partOfSpeech = 'v'): DictionaryEntry => ({ word, partOfSpeech, pronunciation: '', senses: [{ translations: ['traduzione'], definitions: ['definizione'] }] })
const index = new DictionaryIndex({ entries: ['search', 'run', 'study', 'make', 'lie', 'go'].map(word => entry(word)).concat([entry('cat', 'n'), entry('news', 'n'), entry('look up')]) })
afterEach(() => vi.unstubAllGlobals())

it('riconosce solo voci esclusive, incluse flessioni e locuzioni, senza usare suggerimenti', () => {
  const en = new DictionaryIndex({ entries: [entry('search'), entry('look up'), entry('computer'), entry('sale')] })
  const it = new DictionaryIndex({ entries: [entry('cercare'), entry('a causa di'), entry('computer'), entry('sale')] })
  for (const [word, direction] of [['Searching', 'en-it'], [' LOOK   UP ', 'en-it'], ['cercare', 'it-en'], ['a causa di', 'it-en'], ['computer', null], ['sale', null], ['sea', null], ['frase sconosciuta', null], ['', null]] as const) {
    expect(detectDictionaryDirection(en.lookup(word, 'en-it'), it.lookup(word, 'it-en'))).toBe(direction)
  }
})

it('riconosce termini tecnici e locuzioni dei dati reali senza rete', async () => {
  const fetch = vi.fn(() => { throw new Error('Network disabled') })
  vi.stubGlobal('fetch', fetch)
  const service = new LocalDictionaryService(resolve('public/dictionaries'))
  for (const [word, direction] of [['cercare', 'it-en'], ['Searching', 'en-it'], ['look up', 'en-it'], ['eigenvalue', 'en-it'], ['autovalore', 'it-en'], ['computer', null], ['zzzxxyy', null]] as const) {
    const [en, it] = await Promise.all([service.lookup(word, 'en-it'), service.lookup(word, 'it-en')])
    expect(detectDictionaryDirection(en, it), word).toBe(direction)
  }
  expect(fetch).not.toHaveBeenCalled()
})

it('trascrivi e trascrivere funzionano nei dati reali in IT EN e riconoscimento automatico, offline', async () => {
  const fetch = vi.fn(() => { throw new Error('Network disabled') })
  vi.stubGlobal('fetch', fetch)
  const service = new LocalDictionaryService(resolve('public/dictionaries'))
  for (const query of ['trascrivi', 'trascrivo', 'trascriviamo', 'trascrivete', 'TRASCRIVI', 'trascrivere']) {
    const italian = await service.lookup(query, 'it-en')
    expect(italian.lemma, query).toBe('trascrivere')
    expect(italian.inflected).toBe(query !== 'trascrivere')
    expect(italian.entries[0].senses[0].translations).toContain('transcribe')
    expect(detectDictionaryDirection(await service.lookup(query, 'en-it'), italian)).toBe('it-en')
  }
  const source = JSON.parse(await readFile('public/dictionaries/eng-ita.json', 'utf8'))
  const target = JSON.parse(await readFile('public/dictionaries/ita-eng.json', 'utf8'))
  expect(target.entries.filter((entry: DictionaryEntry) => entry.word === 'trascrivere')).toHaveLength(1)
  expect(source.entries.find((entry: DictionaryEntry) => entry.word === 'transcribe').senses[0].translations).toContain('trascrivere')
  expect(target.reviewedReverseVerbs).toEqual([{ word: 'trascrivere', sourceWord: 'transcribe', sourceUrl: source.sourceUrl, sourceSha256: source.sourceSha256 }])
  expect(fetch).not.toHaveBeenCalled()
})

it('le flessioni italiane richiedono un solo lemma verbale attestato e conservano le voci esatte', () => {
  const it = new DictionaryIndex({ entries: ['amare', 'cercare', 'spiegare', 'studiare', 'leggere', 'dormire', 'capire', 'sentare', 'sentire'].map(word => entry(word)).concat([entry('ami', 'n'), entry('parlare', 'n')]) })
  for (const [query, lemma] of [['cerca', 'cercare'], ['cerchi', 'cercare'], ['cerchiamo', 'cercare'], ['spieghi', 'spiegare'], ['studiamo', 'studiare'], ['studi', 'studiare'], ['leggete', 'leggere'], ['dormite', 'dormire'], ['capisci', 'capire']] as const) {
    expect(it.lookup(query, 'it-en'), query).toMatchObject({ lemma, inflected: true })
  }
  expect(it.lookup('ami', 'it-en')).toMatchObject({ lemma: 'ami', inflected: false })
  for (const query of ['senti', 'parli', 'zzzxxyy', 'trascrivi questa frase', 'https://example.test', 'inesistente']) expect(it.lookup(query, 'it-en').entries, query).toEqual([])
  expect(it.lookup('cerchi', 'en-it').entries).toEqual([])
})

it.each([['Searching', 'search'], ['searched', 'search'], ['searches', 'search'], ['running', 'run'], ['studies', 'study'], ['studied', 'study'], ['making', 'make'], ['lying', 'lie'], ['went', 'go'], ['cats', 'cat']])('risolve forme inglesi comuni verificando il lemma nel vocabolario: %s', (query, lemma) => {
  expect(index.lookup(query, 'en-it')).toMatchObject({ lemma, inflected: true })
})
it('preserva voci esatte e locuzioni senza inventare traduzioni parola per parola', () => {
  expect(index.lookup('  LOOK   UP ', 'en-it')).toMatchObject({ lemma: 'look up', inflected: false })
  expect(index.lookup('news', 'en-it')).toMatchObject({ lemma: 'news', inflected: false })
  expect(index.lookup('searching for my book', 'en-it').entries).toEqual([])
  expect(index.lookup('searching', 'it-en').entries).toEqual([])
  expect(index.lookup('', 'en-it').entries).toEqual([])
  expect(index.lookup('sea', 'en-it').suggestions).toEqual(['search'])
})
it('consulta i due dizionari reali e le descrizioni senza alcuna richiesta di rete', async () => {
  const fetch = vi.fn(() => { throw new Error('Network disabled') })
  vi.stubGlobal('fetch', fetch)
  const service = new LocalDictionaryService(resolve('public/dictionaries'))
  const searching = await service.lookup('Searching', 'en-it')
  expect(searching).toMatchObject({ lemma: 'search', inflected: true })
  expect(searching.entries[0].senses[0].translations).toContain('cercare')
  expect(searching.entries[0].senses[0].definitions.length).toBeGreaterThan(0)
  expect((await service.lookup('look up', 'en-it')).lemma).toBe('look up')
  const italian = await service.lookup('cercare', 'it-en')
  expect(italian.entries[0].senses[0].translations).toContain('search')
  expect(fetch).not.toHaveBeenCalled()
})
it('limita il contratto IPC e non interpreta mai input come un percorso o URL', async () => {
  const service = new LocalDictionaryService(resolve('public/dictionaries'))
  for (const input of [null, {}, 'a'.repeat(121)]) await expect(service.lookup(input, 'en-it')).rejects.toThrow('non valida')
  for (const direction of ['../ita-eng', null, 'https://example.test']) await expect(service.lookup('search', direction)).rejects.toThrow('non valida')
  expect((await service.lookup('../../settings.json', 'en-it')).entries).toEqual([])
})
it('consente un nuovo tentativo dopo un errore locale senza esporre percorsi o ricerche', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lezionify-dictionary-'))
  try {
    const service = new LocalDictionaryService(directory)
    expect((await service.lookup(' ', 'en-it')).entries).toEqual([])
    await expect(service.lookup('parola privata', 'en-it')).rejects.toThrow('Vocabolario locale non disponibile')
    await writeFile(join(directory, 'eng-ita.json'), JSON.stringify({ entries: [entry('search')] }))
    expect((await service.lookup('search', 'en-it')).lemma).toBe('search')
  } finally { await rm(directory, { recursive: true, force: true }) }
})
