import { randomUUID, createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { atomicWrite, readRecoverable } from './atomicFile'
import { markdownSections, type SectionRevisionPreview } from '../../shared/sectionRevision'
import { AsyncMutex } from './asyncMutex'

interface Revision { id: string; hash: string; sourceHash: string; before: string; after: string; createdAt: number }
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export class SectionRevisionService {
  private readonly previews = new Map<string, Revision>()
  private readonly mutations = new AsyncMutex()
  constructor(private readonly directory: string, private readonly operations: {
    read: (id: string) => Promise<string | null>
    transcript: (id: string) => Promise<string | null>
    generate: (id: string, title: string, source: string, before: string, instructions: string) => Promise<string>
    commit: (id: string, expected: string, content: string) => Promise<void>
  }) {}

  async preview(id: string, expected: unknown, start: unknown, instructions: unknown): Promise<SectionRevisionPreview> {
    if (typeof expected !== 'string' || expected.length > 20_000_000 || !Number.isInteger(start) || typeof instructions !== 'string' || !instructions.trim() || instructions.length > 4000) throw new Error('Richiesta di rigenerazione non valida.')
    const current = await this.operations.read(id)
    if (!current || current !== expected) throw new Error('La dispensa è cambiata. Riaprila prima di rigenerare.')
    const section = markdownSections(current).find(item => item.start === start)
    if (!section) throw new Error('Sezione non trovata.')
    const transcript = await this.operations.transcript(id)
    if (!transcript?.trim()) throw new Error('Trascrizione grezza non disponibile.')
    if (Buffer.byteLength(transcript, 'utf8') > 1_000_000) throw new Error('Trascrizione oltre 1 MB: la rigenerazione richiede un contesto più piccolo. Nessun invio effettuato.')
    const before = current.slice(section.start, section.end)
    const body = (await this.operations.generate(id, section.title, transcript, before, instructions)).trim()
    if (!body || body.length > 2_000_000) throw new Error('La rigenerazione non ha prodotto una sezione valida.')
    // The renderer/model cannot change neighbouring sections or the selected heading.
    const heading = before.split('\n')[0]
    const withoutHeading = body.replace(/^#{1,6}[^\n]*(?:\n|$)/, '').trim()
    if (!withoutHeading) throw new Error('La rigenerazione contiene solo il titolo: nessuna modifica applicata.')
    if (markdownSections(withoutHeading).some(item => item.level <= section.level)) throw new Error('Il risultato contiene sezioni esterne: riprova con istruzioni più precise.')
    const after = `${heading}\n\n${withoutHeading}\n\n`
    const token = randomUUID()
    for (const [key, preview] of this.previews) if (Date.now() - preview.createdAt > 30 * 60_000) this.previews.delete(key)
    if (this.previews.size >= 20) this.previews.delete(this.previews.keys().next().value!)
    this.previews.set(token, { id, hash: hash(current), sourceHash: hash(transcript), before: current, after: current.slice(0, section.start) + after + current.slice(section.end), createdAt: Date.now() })
    return { token, title: section.title, before, after, fullTranscript: true }
  }

  async apply(id: string, token: unknown): Promise<string> {
    return this.mutations.runExclusive(() => this.applyPreview(id, token))
  }

  private async applyPreview(id: string, token: unknown): Promise<string> {
    if (typeof token !== 'string') throw new Error('Anteprima non valida.')
    const preview = this.previews.get(token)
    if (!preview || preview.id !== id || Date.now() - preview.createdAt > 30 * 60_000) throw new Error('Anteprima scaduta: genera nuovamente.')
    const current = await this.operations.read(id)
    if (!current || hash(current) !== preview.hash || hash(await this.operations.transcript(id) ?? '') !== preview.sourceHash) throw new Error('Le fonti sono cambiate: anteprima non applicata.')
    await mkdir(this.directory, { recursive: true })
    // Filename uses a hash of the identifier, never a renderer-supplied path.
    await atomicWrite(join(this.directory, `${hash(id)}.json`), JSON.stringify({ before: preview.before, afterHash: hash(preview.after) }))
    await atomicWrite(join(this.directory, `${hash(id)}-${token}.json`), JSON.stringify({ before: preview.before, afterHash: hash(preview.after) }))
    await this.operations.commit(id, current, preview.after)
    this.previews.delete(token)
    return preview.after
  }

  async restore(id: string): Promise<string> {
    return this.mutations.runExclusive(() => this.restorePrevious(id))
  }

  private async restorePrevious(id: string): Promise<string> {
    const saved = JSON.parse(await readRecoverable(join(this.directory, `${hash(id)}.json`)))
    const current = await this.operations.read(id)
    if (typeof saved.before !== 'string' || !current || hash(current) !== saved.afterHash) throw new Error('Ripristino non applicabile: la dispensa è cambiata dopo la rigenerazione.')
    await this.operations.commit(id, current, saved.before)
    return saved.before
  }
}
