import { contentFingerprint } from './readingPosition'
import { paragraphFeatures, paragraphModel, type ParagraphSample } from './paragraphEstimate'
import { formatLocalCalendarDate } from '../../shared/calendarDate'

const KEY = 'lezionify.paragraph-samples.v1'
interface Observation { seconds: number; coverage: number[]; recorded: boolean; day?: string }
/** DOM observations measure exposure, not comprehension. No lesson text is persisted. */
export function observeParagraphs(documentId: string, language: string) {
  const observations = new Map<string, Observation>()
  const features = new WeakMap<HTMLElement, { fingerprint: string; words: number; numbers: number; formulas: number }>()
  let model: ReturnType<typeof paragraphModel> = null, modelDay = '', modelDirty = true
  let samples: ParagraphSample[] = []
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (Array.isArray(saved)) samples = saved.slice(-300).filter(item => item && typeof item.document === 'string' && typeof item.day === 'string').map(item => ({ document: item.document, day: item.day, words: item.words, numbers: item.numbers, formulas: item.formulas, seconds: item.seconds }))
  } catch { /* Optional. */ }
  const progressKey = `lezionify.paragraph-progress.v1:${documentId}:${language}`
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey) ?? '[]')
    if (Array.isArray(saved)) for (const [key, item] of saved) if (typeof key === 'string' && item && Number.isFinite(item.seconds) && Array.isArray(item.coverage) && item.coverage.length === 20) observations.set(key, item)
  } catch { /* Fresh progress. */ }
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(samples.slice(-300)))
      localStorage.setItem(progressKey, JSON.stringify([...observations]))
    } catch { /* Still usable in memory. */ }
  }
  return {
    save,
    reset: () => { observations.clear(); save() },
    tick(root: HTMLElement, seconds: number): string | null {
      if (seconds <= 0 || seconds > 3) return null
      const day = formatLocalCalendarDate(new Date())
      const top = root.getBoundingClientRect().top + root.clientTop
      const bottom = top + root.clientHeight
      const blocks = Array.from(root.querySelectorAll<HTMLElement>('.markdown-body > p, .markdown-body > ul, .markdown-body > ol, .markdown-body > pre, .markdown-body > blockquote, .markdown-body > table'))
        .map((node, index) => {
          let cached = features.get(node)
          if (!cached) {
            const clone = node.cloneNode(true) as HTMLElement
            clone.querySelectorAll('.katex-mathml, button').forEach(item => item.remove())
            const text = clone.textContent ?? ''
            cached = { fingerprint: contentFingerprint(text), ...paragraphFeatures(text, node.querySelectorAll('.katex').length) }
            features.set(node, cached)
          }
          const bounds = node.getBoundingClientRect()
          const start = Math.max(0, Math.min(1, (top - bounds.top) / Math.max(1, bounds.height)))
          const end = Math.max(0, Math.min(1, (bottom - bounds.top) / Math.max(1, bounds.height)))
          return { key: `${index}:${cached.fingerprint}`, bounds, start, end, features: { words: cached.words, numbers: cached.numbers, formulas: cached.formulas } }
        }).filter(item => item.bounds.height > 0 && item.features.words >= 8)
      const visible = blocks.filter(item => item.end > item.start)
      const totalWeight = visible.reduce((sum, item) => sum + item.features.words * (item.end - item.start), 0)
      for (const block of visible) {
        const saved = observations.get(block.key)
        const observation = saved?.day === day ? saved : { seconds: 0, coverage: Array(20).fill(0), recorded: false, day }
        observation.seconds += seconds * block.features.words * (block.end - block.start) / Math.max(1, totalWeight)
        for (let bin = 0; bin < 20; bin++) if (bin / 20 >= block.start && (bin + 1) / 20 <= block.end) observation.coverage[bin] = 1
        observations.set(block.key, observation)
      }
      for (const block of blocks) {
        const observation = observations.get(block.key)
        if (observation && observation.day === day && !observation.recorded && block.bounds.bottom <= top && observation.seconds >= 15 && observation.coverage.reduce((a, b) => a + b, 0) >= 18) {
          samples.push({ ...block.features, seconds: observation.seconds, document: `${documentId}:${language}`, day })
          samples = samples.slice(-300)
          modelDirty = true
          observation.recorded = true
        }
      }
      if (modelDirty || modelDay !== day) { model = paragraphModel(samples, day); modelDay = day; modelDirty = false }
      if (!model || !visible.length) return null
      const activeModel = model
      const remaining = blocks.filter(block => block.bounds.bottom > top).reduce((sum, block) => sum + Math.max(0, activeModel.predict(block.features) - (observations.get(block.key)?.seconds ?? 0)), 0)
      const total = blocks.reduce((sum, block) => sum + activeModel.predict(block.features), 0)
      const current = Math.max(0, activeModel.predict(visible[0].features) - (observations.get(visible[0].key)?.seconds ?? 0))
      const minutes = (value: number) => Math.max(1, Math.ceil(value / 60))
      const uncertainty = model.provisional ? 'incertezza alta' : `incertezza: errore medio osservato ${Math.max(1, Math.ceil((model.validationError ?? 60) / 60))} min/blocco`
      return `Paragrafo: circa ${minutes(current)} min · Studio restante: circa ${minutes(remaining)} min · Totale: circa ${minutes(total)} min${model.provisional ? ' · provvisoria' : ' · ritmo personale'} (${uncertainty})`
    }
  }
}
