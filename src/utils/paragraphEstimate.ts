export interface ParagraphFeatures { words: number; numbers: number; formulas: number }
export interface ParagraphSample extends ParagraphFeatures { document: string; day: string; seconds: number }
const median = (items: number[]) => { const sorted = [...items].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)] }
const weight = (item: ParagraphFeatures, factor: number) => Math.max(1, item.words + factor * (item.numbers + item.formulas * 8))
export function paragraphFeatures(text: string, formulas = 0): ParagraphFeatures {
  return { words: text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0, numbers: text.match(/\d+(?:[.,]\d+)?/g)?.length ?? 0, formulas }
}
export function paragraphModel(samples: ParagraphSample[], day: string) {
  const valid = samples.filter(item => Number.isFinite(item.seconds) && item.seconds >= 15 && item.seconds <= 7200 && Number.isFinite(item.words) && item.words >= 8 && Number.isFinite(item.numbers) && item.numbers >= 0 && Number.isFinite(item.formulas) && item.formulas >= 0)
  if (valid.length < 2 || valid.reduce((sum, item) => sum + item.seconds, 0) < 60) return null
  const documents = [...new Set(valid.map(item => item.document))]
  const error = (factor: number) => {
    const errors: number[] = []
    for (const document of documents) {
      const train = valid.filter(item => item.document !== document)
      if (!train.length) continue
      const rate = median(train.map(item => item.seconds / weight(item, factor)))
      for (const item of valid.filter(item => item.document === document)) errors.push(Math.abs(rate * weight(item, factor) - item.seconds))
    }
    return errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : Infinity
  }
  let factor = 0
  const baselineError = error(0)
  let validationError = baselineError
  if (documents.length >= 3 && valid.length >= 12) {
    for (const candidate of [0.5, 1, 2, 4]) {
      const candidateError = error(candidate)
      if (candidateError < validationError * 0.95) { factor = candidate; validationError = candidateError }
    }
  }
  const rate = median(valid.map(item => item.seconds / weight(item, factor)))
  const today = valid.filter(item => item.day === day)
  const adjustment = today.length >= 3 ? Math.max(0.5, Math.min(2, (median(today.map(item => item.seconds / weight(item, factor))) / rate - 1) * Math.min(0.7, today.length / 20) + 1)) : 1
  return { factor, samples: valid.length, documents: documents.length, provisional: documents.length < 3 || valid.length < 12,
    validationError: Number.isFinite(validationError) ? validationError : null, baselineError: Number.isFinite(baselineError) ? baselineError : null,
    predict: (features: ParagraphFeatures) => rate * weight(features, factor) * adjustment }
}
