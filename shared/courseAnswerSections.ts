export type CourseAnswerSection = { kind: 'sources' | 'deduction' | 'general' | 'other'; markdown: string }
/** Classify only explicit section headings; never infer provenance from prose. */
export function courseAnswerSections(text: string): CourseAnswerSection[] {
  const sections: CourseAnswerSection[] = []
  let current: CourseAnswerSection = { kind: 'other', markdown: '' }
  let fence: string | null = null
  for (const line of text.split('\n')) {
    const code = /^\s*(`{3,}|~{3,})/.exec(line)
    if (code) fence = fence ? (code[1][0] === fence ? null : fence) : code[1][0]
    const heading = !fence && /^\s*(?:#{1,6}\s+|\*\*|(?=(?:Dalle fonti(?: del corso)?|Deduzione|Integrazione generale)\s*:))(Dalle fonti(?: del corso)?|Deduzione|Integrazione generale)\b/i.exec(line)
    if (heading) {
      if (current.markdown.trim()) sections.push(current)
      const title = heading[1].toLocaleLowerCase('it-IT')
      current = { kind: title.startsWith('dalle') ? 'sources' : title === 'deduzione' ? 'deduction' : 'general', markdown: '' }
    }
    current.markdown += line + '\n'
  }
  if (current.markdown.trim()) sections.push(current)
  return sections
}
