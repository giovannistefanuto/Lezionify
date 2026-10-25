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
  private installingSoundId: string | null = null
  private failures: Record<string, string> = {}
  private verified = new Map<
    string,
    { mtime: number; size: number; valid: boolean }
  >()

  constructor(
    private root: string,
    private download: typeof fetch = fetch,
    private sounds: readonly AmbientSoundDefinition[] = AMBIENT_SOUNDS
  ) {}

  private filePath(sound: AmbientSoundDefinition): string {
    return join(this.root, `${sound.id}.${sound.format}`)
  }

  async status(): Promise<AmbientSoundStatus> {
    const checks = await Promise.all(
      this.sounds.map(async (sound) => {
        try {
          const stats = await stat(this.filePath(sound))
          if (stats.size !== sound.bytes) return false
          const cached = this.verified.get(sound.id)
          if (
            cached &&
            cached.mtime === stats.mtimeMs &&
            cached.size === stats.size
          )
            return cached.valid
          const valid =
            sha(await readFile(this.filePath(sound))) === sound.sha256
          this.verified.set(sound.id, {
            mtime: stats.mtimeMs,
            size: stats.size,
            valid
          })
          return valid
        } catch {
          return false
        }
      })
    )

    const soundStatuses = this.sounds.map((sound, idx) => ({
      ...sound,
      installed: checks[idx]
    }))

    const installedCount = checks.filter(Boolean).length
    const installedBytes = soundStatuses
      .filter((s) => s.installed)
      .reduce((acc, s) => acc + s.bytes, 0)
    const totalBytes = this.sounds.reduce((acc, s) => acc + s.bytes, 0)

    return {
      installed: installedCount === this.sounds.length,
      installing: Boolean(this.installation),
      downloadBytes: totalBytes,
      installedBytes,
      sounds: soundStatuses,
      installingSoundId: this.installingSoundId,
      failures: { ...this.failures }
    }
  }

  install(soundIds?: unknown): Promise<AmbientSoundStatus> {
    if (this.installation)
      return Promise.reject(
        new Error('Attendi il download dei suoni già in corso.')
      )
    if (
      soundIds !== undefined &&
      (!Array.isArray(soundIds) ||
        !soundIds.length ||
        soundIds.some(
          (id) =>
            typeof id !== 'string' ||
            !this.sounds.some((sound) => sound.id === id)
        ))
    )
      return Promise.reject(new Error('Selezione dei suoni non valida.'))
    this.failures = {}
    const targetSounds =
      soundIds && soundIds.length > 0
        ? this.sounds.filter((s) => soundIds.includes(s.id))
        : this.sounds

    this.installation = this.installFiles(targetSounds).finally(() => {
      this.installation = null
      this.installingSoundId = null
    })
    return this.installation
  }

  private async installFiles(
    sounds: readonly AmbientSoundDefinition[]
  ): Promise<AmbientSoundStatus> {
    try {
      await mkdir(this.root, { recursive: true })

      for (const sound of sounds) {
        try {
          const dest = this.filePath(sound)
          try {
            const existing = await readFile(dest)
            if (
              existing.length === sound.bytes &&
              sha(existing) === sound.sha256
            ) {
              continue
            }
          } catch {
            // File non presente o da aggiornare
          }

          this.installingSoundId = sound.id
          const response = await this.download(sound.url, {
            signal: AbortSignal.timeout(120_000),
            redirect: 'follow'
          })
          if (!response.ok || !response.body) {
            throw new Error(
              `Download fallito per ${sound.title} (HTTP ${response.status})`
            )
          }

          const chunks: Uint8Array[] = []
          let size = 0
          const reader = response.body.getReader()
          try {
            for (;;) {
              const { done, value } = await reader.read()
              if (done) break
              size += value.byteLength
              if (size > sound.bytes)
                throw new Error(`Dimensione eccessiva per ${sound.title}`)
              chunks.push(value)
            }
          } finally {
            await reader.cancel()
          }

          if (size !== sound.bytes) {
            throw new Error(
              `Dimensione file non corrispondente per ${sound.title}`
            )
          }

          const bytes = Buffer.concat(chunks)
          if (sha(bytes) !== sound.sha256) {
            throw new Error(
              `Integrità non valida (SHA-256 errato) per ${sound.title}`
            )
          }

          const tempFile = `${dest}.tmp`
          try {
            await writeFile(tempFile, bytes)
            await rename(tempFile, dest)
            this.verified.delete(sound.id)
          } finally {
            await rm(tempFile, { force: true })
          }
        } catch (error) {
          this.failures[sound.id] =
            error instanceof Error ? error.message : 'Download non riuscito.'
        } finally {
          this.installingSoundId = null
        }
      }
      if (Object.keys(this.failures).length)
        throw new Error(Object.values(this.failures).join(' · '))
      return this.status()
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      throw new Error(`Scaricamento dei suoni non riuscito: ${msg}`, {
        cause: error
      })
    }
  }

  async read(id: string): Promise<Buffer> {
    const sound = this.sounds.find((s) => s.id === id)
    if (!sound) throw new Error(`Suono sconosciuto: ${id}`)
    const filePath = this.filePath(sound)
    try {
      const bytes = await readFile(filePath)
      if (bytes.length !== sound.bytes || sha(bytes) !== sound.sha256) {
        throw new Error(`File non integro per ${sound.title}`)
      }
      return bytes
    } catch {
      throw new Error(
        `Suono ${sound.title} non disponibile offline. Scaricalo prima dell’ascolto.`
      )
    }
  }
}
