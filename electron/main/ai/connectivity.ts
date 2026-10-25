import { GeminiError, normalizeGeminiError } from './geminiErrors'

let isOnline = () => true

export function configureGeminiConnectivity(check: () => boolean) {
  isOnline = check
}

export function assertGeminiOnline() {
  if (!isOnline())
    throw new GeminiError({
      category: 'network_error',
      isRetryable: false,
      isDailyQuota: false,
      recoveryDisposition: 'terminal',
      sanitizedMessage: 'Non c’è connessione Internet. Riconnettiti e riprova.'
    })
}

export function connectedGeminiError(error: unknown): GeminiError {
  const normalized = normalizeGeminiError(error)
  if (
    normalized.category === 'network_error' ||
    normalized.category === 'timeout'
  ) {
    try {
      assertGeminiOnline()
    } catch (offline) {
      return offline as GeminiError
    }
  }
  return normalized
}
