import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { GoogleGenAI } from '@google/genai'
import { GeminiService } from '../../electron/main/gemini'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'
import { GeminiTransport } from '../../electron/main/ai/geminiTransport'
import { DEFAULT_GEMINI_POLICY } from '../../electron/main/ai/geminiPolicy'
import { GeminiError, normalizeGeminiError } from '../../electron/main/ai/geminiErrors'
import { pipelineFailureFromError } from '../../electron/main/ai/pipelineFailure'
import { logger } from '../../electron/main/logger'
import { REPETITION_HEADINGS } from '../../shared/repetition'

vi.mock('../../electron/main/audioChunker', () => ({
  getAudioDuration: vi.fn(async () => 120),
  planSmartChunks: vi.fn(),
  extractChunkWav: vi.fn()
}))

const validText = Array.from({ length: 50 }, (_, i) => `synthetic${i}`).join(' ')
const keys = [
  { key: 'synthetic-project-a', id: 'key-0', quotaGroup: 'project-a' },
  { key: 'synthetic-project-b', id: 'key-1', quotaGroup: 'project-b' }
]

function clientFor(project: string) {
  const file = { name: `files/${project}`, uri: `https://example.invalid/${project}`, mimeType: 'audio/mp3', state: 'ACTIVE' }
  function assertOwnFile(uri: string) {
    if (uri !== file.uri) throw Object.assign(new Error('403 You do not have permission to access the File synthetic-private-id'), { status: 403 })
  }
  return {
    file,
    files: {
      upload: vi.fn(async () => file),
      get: vi.fn(async () => file),
      delete: vi.fn(async () => ({}))
    },
    interactions: {
      create: vi.fn(async (params: { input: Array<{ uri: string }> }) => {
        assertOwnFile(params.input[0].uri)
        return { output_text: validText }
      })
    },
    models: {
      generateContent: vi.fn(async (params: { model?: string; contents: Array<{ fileData?: { fileUri?: string } }> }) => {
        assertOwnFile(params.contents[0].fileData?.fileUri ?? '')
        return { text: validText }
      })
    }
  }
}

describe('Audio Gemini: proprietà dei file durante la rotazione', () => {
  let root: string
  let audio: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lezionify-audio-owner-'))
    audio = join(root, 'synthetic.mp3')
    await writeFile(audio, 'synthetic audio')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network forbidden in offline test'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(logger, 'info').mockImplementation(() => ({} as ReturnType<typeof logger.info>))
    vi.spyOn(logger, 'warn').mockImplementation(() => ({} as ReturnType<typeof logger.warn>))
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  function setup(maxTotalAttempts = 6) {
    const a = clientFor('project-a')
    const b = clientFor('project-b')
    const transport = new GeminiTransport()
    vi.spyOn(transport, 'getClient').mockImplementation(key => (key === keys[0].key ? a : b) as unknown as GoogleGenAI)
    const manager = new GeminiRequestManager(
      { ...DEFAULT_GEMINI_POLICY, rpmLimit: 100, maxTotalAttempts },
      transport,
      { now: () => Date.now(), sleep: async () => {} }
    )
    return { a, b, service: new GeminiService({ requestManager: manager }) }
  }

  it('dopo ASR vuoto e fallback 503 sulla prima chiave carica un file proprio per la seconda', async () => {
    const { a, b, service } = setup()
    a.interactions.create.mockResolvedValue({ output_text: '' })
    a.models.generateContent.mockRejectedValue(Object.assign(new Error('503 UNAVAILABLE'), { status: 503 }))
    await expect(service.transcribeAudioFile({ keys, audioFilePath: audio })).resolves.toBe(validText)
    expect(a.files.upload).toHaveBeenCalledTimes(1)
    expect(b.files.upload).toHaveBeenCalledTimes(1)
    expect(b.models.generateContent).toHaveBeenCalledTimes(1)
    expect(a.files.delete).toHaveBeenCalledWith(expect.objectContaining({ name: a.file.name }))
    expect(b.files.delete).toHaveBeenCalledWith(expect.objectContaining({ name: b.file.name }))
  })

  it('la rotazione ASR usa il file della chiave realmente tentata', async () => {
    const { a, b, service } = setup()
    a.interactions.create.mockRejectedValue(Object.assign(new Error('503 UNAVAILABLE'), { status: 503 }))
    await expect(service.transcribeAudioFile({ keys, audioFilePath: audio })).resolves.toBe(validText)
    expect(b.interactions.create).toHaveBeenCalledTimes(1)
    expect(a.models.generateContent).not.toHaveBeenCalled()
    expect(b.models.generateContent).not.toHaveBeenCalled()
    expect(b.files.upload).toHaveBeenCalledTimes(1)
    expect(b.files.delete).toHaveBeenCalledTimes(1)
  })

  it('un vero 403 del fallback resta strutturato fino alla pipeline, senza testo provider', async () => {
    const { a, service } = setup()
    a.interactions.create.mockResolvedValue({ output_text: '' })
    a.models.generateContent.mockRejectedValue(Object.assign(new Error('403 You do not have permission to access the File synthetic-private-id'), { status: 403 }))
    const error = await service.transcribeAudioFile({ keys, audioFilePath: audio }).catch(error => error)
    expect(error).toBeInstanceOf(GeminiError)
    expect(error.category).toBe('permission_denied')
    expect(pipelineFailureFromError(error)).toMatchObject({ success: false, failureKind: 'authentication' })
    expect(pipelineFailureFromError(error).error).not.toContain('synthetic-private-id')
    expect(a.files.delete).toHaveBeenCalledTimes(1)
  })

  it('un 403 durante il caricamento resta strutturato e non produce falso silenzio', async () => {
    const { a, service } = setup()
    a.files.upload.mockRejectedValue(Object.assign(new Error('403 Caller has no permission'), { status: 403 }))
    const error = await service.transcribeAudioFile({ keys, audioFilePath: audio }).catch(error => error)
    expect(error).toBeInstanceOf(GeminiError)
    expect(error.category).toBe('permission_denied')
    expect(a.interactions.create).not.toHaveBeenCalled()
    expect(a.models.generateContent).not.toHaveBeenCalled()
  })

  it('riusa il file della stessa chiave tra ASR e fallback', async () => {
    const { a, b, service } = setup()
    a.interactions.create.mockResolvedValue({ output_text: '' })
    await expect(service.transcribeAudioFile({ keys, audioFilePath: audio })).resolves.toBe(validText)
    expect(a.files.upload).toHaveBeenCalledTimes(1)
    expect(a.files.delete).toHaveBeenCalledTimes(1)
    expect(b.files.upload).not.toHaveBeenCalled()
  })

  it('RIPETERE conserva anche poche parole nel fallback e non forza la lingua inglese', async () => {
    const { a, service } = setup()
    a.interactions.create.mockResolvedValue({ output_text: '' })
    a.models.generateContent.mockResolvedValue({ text: 'Non ho capito.' })
    await expect(service.transcribeAudioFile({ keys, audioFilePath: audio, context: 'repetition', language: 'auto' })).resolves.toBe('Non ho capito.')
    const request = a.models.generateContent.mock.calls[0][0]
    expect(request.contents[1]).toContain('nella lingua originale, senza tradurre')
    expect(request.contents[1]).toContain('esitazioni')
    expect(request.contents[1]).not.toContain('taught in English')
  })

  it('RIPETERE invia riferimento, tratto e valutazione precedente tramite il gestore condiviso', async () => {
    const { a, service } = setup()
    const text = REPETITION_HEADINGS.map(title => `## ${title}\n\nEvidenza sintetica.`).join('\n\n')
    a.models.generateContent.mockResolvedValue({ text })
    const controller = new AbortController()
    await expect(service.evaluateRepetition({ keys, reference: 'Appunti sintetici', transcript: 'Ora mi correggo', previous: 'Prima avevo sbagliato', final: true,
      id: 'synthetic-repetition', signal: controller.signal })).resolves.toBe(text)
    expect(a.models.generateContent).toHaveBeenCalledWith(expect.objectContaining({
      contents: JSON.stringify({ appuntiDiRiferimento: 'Appunti sintetici', valutazionePrecedente: 'Prima avevo sbagliato', trattoSuccessivoDellaRipetizione: 'Ora mi correggo', ultimoTratto: true }),
      config: expect.objectContaining({ systemInstruction: expect.stringContaining('autocorrezione'), abortSignal: expect.any(AbortSignal) })
    }))
  })

  it('non presume accesso condiviso quando due chiavi hanno lo stesso quotaGroup', async () => {
    const { a, b, service } = setup()
    a.interactions.create.mockResolvedValue({ output_text: '' })
    a.models.generateContent.mockRejectedValue(Object.assign(new Error('503 UNAVAILABLE'), { status: 503 }))
    await expect(service.transcribeAudioFile({
      keys: keys.map(key => ({ ...key, quotaGroup: 'default-project' })), audioFilePath: audio
    })).resolves.toBe(validText)
    expect(b.files.upload).toHaveBeenCalledTimes(1)
  })

  it('dopo due 503 il recupero audio passa al modello di riserva senza ricaricare file della stessa chiave', async () => {
    const { a, b, service } = setup()
    a.interactions.create.mockResolvedValue({ output_text: '' })
    const models: string[] = []
    for (const client of [a, b]) {
      const original = client.models.generateContent.getMockImplementation()!
      client.models.generateContent.mockImplementation(async params => {
        models.push(params.model ?? '')
        if (params.model === 'gemini-3.8-flash') throw Object.assign(new Error('503 UNAVAILABLE'), { status: 503 })
        return original(params)
      })
    }
    await expect(service.transcribeAudioFile({ keys, audioFilePath: audio })).resolves.toBe(validText)
    expect(models).toEqual(['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.7-flash'])
    expect(a.files.upload).toHaveBeenCalledTimes(1)
    expect(b.files.upload).toHaveBeenCalledTimes(1)
  })

  it('una cancellazione dopo upload pulisce il file e non avvia il fallback', async () => {
    const { a, b, service } = setup()
    const controller = new AbortController()
    a.files.upload.mockImplementationOnce(async () => {
      controller.abort()
      return a.file
    })
    await expect(service.transcribeAudioFile({ keys, audioFilePath: audio, signal: controller.signal }))
      .rejects.toMatchObject({ category: 'cancelled' })
    expect(a.files.delete).toHaveBeenCalledTimes(1)
    expect(a.interactions.create).not.toHaveBeenCalled()
    expect(a.models.generateContent).not.toHaveBeenCalled()
    expect(b.files.upload).not.toHaveBeenCalled()
    expect(a.files.upload.mock.calls[0][0]).toMatchObject({ config: { abortSignal: expect.any(AbortSignal) } })
  })

  it('pulisce anche i file con metadati incompleti e conserva invalid_output', async () => {
    const { a, service } = setup()
    a.files.upload.mockResolvedValue({ ...a.file, uri: '' })
    await expect(service.transcribeAudioFile({ keys, audioFilePath: audio }))
      .rejects.toMatchObject({ category: 'invalid_output' })
    expect(a.files.delete).toHaveBeenCalled()
    expect(a.interactions.create).not.toHaveBeenCalled()
    expect(a.models.generateContent).not.toHaveBeenCalled()
  })

  it('un 403 durante get viene registrato e i file già caricati sono puliti', async () => {
    const { a, service } = setup()
    a.files.get.mockRejectedValue(Object.assign(new Error('403 Permission denied for File sensitive-file-id'), { status: 403 }))
    await expect(service.transcribeAudioFile({ keys, audioFilePath: audio }))
      .rejects.toMatchObject({ category: 'permission_denied', permissionReason: 'file_access' })
    expect(a.files.delete).toHaveBeenCalled()
    const results = vi.mocked(logger.warn).mock.calls.filter(call => call[2]?.includes('gemini_request_result'))
    expect(results.length).toBeGreaterThan(0)
    expect(JSON.parse(results[0][2]!)).toMatchObject({ permissionReason: 'file_access', statusCode: 403 })
    expect(JSON.stringify(results)).not.toContain('sensitive-file-id')
  })

  it.each([
    ['403 You do not have permission to access the File private-name', 'file_access'],
    ['403 Your project has been denied access. Please contact support.', 'project_access'],
    ['403 The caller does not have permission', 'unspecified']
  ])('distingue il motivo controllato di %s', (message, reason) => {
    const error = normalizeGeminiError(new Error(message))
    expect(error).toMatchObject({ category: 'permission_denied', permissionReason: reason, isRetryable: false })
    expect(error.sanitizedMessage).not.toContain('private-name')
  })

  it('registra perché serve il fallback senza persistere trascrizione o URI', async () => {
    const { a, service } = setup()
    a.interactions.create.mockResolvedValue({ output_text: '' })
    await service.transcribeAudioFile({ keys, audioFilePath: audio })
    const checks = vi.mocked(logger.info).mock.calls.filter(call => call[2]?.includes('asr_output_check'))
    expect(checks).toHaveLength(1)
    expect(JSON.parse(checks[0][2]!)).toMatchObject({ reason: 'empty', wordCount: 0, chunk: 1 })
    expect(JSON.stringify(checks)).not.toContain(validText)
    expect(JSON.stringify(checks)).not.toContain(a.file.uri)
  })
})
