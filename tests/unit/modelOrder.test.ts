import { expect, it } from 'vitest'
import { getModelFallbackChain } from '../../electron/main/gemini'
import { getQnaModelFallbackChain } from '../../shared/qnaModelPolicy'

it('mantiene separato l ordine archivio dal Q&A e non cambia modello configurato', () => {
  expect(getModelFallbackChain()).toEqual({ preferred: 'gemini-3.7-flash', fallbacks: ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'] })
  const configured = getModelFallbackChain('gemini-3.8-flash')
  expect(configured.preferred).toBe('gemini-3.8-flash')
  expect(configured.fallbacks).not.toContain(configured.preferred)
  expect(getQnaModelFallbackChain('gemini-3.7-flash')).toEqual({ preferred: 'gemini-3.5-flash-lite', fallbacks: ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.8-flash'] })
})
