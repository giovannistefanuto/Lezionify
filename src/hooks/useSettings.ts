import { useState, useCallback, useEffect } from 'react'
import type { AppSettings, GeminiModel, PublishingStatus } from '../../shared/archive'

export function useSettings(onNotice: (msg: string) => void) {
  const [settings, setSettings] = useState<AppSettings>({
    apiKey: '',
    apiKeys: [],
    apiKeyQuotaGroups: [],
    activeKeyIndex: 0,
    autoRotateOnQuota: true,
    model: 'gemini-3.6-flash',
    autoProcessOnImport: false
  })
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [inputApiKeys, setInputApiKeys] = useState<string[]>([])
  const [inputApiKeyQuotaGroups, setInputApiKeyQuotaGroups] = useState<string[]>([])
  const [activeKeyIdx, setActiveKeyIdx] = useState<number>(0)
  const [autoRotate, setAutoRotate] = useState<boolean>(true)
  const [autoProcessOnImport, setAutoProcessOnImport] = useState<boolean>(false)
  const [inputModel, setInputModel] = useState<GeminiModel>('gemini-3.6-flash')
  const [newKeyInput, setNewKeyInput] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [publishingEnabled, setPublishingEnabled] = useState(false)
  const [publishingRepoUrl, setPublishingRepoUrl] = useState('')
  const [publishingToken, setPublishingToken] = useState('')
  const [publishingStatus, setPublishingStatus] = useState<PublishingStatus | null>(null)

  useEffect(() => {
    if (!showSettingsModal || !window.archive?.getPublishingStatus) return
    let disposed = false
    let pending = false
    const refresh = async () => {
      if (pending) return
      pending = true
      try {
        const status = await window.archive.getPublishingStatus()
        if (!disposed) setPublishingStatus(status)
      } catch {
        if (!disposed) setPublishingStatus({ configured: false, enabled: false,
          unpublishedCount: 0, lastPublishAt: null, lastError: 'Impossibile leggere lo stato di sincronizzazione.' })
      } finally { pending = false }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 3_000)
    return () => { disposed = true; window.clearInterval(timer) }
  }, [showSettingsModal])
  const [keyTestStates, setKeyTestStates] = useState<
    Record<string, { isTesting: boolean; result?: { valid: boolean; keyValid?: boolean; modelAvailable?: boolean; error?: string } }>
  >({})

  const loadSettings = useCallback(async (): Promise<void> => {
    if (!window.archive) return
    try {
      const s = await window.archive.getSettings()
      setSettings(s)
      const keys = s.apiKeys.length > 0 ? s.apiKeys : s.apiKey ? [s.apiKey] : []
      setInputApiKeys(keys)
      setInputApiKeyQuotaGroups(
        keys.map((_, index) => s.apiKeyQuotaGroups?.[index] || 'default-project')
      )
      setActiveKeyIdx(s.activeKeyIndex >= 0 ? s.activeKeyIndex : 0)
      setAutoRotate(s.autoRotateOnQuota)
      setAutoProcessOnImport(s.autoProcessOnImport ?? false)
      setInputModel(s.model)
    } catch (err) {
      console.error('Errore nel caricamento impostazioni:', err)
    }
  }, [])

  const openSettingsModal = useCallback((): void => {
    const keys =
      settings.apiKeys.length > 0
        ? [...settings.apiKeys]
        : settings.apiKey
        ? [settings.apiKey]
        : []
    setInputApiKeys(keys)
    setInputApiKeyQuotaGroups(
      keys.map((_, index) => settings.apiKeyQuotaGroups?.[index] || 'default-project')
    )
    setActiveKeyIdx(settings.activeKeyIndex >= 0 ? settings.activeKeyIndex : 0)
    setAutoRotate(settings.autoRotateOnQuota)
    setAutoProcessOnImport(settings.autoProcessOnImport ?? false)
    setInputModel(settings.model)
    setPublishingEnabled(settings.publishing?.enabled ?? false)
    setPublishingRepoUrl(settings.publishing?.repoUrl ?? '')
    setPublishingToken('')
    setNewKeyInput('')
    setKeyTestStates({})
    setShowSettingsModal(true)
  }, [settings])

  const handleAddKey = useCallback((): void => {
    const trimmed = newKeyInput.trim()
    if (!trimmed) return
    if (inputApiKeys.includes(trimmed)) {
      onNotice('Questa chiave API è già presente nel pool.')
      return
    }
    const updated = [...inputApiKeys, trimmed]
    setInputApiKeys(updated)
    setInputApiKeyQuotaGroups((groups) => [...groups, 'default-project'])
    setNewKeyInput('')
  }, [newKeyInput, inputApiKeys, onNotice])

  const handleRemoveKey = useCallback(
    (idx: number): void => {
      const updated = inputApiKeys.filter((_, i) => i !== idx)
      const activeKey = inputApiKeys[activeKeyIdx]
      setInputApiKeys(updated)
      setInputApiKeyQuotaGroups((groups) => groups.filter((_, i) => i !== idx))
      setKeyTestStates((prev) => {
        const next = { ...prev }
        delete next[inputApiKeys[idx]]
        return next
      })
      const preservedIndex = activeKey ? updated.indexOf(activeKey) : -1
      setActiveKeyIdx(
        preservedIndex >= 0 ? preservedIndex : Math.min(idx, Math.max(0, updated.length - 1))
      )
    },
    [inputApiKeys, activeKeyIdx]
  )

  const setQuotaGroupForKey = useCallback((idx: number, value: string): void => {
    setInputApiKeyQuotaGroups((groups) =>
      inputApiKeys.map((_, index) =>
        index === idx ? value : groups[index] || 'default-project'
      )
    )
  }, [inputApiKeys])

  const handleTestKey = useCallback(async (idx: number, key: string): Promise<void> => {
    setKeyTestStates((prev) => ({
      ...prev,
      [key]: { isTesting: true }
    }))
    try {
      const res = await window.archive.testApiKey(key)
      setKeyTestStates((prev) => ({
        ...prev,
        [key]: { isTesting: false, result: res }
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore di connessione'
      setKeyTestStates((prev) => ({
        ...prev,
        [key]: { isTesting: false, result: { valid: false, error: msg } }
      }))
    }
  }, [])

  const handleSaveSettings = useCallback(async (): Promise<void> => {
    if (isSavingSettings) return
    if (publishingEnabled && (!publishingRepoUrl.trim() || (!publishingToken.trim() && !publishingStatus?.configured))) {
      onNotice('Inserisci il repository e un token GitHub per attivare la sincronizzazione automatica.')
      return
    }
    setIsSavingSettings(true)
    try {
      const updated = await window.archive.saveSettings({
        apiKeys: inputApiKeys,
        apiKeyQuotaGroups: inputApiKeys.map(
          (_, index) => inputApiKeyQuotaGroups[index]?.trim() || 'default-project'
        ),
        activeKeyIndex: activeKeyIdx,
        autoRotateOnQuota: autoRotate,
        model: inputModel,
        autoProcessOnImport,
        publishing: {
          enabled: publishingEnabled,
          repoUrl: publishingRepoUrl.trim(),
          branch: settings.publishing?.branch || 'main',
          autoPublishOnStartup: true,
          ...(publishingToken.trim() ? { githubToken: publishingToken.trim() } : {})
        }
      })
      setSettings(updated)
      setPublishingToken('')
      setShowSettingsModal(false)
      onNotice(updated.publishing?.enabled
        ? 'Impostazioni salvate. La sincronizzazione GitHub partirà automaticamente.'
        : 'Impostazioni salvate.')
    } catch {
      // Never log a request that may contain a GitHub credential.
      onNotice('Impossibile salvare le impostazioni. Verifica URL, token e disponibilità della crittografia sul computer.')
    } finally {
      setIsSavingSettings(false)
    }
  }, [
    inputApiKeys,
    inputApiKeyQuotaGroups,
    activeKeyIdx,
    autoRotate,
    inputModel,
    autoProcessOnImport,
    publishingEnabled,
    publishingRepoUrl,
    publishingToken,
    publishingStatus?.configured,
    settings.publishing?.branch,
    isSavingSettings,
    onNotice
  ])

  const saveCourseConfig = useCallback(async (courseCode: string, config: { examDate?: string, expectedHours?: number }) => {
    try {
      const currentConfigs = settings.courseConfigs || {}
      const updatedConfigs = {
        ...currentConfigs,
        [courseCode]: {
          ...currentConfigs[courseCode],
          ...config
        }
      }
      const updated = await window.archive.saveSettings({ courseConfigs: updatedConfigs })
      setSettings(updated)
    } catch (err) {
      console.error('Errore durante il salvataggio configurazione corso:', err)
      onNotice('Errore durante il salvataggio configurazione corso.')
    }
  }, [settings, onNotice])

  return {
    settings,
    setSettings,
    showSettingsModal,
    setShowSettingsModal: (show: boolean) => {
      if (!show) setPublishingToken('')
      setShowSettingsModal(show)
    },
    publishingEnabled,
    setPublishingEnabled,
    publishingRepoUrl,
    setPublishingRepoUrl,
    publishingToken,
    setPublishingToken,
    publishingStatus,
    inputApiKeys,
    setInputApiKeys,
    inputApiKeyQuotaGroups,
    setQuotaGroupForKey,
    activeKeyIdx,
    setActiveKeyIdx,
    autoRotate,
    setAutoRotate,
    autoProcessOnImport,
    setAutoProcessOnImport,
    inputModel,
    setInputModel,
    newKeyInput,
    setNewKeyInput,
    keyTestStates,
    isSavingSettings,
    loadSettings,
    openSettingsModal,
    handleAddKey,
    handleRemoveKey,
    handleTestKey,
    handleSaveSettings,
    saveCourseConfig
  }
}
