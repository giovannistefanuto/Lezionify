import { readFile } from 'node:fs/promises'

const files = ['src/styles.css', 'src/qna.css']
const counts = new Map()

for (const file of files) {
  const source = (await readFile(file, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '')
  const stack = []
  let boundary = 0
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '{') {
      const prelude = source.slice(boundary, index).trim()
      const isAtRule = prelude.startsWith('@')
      const isInsideAtRule = stack.some((entry) => entry === 'at-rule')
      if (!isAtRule && !isInsideAtRule) {
        for (const selector of prelude.split(',')) {
          const normalized = selector.trim().replace(/\s+/g, ' ')
          if (!normalized) continue
          const occurrences = counts.get(normalized) ?? []
          occurrences.push(file)
          counts.set(normalized, occurrences)
        }
      }
      stack.push(isAtRule ? 'at-rule' : 'rule')
      boundary = index + 1
    } else if (character === '}') {
      stack.pop()
      boundary = index + 1
    } else if (character === ';') {
      boundary = index + 1
    }
  }
}

const duplicates = [...counts.entries()].filter(([, locations]) => locations.length > 1)
console.log(`Selettori inventariati: ${counts.size}`)
console.log(`Duplicati esatti fuori da media query e keyframe: ${duplicates.length}`)
for (const [selector, locations] of duplicates) {
  console.log(`${selector}: ${locations.join(', ')}`)
}
