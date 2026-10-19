/**
 * geminiRequestManager.ts
 * Gestore globale unificato per le richieste Gemini in Lezionify.
 * Implementa scheduler a concorrenza 1, finestra mobile 60s per RPM,
 * gruppi di quota progetto, budget di tentativi fisici, cooldown e priorità equa.
 */

import {
  GeminiPolicyConfig,
  DEFAULT_GEMINI_POLICY,
  RequestPurpose,
  RequestPriority,
  TIMEOUTS_BY_PURPOSE
} from './geminiPolicy'
import { GeminiError, normalizeGeminiError } from './geminiErrors'
import { GeminiTransport } from './geminiTransport'
import { logger } from '../logger'
import { createHash } from 'node:crypto'

export interface Clock {
  now(): number
  sleep(ms: number, signal?: AbortSignal): Promise<void>
}

export const defaultClock: Clock = {
  now: () => Date.now(),
  sleep: (ms: number, signal?: AbortSignal) => {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new GeminiError({ category: 'cancelled', isRetryable: false, isDailyQuota: false, sanitizedMessage: 'Attesa annullata.' }))
        return
      }
      const isTest = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true')
      const actualMs = isTest ? Math.min(ms, 15) : ms
      const timer = setTimeout(resolve, actualMs)
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(new GeminiError({ category: 'cancelled', isRetryable: false, isDailyQuota: false, sanitizedMessage: 'Attesa annullata.' }))
        },
        { once: true }
      )
    })
  }
}

export interface KeyConfig {
  key: string
  quotaGroup?: string
  /** False for legacy keys whose common default does not identify a real project. */
  quotaGroupKnown?: boolean
  id?: string
}

export interface RequestAttemptInfo {
  attempt: number
  keyIndex: number
  keyId?: string
  keyAlias: string
  quotaGroup: string
  model: string
}

export interface LogicalRequestOptions<T> {
  jobId: string
  requestId?: string
  purpose: RequestPurpose
  priority?: RequestPriority
  keys: KeyConfig[]
  preferredModel: string
  fallbackModels?: string[]
  /** Interactive Q&A can advance immediately when a model produces no usable answer. */
  preferModelFallback?: boolean
  signal?: AbortSignal
  timeoutMs?: number
  call: (apiKey: string, model: string, attemptSignal: AbortSignal) => Promise<T>
  onAttempt?: (info: RequestAttemptInfo) => void
  onRetry?: (attempt: number, delayMs: number, reason: string, keyIndex: number) => void
  onWaitRateLimit?: (delayMs: number, reason: string) => void
}

interface QueuedItem {
  id: string
  priority: RequestPriority
  enqueuedAt: number
  run: () => Promise<void>
  abort: (err: Error) => void
  signal?: AbortSignal
}

interface RequestTelemetry {
  startedAt: number
  physicalAttempts: number
  keysUsed: Map<string, number>
  modelsUsed: Set<string>
}

export class GeminiRequestManager {
  private policy: GeminiPolicyConfig
  private transport: GeminiTransport
  private clock: Clock

  // Concorrenza
  private activeCount = 0
  private queue: QueuedItem[] = []
  private consecutiveInteractiveServed = 0

  // Finestra mobile RPM: Map<"${quotaGroup}:${model}", timestamp[]>
  private requestTimestamps = new Map<string, number[]>()
  private lastRequestStartTime = new Map<string, number>()

  // Cooldowns: Map<"${quotaGroup}:${model}", cooldownTimestamp>
  private cooldowns = new Map<string, number>()
  private dailySuspendedGroupModels = new Set<string>()

  // Consecutive model failures: Map<model, number>
  private modelConsecutiveFailures = new Map<string, number>()
  private modelCooldowns = new Map<string, number>()

  constructor(
    policy: GeminiPolicyConfig = DEFAULT_GEMINI_POLICY,
    transport: GeminiTransport = new GeminiTransport(),
    clock: Clock = defaultClock
  ) {
    this.policy = { ...policy }
    this.transport = transport
    this.clock = clock
  }

  getPolicy(): GeminiPolicyConfig {
    return { ...this.policy }
  }

  setRpmLimit(rpm: number): void {
    if (rpm > 0) this.policy.rpmLimit = rpm
  }

  getTransport(): GeminiTransport {
    return this.transport
  }

  private getKeyAlias(keyConfig: KeyConfig, keyIndex: number): string {
    const configuredIndex = /^key-(\d+)$/.exec(keyConfig.id || '')
    const displayIndex = configuredIndex
      ? Number(configuredIndex[1]) + 1
      : keyIndex + 1
    return `Chiave ${displayIndex}`
  }

  private writeTelemetry(
    level: 'info' | 'warn',
    event: string,
    fields: Record<string, unknown>,
    readableMessage?: string
  ): void {
    const details = JSON.stringify({ event, ...fields })
    const context = `[${String(fields.purpose || 'Gemini')} · ${String(fields.requestId || fields.actionId)}]`
    const attempt = `Tentativo ${String(fields.physicalAttempt)} · ${String(fields.keyAlias)} · modello ${String(fields.model)}`
    const message = readableMessage ?? (
      event === 'gemini_request_summary'
        ? `Riepilogo Gemini: ${fields.outcome === 'success' ? 'completato' : 'fallito'}; ${String(fields.physicalRequests)} tentativi, ${String(fields.distinctKeysUsed)} chiavi, modelli ${String(fields.modelsUsed)}; durata ${Math.round(Number(fields.durationMs) / 1000)} s${fields.errorCategory ? `; motivo: ${String(fields.errorCategory)}` : ''}.`
        : event === 'gemini_request_attempt'
          ? `${attempt}: invio richiesta (tentativo ${String(fields.keyModelAttempt)} su questa chiave/modello).`
          : `${attempt}: ${fields.outcome === 'success' ? 'riuscito' : `fallito (${String(fields.errorCategory)}${fields.statusCode ? `, HTTP ${String(fields.statusCode)}` : ''})`}; durata ${Math.round(Number(fields.durationMs) / 1000)} s.`
    )
    logger[level]('gemini-api', `${context} ${message}`, details)
  }

  private logRequestSummary<T>(
    options: LogicalRequestOptions<T>,
    telemetry: RequestTelemetry,
    outcome: 'success' | 'failed',
    error?: GeminiError
  ): void {
    const requestsByKey = Object.fromEntries(telemetry.keysUsed)
    const keysUsed = [...telemetry.keysUsed.keys()]
    this.writeTelemetry(outcome === 'success' ? 'info' : 'warn', 'gemini_request_summary', {
      actionId: options.jobId,
      requestId: options.requestId || options.jobId,
      purpose: options.purpose,
      outcome,
      physicalRequests: telemetry.physicalAttempts,
      distinctKeysUsed: keysUsed.length,
      keysUsed,
      requestsByKey,
      modelsUsed: [...telemetry.modelsUsed],
      durationMs: Math.max(0, this.clock.now() - telemetry.startedAt),
      errorCategory: error?.category,
      dailyQuotaExhausted: error?.isDailyQuota || false
    })
  }

  private getGroupKey(quotaGroup: string, model: string): string {
    return `${quotaGroup || 'unknown-project'}:${model}`
  }

  private getDailyQuotaKey(config: KeyConfig, model: string): string {
    // Unknown projects still share RPM/cooldowns. A daily error only proves
    // exhaustion for the key actually tried; do not invent project membership.
    const scope = config.quotaGroupKnown === false
      ? `unverified-key:${createHash('sha256').update(config.key.trim()).digest('hex')}`
      : config.quotaGroup || 'unknown-project'
    return this.getGroupKey(scope, model)
  }

  /**
   * Pulisce i timestamp fuori dalla finestra mobile di 60s
   */
  private cleanSlidingWindow(groupKey: string, now: number): number[] {
    const list = this.requestTimestamps.get(groupKey) || []
    const windowStart = now - 60_000
    const filtered = list.filter((t) => t > windowStart)
    this.requestTimestamps.set(groupKey, filtered)
    return filtered
  }

  /**
   * Calcola quanto attendere prima di poter effettuare una richiesta (rispetto a cooldown e RPM)
   */
  private getWaitTimeMs(quotaGroup: string, model: string): { waitMs: number; reason: string } {
    const now = this.clock.now()
    const groupKey = this.getGroupKey(quotaGroup, model)

    // 1. Cooldown specifico per quotaGroup:model
    const cooldownEnd = this.cooldowns.get(groupKey) ?? 0
    if (cooldownEnd > now) {
      return { waitMs: cooldownEnd - now, reason: 'Cooldown per limite di frequenza.' }
    }

    // 2. Cooldown di disponibilità modello
    const modelCooldownEnd = this.modelCooldowns.get(model) ?? 0
    if (modelCooldownEnd > now) {
      return { waitMs: modelCooldownEnd - now, reason: `Modello ${model} temporaneamente non disponibile.` }
    }

    // 3. Finestra mobile 60s per RPM
    const recent = this.cleanSlidingWindow(groupKey, now)
    if (recent.length >= this.policy.rpmLimit) {
      // Dobbiamo attendere che il timestamp più vecchio esca dai 60s
      const oldest = recent[0]
      const waitMs = Math.max(0, oldest + 60_000 - now + 50)
      return { waitMs, reason: `Raggiunto limite di ${this.policy.rpmLimit} richieste/minuto.` }
    }

    // 4. Pacing minimo tra partenze (per evitare raffiche simultanee)
    const minInterval = Math.round(60_000 / this.policy.rpmLimit)
    const lastStart = this.lastRequestStartTime.get(groupKey) ?? 0
    const timeSinceLast = now - lastStart
    if (timeSinceLast < minInterval && recent.length > 0) {
      return { waitMs: minInterval - timeSinceLast, reason: 'Pacing anti-raffica per rispetto RPM.' }
    }

    return { waitMs: 0, reason: '' }
  }

  private recordRequestStart(quotaGroup: string, model: string): void {
    const now = this.clock.now()
    const groupKey = this.getGroupKey(quotaGroup, model)
    const list = this.cleanSlidingWindow(groupKey, now)
    list.push(now)
    this.requestTimestamps.set(groupKey, list)
    this.lastRequestStartTime.set(groupKey, now)
  }

  private openCooldown(quotaGroup: string, model: string, durationMs: number): void {
    const now = this.clock.now()
    const groupKey = this.getGroupKey(quotaGroup, model)
    const current = this.cooldowns.get(groupKey) ?? 0
    this.cooldowns.set(groupKey, Math.max(current, now + durationMs))
  }

  private handleFailure(quotaGroup: string, model: string, error: GeminiError, dailyQuotaKey: string): void {
    const now = this.clock.now()
    if (error.isDailyQuota) {
      this.dailySuspendedGroupModels.add(dailyQuotaKey)
      return
    }

    if (error.category === 'rate_limited') {
      const wait = error.retryDelayMs && error.retryDelayMs > 0 ? error.retryDelayMs : 15_000
      this.openCooldown(quotaGroup, model, wait)
    }

    if (error.category === 'model_unavailable') {
      const fails = (this.modelConsecutiveFailures.get(model) || 0) + 1
      this.modelConsecutiveFailures.set(model, fails)
      if (fails >= 3) {
        const cooldownSec = Math.min(120, 30 * Math.pow(2, fails - 3))
        this.modelCooldowns.set(model, now + cooldownSec * 1000)
      }
    }
  }

  private handleSuccess(quotaGroup: string, model: string): void {
    const groupKey = this.getGroupKey(quotaGroup, model)
    this.cooldowns.delete(groupKey)
    this.modelConsecutiveFailures.delete(model)
    this.modelCooldowns.delete(model)
  }

  /**
   * Esegue una richiesta logica rispettando lo scheduler globale
   */
  async execute<T>(options: LogicalRequestOptions<T>): Promise<T> {
    if (options.keys.length === 0) {
      this.writeTelemetry('warn', 'gemini_recovery_stopped', {
        actionId: options.jobId, requestId: options.requestId || options.jobId,
        purpose: options.purpose, errorCategory: 'authentication', physicalRequests: 0
      }, 'Nessuna chiave API disponibile: elaborazione interrotta prima di inviare richieste.')
      throw new GeminiError({
        category: 'authentication',
        isRetryable: false,
        isDailyQuota: false,
        sanitizedMessage: 'Nessuna chiave API Gemini disponibile.'
      })
    }

    const priority = options.priority || 'background'
    const deadline = this.clock.now() + (options.timeoutMs ?? this.policy.logicalDeadlineMs)
    const telemetry: RequestTelemetry = {
      startedAt: this.clock.now(),
      physicalAttempts: 0,
      keysUsed: new Map<string, number>(),
      modelsUsed: new Set<string>()
    }

    return new Promise<T>((resolve, reject) => {
      const lifecycle = (event: string, message: string, fields: Record<string, unknown> = {}) =>
        this.writeTelemetry('info', event, {
          actionId: options.jobId, requestId: options.requestId || options.jobId,
          purpose: options.purpose, ...fields
        }, message)
      const queuedItem: QueuedItem = {
        id: options.requestId || options.jobId,
        priority,
        enqueuedAt: this.clock.now(),
        signal: options.signal,
        run: async () => {
          lifecycle('gemini_queue_started', 'Richiesta estratta dalla coda: avvio elaborazione.', {
            queuedMs: Math.max(0, this.clock.now() - telemetry.startedAt)
          })
          try {
            const result = await this.runLogicalRequest(options, deadline, telemetry)
            this.logRequestSummary(options, telemetry, 'success')
            resolve(result)
          } catch (err) {
            this.logRequestSummary(
              options,
              telemetry,
              'failed',
              normalizeGeminiError(err)
            )
            reject(err)
          }
        },
        abort: (err: Error) => {
          lifecycle('gemini_queue_cancelled', 'Richiesta annullata in coda: nessuna chiamata inviata.')
          this.logRequestSummary(options, telemetry, 'failed', normalizeGeminiError(err))
          reject(err)
        }
      };

      if (options.signal?.aborted) {
        lifecycle('gemini_queue_cancelled', 'Richiesta già annullata: accodamento interrotto.')
        reject(new GeminiError({ category: 'cancelled', isRetryable: false, isDailyQuota: false, sanitizedMessage: 'Richiesta annullata prima dell’accodamento.' }))
        return
      }

      this.enqueue(queuedItem)
      lifecycle('gemini_queue_enqueued', `Richiesta accodata con priorità ${priority}; ${this.queue.length} richieste in coda, ${this.activeCount} attive.`, {
        priority, queueLength: this.queue.length, activeCount: this.activeCount,
        models: [options.preferredModel, ...(options.fallbackModels || [])],
        keyCount: options.keys.length, maxTotalAttempts: this.policy.maxTotalAttempts
      })
      this.processQueue()
    })
  }

  private enqueue(item: QueuedItem): void {
    if (item.priority === 'interactive') {
      // Inserisci prima dei background ma dopo eventuali altri interattivi già in coda
      const firstBackgroundIdx = this.queue.findIndex((q) => q.priority === 'background')
      if (firstBackgroundIdx === -1) {
        this.queue.push(item)
      } else {
        this.queue.splice(firstBackgroundIdx, 0, item)
      }
    } else {
      this.queue.push(item)
    }

    if (item.signal) {
      item.signal.addEventListener(
        'abort',
        () => {
          const idx = this.queue.indexOf(item)
          if (idx !== -1) {
            this.queue.splice(idx, 1)
            item.abort(new GeminiError({ category: 'cancelled', isRetryable: false, isDailyQuota: false, sanitizedMessage: 'Richiesta annullata mentre era in coda.' }))
          }
        },
        { once: true }
      )
    }
  }

  private dequeueNext(): QueuedItem | undefined {
    if (this.queue.length === 0) return undefined

    // Starvation check: se sono stati serviti 3 interattivi consecutivi e c'è un background in attesa
    if (this.consecutiveInteractiveServed >= 3) {
      const bgIndex = this.queue.findIndex((q) => q.priority === 'background')
      if (bgIndex !== -1) {
        this.consecutiveInteractiveServed = 0
        return this.queue.splice(bgIndex, 1)[0]
      }
    }

    const item = this.queue.shift()
    if (item?.priority === 'interactive') {
      this.consecutiveInteractiveServed++
    } else {
      this.consecutiveInteractiveServed = 0
    }
    return item
  }

  private async processQueue(): Promise<void> {
    if (this.activeCount >= this.policy.concurrencyLimit) return
    const item = this.dequeueNext()
    if (!item) return

    if (item.signal?.aborted) {
      item.abort(new GeminiError({ category: 'cancelled', isRetryable: false, isDailyQuota: false, sanitizedMessage: 'Richiesta annullata.' }))
      this.processQueue()
      return
    }

    this.activeCount++
    try {
      await item.run()
    } finally {
      this.activeCount--
      this.processQueue()
    }
  }

  private async runLogicalRequest<T>(
    options: LogicalRequestOptions<T>,
    deadline: number,
    telemetry: RequestTelemetry
  ): Promise<T> {
    const models = [options.preferredModel, ...(options.fallbackModels || [])]
    const keyConfigs = options.keys
    const step = (event: string, message: string, fields: Record<string, unknown> = {}, level: 'info' | 'warn' = 'info') =>
      this.writeTelemetry(level, event, {
        actionId: options.jobId, requestId: options.requestId || options.jobId,
        purpose: options.purpose, ...fields
      }, message)

    let totalPhysicalAttempts = 0
    // Il limite locale serve a evitare retry infiniti sulla stessa coppia
    // chiave/modello. Tenerlo solo per chiave rendeva irraggiungibili i
    // fallback successivi nel caso comune di un singolo progetto.
    const attemptsPerKeyModel = new Map<string, number>()
    let lastError: GeminiError | null = null

    // È un budget assoluto per la richiesta logica, non un valore minimo.
    // Moltiplicarlo per chiavi e modelli permetteva a un pool grande di
    // consumare decine di chiamate prima di restituire un errore.
    const effectiveMaxAttempts = this.policy.maxTotalAttempts

    // Itera tra modelli e chiavi
    for (const model of models) {
      if (totalPhysicalAttempts >= effectiveMaxAttempts) break
      step('gemini_model_selected', `Provo modello ${model} (${models.indexOf(model) + 1}/${models.length}); ${effectiveMaxAttempts - totalPhysicalAttempts} tentativi disponibili.`, { model })
      let keyPointer = 0
      let consecutiveSkippedKeys = 0
      const excludedKeys = new Set<string>()
      let consecutive503Count = 0

      while (
        totalPhysicalAttempts < effectiveMaxAttempts &&
        consecutiveSkippedKeys < keyConfigs.length
      ) {
        if (options.signal?.aborted) {
          step('gemini_request_stopped', 'Elaborazione annullata: interrompo i tentativi.', { model }, 'warn')
          throw new GeminiError({
            category: 'cancelled',
            isRetryable: false,
            isDailyQuota: false,
            sanitizedMessage: 'Richiesta annullata.'
          })
        }

        const now = this.clock.now()
        if (now >= deadline) {
          step('gemini_request_stopped', 'Tempo massimo della richiesta raggiunto: interrompo i tentativi.', { model }, 'warn')
          throw new GeminiError({
            category: 'timeout',
            isRetryable: true,
            isDailyQuota: false,
            sanitizedMessage: 'Deadline logica della richiesta superata.'
          }, lastError)
        }

        const currentKeyIdx = keyPointer % keyConfigs.length
        const keyConfig = keyConfigs[currentKeyIdx]
        const apiKey = keyConfig.key
        const quotaGroup = keyConfig.quotaGroup || 'unknown-project'
        const keyId = `${quotaGroup}:${apiKey.slice(-6)}`
        const groupModelKey = this.getDailyQuotaKey(keyConfig, model)
        const keyModelId = `${keyId}:${model}`
        const keyAlias = this.getKeyAlias(keyConfig, currentKeyIdx)

        if (excludedKeys.has(keyId) || this.dailySuspendedGroupModels.has(groupModelKey)) {
          const skipReason = this.dailySuspendedGroupModels.has(groupModelKey)
            ? keyConfig.quotaGroupKnown === false ? 'quota giornaliera della chiave/modello esaurita; progetto non verificato' : 'quota giornaliera del progetto/modello esaurita'
            : 'chiave esclusa per autenticazione'
          step('gemini_key_skipped', `${keyAlias}, modello ${model}: salto la chiave (${skipReason}).`, { keyAlias, model, reason: skipReason })
          if (this.dailySuspendedGroupModels.has(groupModelKey) && !lastError) {
            lastError = new GeminiError({
              category: 'quota_exhausted',
              statusCode: 429,
              isRetryable: false,
              isDailyQuota: true,
              sanitizedMessage:
                'Quota giornaliera del modello o del progetto esaurita su Google AI Studio.'
            })
          }
          keyPointer++
          consecutiveSkippedKeys++
          continue
        }

        let keyAttempts = attemptsPerKeyModel.get(keyModelId) || 0
        if (keyAttempts >= this.policy.maxAttemptsPerKey) {
          step('gemini_key_skipped', `${keyAlias}, modello ${model}: raggiunto il limite di ${this.policy.maxAttemptsPerKey} tentativi; controllo la chiave successiva.`, { keyAlias, model, reason: 'attempt_limit' })
          keyPointer++
          consecutiveSkippedKeys++
          continue
        }

        // Controllo RPM e cooldown per questa coppia gruppo:modello
        const { waitMs, reason } = this.getWaitTimeMs(quotaGroup, model)
        if (waitMs > 0) {
          if (this.clock.now() + waitMs > deadline) {
            step('gemini_request_stopped', `${keyAlias}, modello ${model}: attesa di ${Math.ceil(waitMs / 1000)} s oltre il tempo massimo; interrompo.`, { keyAlias, model, waitMs }, 'warn')
            throw new GeminiError({
              category: 'timeout',
              isRetryable: true,
              isDailyQuota: false,
              sanitizedMessage: `Attesa di rate limit (${Math.round(waitMs / 1000)}s) supera il tempo massimo consentito.`
            }, lastError)
          }
          if (options.onWaitRateLimit) {
            options.onWaitRateLimit(waitMs, reason)
          }
          step('gemini_wait_started', `${keyAlias}, modello ${model}: attendo ${Math.ceil(waitMs / 1000)} s. ${reason}`, { keyAlias, model, waitMs, reason })
          await this.clock.sleep(waitMs, options.signal)
          step('gemini_wait_finished', `${keyAlias}, modello ${model}: attesa terminata; ricontrollo limiti e disponibilità.`, { keyAlias, model })
          continue
        }

        // Tentativo fisico su questa chiave
        keyPointer++
        consecutiveSkippedKeys = 0
        totalPhysicalAttempts++
        keyAttempts++
        attemptsPerKeyModel.set(keyModelId, keyAttempts)
        this.recordRequestStart(quotaGroup, model)

        telemetry.physicalAttempts++
        telemetry.keysUsed.set(
          keyAlias,
          (telemetry.keysUsed.get(keyAlias) || 0) + 1
        )
        telemetry.modelsUsed.add(model)
        const attemptStartedAt = this.clock.now()
        this.writeTelemetry('info', 'gemini_request_attempt', {
          actionId: options.jobId,
          requestId: options.requestId || options.jobId,
          purpose: options.purpose,
          physicalAttempt: totalPhysicalAttempts,
          keyModelAttempt: keyAttempts,
          keyAlias,
          quotaGroup,
          model,
          outcome: 'started'
        })
        options.onAttempt?.({
          attempt: totalPhysicalAttempts,
          keyIndex: currentKeyIdx,
          keyId: keyConfig.id,
          keyAlias,
          quotaGroup,
          model
        })

        const attemptAbortController = new AbortController()
        const onParentAbort = () => attemptAbortController.abort(options.signal?.reason)
        if (options.signal) {
          options.signal.addEventListener('abort', onParentAbort, { once: true })
        }

        const attemptTimeout = TIMEOUTS_BY_PURPOSE[options.purpose] || 180_000
        const attemptTimer = setTimeout(() => {
          step('gemini_attempt_timeout', `Tentativo ${totalPhysicalAttempts}, ${keyAlias}, modello ${model}: timeout dopo ${attemptTimeout / 1000} s; richiesta di interruzione inviata.`, { keyAlias, model, physicalAttempt: totalPhysicalAttempts, attemptTimeout }, 'warn')
          attemptAbortController.abort(new GeminiError({
            category: 'timeout', isRetryable: true, isDailyQuota: false,
            sanitizedMessage: 'Tempo limite del tentativo Gemini superato.'
          }))
        }, attemptTimeout)

        try {
          const result = await options.call(
            apiKey,
            model,
            attemptAbortController.signal
          )
          clearTimeout(attemptTimer)
          if (options.signal) {
            options.signal.removeEventListener('abort', onParentAbort)
          }
          this.handleSuccess(quotaGroup, model)
          this.writeTelemetry('info', 'gemini_request_result', {
            actionId: options.jobId,
            requestId: options.requestId || options.jobId,
            purpose: options.purpose,
            physicalAttempt: totalPhysicalAttempts,
            keyAlias,
            quotaGroup,
            model,
            outcome: 'success',
            durationMs: Math.max(0, this.clock.now() - attemptStartedAt)
          })
          return result
        } catch (rawError) {
          clearTimeout(attemptTimer)
          if (options.signal) {
            options.signal.removeEventListener('abort', onParentAbort)
          }

          const normalized = normalizeGeminiError(rawError)
          const error = normalized.recoveryDisposition !== 'terminal' &&
            normalized.category === 'cancelled' &&
            attemptAbortController.signal.reason instanceof GeminiError
              ? attemptAbortController.signal.reason
              : normalized
          lastError = error
          this.handleFailure(quotaGroup, model, error, groupModelKey)
          this.writeTelemetry('warn', 'gemini_request_result', {
            actionId: options.jobId,
            requestId: options.requestId || options.jobId,
            purpose: options.purpose,
            physicalAttempt: totalPhysicalAttempts,
            keyAlias,
            quotaGroup,
            model,
            outcome: 'failed',
            durationMs: Math.max(0, this.clock.now() - attemptStartedAt),
            errorCategory: error.category,
            ...(error.permissionReason ? { permissionReason: error.permissionReason } : {}),
            statusCode: error.statusCode,
            retryable: error.isRetryable,
            dailyQuotaExhausted: error.isDailyQuota,
            retryDelayMs: error.retryDelayMs
          })

          if (error.recoveryDisposition === 'terminal' || options.signal?.aborted || error.category === 'cancelled') {
            step('gemini_recovery_stopped', `${keyAlias}, modello ${model}: errore terminale o annullamento; nessun retry o fallback.`, { keyAlias, model, errorCategory: error.category }, 'warn')
            throw error
          }

          if (options.purpose === 'qna' && options.preferModelFallback && ['service_unavailable', 'model_unavailable', 'network_error', 'timeout', 'invalid_output'].includes(error.category)) {
            step('gemini_model_abandoned', `Modello ${model} senza risposta utilizzabile: passo alle alternative.`, { model, errorCategory: error.category }, 'warn')
            break
          }

          if (!error.isRetryable) {
            if (error.category === 'authentication') {
              step('gemini_key_excluded', `${keyAlias}: autenticazione fallita; escludo questa chiave per il modello ${model} e controllo le altre.`, { keyAlias, model }, 'warn')
              excludedKeys.add(keyId)
              continue
            }
            if (error.category === 'quota_exhausted') {
              const scope = keyConfig.quotaGroupKnown === false
                ? 'sospendo questa chiave; il progetto delle altre non è verificato'
                : 'sospendo tutte le chiavi dello stesso progetto per questo modello'
              step('gemini_quota_suspended', `${keyAlias}, modello ${model}: quota giornaliera esaurita; ${scope} e controllo le alternative.`, { keyAlias, model }, 'warn')
              this.dailySuspendedGroupModels.add(groupModelKey)
              continue
            }
            if (error.category === 'model_unavailable') {
              step('gemini_model_abandoned', `Modello ${model} non disponibile: interrompo i tentativi su questo modello.`, { model }, 'warn')
              break
            }
            step('gemini_recovery_stopped', `${keyAlias}, modello ${model}: errore non ritentabile (${error.category}); interrompo l'elaborazione.`, { keyAlias, model, errorCategory: error.category }, 'warn')
            throw error
          }

          // Se il modello restituisce 503 (sovraccarico lato server Google) per 2 tentativi
          // e abbiamo modelli di riserva (fallback), passiamo subito al modello successivo
          if (error.category === 'service_unavailable') {
            consecutive503Count++
            const hasFallbackModel = models.indexOf(model) < models.length - 1
            if (consecutive503Count >= 2 && hasFallbackModel) {
              step('gemini_model_abandoned', `Modello ${model} saturo: ${consecutive503Count} errori consecutivi di indisponibilità; interrompo i tentativi su questo modello.`, { model, consecutive503Count }, 'warn')
              break
            }
          } else {
            consecutive503Count = 0
          }

          // Errore ritentabile (429, 503, network, timeout): backoff
          const delayHint = error.retryDelayMs ?? 0
          const exponentialDelay =
            this.policy.backoffBaseMs * Math.pow(2, keyAttempts - 1)
          const delayMs = Math.max(delayHint, Math.min(this.policy.backoffCapMs, exponentialDelay))

          if (options.onRetry) {
            options.onRetry(totalPhysicalAttempts, delayMs, error.sanitizedMessage, currentKeyIdx)
          }

          // Se abbiamo altre chiavi valide disponibili, passiamo alla prossima chiave ruotando
          const otherAvailableKeys = keyConfigs.some((kc, idx) => {
            const kid = `${kc.quotaGroup || 'unknown-project'}:${kc.key.slice(-6)}`
             const keyModel = `${kid}:${model}`
             return idx !== currentKeyIdx && !excludedKeys.has(kid) && (attemptsPerKeyModel.get(keyModel) || 0) < this.policy.maxAttemptsPerKey
          })

          if (otherAvailableKeys) {
            step('gemini_key_rotation', `Tentativo ${totalPhysicalAttempts} fallito con ${keyAlias}, modello ${model}: provo un'altra chiave; eventuali attese dipendono dalle quote del progetto.`, { keyAlias, model, errorCategory: error.category })
            continue
          }

          if (this.clock.now() + delayMs >= deadline) {
            step('gemini_request_stopped', `Modello ${model}: attesa di retry di ${Math.ceil(delayMs / 1000)} s oltre il tempo massimo; interrompo.`, { keyAlias, model, delayMs }, 'warn')
            throw new GeminiError({
              category: 'timeout',
              isRetryable: true,
              isDailyQuota: false,
              sanitizedMessage: 'Tempo massimo superato durante il backoff.'
            }, error)
          }

          step('gemini_retry_wait', `${keyAlias}, modello ${model}: attendo ${Math.ceil(delayMs / 1000)} s prima di ricontrollare il prossimo tentativo (${error.category}).`, { keyAlias, model, delayMs, errorCategory: error.category })
          await this.clock.sleep(delayMs, options.signal)
          step('gemini_retry_ready', `${keyAlias}, modello ${model}: attesa di retry terminata.`, { keyAlias, model })
        }
      }
      const nextModel = models[models.indexOf(model) + 1]
      if (nextModel && totalPhysicalAttempts < effectiveMaxAttempts) {
        step('gemini_model_fallback', `Passo dal modello ${model} al modello ${nextModel}: il precedente non ha completato la richiesta.`, { model, nextModel, errorCategory: lastError?.category })
      }
    }

    step('gemini_attempts_exhausted', `Nessuna alternativa utilizzabile: ${totalPhysicalAttempts}/${effectiveMaxAttempts} tentativi eseguiti; ${totalPhysicalAttempts >= effectiveMaxAttempts ? 'budget totale esaurito' : 'modelli e chiavi disponibili esauriti'}.`, { physicalAttempts: totalPhysicalAttempts, maxTotalAttempts: effectiveMaxAttempts }, 'warn')
    throw lastError || new GeminiError({
      category: 'unknown',
      isRetryable: false,
      isDailyQuota: false,
      sanitizedMessage: 'Tentativi esauriti senza successo.'
    })
  }
}
