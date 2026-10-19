import { describe, expect, it } from 'vitest'
import type { PipelineFailureKind } from '../../shared/archive'
import {
  GeminiError,
  type GeminiErrorCategory
} from '../../electron/main/ai/geminiErrors'
import { pipelineFailureFromError } from '../../electron/main/ai/pipelineFailure'

const cases: Record<GeminiErrorCategory, PipelineFailureKind> = {
  authentication: 'authentication',
  permission_denied: 'authentication',
  quota_exhausted: 'quota_exhausted',
  rate_limited: 'rate_limited',
  network_error: 'network',
  service_unavailable: 'provider_unavailable',
  timeout: 'provider_unavailable',
  model_unavailable: 'provider_unavailable',
  invalid_request: 'input',
  invalid_output: 'input',
  cancelled: 'cancelled',
  unknown: 'unknown'
}
describe('Codici di fallimento della pipeline', () => {
  it.each(Object.entries(cases))('mappa %s a %s', (category, kind) => {
    const error = new GeminiError({
      category: category as GeminiErrorCategory,
      isRetryable: false,
      isDailyQuota: false,
      sanitizedMessage: 'Messaggio controllato'
    })
    expect(pipelineFailureFromError(error)).toMatchObject({
      success: false,
      failureKind: kind
    })
  })
  it('non classifica un 404 locale come errore modello e non espone testo arbitrario', () => {
    const failure = pipelineFailureFromError(
      new Error('404 file locale /sensitive/path')
    )
    expect(failure.failureKind).toBe('unknown')
    expect(failure.error).not.toContain('sensitive')
    expect(
      pipelineFailureFromError(
        new GeminiError({
          category: 'unknown',
          isRetryable: false,
          isDailyQuota: false,
          sanitizedMessage: 'secret arbitrary SDK text'
        })
      ).error
    ).not.toContain('secret')
  })
})
