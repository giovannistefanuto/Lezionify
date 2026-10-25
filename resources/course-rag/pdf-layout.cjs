// Conservative text-only layout handling. Tables and ambiguous layouts keep
// PDF.js content order; no OCR or visual interpretation is implied.
function extractLayoutText(items, width) {
  const words = items.filter(item => typeof item.str === 'string' && item.str.trim())
  const center = width / 2
  const left = words.filter(item => item.transform?.[4] < center && item.transform[4] + item.width < center - 6)
  const right = words.filter(item => item.transform?.[4] > center + 6)
  const columns = new Set([...left, ...right])
  const wide = words.filter(item => !columns.has(item))
  const verticalSpan = group => Math.max(...group.map(item => item.transform[5])) - Math.min(...group.map(item => item.transform[5]))
  const paragraphLike = group => group.length >= 4 && group.reduce((n, item) => n + item.str.length, 0) / group.length > 35 && verticalSpan(group) > 60
  const flow = group => group.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('')
  if (!paragraphLike(left) || !paragraphLike(right) || wide.some(item => item.transform?.[5] < Math.max(...left.map(item => item.transform[5])) && item.transform?.[5] > Math.min(...left.map(item => item.transform[5])))) return flow(items.filter(item => typeof item.str === 'string'))
  const order = (a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]
  const top = Math.max(...left.map(item => item.transform[5]), ...right.map(item => item.transform[5]))
  return [wide.filter(item => item.transform[5] >= top).sort(order), left.sort(order), right.sort(order), wide.filter(item => item.transform[5] < top).sort(order)].map(group => group.map(item => item.str).join('\n')).filter(Boolean).join('\n\n')
}
module.exports = { extractLayoutText }
