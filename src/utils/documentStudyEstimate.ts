import { countLectureWords } from '../../shared/lectureLength'
import { formatLocalCalendarDate } from '../../shared/calendarDate'
import { paragraphFeatures, paragraphModel, type ParagraphSample } from './paragraphEstimate'

/** Coarse whole-document preview; never credits time or changes the learned model. */
export function documentStudyEstimate(markdown: string, samples: ParagraphSample[], day = formatLocalCalendarDate()): string | null {
  const model = paragraphModel(samples, day)
  if (!model || !markdown.trim()) return null
  const blocks = markdown.replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[^]*?^[ \t]*\1[ \t]*(?:\n|$)/gm, '').split(/\n\s*\n/)
  const seconds = blocks.reduce((sum, text, index) => {
    const features = paragraphFeatures(text)
    features.words = countLectureWords(text)
    features.formulas = (text.match(/\$\$[^]*?\$\$|\$[^\n$]+\$|\\\([^]*?\\\)|\\\[[^]*?\\\]/g) ?? []).length
    features.position = index / Math.max(1, blocks.length)
    return features.words >= 8 ? sum + model.predict(features) : sum
  }, 0)
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  const minutes = Math.ceil(seconds / 60)
  const duration = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`
  return `Studio totale: circa ${duration}${model.provisional ? ' · provvisorio' : ''}`
}

export function readDocumentStudyEstimate(markdown: string): string | null {
  try {
    const samples = JSON.parse(localStorage.getItem('lezionify.paragraph-samples.v1') ?? '[]')
    return Array.isArray(samples) ? documentStudyEstimate(markdown, samples.filter(item => item && typeof item.document === 'string')) : null
  } catch { return null }
}
