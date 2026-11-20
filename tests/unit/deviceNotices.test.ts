import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_DEVICE_NOTICES, HeadphoneConnection } from '../../shared/deviceNotices'
import { installLanguageShortcut } from '../../electron/main/languageShortcut'

describe('notifiche delle cuffiette', () => {
  it('notifica solo una connessione effettiva del nome scelto, mai avvio o campioni ripetuti', () => {
    const tracker = new HeadphoneConnection(), prefs = DEFAULT_DEVICE_NOTICES
    expect(tracker.sample(['EarFun Air Pro 4'], prefs)).toBe(false)
    expect(tracker.sample([], prefs)).toBe(false)
    expect(tracker.sample(['Altre cuffie'], prefs)).toBe(false)
    expect(tracker.sample(['earfun air pro 4'], prefs)).toBe(true)
    expect(tracker.sample(['EarFun Air Pro 4'], prefs)).toBe(false)
    tracker.reset()
    expect(tracker.sample(['EarFun Air Pro 4'], prefs)).toBe(false)
    expect(tracker.sample([], { ...prefs, headphonesName: 'Altro' })).toBe(false)
    expect(tracker.sample(['Altro'], { ...prefs, headphonesName: 'Altro' })).toBe(true)
  })
  it('rispetta la disattivazione e non inventa un evento alla riattivazione', () => {
    const tracker = new HeadphoneConnection(), prefs = DEFAULT_DEVICE_NOTICES
    tracker.sample([], prefs)
    expect(tracker.sample(['EarFun Air Pro 4'], { ...prefs, headphones: false })).toBe(false)
    expect(tracker.sample(['EarFun Air Pro 4'], prefs)).toBe(false)
  })
})
it('consegna Ctrl+L una volta prima dei default Chromium solo quando la lettura Focus è attiva', () => {
  const contents = Object.assign(new EventEmitter(), { send: vi.fn() })
  const route = installLanguageShortcut(contents as any)
  const event = { preventDefault: vi.fn() }, key = { type: 'keyDown', key: 'L', code: 'KeyL', control: true }
  contents.emit('before-input-event', event, key)
  expect(event.preventDefault).not.toHaveBeenCalled()
  route.setActive(true)
  contents.emit('before-input-event', event, key)
  expect(event.preventDefault).toHaveBeenCalledTimes(1)
  expect(contents.send).toHaveBeenCalledWith('archive:language-shortcut')
  for (const other of [{ shift: true }, { alt: true }, { isAutoRepeat: true }, { isComposing: true }, { type: 'keyUp' }]) contents.emit('before-input-event', event, { ...key, ...other })
  expect(contents.send).toHaveBeenCalledTimes(1)
  route.dispose()
  expect(contents.listenerCount('before-input-event')).toBe(0)
})
