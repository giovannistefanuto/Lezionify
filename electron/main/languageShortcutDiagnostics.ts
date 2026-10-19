import type { Input, WebContents } from 'electron'

// Temporary, opt-in trace for the unresolved Ctrl+L report. Never retain raw keys.
export function traceLanguageShortcut(contents: Pick<WebContents, 'on'>, write: (details: string) => void) {
  contents.on('before-input-event', (_event, input: Input) => {
    if (input.type !== 'keyDown' || !(input.control || input.meta) ||
      (input.key.toLowerCase() !== 'l' && input.code !== 'KeyL')) return
    write(JSON.stringify({ stage: 'main-input', logicalL: input.key.toLowerCase() === 'l',
      physicalL: input.code === 'KeyL', control: input.control, meta: input.meta,
      shift: input.shift, alt: input.alt, repeat: input.isAutoRepeat }))
  })
}
