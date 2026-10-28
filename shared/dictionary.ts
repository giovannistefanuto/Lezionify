export type DictionaryDirection = 'en-it' | 'it-en'
export type DictionaryLookupDirection = DictionaryDirection | 'it-it'
export interface DictionaryEntry {
  word: string
  partOfSpeech: string
  pronunciation: string
  senses: { translations: string[]; definitions: string[] }[]
}
export interface DictionaryResult {
  query: string
  lemma: string | null
  inflected: boolean
  entries: DictionaryEntry[]
  suggestions: string[]
}
export interface DictionaryData { entries: DictionaryEntry[]; aliases?: Record<string, string[]> }

/** Suggestions alone are not evidence of a language. Both hits remain ambiguous. */
export function detectDictionaryDirection(english: DictionaryResult, italian: DictionaryResult): DictionaryDirection | null {
  const en = english.entries.length > 0
  const it = italian.entries.length > 0
  return en === it ? null : en ? 'en-it' : 'it-en'
}

export function normalizeDictionaryWord(word: string): string {
  return word.normalize('NFKC').trim().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').toLocaleLowerCase('en')
}

function englishBases(word: string): { word: string; pos: string[] }[] {
  const candidates: { word: string; pos: string[] }[] = []
  const add = (value: string, pos: string[]) => { if (value.length >= 2) candidates.push({ word: value, pos }) }
  const irregular: Record<string, string> = { went: 'go', gone: 'go', ran: 'run', bought: 'buy', brought: 'bring', thought: 'think', found: 'find', made: 'make', took: 'take', taken: 'take', saw: 'see', seen: 'see', was: 'be', were: 'be', been: 'be', did: 'do', done: 'do', had: 'have', wrote: 'write', written: 'write', children: 'child', mice: 'mouse', feet: 'foot', teeth: 'tooth', men: 'man', women: 'woman' }
  if (irregular[word]) add(irregular[word], ['v', 'n'])
  if (word.endsWith('ing') || word.endsWith('ed')) {
    const stem = word.slice(0, word.endsWith('ing') ? -3 : -2)
    add(stem, ['v']); add(stem + 'e', ['v'])
    if (/([b-df-hj-np-tv-z])\1$/.test(stem)) add(stem.slice(0, -1), ['v'])
    if (word.endsWith('ying')) add(word.slice(0, -4) + 'ie', ['v'])
    if (word.endsWith('ied')) add(word.slice(0, -3) + 'y', ['v'])
  }
  if (word.endsWith('ies')) add(word.slice(0, -3) + 'y', ['n', 'v'])
  if (word.endsWith('es')) add(word.slice(0, -2), ['n', 'v'])
  if (word.endsWith('s') && !word.endsWith('ss')) add(word.slice(0, -1), ['n', 'v'])
  return candidates
}

/** Limited present/imperative forms; only one attested verb lemma may win. */
function italianVerbBases(word: string): string[] {
  if (!/^[a-zàèéìòù]+$/.test(word)) return []
  const endings: [string, string[]][] = [
    ['iscono', ['ire']], ['isci', ['ire']], ['isco', ['ire']], ['isce', ['ire']],
    ['iamo', ['are', 'ere', 'ire', 'iare']], ['ate', ['are']], ['ete', ['ere']], ['ite', ['ire']],
    ['ano', ['are']], ['ono', ['ere', 'ire']], ['i', ['are', 'ere', 'ire', 'iare']],
    ['o', ['are', 'ere', 'ire']], ['a', ['are']], ['e', ['ere', 'ire']]
  ]
  for (const [ending, infinitives] of endings) {
    if (!word.endsWith(ending)) continue
    const stem = word.slice(0, -ending.length)
    if (stem.length < 2) return []
    const candidates = infinitives.map(infinitive => stem + infinitive)
    // cerc-h-i / spieg-h-iamo keep a hard consonant before i but not in the lemma.
    if ((ending === 'i' || ending === 'iamo') && /[cg]h$/.test(stem)) candidates.push(stem.slice(0, -1) + 'are')
    return [...new Set(candidates)]
  }
  return []
}

/** Exact headwords always take priority over conservative, dictionary-checked stems. */
export class DictionaryIndex {
  private readonly aliases: Record<string, string[]>
  private readonly words = new Map<string, DictionaryEntry[]>()
  private readonly keys: string[]
  constructor(data: DictionaryData) {
    this.aliases = data.aliases ?? {}
    for (const entry of data.entries) {
      const key = normalizeDictionaryWord(entry.word)
      const group = this.words.get(key) ?? []
      group.push(entry); this.words.set(key, group)
    }
    this.keys = [...this.words.keys()].sort()
  }
  lookup(input: string, direction: DictionaryLookupDirection): DictionaryResult {
    const query = normalizeDictionaryWord(input)
    const result: DictionaryResult = { query, lemma: null, inflected: false, entries: [], suggestions: [] }
    if (!query) return result
    const exact = this.words.get(query)
    if (exact) return { ...result, lemma: exact[0].word, entries: exact }
    if (direction === 'it-it') {
      const entries = [...new Set(this.aliases[query] ?? [])].flatMap(word => this.words.get(normalizeDictionaryWord(word)) ?? [])
      if (entries.length) return { ...result, lemma: entries.map(entry => entry.word).join(', '), inflected: true, entries }
    }
    if (direction === 'en-it' && !query.includes(' ')) {
      for (const base of englishBases(query)) {
        const entries = this.words.get(base.word)?.filter(entry => base.pos.includes(entry.partOfSpeech))
        if (entries?.length) return { ...result, lemma: entries[0].word, inflected: true, entries }
      }
    }
    if (direction === 'it-en' && !query.includes(' ')) {
      const matches = italianVerbBases(query).map(base => this.words.get(base)?.filter(entry => entry.partOfSpeech === 'v')).filter((entries): entries is DictionaryEntry[] => Boolean(entries?.length))
      if (matches.length === 1) return { ...result, lemma: matches[0][0].word, inflected: true, entries: matches[0] }
    }
    let low = 0; let high = this.keys.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (this.keys[middle] < query) low = middle + 1
      else high = middle
    }
    for (let index = low; index < this.keys.length && result.suggestions.length < 8; index++) {
      if (!this.keys[index].startsWith(query)) break
      result.suggestions.push(this.words.get(this.keys[index])![0].word)
    }
    return result
  }
}

export function dictionaryPartOfSpeech(value: string): string {
  return ({ v: 'verbo', n: 'sostantivo', pn: 'nome proprio', adj: 'aggettivo', adv: 'avverbio', pron: 'pronome', prep: 'preposizione', conj: 'congiunzione', interj: 'interiezione' } as Record<string, string>)[value] ?? value
}
