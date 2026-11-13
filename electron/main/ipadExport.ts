import { readFile, writeFile, rename, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { nativeImage } from 'electron'
import { validateIpadExport, type IpadExportStatus, type IpadExportResult } from '../../shared/ipadExport'
interface Ledger { enabled: boolean; entries: Record<string, { bytes: number; name: string }> }
/** Never removes generated images from the synced library. */
export class IpadExportService {
  private queue: Promise<unknown> = Promise.resolve()
  constructor(private readonly profile: string, private readonly destination: string) {}
  private serial<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task)
    this.queue = result.catch(() => {})
    return result
  }
  private async read(): Promise<Ledger> {
    try {
      const value = JSON.parse(await readFile(join(this.profile, 'ipad-diagrams.json'), 'utf8'))
      if (typeof value.enabled !== 'boolean' || !value.entries || typeof value.entries !== 'object' || Array.isArray(value.entries)) throw new Error()
      for (const [key, entry] of Object.entries(value.entries)) {
        const item = entry as { bytes: number; name: string }
        if (!/^[a-f0-9]{64}$/.test(key) || !item || !Number.isSafeInteger(item.bytes) || item.bytes < 0 ||
          typeof item.name !== 'string' || !/^lezionify-schema-[a-f0-9]{64}\.png$/.test(item.name)) throw new Error()
      }
      return value
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { enabled: true, entries: {} }
      throw new Error('Registro degli schemi iPad non leggibile. Nessun invio eseguito.', { cause: error })
    }
  }
  private async save(value: Ledger) {
    const temporary = join(this.profile, `ipad-diagrams-${randomUUID()}.tmp`)
    await writeFile(temporary, JSON.stringify(value), { flag: 'wx' })
    await rename(temporary, join(this.profile, 'ipad-diagrams.json'))
  }
  status(enabled?: boolean): Promise<IpadExportStatus> {
    return this.serial(async () => {
      const ledger = await this.read()
      if (enabled !== undefined) { ledger.enabled = enabled; await this.save(ledger) }
      return { enabled: ledger.enabled, count: Object.keys(ledger.entries).length,
        bytes: Object.values(ledger.entries).reduce((sum, entry) => sum + entry.bytes, 0) }
    })
  }
  export(value: unknown): Promise<IpadExportResult> {
    return this.serial(async () => {
      const request = validateIpadExport(value)
      const ledger = await this.read()
      if (!ledger.enabled && !request.manual) throw new Error('Invio automatico iPad disattivato.')
      const recorded = ledger.entries[request.key]
      if (recorded) {
        try {
          if (!(await stat(join(this.destination, recorded.name))).isFile()) throw new Error('Il percorso dello schema non è un file.')
          return { duplicate: true, bytes: recorded.bytes }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
          // A missing file can be recreated; the existing ledger is kept until the write succeeds.
        }
      }
      if (nativeImage.createFromBuffer(Buffer.from(request.png)).isEmpty()) throw new Error('Immagine non decodificabile.')
      const name = `lezionify-schema-${request.key}.png`
      try {
        if (!(await stat(this.destination)).isDirectory()) throw new Error()
        try { await writeFile(join(this.destination, name), request.png, { flag: 'wx' }) }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
          const previous = await readFile(join(this.destination, name))
          if (!previous.equals(Buffer.from(request.png))) throw new Error('Immagine precedente differente.', { cause: error })
        }
      } catch (error) { throw new Error('Salvataggio iPad non riuscito. Controlla cartella Foto di iCloud, spazio e permessi.', { cause: error }) }
      ledger.entries[request.key] = { bytes: request.png.length, name }
      await this.save(ledger)
      return { duplicate: false, bytes: request.png.length }
    })
  }
}
