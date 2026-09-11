import { useState, useCallback } from 'react'
import type { AppSettings, GeminiModel } from '../../shared/archive'

export function useSettings(onNotice: (msg: string) => void) {
  const [settings, setSettings] = useState<AppSettings>({
    apiKey: '',
    apiKeys: [],
    activeKeyIndex: 0,
    autoRotateOnQuota: true,
    model: 'gemini-3.6-flash'
  })
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [inputApiKeys, setInputApiKeys] = useState<string[]>([])
  const [activeKeyIdx, setActiveKeyIdx] = useState<number>(0)
  const [autoRotate, setAutoRotate] = useState<boolean>(true)
  const [inputModel, setInputModel] = useState<GeminiModel>('gemini-3.6-flash')
  const [newKeyInput, setNewKeyInput] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [keyTestStates, setKeyTestStates] = useState<
    Record<string, { isTesting: boolean; result?: { valid: boolean; keyValid?: boolean; modelAvailable?: boolean; error?: string } }>
  >({})

  const loadSettings = useCallback(async (): Promise<void> => {
    if (!window.archive) return
    try {
      const s = await window.archive.getSettings()
      setSettings(s)
      setInputApiKeys(s.apiKeys.length > 0 ? s.apiKeys : s.apiKey ? [s.apiKey] : [])
      setActiveKeyIdx(s.activeKeyIndex >= 0 ? s.activeKeyIndex : 0)
      setAutoRotate(s.autoRotateOnQuota)
      setInputModel(s.model)
    } catch (err) {
      console.error('Errore nel caricamento impostazioni:', err)
    }
  }, [])

  const openSettingsModal = useCallback((): void => {
    setInputApiKeys(
      settings.apiKeys.length > 0
        ? [...settings.apiKeys]
        : settings.apiKey
        ? [settings.apiKey]
        : []
    )
    setActiveKeyIdx(settings.activeKeyIndex >= 0 ? settings.activeKeyIndex : 0)
    setAutoRotate(settings.autoRotateOnQuota)
    setInputModel(settings.model)
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
    setNewKeyInput('')
  }, [newKeyInput, inputApiKeys, onNotice])

  const handleRemoveKey = useCallback(
    (idx: number): void => {
      const updated = inputApiKeys.filter((_, i) => i !== idx)
      const activeKey = inputApiKeys[activeKeyIdx]
      setInputApiKeys(updated)
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
    setIsSavingSettings(true)
    try {
      const updated = await window.archive.saveSettings({
        apiKeys: inputApiKeys,
        activeKeyIndex: activeKeyIdx,
        autoRotateOnQuota: autoRotate,
        model: inputModel
      })
      setSettings(updated)
      setShowSettingsModal(false)
      onNotice(`Impostazioni salvate: ${updated.apiKeys.length} chiavi API nel pool.`)
    } catch (err) {
      console.error('Errore durante il salvataggio delle impostazioni:', err)
      onNotice('Errore durante il salvataggio delle impostazioni.')
    } finally {
      setIsSavingSettings(false)
    }
  }, [inputApiKeys, activeKeyIdx, autoRotate, inputModel, isSavingSettings, onNotice])

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
    setShowSettingsModal,
    inputApiKeys,
    setInputApiKeys,
    activeKeyIdx,
    setActiveKeyIdx,
    autoRotate,
    setAutoRotate,
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
