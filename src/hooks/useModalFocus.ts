import { useEffect, type RefObject } from 'react'

// One owner for inert/focus: independent traps otherwise steal focus from each other.
const dialogs: HTMLElement[] = []
const originalInert = new Map<HTMLElement, boolean>()
function isolateTop() {
  for (const [element, inert] of originalInert) element.inert = inert
  originalInert.clear()
  const top = dialogs.at(-1)
  if (!top) return
  let branch = top
  while (branch.parentElement) {
    for (const sibling of branch.parentElement.children) {
      if (sibling === branch || !(sibling instanceof HTMLElement) || sibling === document.fullscreenElement || (document.fullscreenElement && sibling.contains(document.fullscreenElement)) || sibling.matches('script, style, [data-dictionary-overlay]') || sibling.querySelector('[data-dictionary-overlay]')) continue
      originalInert.set(sibling, sibling.inert)
      sibling.inert = true
    }
    branch = branch.parentElement
    if (branch === document.body) break
  }
}

/** Isolate the top dialog; suspended dialogs resume when its overlay closes. */
export function useModalFocus(ref: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    const previous = document.activeElement as HTMLElement | null
    dialogs.push(dialog)
    isolateTop()
    const observer = new MutationObserver(isolateTop)
    observer.observe(document.body, { childList: true, subtree: true })
    const active = () => dialogs.at(-1) === dialog && !document.querySelector('[data-dictionary-overlay]')
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')).filter(element => element.getClientRects().length && !element.closest('[hidden], [inert]'))
    const focusFirst = () => (controls()[0] ?? dialog).focus({ preventScroll: true })
    if (active()) focusFirst()
    const key = (event: KeyboardEvent) => {
      if (!active() || event.key !== 'Tab') return
      const items = controls(), first = items[0], last = items.at(-1)
      if (!items.length) { event.preventDefault(); dialog.focus(); return }
      if (!dialog.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first)?.focus()
      }
    }
    const focus = (event: FocusEvent) => {
      if (active() && !dialog.contains(event.target as Node)) focusFirst()
    }
    window.addEventListener('keydown', key, true)
    document.addEventListener('focusin', focus)
    return () => {
      observer.disconnect()
      window.removeEventListener('keydown', key, true)
      document.removeEventListener('focusin', focus)
      const index = dialogs.indexOf(dialog)
      if (index >= 0) dialogs.splice(index, 1)
      isolateTop()
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus({ preventScroll: true })
    }
  }, [ref, open])
}
