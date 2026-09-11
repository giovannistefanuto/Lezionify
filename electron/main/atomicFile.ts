import { copyFile, open, readFile, rename, unlink } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'

const queues = new Map<string, Promise<void>>()

/** Serialize replacement of a resource; readers see the old or the complete new file. */
export function atomicWrite(
  file: string,
  content: string,
  _encoding?: string
): Promise<void> {
  const key = resolve(file)
  const pending = (queues.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const temporary = `${key}.${randomUUID()}.tmp`
      try {
        const handle = await open(temporary, 'wx')
        try {
          await handle.writeFile(content, 'utf8')
          await handle.sync()
        } finally {
          await handle.close()
        }
        try {
          if (key.endsWith('.json')) JSON.parse(await readFile(key, 'utf8'))
          await copyFile(key, `${temporary}.bak`)
          await rename(`${temporary}.bak`, `${key}.bak`)
        } catch (error) {
          if (
            !(error instanceof SyntaxError) &&
            (error as NodeJS.ErrnoException).code !== 'ENOENT'
          )
            throw error
        }
        await rename(temporary, key)
      } finally {
        await Promise.all(
          [temporary, `${temporary}.bak`].map((p) => unlink(p).catch(() => {}))
        )
      }
    })
  queues.set(key, pending)
  void pending
    .finally(() => {
      if (queues.get(key) === pending) queues.delete(key)
    })
    .catch(() => {})
  return pending
}

/** Missing data is distinct from malformed data. Never silently replace corrupt JSON with defaults. */
export async function readRecoverable(file: string): Promise<string> {
  try {
    const raw = await readFile(file, 'utf8')
    if (file.endsWith('.json')) JSON.parse(raw)
    return raw
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    try {
      const backup = await readFile(`${file}.bak`, 'utf8')
      JSON.parse(backup)
      await atomicWrite(file, backup)
      return backup
    } catch {
      throw new Error(
        `Dati JSON danneggiati: ripristinare una copia valida del file ${file.split(/[\\/]/).pop()}.`
      )
    }
  }
}
