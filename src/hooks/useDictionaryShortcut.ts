import { useCallback, useEffect, useState } from 'react'
import type { DictionaryDirection } from '../../shared/dictionary'

export interface DictionarySelection { text: string; direction: DictionaryDirection }

export function useDictionaryShortcut() {
  const [isOpen, setIsOpen] = useState(false)
  const [selection, setSelection] = useState<DictionarySelection | undefined>()
  const close = useCallback(() => setIsOpen(false), [])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (document.querySelector('.settings-modal-overlay')) return
      if (!event.isComposing && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 't') {
        event.preventDefault(); event.stopImmediatePropagation()
        if (!event.repeat) {
          const selected = window.getSelection()
          const element = (node: Node | null) => node instanceof Element ? node : node?.parentElement
          const source = element(selected?.anchorNode ?? null)?.closest<HTMLElement>('[data-notes-language]')
          const endSource = element(selected?.focusNode ?? null)?.closest('[data-notes-language]')
          const text = source && source === endSource ? selected?.toString().trim() : ''
          setSelection(text ? { text, direction: source?.dataset.notesLanguage === 'en' ? 'en-it' : 'it-en' } : undefined)
          setIsOpen(value => !value)
        }
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])
  return { isOpen, close, selection }
}
