import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DictionaryIndex, type DictionaryData, type DictionaryDirection, type DictionaryResult } from '../../shared/dictionary'

/** The only inputs are query/direction; callers cannot supply paths or URLs. */
export class LocalDictionaryService {
  private readonly indexes = new Map<DictionaryDirection, Promise<DictionaryIndex>>()
  constructor(private readonly directory: string) {}
  async lookup(input: unknown, direction: unknown): Promise<DictionaryResult> {
    if (typeof input !== 'string' || input.length > 120 || (direction !== 'en-it' && direction !== 'it-en')) throw new Error('Ricerca nel vocabolario non valida.')
    if (!input.trim()) return { query: '', lemma: null, inflected: false, entries: [], suggestions: [] }
    let index = this.indexes.get(direction)
    if (!index) {
      const file = direction === 'en-it' ? 'eng-ita.json' : 'ita-eng.json'
      index = readFile(join(this.directory, file), 'utf8').then(raw => new DictionaryIndex(JSON.parse(raw) as DictionaryData))
      this.indexes.set(direction, index)
    }
    try { return (await index).lookup(input, direction) }
    catch { this.indexes.delete(direction); throw new Error('Vocabolario locale non disponibile. Riprova o reinstalla Lezionify.') }
  }
}
