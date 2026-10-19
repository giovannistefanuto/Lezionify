import { readFile, mkdir, writeFile, rename, stat, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import {
  AMBIENT_SOUNDS,
  type AmbientSoundDefinition,
  type AmbientSoundStatus
} from '../../shared/ambientSounds'

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

export class AmbientSoundService {
  private installation: Promise<AmbientSoundStatus> | null = null

  constructor(
    private root: string,
    private download: typeof fetch = fetch
  ) {}

  private filePath(sound: AmbientSoundDefinition): string {
    return join(this.root, `${sound.id}.${sound.format}`)
  }

  async status(): Promise<AmbientSoundStatus> {
    const checks = await Promise.all(
      AMBIENT_SOUNDS.map(async (sound) => {
        try {
          const stats = await stat(this.filePath(sound))
          return stats.size === sound.bytes
        } catch {
          return false
        }
      })
    )

    const soundStatuses = AMBIENT_SOUNDS.map((sound, idx) => ({
      ...sound,
      installed: checks[idx]
    }))

    const installedCount = checks.filter(Boolean).length
    const installedBytes = soundStatuses
      .filter((s) => s.installed)
      .reduce((acc, s) => acc + s.bytes, 0)
    const totalBytes = AMBIENT_SOUNDS.reduce((acc, s) => acc + s.bytes, 0)

    return {
      installed: installedCount === AMBIENT_SOUNDS.length,
      installing: Boolean(this.installation),
      downloadBytes: totalBytes,
      installedBytes,
      sounds: soundStatuses
    }
  }

  install(soundIds?: string[]): Promise<AmbientSoundStatus> {
    if (this.installation) return this.installation
    const targetSounds =
      soundIds && soundIds.length > 0
        ? AMBIENT_SOUNDS.filter((s) => soundIds.includes(s.id))
        : AMBIENT_SOUNDS

    this.installation = this.installFiles(targetSounds).finally(() => {
      this.installation = null
    })
    return this.installation
  }

  private async installFiles(
    sounds: readonly AmbientSoundDefinition[]
  ): Promise<AmbientSoundStatus> {
    try {
      await mkdir(this.root, { recursive: true })

      for (const sound of sounds) {
        const dest = this.filePath(sound)
        try {
          const existing = await readFile(dest)
          if (existing.length === sound.bytes && sha(existing) === sound.sha256) {
            continue
          }
        } catch {
          // File non presente o da aggiornare
        }

        const response = await this.download(sound.url, {
          signal: AbortSignal.timeout(120_000),
          redirect: 'follow'
        })
        if (!response.ok || !response.body) {
          throw new Error(`Download fallito per ${sound.title} (HTTP ${response.status})`)
        }

        const chunks: Uint8Array[] = []
        let size = 0
        const reader = response.body.getReader()
        try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            size += value.byteLength
            if (size > sound.bytes) throw new Error(`Dimensione eccessiva per ${sound.title}`)
            chunks.push(value)
          }
        } finally {
          await reader.cancel()
        }

        if (size !== sound.bytes) {
          throw new Error(`Dimensione file non corrispondente per ${sound.title}`)
        }

        const bytes = Buffer.concat(chunks)
        if (sha(bytes) !== sound.sha256) {
          throw new Error(`Integrità non valida (SHA-256 errato) per ${sound.title}`)
        }

        const tempFile = `${dest}.tmp`
        try {
          await writeFile(tempFile, bytes)
          await rename(tempFile, dest)
        } finally {
          await rm(tempFile, { force: true })
        }
      }

      return this.status()
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      throw new Error(`Scaricamento dei suoni non riuscito: ${msg}`, { cause: error })
    }
  }

  async read(id: string): Promise<Buffer> {
    const sound = AMBIENT_SOUNDS.find((s) => s.id === id)
    if (!sound) throw new Error(`Suono sconosciuto: ${id}`)
    const filePath = this.filePath(sound)
    try {
      const bytes = await readFile(filePath)
      if (bytes.length !== sound.bytes || sha(bytes) !== sound.sha256) {
        throw new Error(`File non integro per ${sound.title}`)
      }
      return bytes
    } catch {
      throw new Error(`Suono ${sound.title} non disponibile offline. Scaricalo prima dell’ascolto.`)
    }
  }
}
