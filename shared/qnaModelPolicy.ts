import type { GeminiModel } from './archive'

export const QNA_PRIMARY_MODEL: GeminiModel = 'gemini-3.5-flash-lite'
// Verified thinkingLevel on generateContent. Legacy 2.5 uses token budgets.
export const QNA_DEEP_MODELS: GeminiModel[] = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-4-hydrogen', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']
const budgets: Record<string, number> = { 'gemini-2.5-flash': 24576, 'gemini-2.5-flash-lite': 24576, 'gemini-2.5-pro': 32768 }
export function qnaThinkingConfig(model: string, thinkDeeper = false) {
  if (!thinkDeeper) return {}
  if (budgets[model]) return { thinkingConfig: { thinkingBudget: budgets[model] } }
  return QNA_DEEP_MODELS.some(candidate => candidate === model) ? { thinkingConfig: { thinkingLevel: 'HIGH' as const } } : {}
}
export function getQnaModelFallbackChain(configuredModel?: GeminiModel, thinkDeeper = false) {
  const primary = configuredModel ?? QNA_PRIMARY_MODEL
  const models = [...new Set<GeminiModel>([
    primary, QNA_PRIMARY_MODEL, 'gemini-3.1-flash-lite', 'gemini-3.7-flash',
    ...(configuredModel ? [configuredModel] : []), 'gemini-3.5-flash', 'gemini-3.8-flash'
  ])]
  const compatible = thinkDeeper ? models.filter(model => Boolean(qnaThinkingConfig(model, true).thinkingConfig)) : models
  // An unsupported explicitly selected model must never be silently replaced to enable thinking.
  return { preferred: primary, fallbacks: compatible.filter(model => model !== primary) }
}

export function qnaThinkingLabel(model: string, thinkDeeper = false): 'HIGH' | 'predefinito' {
  return qnaThinkingConfig(model, thinkDeeper).thinkingConfig ? 'HIGH' : 'predefinito'
}
