import { contentFingerprint } from './readingPosition'
import { paragraphFeatures, paragraphModel, type ParagraphFeatures, type ParagraphSample } from './paragraphEstimate'
import { formatLocalCalendarDate } from '../../shared/calendarDate'

const KEY = 'lezionify.paragraph-samples.v1'
interface Observation { seconds: number; coverage: number[]; recorded: boolean; day?: string; sampleKey?: string }
export interface ParagraphPrediction {
  remaining: number; total: number; current: number; position: number
  samples: number; documents: number; provisional: boolean; validationError: number | null
}
/** DOM observations measure exposure, not comprehension. No lesson text is persisted. */
export function observeParagraphs(documentId: string, language: string) {
  const observations = new Map<string, Observation>()
  const features = new WeakMap<HTMLElement, ParagraphFeatures & { fingerprint: string }>()
  let model: ReturnType<typeof paragraphModel> = null, modelDay = '', modelDirty = true
  let samples: ParagraphSample[] = []
  let prediction: ParagraphPrediction | null = null
  let lastReadingKey: string | null = null
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (Array.isArray(saved)) samples = saved.slice(-300).filter(item => item && typeof item.document === 'string' && typeof item.day === 'string').map(item => ({ document: item.document, day: item.day, words: item.words, numbers: item.numbers, formulas: item.formulas, seconds: item.seconds, boldWords: item.boldWords, position: item.position, note: item.note, key: item.key }))
  } catch { /* Optional. */ }
  const progressKey = `lezionify.paragraph-progress.v1:${documentId}:${language}`
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey) ?? '[]')
    if (Array.isArray(saved)) for (const entry of saved) {
      if (!Array.isArray(entry) || entry.length !== 2) continue
      const [key, item] = entry
      if (typeof key === 'string' && item && Number.isFinite(item.seconds) && item.seconds >= 0 &&
        typeof item.recorded === 'boolean' && Array.isArray(item.coverage) && item.coverage.length === 20 &&
        item.coverage.every((value: unknown) => value === 0 || value === 1)) observations.set(key, item)
    }
  } catch { /* Fresh progress. */ }
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(samples.slice(-300)))
      localStorage.setItem(progressKey, JSON.stringify([...observations]))
    } catch { /* Still usable in memory. */ }
  }
  return {
    save,
    reset: () => { observations.clear(); prediction = null; lastReadingKey = null; save() },
    prediction: () => prediction,
    tick(root: HTMLElement, seconds: number, mode: 'reading' | 'qna' = 'reading', anchor = ''): string | null {
      if (seconds <= 0 || seconds > 3) return null
      const day = formatLocalCalendarDate(new Date())
      const top = root.getBoundingClientRect().top + root.clientTop
      const bottom = top + root.clientHeight
      const documentBounds = root.querySelector('.markdown-body')?.getBoundingClientRect()
      const blocks = Array.from(root.querySelectorAll<HTMLElement>('.markdown-body > p, .markdown-body > ul, .markdown-body > ol, .markdown-body > pre, .markdown-body > blockquote, .markdown-body > table, .markdown-body > .markdown-alert'))
        .map((node, index) => {
          let cached = features.get(node)
          if (!cached) {
            const clone = node.cloneNode(true) as HTMLElement
            clone.querySelectorAll('.katex-mathml, button, code, .markdown-alert-header').forEach(item => item.remove())
            const text = clone.textContent ?? ''
            cached = { fingerprint: contentFingerprint(text), ...paragraphFeatures(text, node.querySelectorAll('.katex').length) }
            cached.boldWords = Array.from(clone.querySelectorAll('strong, b')).filter(element => !element.parentElement?.closest('strong, b')).reduce((sum, element) => sum + paragraphFeatures(element.textContent ?? '').words, 0)
            cached.note = node.matches('.markdown-alert-note') || /^(?:\u2139\uFE0F?\s*)?(?:nota|note)\b[\s:—-]/iu.test(text.trim())
            features.set(node, cached)
          }
          const bounds = node.getBoundingClientRect()
          const start = Math.max(0, Math.min(1, (top - bounds.top) / Math.max(1, bounds.height)))
          const end = Math.max(0, Math.min(1, (bottom - bounds.top) / Math.max(1, bounds.height)))
          return { node, key: `${index}:${cached.fingerprint}`, bounds, start, end, features: { words: cached.words, numbers: cached.numbers, formulas: cached.formulas, boldWords: cached.boldWords, note: cached.note, position: Math.max(0, Math.min(1, (bounds.top - (documentBounds?.top ?? bounds.top)) / Math.max(1, documentBounds?.height ?? 1))) } }
        }).filter(item => item.bounds.height > 0 && item.features.words >= 8)
      const visible = blocks.filter(item => item.end > item.start)
      if (mode === 'reading' && visible[0]) lastReadingKey = visible[0].key
      const normalizedAnchor = anchor.replace(/\s+/g, ' ').trim()
      const anchored = normalizedAnchor ? blocks.filter(item => (item.node.textContent ?? '').replace(/\s+/g, ' ').includes(normalizedAnchor)) : []
      const qnaBlock = anchored.length === 1 ? anchored[0] : blocks.find(item => item.key === lastReadingKey) ?? visible[0]
      const totalWeight = visible.reduce((sum, item) => sum + item.features.words * (item.end - item.start), 0)
      for (const block of mode === 'qna' ? (qnaBlock ? [qnaBlock] : []) : visible) {
        const saved = observations.get(block.key)
        const observation: Observation = saved?.day === day ? saved : { seconds: 0, coverage: Array(20).fill(0), recorded: false, day }
        observation.seconds += mode === 'qna' ? seconds : seconds * block.features.words * (block.end - block.start) / Math.max(1, totalWeight)
        if (mode === 'reading') for (let bin = 0; bin < 20; bin++) if (bin / 20 >= block.start && (bin + 1) / 20 <= block.end) observation.coverage[bin] = 1
        if (observation.recorded && observation.sampleKey) {
          const sample = samples.find(item => item.key === observation.sampleKey)
          if (sample) {
            // Persist every second; bound expensive cross-document retraining during long Q&A.
            if (Math.floor(sample.seconds / 15) !== Math.floor(observation.seconds / 15)) modelDirty = true
            sample.seconds = observation.seconds
          }
        }
        observations.set(block.key, observation)
      }
      for (const block of blocks) {
        const observation = observations.get(block.key)
        if (mode === 'reading' && observation && observation.day === day && !observation.recorded && block.bounds.bottom <= top && observation.seconds >= 15 && observation.coverage.reduce((a, b) => a + b, 0) >= 18) {
          observation.sampleKey = `${documentId}:${language}:${day}:${block.key}`
          const sample = { ...block.features, seconds: observation.seconds, document: `${documentId}:${language}`, day, key: observation.sampleKey }
          const previous = samples.findIndex(item => item.key === observation.sampleKey)
          if (previous >= 0) samples[previous] = sample
          else samples.push(sample)
          samples = samples.slice(-300)
          modelDirty = true
          observation.recorded = true
        }
      }
      if (modelDirty || modelDay !== day) { model = paragraphModel(samples, day); modelDay = day; modelDirty = false }
      if (!model || !visible.length) { prediction = null; return null }
      const activeModel = model
      const remaining = blocks.filter(block => block.bounds.bottom > top).reduce((sum, block) => sum + Math.max(0, activeModel.predict(block.features) - (observations.get(block.key)?.seconds ?? 0)), 0)
      const total = blocks.reduce((sum, block) => sum + activeModel.predict(block.features), 0)
      const active = mode === 'qna' && qnaBlock ? qnaBlock : visible[0]
      const current = Math.max(0, activeModel.predict(active.features) - (observations.get(active.key)?.seconds ?? 0))
      prediction = { remaining, total, current, position: visible[0].features.position,
        samples: model.samples, documents: model.documents, provisional: model.provisional, validationError: model.validationError }
      const minutes = (value: number) => Math.max(1, Math.ceil(value / 60))
      const uncertainty = model.provisional ? 'incertezza alta' : `incertezza: errore medio osservato ${Math.max(1, Math.ceil((model.validationError ?? 60) / 60))} min/blocco`
      return `Paragrafo: circa ${minutes(current)} min · Studio restante: circa ${minutes(remaining)} min · Totale: circa ${minutes(total)} min${model.provisional ? ' · provvisoria' : ' · ritmo personale'} (${uncertainty})`
    }
  }
}
