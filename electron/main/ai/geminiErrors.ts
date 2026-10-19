/**
 * geminiErrors.ts
 * Normalizzazione errori Gemini, parsing attese e messaggi sanitizzati per Lezionify.
 */

export type GeminiErrorCategory =
  | 'rate_limited'
  | 'quota_exhausted'
  | 'service_unavailable'
  | 'network_error'
  | 'timeout'
  | 'authentication'
  | 'permission_denied'
  | 'model_unavailable'
  | 'invalid_request'
  | 'invalid_output'
  | 'cancelled'
  | 'unknown'

export interface NormalizedErrorDetails {
  permissionReason?: 'file_access' | 'project_access' | 'unspecified'
  recoveryDisposition?: 'policy' | 'terminal'
  category: GeminiErrorCategory
  statusCode?: number
  retryDelayMs?: number
  isRetryable: boolean
  isDailyQuota: boolean
  sanitizedMessage: string
}

export class GeminiError extends Error {
  readonly permissionReason?: NormalizedErrorDetails['permissionReason']
  readonly recoveryDisposition: 'policy' | 'terminal'
  readonly category: GeminiErrorCategory
  readonly statusCode?: number
  readonly retryDelayMs?: number
  readonly isRetryable: boolean
  readonly isDailyQuota: boolean
  readonly sanitizedMessage: string

  constructor(details: NormalizedErrorDetails, originalError?: unknown) {
    super(details.sanitizedMessage, { cause: originalError })
    this.name = 'GeminiError'
    this.permissionReason = details.permissionReason
    this.recoveryDisposition = details.recoveryDisposition ?? 'policy'
    this.category = details.category
    this.statusCode = details.statusCode
    this.retryDelayMs = details.retryDelayMs
    this.isRetryable = details.isRetryable
    this.isDailyQuota = details.isDailyQuota
    this.sanitizedMessage = details.sanitizedMessage
  }
}

/**
 * Parsing robusto dei suggerimenti di attesa (Retry-After, Please retry in, google.rpc.RetryInfo).
 */
export function parseRetryDelayMs(error: unknown): number {
  if (!error) return 0

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>

    const details = Array.isArray(errObj.errorDetails)
      ? errObj.errorDetails
      : Array.isArray(errObj.details)
        ? errObj.details
        : []

    for (const item of details) {
      if (typeof item === 'object' && item !== null) {
        const d = item as Record<string, unknown>
        if (
          d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' ||
          'retryDelay' in d
        ) {
          const delay = parseDelayValue(d.retryDelay)
          if (delay > 0) return delay
        }
      }
    }

    if ('retryDelay' in errObj) {
      const delay = parseDelayValue(errObj.retryDelay)
      if (delay > 0) return delay
    }

    const headers =
      (errObj.response as Record<string, unknown> | undefined)?.headers ??
      errObj.headers
    if (headers) {
      const retryAfter =
        typeof (headers as { get?: (name: string) => string | null }).get === 'function'
          ? (headers as { get: (name: string) => string | null }).get('retry-after')
          : (headers as Record<string, unknown>)['retry-after'] ??
            (headers as Record<string, unknown>)['Retry-After']
      if (retryAfter !== undefined && retryAfter !== null) {
        const delay = parseHttpRetryAfter(String(retryAfter))
        if (delay > 0) return delay
      }
    }
  }

  const msg =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : String(error)

  const jsonRetryMatch = msg.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?s?)"/i)
  if (jsonRetryMatch) {
    const delay = parseDelayValue(jsonRetryMatch[1])
    if (delay > 0) return delay
  }

  const textMatch = msg.match(/retry(?:ing)?\s+(?:in|after)[\s:]*(\d+(?:\.\d+)?)\s*(s|sec|seconds|ms|milliseconds)?/i)
  if (textMatch) {
    const val = parseFloat(textMatch[1])
    const unit = (textMatch[2] || 's').toLowerCase()
    if (Number.isFinite(val) && val > 0) {
      return unit.startsWith('ms') ? Math.round(val) : Math.round(val * 1000)
    }
  }

  const headerMatch = msg.match(/retry-after[\s:]+(\d+(?:\.\d+)?)/i)
  if (headerMatch) {
    const val = parseFloat(headerMatch[1])
    if (Number.isFinite(val) && val > 0) {
      return Math.round(val * 1000)
    }
  }

  return 0
}

function parseDelayValue(val: unknown): number {
  if (typeof val === 'string') {
    const m = val.trim().match(/^(\d+(?:\.\d+)?)\s*(s|ms)?$/i)
    if (m) {
      const num = parseFloat(m[1])
      const unit = (m[2] || 's').toLowerCase()
      if (Number.isFinite(num) && num > 0) {
        return unit === 'ms' ? Math.round(num) : Math.round(num * 1000)
      }
    }
  } else if (typeof val === 'number') {
    if (Number.isFinite(val) && val > 0) {
      return Math.round(val * 1000)
    }
  } else if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>
    const seconds = typeof obj.seconds === 'number' ? obj.seconds : parseInt(String(obj.seconds || '0'), 10)
    const nanos = typeof obj.nanos === 'number' ? obj.nanos : parseInt(String(obj.nanos || '0'), 10)
    if (Number.isFinite(seconds) && seconds >= 0) {
      const ms = seconds * 1000 + (Number.isFinite(nanos) && nanos > 0 ? Math.round(nanos / 1_000_000) : 0)
      if (ms > 0) return ms
    }
  }
  return 0
}

function parseHttpRetryAfter(headerVal: string): number {
  const trimmed = headerVal.trim()
  const seconds = parseFloat(trimmed)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000)
  }
  const dateMs = Date.parse(trimmed)
  if (!Number.isNaN(dateMs)) {
    const diff = dateMs - Date.now()
    return diff > 0 ? diff : 0
  }
  return 0
}

/**
 * Normalizza qualsiasi errore in un GeminiError categorizzato con messaggio sanitizzato.
 */
export function normalizeGeminiError(error: unknown): GeminiError {
  if (error instanceof GeminiError) return error

  let statusCode: number | undefined
  const rawMsg = error instanceof Error ? error.message : String(error || '')

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>
    if (typeof errObj.status === 'number') statusCode = errObj.status
    else if (typeof errObj.statusCode === 'number') statusCode = errObj.statusCode
    else if (typeof errObj.code === 'number') statusCode = errObj.code
  }

  if (!statusCode) {
    const statusMatch = rawMsg.match(/\b(400|401|403|404|429|500|502|503|504)\b/)
    if (statusMatch) statusCode = parseInt(statusMatch[1], 10)
  }

  const retryDelayMs = parseRetryDelayMs(error)
  const isCancelled =
    rawMsg.includes('annullata') ||
    rawMsg.includes('aborted') ||
    rawMsg.includes('AbortError') ||
    (error instanceof Error && error.name === 'AbortError')

  if (isCancelled) {
    return new GeminiError({
      category: 'cancelled',
      statusCode,
      isRetryable: false,
      isDailyQuota: false,
      sanitizedMessage: 'Richiesta annullata dall’utente o interrotta.'
    }, error)
  }

  const isTimeout =
    rawMsg.includes('Timeout') ||
    rawMsg.includes('deadline') ||
    rawMsg.includes('ETIMEDOUT')

  if (isTimeout) {
    return new GeminiError({
      category: 'timeout',
      statusCode,
      retryDelayMs,
      isRetryable: true,
      isDailyQuota: false,
      sanitizedMessage: 'Tempo limite della richiesta superato. Il server Google ha impiegato troppo tempo.'
    }, error)
  }

  const isDailyQuota =
    /perday|quota.*day|daily.*quota|exceeded.*day/i.test(rawMsg) ||
    /GenerateRequestsPerDay/i.test(rawMsg)

  if (statusCode === 429 || isDailyQuota || /RESOURCE_EXHAUSTED|rate.*limit/i.test(rawMsg)) {
    if (isDailyQuota) {
      return new GeminiError({
        category: 'quota_exhausted',
        statusCode: statusCode || 429,
        retryDelayMs,
        isRetryable: false,
        isDailyQuota: true,
        sanitizedMessage: 'Quota giornaliera del modello o del progetto esaurita su Google AI Studio.'
      }, error)
    }
    const waitSec = retryDelayMs > 0 ? Math.ceil(retryDelayMs / 1000) : 0
    const waitText = waitSec > 0 ? ` Riprova tra circa ${waitSec}s.` : ''
    return new GeminiError({
      category: 'rate_limited',
      statusCode: 429,
      retryDelayMs,
      isRetryable: true,
      isDailyQuota: false,
      sanitizedMessage: `Limite di richieste al minuto (RPM) temporaneamente superato.${waitText}`
    }, error)
  }

  if (
    statusCode === 503 ||
    statusCode === 502 ||
    statusCode === 504 ||
    statusCode === 500 ||
    /UNAVAILABLE|Overloaded|high demand|overloaded/i.test(rawMsg)
  ) {
    return new GeminiError({
      category: 'service_unavailable',
      statusCode: statusCode || 503,
      retryDelayMs,
      isRetryable: true,
      isDailyQuota: false,
      sanitizedMessage: 'Server Google temporaneamente sovraccarico o non disponibile. Riprova tra poco.'
    }, error)
  }

  if (/fetch failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|network error/i.test(rawMsg)) {
    return new GeminiError({
      category: 'network_error',
      statusCode,
      isRetryable: true,
      isDailyQuota: false,
      sanitizedMessage: 'Errore di connessione di rete verso i server di Google Gemini.'
    }, error)
  }

  if (statusCode === 401 || /unauthenticated|invalid api key|api key not valid/i.test(rawMsg)) {
    return new GeminiError({
      category: 'authentication',
      statusCode: 401,
      isRetryable: false,
      isDailyQuota: false,
      sanitizedMessage: 'Chiave API Gemini non valida o priva di autorizzazione.'
    }, error)
  }

  if (statusCode === 403 || /permission denied|forbidden/i.test(rawMsg)) {
    const permissionReason = /\bfile\b|file[_ ]?uri|file[_ ]?data/i.test(rawMsg)
      ? 'file_access'
      : /project.*(?:denied|permission|access)|(?:denied|permission).*project/i.test(rawMsg)
        ? 'project_access'
        : 'unspecified'
    return new GeminiError({
      category: 'permission_denied',
      permissionReason,
      statusCode: 403,
      isRetryable: false,
      isDailyQuota: false,
      sanitizedMessage: permissionReason === 'file_access'
        ? 'Accesso negato al file caricato su Google: verifica i permessi della chiave usata per il caricamento e la trascrizione.'
        : 'Accesso negato: verifica i permessi o la fatturazione del progetto Google Cloud.'
    }, error)
  }

  if (statusCode === 404 || /model.*(?:not found|unavailable|unsupported)/i.test(rawMsg)) {
    return new GeminiError({
      category: 'model_unavailable',
      statusCode: 404,
      isRetryable: false,
      isDailyQuota: false,
      sanitizedMessage: 'Il modello richiesto non è al momento disponibile o non esiste per questo account.'
    }, error)
  }

  if (statusCode === 400 || /invalid argument|bad request/i.test(rawMsg)) {
    return new GeminiError({
      category: 'invalid_request',
      statusCode: 400,
      isRetryable: false,
      isDailyQuota: false,
      sanitizedMessage: 'Parametri della richiesta non validi.'
    }, error)
  }

  return new GeminiError({
    category: 'unknown',
    statusCode,
    isRetryable: false,
    isDailyQuota: false,
    sanitizedMessage: 'Errore imprevisto durante la comunicazione con Gemini.'
  }, error)
}
