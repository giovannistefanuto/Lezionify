import type { WebContents } from 'electron'

/** Deliver the app shortcut before Chromium's fullscreen focus/navigation defaults. */
export function installLanguageShortcut(contents: WebContents) {
  let active = false
  const listener = (event: Electron.Event, input: Electron.Input) => {
    if (!active || input.type !== 'keyDown' || input.isAutoRepeat || input.isComposing || input.alt || input.shift ||
      !(input.control || input.meta) || (input.key.toLowerCase() !== 'l' && input.code !== 'KeyL')) return
    event.preventDefault()
    contents.send('archive:language-shortcut')
  }
  contents.on('before-input-event', listener)
  return { setActive: (value: boolean) => { active = value }, dispose: () => contents.removeListener('before-input-event', listener) }
}
