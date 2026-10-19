import type { PipelineFailureKind } from '../../../shared/archive'
import { GeminiError, type GeminiErrorCategory } from './geminiErrors'

const FAILURE_KINDS = {
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
} satisfies Record<GeminiErrorCategory, PipelineFailureKind>

/** Solo codici finiti e messaggi controllati attraversano IPC e checkpoint. */
export function pipelineFailureFromError(error: unknown): {
  success: false
  error: string
  failureKind: PipelineFailureKind
} {
  if (error instanceof GeminiError) {
    return {
      success: false,
      failureKind: FAILURE_KINDS[error.category],
      error:
        error.category === 'unknown'
          ? 'Errore imprevisto durante la comunicazione con Gemini.'
          : error.sanitizedMessage
    }
  }
  return {
    success: false,
    failureKind: 'unknown',
    error: 'Operazione non completata. Controlla l’archivio locale e riprova.'
  }
}
