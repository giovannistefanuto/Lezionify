import { readFile, rename, stat, writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import type { AppSettings } from '../../shared/archive'

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  model: 'gemini-2.5-flash'
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
          parsed.model === 'gemini-2.5-pro' || parsed.model === 'gemini-2.0-flash' || parsed.model === 'gemini-2.5-flash'
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
      model: updates.model !== undefined ? updates.model : current.model
    }

    const tempPath = `${this.settingsPath}.tmp`
    await writeFile(tempPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8')
    await rename(tempPath, this.settingsPath)
    return updated
  }
}
