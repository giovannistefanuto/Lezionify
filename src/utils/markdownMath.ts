/** Repair multiline display delimiters for remark-math, only in the rendered copy.
 * A flow opener such as $$\\begin{aligned} otherwise treats the environment as
 * metadata and consumes the rest of the document looking for a standalone $$.
 */
export function normalizeDisplayMath(markdown: string): string {
  markdown = normalizeMathDelimiters(markdown)
  const insertions: { offset: number; text: string }[] = []
  let opening: { offset: number; indent: string; newline: string } | null = null
  let fence: { marker: string; size: number } | null = null
  let inlineTicks = 0
  let offset = 0

  for (const line of markdown.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const body = line.replace(/\r?\n$/, '')
    const newline = line.endsWith('\r\n') ? '\r\n' : '\n'
    if (!opening && !inlineTicks) {
      const marker = body.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
      if (fence) {
        if (marker && marker[1][0] === fence.marker && marker[1].length >= fence.size && !marker[2].trim()) fence = null
        offset += line.length
        continue
      }
      if (marker) {
        fence = { marker: marker[1][0], size: marker[1].length }
        offset += line.length
        continue
      }
      // Four-space/tab indented code must remain literal as well.
      if (/^(?: {4}|\t)/.test(body)) {
        offset += line.length
        continue
      }
    }
    for (let i = 0; i < body.length; i++) {
      let slashes = 0
      for (let j = i - 1; j >= 0 && body[j] === '\\'; j--) slashes++
      if (slashes % 2) continue
      if (!opening && body[i] === '`') {
        const size = body.slice(i).match(/^`+/)![0].length
        if (!inlineTicks) {
          // An unmatched backtick is ordinary text, not a code span.
          const remainder = markdown.slice(offset + i + size)
          if (new RegExp('(?<!`)`{' + size + '}(?!`)').test(remainder)) inlineTicks = size
        } else if (size === inlineTicks) inlineTicks = 0
        i += size - 1
        continue
      }
      if (inlineTicks || body.slice(i, i + 2) !== '$$' || body[i - 1] === '$' || body[i + 2] === '$') continue
      if (opening) {
        if (markdown.slice(opening.offset + 2, offset + i).includes('\n')) {
          const afterOpen = opening.offset + 2
          if (!/^[ \t]*\r?\n/.test(markdown.slice(afterOpen))) insertions.push({ offset: afterOpen, text: opening.newline + opening.indent })
          if (body.slice(0, i).trim()) insertions.push({ offset: offset + i, text: opening.newline + opening.indent })
        }
        opening = null
      } else if (/^ {0,3}$/.test(body.slice(0, i))) {
        opening = { offset: offset + i, indent: body.slice(0, i), newline }
      }
      i++
    }
    offset += line.length
  }
  let result = markdown
  for (let i = insertions.length - 1; i >= 0; i--) {
    const insertion = insertions[i]
    result = result.slice(0, insertion.offset) + insertion.text + result.slice(insertion.offset)
  }
  return result
}

/** Work only on a rendered copy. Never interpret code as math or invent LaTeX. */
function normalizeMathDelimiters(source: string): string {
  let fence: { marker: string; size: number } | null = null
  let inlineTicks = 0
  let offset = 0
  const prose = (text: string) => text
    .replace(/\\\((.*?)\\\)/g, (_, body: string) => `$${body}$`)
    .replace(/\\\[|\\\]/g, () => '$$')
    // Repair this malformed currency before recognizing valid math: otherwise
    // its first closing dollar is mistaken for a complete scalar formula.
    .replace(/(^|[\s(])\$(\d+[.,]\d{2},?)\$\$(?=\s|[).,]|$)/g,
      (_, before: string, amount: string) => `${before}${amount}\\$`)
    // A numeric scalar or a closing delimiter inside a valid formula is math.
    .split(/((?<![\\$])\$\$[^\n]*?\$\$|(?<![\\$])\$(?!\$|\s)(?:\\.|[^$\\\n])*(?<!\s)\$(?!\$))/g)
    .map((part, index) => index % 2 ? part : part
      .replace(/(\d(?:[.,]\d+)?\\\$)\$+/g, '$1')
      .replace(/(^|[\s(])\$(\d+[.,]\d{2},?)\$\$(?=\s|[).,]|$)/g,
        (_, before: string, amount: string) => `${before}${amount}\\$`)
      .replace(/(^|[\s(])(\d+[.,]\d{2},?)\$(?!\$)/g,
        (_, before: string, amount: string) => `${before}${amount}\\$`)).join('')
  return (source.match(/[^\n]*\n|[^\n]+$/g) ?? []).map(line => {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)/.exec(line.trimEnd())
    if (!inlineTicks && fence) {
      if (marker && marker[1][0] === fence.marker && marker[1].length >= fence.size && !marker[2].trim()) fence = null
      offset += line.length
      return line
    }
    if (!inlineTicks && marker) {
      fence = { marker: marker[1][0], size: marker[1].length }
      offset += line.length
      return line
    }
    if (!inlineTicks && /^(?: {4}|\t)/.test(line)) { offset += line.length; return line }
    let result = '', position = 0
    for (const tick of line.matchAll(/`+/g)) {
      const index = tick.index!
      const before = line.slice(position, index)
      result += inlineTicks ? before : prose(before)
      let slashes = 0
      for (let cursor = index - 1; cursor >= 0 && line[cursor] === '\\'; cursor--) slashes++
      if (!(slashes % 2)) {
        if (inlineTicks === tick[0].length) inlineTicks = 0
        else if (!inlineTicks && new RegExp('(?<!`)`{' + tick[0].length + '}(?!`)').test(source.slice(offset + index + tick[0].length))) inlineTicks = tick[0].length
      }
      result += tick[0]
      position = index + tick[0].length
    }
    const tail = line.slice(position)
    result += inlineTicks ? tail : prose(tail)
    offset += line.length
    return result
  }).join('')
}
