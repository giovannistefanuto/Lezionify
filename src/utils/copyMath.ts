import type React from 'react'

/** KaTeX contains an accessible tree and a visual tree. Copy each formula once. */
export function copyRenderedMath(event: React.ClipboardEvent<HTMLElement>): void {
  const selection = window.getSelection()
  if (!selection?.rangeCount || !selection.toString()) return
  const range = selection.getRangeAt(0)
  if (!event.currentTarget.contains(range.commonAncestorContainer)) return
  const copy = document.createElement('div')
  copy.append(range.cloneContents())
  if (!copy.querySelector('.katex, .katex-mathml, .katex-html')) return
  copy.querySelectorAll('.katex').forEach(node => {
    const tex = node.querySelector('annotation[encoding="application/x-tex"]')?.textContent
    if (tex) node.replaceWith(document.createTextNode(`$${tex}$`))
  })
  copy.querySelectorAll('.katex-mathml').forEach(node => node.remove())
  // Preserve paragraph breaks while excluding the duplicate MathML text.
  copy.querySelectorAll('p, div, li').forEach(node => node.append(document.createTextNode('\n')))
  event.clipboardData.setData('text/plain', copy.textContent?.trim() ?? '')
  event.preventDefault()
}
