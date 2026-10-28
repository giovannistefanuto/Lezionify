export interface MarkdownSection { title: string; start: number; end: number; level: number }
/** Offsets refer to the untouched source; headings inside fences are not sections. */
export function markdownSections(source: string): MarkdownSection[] {
  const headings: Omit<MarkdownSection, 'end'>[] = []
  let offset = 0, fence: string | null = null
  for (const line of source.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1]
    if (marker) {
      if (!fence) fence = marker
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null
    } else if (!fence) {
      const match = /^(#{1,6})[ \t]+(.+?)\s*#*\s*$/.exec(line.trimEnd())
      if (match) headings.push({ title: match[2], level: match[1].length, start: offset })
    }
    offset += line.length
  }
  return headings.map((heading, index) => ({ ...heading, end: headings.slice(index + 1).find(next => next.level <= heading.level)?.start ?? source.length }))
}
export interface SectionRevisionPreview { token: string; title: string; before: string; after: string; fullTranscript: true }
export interface SectionRevisionApi {
  previewSectionRevision: (id: string, expected: string, start: number, instructions: string) => Promise<SectionRevisionPreview>
  applySectionRevision: (id: string, token: string) => Promise<string>
  restoreSectionRevision: (id: string) => Promise<string>
}
