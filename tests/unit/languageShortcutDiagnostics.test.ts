import { EventEmitter } from 'node:events'
import { expect, it, vi } from 'vitest'
import type { WebContents } from 'electron'
import { traceLanguageShortcut } from '../../electron/main/languageShortcutDiagnostics'

it('osserva solo Ctrl/Cmd+L senza intercettare i tasti o conservare testo e codici grezzi', () => {
  const contents = new EventEmitter()
  const write = vi.fn()
  const preventDefault = vi.fn()
  traceLanguageShortcut(contents as unknown as Pick<WebContents, 'on'>, write)
  const input = { type: 'keyDown', key: 'l', code: 'KeyL', control: true, meta: false, shift: false, alt: false, isAutoRepeat: false }
  for (const change of [{ control: false }, { type: 'keyUp' }, { key: 'private-input', code: 'KeyS' }]) {
    contents.emit('before-input-event', { preventDefault }, { ...input, ...change })
  }
  expect(write).not.toHaveBeenCalled()
  contents.emit('before-input-event', { preventDefault }, input)
  expect(JSON.parse(write.mock.calls[0][0])).toEqual({ stage: 'main-input', logicalL: true, physicalL: true,
    control: true, meta: false, shift: false, alt: false, repeat: false })
  contents.emit('before-input-event', { preventDefault }, { ...input, key: 'private-input', control: false, meta: true, privateContext: 'private-lecture' })
  expect(write).toHaveBeenCalledTimes(2)
  expect(JSON.parse(write.mock.calls[1][0])).toMatchObject({ logicalL: false, physicalL: true, meta: true })
  expect(JSON.stringify(write.mock.calls)).not.toContain('private')
  expect(preventDefault).not.toHaveBeenCalled()
})
