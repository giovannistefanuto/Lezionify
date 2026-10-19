import { createContext, useContext } from 'react'

export type ToolSettingsSection = 'translation' | 'music'
export const ToolSettingsContext = createContext({
  isOpen: false,
  open: (_section: ToolSettingsSection) => {}
})
export const useToolSettings = () => useContext(ToolSettingsContext)
