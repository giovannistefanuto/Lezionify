import { copyFile, readFile, rename, stat, writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import { safeStorage } from 'electron'
import type { AppSettings, GeminiModel } from '../../shared/archive'
import { AsyncMutex } from './asyncMutex'

const VALID_MODELS: GeminiModel[] = [
  'gemini-3.8-flash',
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
  model: 'gemini-3.6-flash',
  courseConfigs: {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validateSettingsUpdate(
  value: unknown
): asserts value is Partial<AppSettings> {
  if (!isRecord(value)) throw new Error('Impostazioni non valide.')
  const allowed = new Set([
    'apiKey',
    'apiKeys',
    'activeKeyIndex',
    'autoRotateOnQuota',
    'model',
    'courses',
    'courseConfigs',
    'lastSemesterReminderDismissed'
  ])
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error('Impostazioni non valide.')
  }
  if (
    (value.apiKey !== undefined &&
      (typeof value.apiKey !== 'string' || value.apiKey.length > 10_000)) ||
    (value.apiKeys !== undefined &&
      (!Array.isArray(value.apiKeys) ||
        value.apiKeys.length > 50 ||
        value.apiKeys.some(
          (key) => typeof key !== 'string' || key.length > 10_000
        ))) ||
    (value.activeKeyIndex !== undefined &&
      (typeof value.activeKeyIndex !== 'number' ||
        !Number.isInteger(value.activeKeyIndex) ||
        value.activeKeyIndex < 0 ||
        value.activeKeyIndex >= 50)) ||
    (value.autoRotateOnQuota !== undefined &&
      typeof value.autoRotateOnQuota !== 'boolean') ||
    (value.model !== undefined &&
      (typeof value.model !== 'string' ||
        !VALID_MODELS.includes(value.model as GeminiModel))) ||
    (value.lastSemesterReminderDismissed !== undefined &&
      (typeof value.lastSemesterReminderDismissed !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value.lastSemesterReminderDismissed)))
  ) {
    throw new Error('Impostazioni non valide.')
  }
  if (value.courses !== undefined) {
    if (!isRecord(value.courses) || Object.keys(value.courses).length > 500) {
      throw new Error('Elenco dei corsi non valido.')
    }
    for (const course of Object.values(value.courses)) {
      if (
        !isRecord(course) ||
        typeof course.code !== 'string' ||
        course.code.trim().length === 0 ||
        course.code.length > 120 ||
        typeof course.cfu !== 'number' ||
        !Number.isFinite(course.cfu) ||
        course.cfu < 0 ||
        course.cfu > 60 ||
        !Array.isArray(course.schedule)
      ) {
        throw new Error('Elenco dei corsi non valido.')
      }
    }
  }
  if (value.courseConfigs !== undefined) {
    if (
      !isRecord(value.courseConfigs) ||
      Object.keys(value.courseConfigs).length > 500
    ) {
      throw new Error('Configurazione dei corsi non valida.')
    }
    for (const config of Object.values(value.courseConfigs)) {
      if (
        !isRecord(config) ||
        (config.examDate !== undefined &&
          (typeof config.examDate !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(config.examDate))) ||
        (config.expectedHours !== undefined &&
          (typeof config.expectedHours !== 'number' ||
            !Number.isFinite(config.expectedHours) ||
            config.expectedHours < 0 ||
            config.expectedHours > 20_000))
      ) {
        throw new Error('Configurazione dei corsi non valida.')
      }
    }
  }
}

function isEncryptionAvailable(): boolean {
  try {
    return Boolean(
      safeStorage &&
      typeof safeStorage.isEncryptionAvailable === 'function' &&
      safeStorage.isEncryptionAvailable()
    )
  } catch {
    return false
  }
}

export class SettingsService {
  private readonly settingsPath: string
  private readonly saveMutex = new AsyncMutex()

  constructor(rootDirectory: string) {
    this.settingsPath = path.join(rootDirectory, 'settings.json')
  }

  private async readSettingsFile(filePath: string): Promise<AppSettings> {
    await stat(filePath)
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<AppSettings> & {
      keysEncrypted?: boolean
    }

    let rawApiKeys: string[] = []
    if (Array.isArray(parsed.apiKeys)) {
      rawApiKeys = parsed.apiKeys
    } else if (
      typeof parsed.apiKey === 'string' &&
      parsed.apiKey.trim().length > 0
    ) {
      rawApiKeys = [parsed.apiKey.trim()]
    }

    let apiKeys: string[]
    if (parsed.keysEncrypted) {
      if (isEncryptionAvailable()) {
        apiKeys = rawApiKeys
          .filter((k): k is string => typeof k === 'string' && k.length > 0)
          .map((k) => safeStorage.decryptString(Buffer.from(k, 'base64')))
          .filter((k) => k.trim().length > 0)
      } else {
        console.warn(
          'Crittografia non disponibile. Impossibile decriptare le API keys.'
        )
        apiKeys = []
      }
    } else {
      apiKeys = rawApiKeys
        .filter(
          (k): k is string => typeof k === 'string' && k.trim().length > 0
        )
        .map((k) => k.trim())
    }

    let activeKeyIndex =
      typeof parsed.activeKeyIndex === 'number' ? parsed.activeKeyIndex : 0
    if (
      activeKeyIndex < 0 ||
      (apiKeys.length > 0 && activeKeyIndex >= apiKeys.length)
    ) {
      activeKeyIndex = 0
    }

    const activeApiKey = apiKeys[activeKeyIndex] ?? ''

    return {
      apiKey: activeApiKey,
      apiKeys,
      activeKeyIndex,
      autoRotateOnQuota:
        typeof parsed.autoRotateOnQuota === 'boolean'
          ? parsed.autoRotateOnQuota
          : true,
      model:
        parsed.model && VALID_MODELS.includes(parsed.model)
          ? parsed.model
          : DEFAULT_SETTINGS.model,
      courses: parsed.courses || {},
      courseConfigs: parsed.courseConfigs || {},
      lastSemesterReminderDismissed: parsed.lastSemesterReminderDismissed
    }
  }

  async getSettings(): Promise<AppSettings> {
    try {
      return await this.readSettingsFile(this.settingsPath)
    } catch (primaryError) {
      const primaryMissing =
        (primaryError as NodeJS.ErrnoException).code === 'ENOENT'
      try {
        const backupPath = `${this.settingsPath}.bak`
        const backupSettings = await this.readSettingsFile(backupPath)
        if (!primaryMissing)
          console.warn('Settings file corrotto, recuperato il backup.')
        return backupSettings
      } catch (backupError) {
        const backupMissing =
          (backupError as NodeJS.ErrnoException).code === 'ENOENT'
        if (!primaryMissing || !backupMissing) {
          console.error(
            'Impossibile recuperare settings da file primario e backup.'
          )
        }
        return { ...DEFAULT_SETTINGS }
      }
    }
  }

  async saveSettings(updates: unknown): Promise<AppSettings> {
    validateSettingsUpdate(updates)
    return this.saveMutex.runExclusive(() => this.saveSettingsUnlocked(updates))
  }

  private async saveSettingsUnlocked(
    updates: Partial<AppSettings>
  ): Promise<AppSettings> {
    const current = await this.getSettings()

    let apiKeys = current.apiKeys
    if (Array.isArray(updates.apiKeys)) {
      apiKeys = updates.apiKeys
        .filter(
          (k): k is string => typeof k === 'string' && k.trim().length > 0
        )
        .map((k) => k.trim())
    } else if (typeof updates.apiKey === 'string') {
      const trimmed = updates.apiKey.trim()
      if (trimmed && !apiKeys.includes(trimmed)) {
        apiKeys = [...apiKeys, trimmed]
      }
    }

    let activeKeyIndex =
      typeof updates.activeKeyIndex === 'number'
        ? updates.activeKeyIndex
        : current.activeKeyIndex
    if (
      activeKeyIndex < 0 ||
      (apiKeys.length > 0 && activeKeyIndex >= apiKeys.length)
    ) {
      activeKeyIndex = 0
    }

    const activeApiKey = apiKeys[activeKeyIndex] ?? ''

    const updated: AppSettings = {
      apiKey: activeApiKey,
      apiKeys,
      activeKeyIndex,
      autoRotateOnQuota:
        updates.autoRotateOnQuota !== undefined
          ? updates.autoRotateOnQuota
          : current.autoRotateOnQuota,
      model:
        updates.model && VALID_MODELS.includes(updates.model)
          ? updates.model
          : current.model,
      courses:
        updates.courses !== undefined ? updates.courses : current.courses,
      courseConfigs:
        updates.courseConfigs !== undefined
          ? updates.courseConfigs
          : current.courseConfigs,
      lastSemesterReminderDismissed:
        updates.lastSemesterReminderDismissed !== undefined
          ? updates.lastSemesterReminderDismissed
          : current.lastSemesterReminderDismissed
    }

    const backupPath = `${this.settingsPath}.bak`
    try {
      await copyFile(this.settingsPath, backupPath)
    } catch {
      // ignore se il file originale non esiste ancora
    }

    let keysEncrypted = false
    const outputData: AppSettings & { keysEncrypted?: boolean } = { ...updated }

    if (isEncryptionAvailable()) {
      keysEncrypted = true
      outputData.apiKeys = updated.apiKeys.map((k) =>
        safeStorage.encryptString(k).toString('base64')
      )
      if (updated.apiKey) {
        outputData.apiKey = safeStorage
          .encryptString(updated.apiKey)
          .toString('base64')
      }
    } else {
      console.warn(
        'Crittografia non disponibile, salvataggio API keys in chiaro.'
      )
    }

    outputData.keysEncrypted = keysEncrypted

    const tempPath = `${this.settingsPath}.tmp`
    await writeFile(
      tempPath,
      `${JSON.stringify(outputData, null, 2)}\n`,
      'utf8'
    )
    await rename(tempPath, this.settingsPath)
    return updated
  }

  async rotateKey(): Promise<string | null> {
    return this.saveMutex.runExclusive(async () => {
      const current = await this.getSettings()
      if (current.apiKeys.length <= 1) return null
      const nextIndex = (current.activeKeyIndex + 1) % current.apiKeys.length
      await this.saveSettingsUnlocked({ activeKeyIndex: nextIndex })
      return current.apiKeys[nextIndex]
    })
  }
}
