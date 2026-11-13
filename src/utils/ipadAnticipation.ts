export const IPAD_PREFERENCE_EVENT = 'lezionify-ipad-preference'
export const IPAD_EXPORT_EVENT = 'lezionify-ipad-export'
/** One second of real credited study per call; no wall-clock catch-up. */
export class IpadAnticipation {
  total: number
  private active = ''
  private seconds = 0
  constructor(total = 0) { this.total = Math.max(0, Math.min(300, Number.isFinite(total) ? total : 0)) }
  tick(paragraph: string | null): boolean {
    this.total = Math.min(300, this.total + 1)
    if (paragraph !== this.active) { this.active = paragraph ?? ''; this.seconds = 0 }
    if (paragraph) this.seconds++
    return Boolean(paragraph && this.total >= 300 && this.seconds >= 10)
  }
}
export function upcomingDiagrams(root: HTMLElement): { paragraph: HTMLElement; diagrams: HTMLElement[] } | null {
  const body = root.querySelector<HTMLElement>('.markdown-body')
  if (!body || root.clientHeight <= 0) return null
  const top = root.getBoundingClientRect().top + root.clientTop
  const bottom = top + root.clientHeight
  const blocks = Array.from(body.children).filter((element): element is HTMLElement =>
    element instanceof HTMLElement && element.matches('p, ul, ol, pre, blockquote, table, .markdown-alert, .mermaid-diagram'))
  const index = blocks.findIndex(block => !block.matches('.mermaid-diagram') &&
    block.getBoundingClientRect().bottom > top && block.getBoundingClientRect().top < bottom)
  if (index < 0) return null
  const next = blocks[index + 1]
  if (!next || next.matches('.mermaid-diagram')) return { paragraph: blocks[index], diagrams: [] }
  const diagrams: HTMLElement[] = []
  for (let offset = index + 2; offset < blocks.length && blocks[offset].matches('.mermaid-diagram'); offset++) diagrams.push(blocks[offset])
  return { paragraph: blocks[index], diagrams }
}

/** The automatic and manual paths must use the same identity. */
export async function ipadDiagramKey(lectureId: string, language: string, source: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${lectureId}\n${language}\n${source}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
