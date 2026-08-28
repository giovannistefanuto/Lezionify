import { readFile, rename, stat, writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import type { AppSettings, GeminiModel } from '../../shared/archive'

const VALID_MODELS: GeminiModel[] = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite'
]

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  apiKeys: [],
  activeKeyIndex: 0,
  autoRotateOnQuota: true,
  model: 'gemini-3.6-flash'
}

export class SettingsService {
  private readonly settingsPath: string

  constructor(rootDirectory: string) {
    this.settingsPath = path.join(rootDirectory, 'settings.json')
  }

  async getSettings(): Promise<AppSettings> {
    try {
      await stat(this.settingsPath)
      const raw = await readFile(this.settingsPath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<AppSettings>

      let apiKeys: string[] = []
      if (Array.isArray(parsed.apiKeys)) {
        apiKeys = parsed.apiKeys
          .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
          .map((k) => k.trim())
      } else if (typeof parsed.apiKey === 'string' && parsed.apiKey.trim().length > 0) {
        apiKeys = [parsed.apiKey.trim()]
      }

      let activeKeyIndex = typeof parsed.activeKeyIndex === 'number' ? parsed.activeKeyIndex : 0
      if (activeKeyIndex < 0 || (apiKeys.length > 0 && activeKeyIndex >= apiKeys.length)) {
        activeKeyIndex = 0
      }

      const activeApiKey = apiKeys[activeKeyIndex] ?? ''

      return {
        apiKey: activeApiKey,
        apiKeys,
        activeKeyIndex,
        autoRotateOnQuota:
          typeof parsed.autoRotateOnQuota === 'boolean' ? parsed.autoRotateOnQuota : true,
        model:
          parsed.model && VALID_MODELS.includes(parsed.model)
            ? parsed.model
            : DEFAULT_SETTINGS.model
      }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  async saveSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings()

    let apiKeys = current.apiKeys
    if (Array.isArray(updates.apiKeys)) {
      apiKeys = updates.apiKeys
        .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
        .map((k) => k.trim())
    } else if (typeof updates.apiKey === 'string') {
      const trimmed = updates.apiKey.trim()
      if (trimmed && !apiKeys.includes(trimmed)) {
        apiKeys = [...apiKeys, trimmed]
      }
    }

    let activeKeyIndex =
      typeof updates.activeKeyIndex === 'number' ? updates.activeKeyIndex : current.activeKeyIndex
    if (activeKeyIndex < 0 || (apiKeys.length > 0 && activeKeyIndex >= apiKeys.length)) {
      activeKeyIndex = 0
    }

    const activeApiKey = apiKeys[activeKeyIndex] ?? ''

    const updated: AppSettings = {
      apiKey: activeApiKey,
      apiKeys,
      activeKeyIndex,
      autoRotateOnQuota:
        updates.autoRotateOnQuota !== undefined ? updates.autoRotateOnQuota : current.autoRotateOnQuota,
      model: updates.model && VALID_MODELS.includes(updates.model) ? updates.model : current.model
    }

    const tempPath = `${this.settingsPath}.tmp`
    await writeFile(tempPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8')
    await rename(tempPath, this.settingsPath)
    return updated
  }

  async rotateKey(): Promise<string | null> {
    const current = await this.getSettings()
    if (current.apiKeys.length <= 1) return null

    const nextIndex = (current.activeKeyIndex + 1) % current.apiKeys.length
    await this.saveSettings({ activeKeyIndex: nextIndex })
    return current.apiKeys[nextIndex]
  }
}
