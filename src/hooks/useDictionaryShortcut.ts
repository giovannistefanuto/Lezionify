import { useCallback, useEffect, useState } from 'react'

export function useDictionaryShortcut() {
  const [isOpen, setIsOpen] = useState(false)
  const close = useCallback(() => setIsOpen(false), [])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (document.querySelector('.settings-modal-overlay')) return
      if (!event.isComposing && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 't') {
        event.preventDefault(); event.stopImmediatePropagation()
        if (!event.repeat) setIsOpen(value => !value)
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])
  return { isOpen, close }
}
