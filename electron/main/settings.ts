import { validateLaboratorySchedule } from './laboratorySchedule'
import { copyFile, readFile, rename, stat, writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import { safeStorage } from 'electron'
import type { AppSettings, GeminiModel, PublishingSettings } from '../../shared/archive'
import { AsyncMutex } from './asyncMutex'
import { normalizeRepoUrl, validateBranch } from './publishing/publishGitClient'

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
  apiKeyQuotaGroups: [],
  activeKeyIndex: 0,
  autoRotateOnQuota: true,
  model: 'gemini-3.6-flash',
  courseConfigs: {},
  // Il flusso principale è deliberato: dopo aver importato dal registratore
  // l'utente avvia l'intera coda con “Elabora tutto”. L'automazione resta
  // disponibile come opzione esplicita per chi la preferisce.
  autoProcessOnImport: false,
  publishing: { enabled: false, repoUrl: '', branch: 'main', autoPublishOnStartup: true }
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
    'apiKeyQuotaGroups',
    'activeKeyIndex',
    'autoRotateOnQuota',
    'model',
    'courses',
    'legacyPublishingCourseCodes',
    'archivedCourseCodes',
    'courseConfigs',
    'lastSemesterReminderDismissed',
    'autoProcessOnImport',
    'publishing'
  ])
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error('Impostazioni non valide.')
  }
  if (value.publishing !== undefined) validatePublishing(value.publishing)
  if (
    (value.apiKey !== undefined &&
      (typeof value.apiKey !== 'string' || value.apiKey.length > 10_000)) ||
    (value.apiKeys !== undefined &&
      (!Array.isArray(value.apiKeys) ||
        value.apiKeys.length > 50 ||
        value.apiKeys.some(
          (key) => typeof key !== 'string' || key.length > 10_000
        ))) ||
    (value.apiKeyQuotaGroups !== undefined &&
      (!Array.isArray(value.apiKeyQuotaGroups) ||
        value.apiKeyQuotaGroups.length > 50 ||
        value.apiKeyQuotaGroups.some(
          (group) =>
            typeof group !== 'string' ||
            group.trim().length === 0 ||
            group.length > 120
        ))) ||
    (value.activeKeyIndex !== undefined &&
      (typeof value.activeKeyIndex !== 'number' ||
        !Number.isInteger(value.activeKeyIndex) ||
        value.activeKeyIndex < 0 ||
        value.activeKeyIndex >= 50)) ||
    (value.autoRotateOnQuota !== undefined &&
      typeof value.autoRotateOnQuota !== 'boolean') ||
    (value.autoProcessOnImport !== undefined &&
      typeof value.autoProcessOnImport !== 'boolean') ||
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
      if (course.publishToGithub !== undefined && typeof course.publishToGithub !== 'boolean') throw new Error('Consenso GitHub del corso non valido.')
      validateLaboratorySchedule(course.laboratorySchedule)
    }
  }
  if (value.legacyPublishingCourseCodes !== undefined && (!Array.isArray(value.legacyPublishingCourseCodes) || value.legacyPublishingCourseCodes.length > 500 || value.legacyPublishingCourseCodes.some(code => typeof code !== 'string' || !code.trim() || code.length > 120))) throw new Error('Consensi dei corsi non validi.')
  if (value.archivedCourseCodes !== undefined &&
    (!Array.isArray(value.archivedCourseCodes) ||
      value.archivedCourseCodes.length > 500 ||
      value.archivedCourseCodes.some(code => typeof code !== 'string' ||
        !code.trim() || code.length > 120))) {
    throw new Error('Elenco dei corsi archiviati non valido.')
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

function validatePublishing(value: unknown): asserts value is PublishingSettings {
  if (!isRecord(value) || Object.keys(value).some(key => ![
    'enabled', 'repoUrl', 'githubToken', 'branch', 'autoPublishOnStartup'
  ].includes(key)) || typeof value.enabled !== 'boolean' ||
    typeof value.autoPublishOnStartup !== 'boolean' || typeof value.repoUrl !== 'string' ||
    value.repoUrl.length > 500 || typeof value.branch !== 'string' ||
    (value.githubToken !== undefined && (typeof value.githubToken !== 'string' ||
      value.githubToken.length > 10_000 || Array.from(value.githubToken).some(char =>
        char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)))) {
    throw new Error('Impostazioni di pubblicazione non valide.')
  }
  if (value.repoUrl.trim()) normalizeRepoUrl(value.repoUrl)
  else if (value.enabled) throw new Error('Repository GitHub mancante.')
  validateBranch(value.branch)
}

function publicPublishingDefaults(): PublishingSettings {
  return { enabled: false, repoUrl: '', branch: 'main', autoPublishOnStartup: true }
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

  /** Add only the migration marker; never decrypt/re-encrypt credentials at startup. */
  async initializeCoursePublicationConsent(libraryCodes: string[]): Promise<void> {
    await this.saveMutex.runExclusive(async () => {
      let disk: Record<string, unknown> | undefined
      let primaryMissing = false
      for (const file of [this.settingsPath, `${this.settingsPath}.bak`]) {
        try {
          const parsed: unknown = JSON.parse(await readFile(file, 'utf8'))
          if (!isRecord(parsed)) throw new Error()
          disk = parsed
          break
        } catch (error) {
          if (file === this.settingsPath) primaryMissing = (error as NodeJS.ErrnoException).code === 'ENOENT'
          else if (!primaryMissing || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Impossibile preparare i consensi GitHub. Ripristina le impostazioni locali.', { cause: error })
        }
      }
      if (disk?.legacyPublishingCourseCodes !== undefined) return
      const legacyPublishingCourseCodes = [...new Set([...Object.keys(isRecord(disk?.courses) ? disk.courses : {}), ...libraryCodes])]
      validateSettingsUpdate({ legacyPublishingCourseCodes })
      if (!disk) {
        await this.saveSettingsUnlocked({ legacyPublishingCourseCodes })
        return
      }
      const temp = `${this.settingsPath}.tmp`
      await writeFile(temp, `${JSON.stringify({ ...disk, legacyPublishingCourseCodes }, null, 2)}\n`, 'utf8')
      await rename(temp, this.settingsPath)
    })
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
    const parsedQuotaGroups = Array.isArray(parsed.apiKeyQuotaGroups)
      ? parsed.apiKeyQuotaGroups
      : []
    // Le impostazioni precedenti non avevano il metadato del progetto. Le
    // trattiamo in modo prudente come appartenenti allo stesso progetto.
    const apiKeyQuotaGroups = apiKeys.map((_, index) => {
      const group = parsedQuotaGroups[index]
      return typeof group === 'string' && group.trim()
        ? group.trim()
        : 'default-project'
    })

    let publishing = publicPublishingDefaults()
    if (isRecord(parsed.publishing)) {
      const { githubToken: encryptedToken, tokenEncrypted, ...configuration } = parsed.publishing
      try {
        validatePublishing(configuration)
        let token = ''
        // Never adopt plaintext tokens from settings.json.
        if (tokenEncrypted === true && typeof encryptedToken === 'string' && isEncryptionAvailable()) {
          try { token = safeStorage.decryptString(Buffer.from(encryptedToken, 'base64')) } catch { /* Fail closed. */ }
        }
        publishing = { ...configuration, repoUrl: configuration.repoUrl ? normalizeRepoUrl(configuration.repoUrl) : '',
          githubToken: token, enabled: configuration.enabled && Boolean(token) }
      } catch { /* Invalid legacy publishing configuration stays disabled. */ }
    }

    return {
      apiKey: activeApiKey,
      apiKeys,
      apiKeyQuotaGroups,
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
      legacyPublishingCourseCodes: Array.isArray(parsed.legacyPublishingCourseCodes) ? parsed.legacyPublishingCourseCodes.filter((code): code is string => typeof code === 'string' && Boolean(code.trim()) && code.length <= 120) : undefined,
      archivedCourseCodes: Array.isArray(parsed.archivedCourseCodes)
        ? [...new Set(parsed.archivedCourseCodes.filter(
            (code): code is string => typeof code === 'string' &&
              Boolean(code.trim()) && code.length <= 120
          ).map(code => code.trim()))]
        : [],
      courseConfigs: parsed.courseConfigs || {},
      lastSemesterReminderDismissed: parsed.lastSemesterReminderDismissed,
      autoProcessOnImport:
        typeof parsed.autoProcessOnImport === 'boolean'
          ? parsed.autoProcessOnImport
          : DEFAULT_SETTINGS.autoProcessOnImport,
      publishing
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

  async setCourseArchived(code: string, archived: boolean): Promise<string[]> {
    return this.saveMutex.runExclusive(async () => {
      const current = await this.getSettings()
      const codes = new Set(current.archivedCourseCodes || [])
      if (archived) codes.add(code)
      else codes.delete(code)
      const archivedCourseCodes = [...codes].sort()
      validateSettingsUpdate({ archivedCourseCodes })
      await this.saveSettingsUnlocked({ archivedCourseCodes })
      return archivedCourseCodes
    })
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

    const providedQuotaGroups = Array.isArray(updates.apiKeyQuotaGroups)
      ? updates.apiKeyQuotaGroups
      : current.apiKeyQuotaGroups
    const apiKeyQuotaGroups = apiKeys.map((_, index) => {
      const group = providedQuotaGroups?.[index]
      return typeof group === 'string' && group.trim()
        ? group.trim()
        : 'default-project'
    })

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
      apiKeyQuotaGroups,
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
        updates.courses !== undefined ? Object.fromEntries(Object.entries(updates.courses).map(([code, course]) => [code, { ...course, publishToGithub: course.publishToGithub ?? current.courses?.[code]?.publishToGithub ?? Boolean(current.courses?.[code] || current.legacyPublishingCourseCodes?.includes(code)) }])) : current.courses,
      legacyPublishingCourseCodes: updates.legacyPublishingCourseCodes ?? current.legacyPublishingCourseCodes,
      archivedCourseCodes:
        updates.archivedCourseCodes !== undefined
          ? [...new Set(updates.archivedCourseCodes.map(code => code.trim()))].sort()
          : current.archivedCourseCodes || [],
      courseConfigs:
        updates.courseConfigs !== undefined
          ? updates.courseConfigs
          : current.courseConfigs,
      lastSemesterReminderDismissed:
        updates.lastSemesterReminderDismissed !== undefined
          ? updates.lastSemesterReminderDismissed
          : current.lastSemesterReminderDismissed,
      autoProcessOnImport:
        updates.autoProcessOnImport !== undefined
          ? updates.autoProcessOnImport
          : current.autoProcessOnImport !== undefined
            ? current.autoProcessOnImport
            : DEFAULT_SETTINGS.autoProcessOnImport,
      publishing: updates.publishing ? {
        ...updates.publishing,
        repoUrl: updates.publishing.repoUrl ? normalizeRepoUrl(updates.publishing.repoUrl) : '',
        githubToken: updates.publishing.githubToken ?? current.publishing?.githubToken ?? ''
      } : current.publishing ?? publicPublishingDefaults()
    }

    const publishingToken = updated.publishing?.githubToken ?? ''
    if (updated.publishing?.enabled && !publishingToken) {
      if (updates.publishing?.githubToken === '') updated.publishing.enabled = false
      else throw new Error('Inserisci un token GitHub per attivare la sincronizzazione automatica.')
    }
    if (publishingToken && !isEncryptionAvailable()) {
      throw new Error('Crittografia non disponibile. Il token GitHub non può essere salvato.')
    }

    const backupPath = `${this.settingsPath}.bak`
    try {
      await copyFile(this.settingsPath, backupPath)
    } catch {
      // ignore se il file originale non esiste ancora
    }

    let keysEncrypted = false
    const outputData: Omit<AppSettings, 'publishing'> & {
      keysEncrypted?: boolean
      publishing?: PublishingSettings & { tokenEncrypted: boolean }
    } = { ...updated, publishing: undefined }
    let encryptedPublishingToken = ''
    if (publishingToken) {
      try { encryptedPublishingToken = safeStorage.encryptString(publishingToken).toString('base64') }
      catch { throw new Error('Impossibile cifrare il token GitHub. Le impostazioni non sono state salvate.') }
    }
    outputData.publishing = {
      ...updated.publishing!,
      githubToken: encryptedPublishingToken,
      tokenEncrypted: true
    }
    // Preserve an unreadable encrypted credential on unrelated settings updates.
    if (!publishingToken && updates.publishing?.githubToken === undefined) {
      try {
        const disk = JSON.parse(await readFile(this.settingsPath, 'utf8'))
        if (disk.publishing?.tokenEncrypted === true && typeof disk.publishing.githubToken === 'string') {
          outputData.publishing.githubToken = disk.publishing.githubToken
        }
      } catch { /* Missing settings have no credential to preserve. */ }
    }

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
