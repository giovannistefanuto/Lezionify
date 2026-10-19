// Conservative SVG area on A4 with the export's 0.55 inch side margins,
// default body margin, figure border and canvas padding. Values are CSS px.
const PRINT_WIDTH = 660
const PRINT_HEIGHT = 230 * 96 / 25.4
const PRINT_FONT_PT = 10.5
const MIN_FONT_PT = 8.5

export function mermaidPrintScale(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 0
  return Math.min(1, PRINT_WIDTH / width, PRINT_HEIGHT / height)
}

export function needsMermaidPrintAlternative(width: number, height: number): boolean {
  return PRINT_FONT_PT * mermaidPrintScale(width, height) < MIN_FONT_PT
}

/** Change only the top-level layout, never labels, edges or saved Markdown. */
export function mermaidPrintAlternative(source: string): string | null {
  const firstLine = source.split(/\r?\n/).find(line => line.trim() && !line.trim().startsWith('%%'))
  const match = firstLine && /^\s*(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)\b/.exec(firstLine)
  if (!match) return null
  const directions = { TD: 'LR', TB: 'LR', BT: 'RL', LR: 'TD', RL: 'BT' } as const
  return source.replace(/^(\s*(?:flowchart|graph)\s+)(TD|TB|BT|LR|RL)\b/m,
    (_, prefix: string, direction: keyof typeof directions) => prefix + directions[direction])
}
