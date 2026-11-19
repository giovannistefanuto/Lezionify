import { expect, test, vi } from 'vitest'
import { configureWindowsIdentity, windowIconPath } from '../../electron/main/windowsIdentity'
import { resolve } from 'node:path'

test('development cannot register the installed Windows application identity', () => {
  const setAppUserModelId = vi.fn()
  configureWindowsIdentity({ isPackaged: false, setAppUserModelId }, 'win32')
  expect(setAppUserModelId).toHaveBeenCalledWith('com.lezionify.app.development')
})

test('installed identity stays compatible with existing NSIS shortcuts', () => {
  const setAppUserModelId = vi.fn()
  configureWindowsIdentity({ isPackaged: true, setAppUserModelId }, 'win32')
  expect(setAppUserModelId).toHaveBeenCalledWith('com.lezionify.app')
  setAppUserModelId.mockClear()
  configureWindowsIdentity({ isPackaged: true, setAppUserModelId }, 'linux')
  expect(setAppUserModelId).not.toHaveBeenCalled()
})

test('window icon resolves inside the packaged main assets', () => {
  const main = resolve('fixture/resources/app.asar/out/main')
  expect(windowIconPath(main)).toBe(resolve(main, 'app-icon.png'))
})
