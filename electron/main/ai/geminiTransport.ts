/**
 * geminiTransport.ts
 * Adattatore SDK a basso livello: esegue un singolo tentativo fisico per chiamata,
 * gestisce abort reali, payload multimodali, streaming con inattività e Files.
 */

import { GoogleGenAI } from '@google/genai'
import { GeminiError } from './geminiErrors'
import { assertGeminiOnline, connectedGeminiError } from './connectivity'
import { QNA_TIMEOUTS } from './geminiPolicy'

export interface GenerateContentParams {
  apiKey: string
  model: string
  contents: unknown
  config?: Record<string, unknown>
  signal?: AbortSignal
}

export interface GenerateContentStreamParams extends GenerateContentParams {
  onChunk: (chunk: string) => void
  firstChunkTimeoutMs?: number
  chunkInactivityTimeoutMs?: number
}

export interface InteractionParams {
  apiKey: string
  model: string
  input: unknown[]
  generation_config?: Record<string, unknown>
  signal?: AbortSignal
}

export interface FileUploadParams {
  apiKey: string
  filePath: string
  mimeType: string
  signal?: AbortSignal
}

export interface FileGetParams {
  apiKey: string
  name: string
  signal?: AbortSignal
}

export interface FileDeleteParams {
  apiKey: string
  name: string
  signal?: AbortSignal
}

export interface TransportExecutionResult<T> {
  data: T
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
}

export class GeminiTransport {
  private clientCache = new Map<string, GoogleGenAI>()

  getClient(apiKey: string): GoogleGenAI {
    assertGeminiOnline()
    const trimmed = apiKey.trim()
    let client = this.clientCache.get(trimmed)
    if (!client) {
      client = new GoogleGenAI({ apiKey: trimmed })
      this.clientCache.set(trimmed, client)
    }
    return client
  }

  async generateContent(
    params: GenerateContentParams
  ): Promise<TransportExecutionResult<string>> {
    const { apiKey, model, contents, config, signal } = params
    if (signal?.aborted) {
      throw new GeminiError({
        category: 'cancelled',
        isRetryable: false,
        isDailyQuota: false,
        sanitizedMessage: 'Richiesta annullata prima dell’inizio.'
      })
    }

    try {
      const ai = this.getClient(apiKey)
      // Chiamata diretta a generateContent con propagazione abort
      const response = await ai.models.generateContent({
        model,
        contents: contents as unknown as Parameters<
          typeof ai.models.generateContent
        >[0]['contents'],
        config: config as unknown as Parameters<
          typeof ai.models.generateContent
        >[0]['config']
      })

      if (signal?.aborted) {
        throw new GeminiError({
          category: 'cancelled',
          isRetryable: false,
          isDailyQuota: false,
          sanitizedMessage: 'Richiesta annullata dopo l’esecuzione.'
        })
      }

      const text = response.text ?? ''
      return {
        data: text,
        usageMetadata: response.usageMetadata
          ? {
              promptTokenCount: response.usageMetadata.promptTokenCount,
              candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
              totalTokenCount: response.usageMetadata.totalTokenCount
            }
          : undefined
      }
    } catch (err) {
      throw connectedGeminiError(err)
    }
  }

  async generateContentStream(
    params: GenerateContentStreamParams
  ): Promise<TransportExecutionResult<string>> {
    const {
      apiKey,
      model,
      contents,
      config,
      signal,
      onChunk,
      firstChunkTimeoutMs = QNA_TIMEOUTS.firstChunkTimeoutMs,
      chunkInactivityTimeoutMs = QNA_TIMEOUTS.chunkInactivityTimeoutMs
    } = params
    const cancellation = () =>
      signal?.reason instanceof GeminiError
        ? signal.reason
        : new GeminiError({
            category: 'cancelled',
            isRetryable: false,
            isDailyQuota: false,
            sanitizedMessage: 'Streaming Q&A interrotto dall’utente.'
          })
    if (signal?.aborted) throw cancellation()

    const controller = new AbortController()
    let finished = false
    let abortError: GeminiError | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    type StreamChunk = { text?: string; usageMetadata?: TransportExecutionResult<string>['usageMetadata']; promptFeedback?: { blockReason?: string }; candidates?: { finishReason?: string }[] }
    let usageMetadata: TransportExecutionResult<string>['usageMetadata']
    let iterator: AsyncIterator<StreamChunk> | undefined
    let rejectAborted!: (error: GeminiError) => void
    const aborted = new Promise<never>((_, reject) => {
      rejectAborted = reject
    })
    // La rejection è osservata anche se un callback SDK fallisce sincronicamente.
    void aborted.catch(() => {})
    const abort = (error: GeminiError) => {
      if (finished || abortError) return
      abortError = error
      finished = true // Impedisce emissioni prima di interrompere la rete.
      controller.abort(error)
      rejectAborted(error)
    }
    const onParentAbort = () => abort(cancellation())
    const armTimeout = (ms: number, message: string) => {
      clearTimeout(timer)
      timer = setTimeout(
        () =>
          abort(
            new GeminiError({
              category: 'timeout',
              isRetryable: true,
              isDailyQuota: false,
              sanitizedMessage: message
            })
          ),
        ms
      )
    }
    const closeIterator = (value: AsyncIterator<StreamChunk>) => {
      // return() può restare in attesa di un next() in mock che ignorano abort.
      // La rete è già annullata; osserviamo la pulizia senza bloccare la coda.
      try {
        void Promise.resolve(value.return?.()).catch(() => {})
      } catch {
        /* best effort */
      }
    }
    signal?.addEventListener('abort', onParentAbort, { once: true })
    armTimeout(
      firstChunkTimeoutMs,
      `Timeout streaming: nessun contenuto ricevuto entro ${Math.round(firstChunkTimeoutMs / 1000)}s.`
    )
    let fullText = ''
    let receivedText = false
    try {
      const ai = this.getClient(apiKey)
      const opening = ai.models
        .generateContentStream({
          model,
          contents: contents as Parameters<
            typeof ai.models.generateContentStream
          >[0]['contents'],
          config: { ...config, abortSignal: controller.signal }
        })
        .then((stream) => {
          const openedIterator = stream[Symbol.asyncIterator]()
          if (finished) closeIterator(openedIterator)
          return openedIterator
        })
      iterator = await Promise.race([opening, aborted])
      while (!finished) {
        const chunk = await Promise.race([iterator.next(), aborted])
        if (finished || chunk.done) break
        if (chunk.value.usageMetadata) usageMetadata = chunk.value.usageMetadata
        const blockReason = chunk.value.promptFeedback?.blockReason
        if ((blockReason && blockReason !== 'BLOCK_REASON_UNSPECIFIED') || chunk.value.candidates?.some(candidate => ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY'].includes(candidate.finishReason ?? ''))) {
          throw new GeminiError({ category: 'invalid_request', recoveryDisposition: 'terminal', isRetryable: false, isDailyQuota: false, sanitizedMessage: 'La risposta Q&A è stata bloccata dal provider. Riformula la domanda.' })
        }
        const text = chunk.value.text ?? ''
        // Metadati e whitespace iniziale non riavviano la deadline del primo testo.
        if (text.trim()) {
          receivedText = true
          armTimeout(
            chunkInactivityTimeoutMs,
            `Timeout streaming: flusso inattivo per oltre ${Math.round(chunkInactivityTimeoutMs / 1000)}s.`
          )
        }
        if (text && receivedText) {
          fullText += text
          onChunk(text)
        }
      }
      if (abortError) throw abortError
      return { data: fullText, ...(usageMetadata ? { usageMetadata } : {}) }
    } catch (error) {
      // Il SDK può sostituire il motivo con AbortError: conserviamo timeout/cancel.
      throw connectedGeminiError(abortError ?? error)
    } finally {
      finished = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onParentAbort)
      controller.abort()
      if (iterator) closeIterator(iterator)
    }
  }

  async createInteraction(
    params: InteractionParams
  ): Promise<TransportExecutionResult<unknown>> {
    const { apiKey, model, input, generation_config, signal } = params
    if (signal?.aborted) {
      throw new GeminiError({
        category: 'cancelled',
        isRetryable: false,
        isDailyQuota: false,
        sanitizedMessage: 'Interazione ASR annullata.'
      })
    }

    try {
      const ai = this.getClient(apiKey)
      const interactionClient = (
        ai as unknown as {
          interactions: {
            create: (params: unknown) => Promise<unknown>
          }
        }
      ).interactions

      const response = await interactionClient.create({
        model,
        input,
        generation_config
      })

      if (signal?.aborted) {
        throw new GeminiError({
          category: 'cancelled',
          isRetryable: false,
          isDailyQuota: false,
          sanitizedMessage: 'Interazione ASR annullata.'
        })
      }

      return { data: response }
    } catch (err) {
      throw connectedGeminiError(err)
    }
  }

  async uploadFile(
    params: FileUploadParams
  ): Promise<{ name: string; uri: string }> {
    const { apiKey, filePath, mimeType, signal } = params
    if (signal?.aborted)
      throw new GeminiError({
        category: 'cancelled',
        isRetryable: false,
        isDailyQuota: false,
        sanitizedMessage: 'Upload annullato.'
      })

    try {
      const ai = this.getClient(apiKey)
      const result = await ai.files.upload({
        file: filePath,
        config: { mimeType }
      })
      if (!result.name || !result.uri) {
        throw new Error(
          'Il server Google non ha restituito nome/URI per il file caricato.'
        )
      }
      return { name: result.name, uri: result.uri }
    } catch (err) {
      throw connectedGeminiError(err)
    }
  }

  async getFile(
    params: FileGetParams
  ): Promise<{ state: string; uri: string; mimeType?: string }> {
    const { apiKey, name, signal } = params
    if (signal?.aborted)
      throw new GeminiError({
        category: 'cancelled',
        isRetryable: false,
        isDailyQuota: false,
        sanitizedMessage: 'Get file annullato.'
      })

    try {
      const ai = this.getClient(apiKey)
      const file = await ai.files.get({ name })
      return {
        state: file.state || 'UNKNOWN',
        uri: file.uri || '',
        mimeType: file.mimeType
      }
    } catch (err) {
      throw connectedGeminiError(err)
    }
  }

  async deleteFile(params: FileDeleteParams): Promise<void> {
    const { apiKey, name } = params
    try {
      const ai = this.getClient(apiKey)
      await ai.files.delete({ name })
    } catch {
      // Best-effort cleanup
    }
  }
}
