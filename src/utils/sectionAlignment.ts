export interface SectionHeading { level: number; text: string }
export interface LanguageReadingPoint {
  key: string
  headings: SectionHeading[]
  section: number
  progress: number
  documentProgress: number
}

const label = (heading: SectionHeading) => heading.text.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
const number = (heading: SectionHeading) => heading.text.trim().match(/^(\d+(?:\.\d+)*)(?:[.)]?\s|$)/)?.[1]

/** Use stable visible identities first; ordinal matching requires compatible outlines. */
export function correspondingSection(source: SectionHeading[], target: SectionHeading[], index: number): number | null {
  const active = source[index]
  if (!active) return null
  for (const identity of [number, label]) {
    const value = identity(active)
    if (!value) continue
    const from = source.filter(heading => heading.level === active.level && identity(heading) === value)
    const to = target.map((heading, i) => heading.level === active.level && identity(heading) === value ? i : -1).filter(i => i >= 0)
    if (from.length === 1 && to.length === 1) return to[0]
  }
  if (source.length !== target.length || source.some((heading, i) => heading.level !== target[i].level)) return null
  // A missing/reordered identity, or repeated active title, makes ordinal matching unsafe.
  if (source.filter(heading => label(heading) === label(active)).length > 1 ||
    target.filter(heading => label(heading) === label(target[index])).length > 1) return null
  for (const identity of [number, label]) {
    for (let i = 0; i < source.length; i++) {
      const value = identity(source[i])
      if (!value) continue
      const matches = target.map((heading, j) => identity(heading) === value ? j : -1).filter(j => j >= 0)
      if ((identity === number && matches.length !== 1) || (matches.length === 1 && matches[0] !== i)) return null
    }
  }
  return index
}

export function captureLanguagePoint(body: HTMLElement, scroller: HTMLElement, key: string): LanguageReadingPoint {
  const nodes = Array.from(body.querySelectorAll<HTMLElement>(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6'))
  const top = scroller.getBoundingClientRect().top
  let section = -1
  nodes.forEach((node, i) => { if (node.getBoundingClientRect().top <= top + 1) section = i })
  const start = nodes[section]?.getBoundingClientRect().top ?? body.getBoundingClientRect().top
  const end = nodes[section + 1]?.getBoundingClientRect().top ?? body.getBoundingClientRect().bottom
  return {
    key, headings: nodes.map(node => ({ level: Number(node.tagName.slice(1)), text: node.textContent ?? '' })), section,
    progress: Math.max(0, Math.min(1, (top - start) / Math.max(1, end - start))),
    documentProgress: scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight)
  }
}

export function alignLanguagePoint(body: HTMLElement, scroller: HTMLElement, source: LanguageReadingPoint): void {
  const nodes = Array.from(body.querySelectorAll<HTMLElement>(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6'))
  const target = nodes.map(node => ({ level: Number(node.tagName.slice(1)), text: node.textContent ?? '' }))
  const index = correspondingSection(source.headings, target, source.section)
  if (index === null) {
    scroller.scrollTop = source.documentProgress * (scroller.scrollHeight - scroller.clientHeight)
    return
  }
  const start = nodes[index].getBoundingClientRect().top
  const end = nodes[index + 1]?.getBoundingClientRect().top ?? body.getBoundingClientRect().bottom
  scroller.scrollTop += start - scroller.getBoundingClientRect().top + source.progress * (end - start)
}
