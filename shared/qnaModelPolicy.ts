import type { GeminiModel } from './archive'

export const QNA_PRIMARY_MODEL: GeminiModel = 'gemini-3.5-flash-lite'
export const QNA_DEEP_MODELS: GeminiModel[] = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']
export function qnaThinkingConfig(model: string, thinkDeeper = false) {
  return thinkDeeper && QNA_DEEP_MODELS.some(candidate => candidate === model) ? { thinkingConfig: { thinkingLevel: 'HIGH' as const } } : {}
}
export function getQnaModelFallbackChain(configuredModel?: GeminiModel, thinkDeeper = false) {
  if (thinkDeeper) return { preferred: QNA_DEEP_MODELS[0], fallbacks: QNA_DEEP_MODELS.slice(1) }
  const primary = configuredModel === 'gemini-4-hydrogen' ? configuredModel : QNA_PRIMARY_MODEL
  const models = [...new Set<GeminiModel>([
    primary, QNA_PRIMARY_MODEL, 'gemini-3.1-flash-lite', 'gemini-3.7-flash',
    ...(configuredModel ? [configuredModel] : []), 'gemini-3.5-flash', 'gemini-3.8-flash'
  ])]
  return { preferred: models[0], fallbacks: models.slice(1) }
}
