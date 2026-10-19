import type { GeminiModel } from './archive'

export const QNA_PRIMARY_MODEL: GeminiModel = 'gemini-3.5-flash-lite'
export function getQnaModelFallbackChain(configuredModel?: GeminiModel) {
  const models = [...new Set<GeminiModel>([
    QNA_PRIMARY_MODEL, 'gemini-3.1-flash-lite', 'gemini-3.7-flash',
    ...(configuredModel ? [configuredModel] : []), 'gemini-3.5-flash', 'gemini-3.8-flash'
  ])]
  return { preferred: models[0], fallbacks: models.slice(1) }
}
