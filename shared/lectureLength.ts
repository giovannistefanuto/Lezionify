/** Count prose, including headings and tables, rather than Markdown/LaTeX syntax. */
export function countLectureWords(markdown: string): number {
  const prose = markdown
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[^]*?^[ \t]*\1[ \t]*(?:\n|$)/gm, ' ')
    .replace(/`+[^`]*`+/g, ' ')
    .replace(/\$\$[^]*?\$\$|\$[^\n$]+\$/g, ' ')
    .replace(/\\\([^]*?\\\)|\\\[[^]*?\\\]/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\[[^\]]+\]:[^\n]*$/gm, ' ')
    .replace(/https?:\/\/\S+|<[^>]+>/g, ' ')
    .replace(/\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|CONCETTO CHIAVE)\]/gi, ' ')
  return prose.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0
}

export function relativeLectureLength(words: number | null, counts: Record<string, number | null>): number | null {
  if (words === null) return null
  const maximum = Object.values(counts).reduce<number>((largest, count) => Math.max(largest, count ?? 0), words)
  return maximum > 0 ? Math.round(words / maximum * 100) : 0
}
