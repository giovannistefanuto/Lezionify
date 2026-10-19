import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  GeminiService,
  parseRetryDelayMs
} from '../../electron/main/gemini'
import { ArchiveService } from '../../electron/main/archive'
import { GoogleGenAI, createPartFromUri } from '@google/genai'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'
import { GeminiTransport } from '../../electron/main/ai/geminiTransport'
import { DEFAULT_GEMINI_POLICY } from '../../electron/main/ai/geminiPolicy'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

vi.mock('../../electron/main/audioChunker', () => ({
  getAudioDuration: vi.fn(async () => 120),
  planSmartChunks: vi.fn(async () => [{ start: 0, end: 120 }]),
  extractChunkWav: vi.fn(async () => {})
}))

describe('Fase A — Regressioni Bug Critici Gemini (R1, R2, R5)', () => {
  describe('R5 — Parsing robusto di Retry-After e tempi di attesa', () => {
    it('riconosce "Please retry in 42.5s"', () => {
      const err = new Error('Resource exhausted. Please retry in 42.5s')
      expect(parseRetryDelayMs(err)).toBe(42500)
    })

    it('riconosce "Please retry in 17.382021571s" con frazioni elevate', () => {
      const err = new Error('Quota exceeded: Please retry in 17.382021571s')
      expect(parseRetryDelayMs(err)).toBe(17382)
    })

    it('riconosce "retry after 12.5s" e "retry-after: 30"', () => {
      expect(parseRetryDelayMs('Rate limit hit. retry after 12.5s')).toBe(12500)
      expect(parseRetryDelayMs('Service Unavailable. retry-after: 30')).toBe(30000)
    })

    it('riconosce google.rpc.RetryInfo nei dettagli strutturati dell’errore', () => {
      const errWithDetails = {
        message: 'Resource exhausted',
        errorDetails: [
          {
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: '25.5s'
          }
        ]
      }
      expect(parseRetryDelayMs(errWithDetails)).toBe(25500)
    })

    it('riconosce google.rpc.RetryInfo con formato seconds e nanos', () => {
      const errWithNanos = {
        message: 'Resource exhausted',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: { seconds: 15, nanos: 500000000 }
          }
        ]
      }
      expect(parseRetryDelayMs(errWithNanos)).toBe(15500)
    })

    it('riconosce Retry-After negli header HTTP dell’errore', () => {
      const errWithHeaders = {
        message: 'Too Many Requests',
        headers: {
          'retry-after': '45'
        }
      }
      expect(parseRetryDelayMs(errWithHeaders)).toBe(45000)
    })

    it('ignora numeri casuali o testo non correlato e restituisce 0', () => {
      expect(parseRetryDelayMs('Error 429: something went wrong')).toBe(0)
      expect(parseRetryDelayMs('Model returned 503 errors on port 8080')).toBe(0)
      expect(parseRetryDelayMs(null)).toBe(0)
      expect(parseRetryDelayMs(undefined)).toBe(0)
      expect(parseRetryDelayMs(new Error('Generic failure'))).toBe(0)
    })
  })

  describe('R1 — Payload multimodale del fallback audio', () => {
    it('createPartFromUri produce la struttura corretta fileData richiesta dallo SDK', () => {
      const part = createPartFromUri('https://generativelanguage.googleapis.com/v1beta/files/test-123', 'audio/mp3')
      expect(part).toEqual({
        fileData: {
          fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/test-123',
          mimeType: 'audio/mp3'
        }
      })
      // Verifica che non sia un oggetto vuoto
      expect(Object.keys(part)).toContain('fileData')
      expect(part.fileData.fileUri).toBe('https://generativelanguage.googleapis.com/v1beta/files/test-123')
    })

    it('lo SDK @google/genai serializza fileData in parts nel corpo HTTP effettivo (nessuna parte vuota)', async () => {
      const ai = new GoogleGenAI({ apiKey: 'test-fake-key' })
      let capturedBody: any = null

      const originalFetch = global.fetch
      global.fetch = vi.fn(async (_url: any, opts: any) => {
        capturedBody = JSON.parse(opts.body)
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Trascrizione di fallback recuperata' }]
                }
              }
            ]
          })
        } as any
      })

      try {
        const audioPart = createPartFromUri('files/sample-uri', 'audio/wav')
        await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [audioPart, 'Prompt trascrizione']
        })

        expect(capturedBody).not.toBeNull()
        const userContent = capturedBody.contents?.[0]
        expect(userContent).toBeDefined()
        const parts = userContent.parts
        expect(parts).toHaveLength(2)

        // Verifichiamo che la prima parte contenga fileData e NON sia vuota {}
        expect(parts[0]).toEqual({
          fileData: {
            fileUri: 'files/sample-uri',
            mimeType: 'audio/wav'
          }
        })
        expect(parts[0]).not.toEqual({})
        expect(parts[1]).toEqual({ text: 'Prompt trascrizione' })
      } finally {
        global.fetch = originalFetch
      }
    })
  })

  describe('R2 — Gestione errori ASR vs assenza di parlato (No Fake Silence)', () => {
    let tempDir: string

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'lezionify-phase-a-'))
    })

    afterEach(async () => {
      vi.restoreAllMocks()
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    })

    it('quando sia gemini-3.5-transcribe sia il fallback multimodale falliscono con errore API, lancia errore e NON restituisce finto silenzio', async () => {
      let virtualTime = 1_000_000
      const clock = { now: () => virtualTime, sleep: async (ms: number) => { virtualTime += ms } }
      const requestManager = new GeminiRequestManager(DEFAULT_GEMINI_POLICY, new GeminiTransport(), clock)
      const gemini = new GeminiService({ requestManager })
      const dummyAudio = join(tempDir, 'sample.mp3')
      await writeFile(dummyAudio, 'dummy audio binary content')

      // Simula fallimento sia di ASR primario sia di fallback
      vi.spyOn(global, 'fetch').mockImplementation(async () => {
        return {
          ok: false,
          status: 503,
          headers: new Headers(),
          text: async () => '503 Service Unavailable'
        } as any
      })

      const callPromise = gemini.transcribeAudioFile({
        apiKey: 'fake-test-key',
        audioFilePath: dummyAudio
      })

      // Deve fallire rigettando la promessa con l'errore API reale, NON restituire "[Nessun parlato rilevato...]"
      await expect(callPromise).rejects.toMatchObject({ category: 'service_unavailable', statusCode: 503 })
    })

    it('ArchiveService consegna una sola richiesta al gestore Gemini con tutte le chiavi disponibili', async () => {
      const gemini = new GeminiService()
      const archive = new ArchiveService(tempDir, gemini, false)
      await archive.initialize()

      await archive.saveSettings({
        apiKeys: ['key-1-failing', 'key-2-working'],
        activeKeyIndex: 0,
        autoRotateOnQuota: true
      })

      const audioFile = join(tempDir, 'RC 2026-0507-16-19-41.mp3')
      await writeFile(audioFile, 'dummy audio')
      const importResult = await archive.importFiles([audioFile])
      const lectureId = importResult.imported[0].id

      let callCount = 0
      let configuredKeys: string[] = []

      vi.spyOn(gemini, 'transcribeAudioFile').mockImplementation(async (params) => {
        callCount++
        configuredKeys = params.keys?.map((key) => key.key) ?? []
        return 'Trascrizione valida da chiave 2'
      })

      const result = await archive.transcribeAudio(lectureId)

      // Retry e rotazione sono responsabilità del GeminiRequestManager: il
      // servizio archivio passa il pool una sola volta e non duplica tentativi.
      expect(result.success).toBe(true)
      expect(result.transcript).toBe('Trascrizione valida da chiave 2')
      expect(configuredKeys).toEqual(['key-1-failing', 'key-2-working'])
      expect(callCount).toBe(1)

      // La lezione deve risultare completata con la trascrizione corretta
      const lectures = await archive.listLectures()
      expect(lectures[0].status).toBe('transcript-available')

      archive.destroy()
    })

    it('la pipeline automatica non avvia la generazione della dispensa se la trascrizione fallisce', async () => {
      const gemini = new GeminiService()
      const archive = new ArchiveService(tempDir, gemini, true)
      await archive.initialize()

      await archive.saveSettings({
        apiKeys: ['key-failing'],
        activeKeyIndex: 0,
        autoProcessOnImport: true
      })

      const audioFile = join(tempDir, 'RC 2026-0507-16-19-41.mp3')
      await writeFile(audioFile, 'dummy audio')

      vi.spyOn(gemini, 'transcribeAudioFile').mockImplementation(async () => {
        throw new Error('503 Service Unavailable')
      })

      const notesSpy = vi.spyOn(gemini, 'generateLectureNotes')

      await archive.importFiles([audioFile])
      await archive.waitForAutoProcessing()

      // Poiché la trascrizione è fallita con 503, la dispensa NON deve essere stata avviata
      expect(notesSpy).not.toHaveBeenCalled()

      // Lo status della lezione deve rimanere audio-only, NON transcript-available
      const lectures = await archive.listLectures()
      expect(lectures[0].status).toBe('audio-only')
      expect(lectures[0].markdownFileName).toBeNull()

      archive.destroy()
    })
  })
})
