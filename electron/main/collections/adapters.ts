import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { rename } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import type { AppSettings } from '../../../shared/archive'
import type { GeminiService } from '../gemini'
import { getModelFallbackChain } from '../gemini'
import type { GeminiRequestManager, KeyConfig } from '../ai/geminiRequestManager'
import { GeminiError } from '../ai/geminiErrors'
import { getFfmpegPath } from '../ffmpegPath'
import { COLLECTION_SYSTEM } from './profiles'
import type { CollectionsDependencies } from './service'

const execFileAsync = promisify(execFile)
const mapSchema = { type: 'object', required: ['themes'], properties: { themes: { type: 'array', items: { type: 'object', required: ['title', 'passageIds'], properties: { title: { type: 'string' }, passageIds: { type: 'array', items: { type: 'integer' } } } } } } }
const sectionSchema = { type: 'object', required: ['markdown', 'quotes'], properties: { markdown: { type: 'string' }, quotes: { type: 'array', items: { type: 'object', required: ['text', 'passageId'], properties: { text: { type: 'string' }, passageId: { type: 'integer' } } } } } }
export function collectionAdapters(deps: {
  settings(): Promise<AppSettings>
  keys(): Promise<KeyConfig[]>
  gemini: GeminiService
  manager: GeminiRequestManager
}): CollectionsDependencies {
  return {
    model: async () => (await deps.settings()).model,
    prepareAudio: async (source, destination, signal) => {
      const temporary = `${destination}.pending.mp3`
      try {
        await execFileAsync(getFfmpegPath(), ['-nostdin', '-y', '-i', source, '-vn', '-ac', '1', '-ar', '16000', '-codec:a', 'libmp3lame', '-q:a', '4', temporary], { signal, windowsHide: true, maxBuffer: 1024 * 1024 })
      } catch { throw new Error('Impossibile preparare l’audio. Controlla il file o riprendi il lavoro.') }
      if (signal.aborted) throw new Error('Annullato.')
      await rename(temporary, destination)
    },
    transcribe: async (source, checkpointId, signal, onProgress) => {
      const [settings, keys] = await Promise.all([deps.settings(), deps.keys()])
      return deps.gemini.transcribeAudioFile({ keys: settings.autoRotateOnQuota ? keys : keys.slice(0, 1), audioFilePath: source, lectureId: checkpointId, signal, onProgress, language: 'auto', context: 'collection' })
    },
    complete: async (prompt, model, signal, map) => {
      const [settings, keys] = await Promise.all([deps.settings(), deps.keys()])
      if (!keys.length) throw new Error('Configura una chiave Gemini nelle Impostazioni.')
      const chain = getModelFallbackChain(model)
      return deps.manager.execute({
        jobId: `collections-${randomUUID()}`, purpose: map ? 'overview' : 'sections', priority: 'background',
        keys: settings.autoRotateOnQuota ? keys : keys.slice(0, 1), preferredModel: chain.preferred, fallbackModels: chain.fallbacks, signal,
        call: async (key, actualModel, attemptSignal) => {
          const response = await deps.manager.getTransport().getClient(key).models.generateContent({
            model: actualModel, contents: prompt,
            config: { abortSignal: attemptSignal, temperature: 0.2, responseMimeType: 'application/json', responseJsonSchema: map ? mapSchema : sectionSchema, systemInstruction: COLLECTION_SYSTEM }
          })
          if (attemptSignal.aborted) throw new GeminiError({ category: 'cancelled', isRetryable: false, isDailyQuota: false, sanitizedMessage: 'Elaborazione interrotta.' })
          if (response.candidates?.[0]?.finishReason !== 'STOP' || !response.text?.trim()) throw new GeminiError({ category: 'invalid_output', isRetryable: false, isDailyQuota: false, sanitizedMessage: 'Scheda incompleta. Puoi riprendere il lavoro.' })
          const usage = response.usageMetadata
          return { text: response.text, model: actualModel, usage: usage ? { model: actualModel, inputTokens: usage.promptTokenCount ?? 0, outputTokens: usage.candidatesTokenCount ?? 0, totalTokens: usage.totalTokenCount ?? 0 } : undefined }
        }
      })
    }
  }
}
