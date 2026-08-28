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
      return {
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : DEFAULT_SETTINGS.apiKey,
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
    const updated: AppSettings = {
      apiKey: updates.apiKey !== undefined ? updates.apiKey.trim() : current.apiKey,
      model: updates.model && VALID_MODELS.includes(updates.model) ? updates.model : current.model
    }

    const tempPath = `${this.settingsPath}.tmp`
    await writeFile(tempPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8')
    await rename(tempPath, this.settingsPath)
    return updated
  }
}
