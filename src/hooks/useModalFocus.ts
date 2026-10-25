import { useEffect, type RefObject } from 'react'

/** Isolate siblings at every ancestor, including dialogs rendered inside Focus. */
export function useModalFocus(ref: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    const previous = document.activeElement as HTMLElement | null
    const isolated: { element: HTMLElement; inert: boolean }[] = []
    let branch: HTMLElement = dialog
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling === branch || !(sibling instanceof HTMLElement) || sibling === document.fullscreenElement || (document.fullscreenElement && sibling.contains(document.fullscreenElement)) || sibling.matches('script, style, [data-dictionary-overlay]') || sibling.querySelector('[data-dictionary-overlay]')) continue
        isolated.push({ element: sibling, inert: sibling.inert })
        sibling.inert = true
      }
      branch = branch.parentElement
      if (branch === document.body) break
    }
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')).filter(element => element.getClientRects().length && !element.closest('[hidden], [inert]'))
    const focusFirst = () => (controls()[0] ?? dialog).focus({ preventScroll: true })
    if (!document.querySelector('[data-dictionary-overlay]')) focusFirst()
    const key = (event: KeyboardEvent) => {
      if (document.querySelector('[data-dictionary-overlay]')) return
      if (event.key !== 'Tab') return
      const items = controls(), first = items[0], last = items.at(-1)
      if (!items.length) { event.preventDefault(); dialog.focus(); return }
      if (!dialog.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first)?.focus()
      }
    }
    const focus = (event: FocusEvent) => {
      if (!document.querySelector('[data-dictionary-overlay]') && !dialog.contains(event.target as Node)) focusFirst()
    }
    window.addEventListener('keydown', key, true)
    document.addEventListener('focusin', focus)
    return () => {
      window.removeEventListener('keydown', key, true)
      document.removeEventListener('focusin', focus)
      for (const item of isolated) item.element.inert = item.inert
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus({ preventScroll: true })
    }
  }, [ref, open])
}
