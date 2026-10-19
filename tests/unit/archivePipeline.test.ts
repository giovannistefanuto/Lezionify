import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Lecture } from '../../shared/archive'
import { ArchivePipeline } from '../../electron/main/ai/archivePipeline'
import { AiJobStore } from '../../electron/main/ai/aiJobStore'
import { normalizeGeminiError } from '../../electron/main/ai/geminiErrors'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

async function createStore(): Promise<AiJobStore> {
  const root = await mkdtemp(join(tmpdir(), 'lezionify-pipeline-'))
  temporaryRoots.push(root)
  const store = new AiJobStore(root)
  await store.initialize()
  return store
}

function lecture(id: string, options: Partial<Lecture> = {}): Lecture {
  return {
    id,
    title: `Lezione ${id}`,
    courseCode: 'RL',
    recordedAt: `2026-09-${id.padStart(2, '0')}T10:00:00`,
    sourceAudioFileName: `${id}.mp3`,
    sourceTranscriptFileName: null,
    audioFileName: `${id}.mp3`,
    transcriptFileName: null,
    markdownFileName: null,
    markdownEnFileName: null,
    byteSize: 1,
    checksum: id,
    importedAt: `2026-09-${id.padStart(2, '0')}T10:00:00.000Z`,
    status: 'audio-only',
    studyStatus: 'da-studiare',
    ...options
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { resolve, promise }
}

function operationsFor(lectures: Lecture[]) {
  return {
    listLectures: vi.fn(async () => lectures),
    hasConfiguredKey: vi.fn(async () => true),
    transcribe: vi.fn(async (id: string) => {
      lectures.find((item) => item.id === id)!.transcriptFileName = `${id}.txt`
      return { success: true }
    }),
    generateNotes: vi.fn(async (id: string) => {
      lectures.find((item) => item.id === id)!.markdownFileName = `${id}.md`
      return { success: true }
    }),
    translate: vi.fn(async (id: string) => {
      lectures.find((item) => item.id === id)!.markdownEnFileName =
        `${id}_en.md`
      return { success: true }
    })
  }
}

describe('ArchivePipeline', () => {
  it('l import automatico senza ENG seguito da Elabora tutto completa solo le traduzioni mancanti', async () => {
    const store = await createStore()
    const lectures = [lecture('01'), lecture('02', { transcriptFileName: '02.txt', markdownFileName: '02.md', markdownEnFileName: '02_en.md' })]
    const ops = operationsFor(lectures)
    const pipeline = new ArchivePipeline(store, ops)
    await pipeline.start({ trigger: 'import', lectureIds: ['01'], includeTranslation: false })
    await pipeline.waitForCompletion()
    expect(pipeline.getStatus()).toMatchObject({ status: 'completed', includeTranslation: false })
    expect(pipeline.getStatus().stageSummaries.translation.total).toBe(0)
    expect(ops.translate).not.toHaveBeenCalled()
    await pipeline.start({ trigger: 'manual', includeTranslation: true })
    await pipeline.waitForCompletion()
    expect(pipeline.getStatus().status).toBe('completed')
    expect(ops.transcribe).toHaveBeenCalledTimes(1)
    expect(ops.generateNotes).toHaveBeenCalledTimes(1)
    expect(ops.translate.mock.calls.map(([id]) => id)).toEqual(['01'])
    expect(lectures[1].markdownEnFileName).toBe('02_en.md')
  })
  it.each(['preflight', 'persistence', 'stop'] as const)(
    'resume %s libera sempre lo slot e mantiene la coda',
    async (phase) => {
      const store = await createStore()
      const ops = operationsFor([lecture('01')])
      const pipeline = new ArchivePipeline(store, ops)
      ops.hasConfiguredKey.mockResolvedValueOnce(false)
      await pipeline.start({ trigger: 'manual', includeTranslation: false })
      const runId = pipeline.getStatus().runId
      if (phase === 'preflight')
        ops.hasConfiguredKey.mockRejectedValueOnce(new Error('settings error'))
      if (phase === 'persistence')
        vi.spyOn(store, 'saveArchivePipelineState').mockRejectedValueOnce(
          new Error('disk error')
        )
      if (phase === 'stop') {
        const gate = deferred<boolean>()
        ops.hasConfiguredKey.mockReturnValueOnce(gate.promise)
        const resumed = pipeline.resume()
        const wait = pipeline.waitForCompletion()
        await pipeline.requestStop()
        gate.resolve(true)
        expect((await resumed).started).toBe(false)
        await wait
        expect(pipeline.getStatus().status).toBe('stopped')
      } else {
        await expect(pipeline.resume()).rejects.toThrow(/error/)
        expect(pipeline.getStatus().status).toBe('paused')
        expect((await pipeline.resume()).started).toBe(true)
        await pipeline.waitForCompletion()
      }
      expect(pipeline.isProcessing()).toBe(false)
      expect(pipeline.getStatus().runId).toBe(runId)
    }
  )
  it.each(['planning', 'preflight', 'persistence'] as const)(
    'stop e wait durante %s coprono tutto il ciclo ammesso',
    async (phase) => {
      const store = await createStore()
      const ops = operationsFor([lecture('01')])
      const gate = deferred<void>()
      const entered = deferred<void>()
      if (phase === 'planning')
        ops.listLectures.mockImplementationOnce(async () => {
          entered.resolve()
          await gate.promise
          return [lecture('01')]
        })
      if (phase === 'preflight')
        ops.hasConfiguredKey.mockImplementationOnce(async () => {
          entered.resolve()
          await gate.promise
          return true
        })
      if (phase === 'persistence') {
        const save = store.saveArchivePipelineState.bind(store)
        vi.spyOn(store, 'saveArchivePipelineState').mockImplementationOnce(
          async (status) => {
            entered.resolve()
            await gate.promise
            await save(status)
          }
        )
      }
      const pipeline = new ArchivePipeline(store, ops)
      const start = pipeline.start({
        trigger: 'manual',
        includeTranslation: true
      })
      await entered.promise
      let completed = false
      const wait = pipeline.waitForCompletion().then(() => {
        completed = true
      })
      await Promise.resolve()
      expect(completed).toBe(false)
      expect(
        (await pipeline.start({ trigger: 'import', includeTranslation: true }))
          .started
      ).toBe(false)
      expect((await pipeline.requestStop()).stopRequested).toBe(true)
      gate.resolve()
      expect((await start).started).toBe(false)
      await wait
      expect(ops.transcribe).not.toHaveBeenCalled()
      expect(pipeline.getStatus().status).toBe('stopped')
      expect(pipeline.isProcessing()).toBe(false)
    }
  )

  it('wait dalla preparazione attende anche il worker e lo slot si libera al completamento', async () => {
    const store = await createStore()
    const ops = operationsFor([lecture('01')])
    const planning = deferred<void>()
    const work = deferred<void>()
    const working = deferred<void>()
    ops.hasConfiguredKey.mockImplementationOnce(async () => {
      await planning.promise
      return true
    })
    const transcribe = ops.transcribe.getMockImplementation()!
    ops.transcribe.mockImplementationOnce(async (id) => {
      working.resolve()
      await work.promise
      return transcribe(id)
    })
    const pipeline = new ArchivePipeline(store, ops)
    const start = pipeline.start({
      trigger: 'manual',
      includeTranslation: false
    })
    let finished = false
    const wait = pipeline.waitForCompletion().then(() => {
      finished = true
    })
    planning.resolve()
    await start
    await working.promise
    expect(finished).toBe(false)
    expect(pipeline.isProcessing()).toBe(true)
    work.resolve()
    await wait
    expect(pipeline.isProcessing()).toBe(false)
    const next = await pipeline.start({
      trigger: 'manual',
      includeTranslation: true
    })
    expect(next.started).toBe(true)
    await pipeline.waitForCompletion()
    expect(ops.transcribe).toHaveBeenCalledTimes(1)
    expect(ops.generateNotes).toHaveBeenCalledTimes(1)
    expect(ops.translate).toHaveBeenCalledTimes(1)
  })

  it.each(['planning', 'preflight', 'persistence'] as const)(
    'libera lo slot dopo un errore di %s e ammette un successivo comando',
    async (phase) => {
      const store = await createStore()
      const ops = operationsFor([lecture('01')])
      const failure = new Error('synthetic failure')
      if (phase === 'planning') ops.listLectures.mockRejectedValueOnce(failure)
      if (phase === 'preflight')
        ops.hasConfiguredKey.mockRejectedValueOnce(failure)
      if (phase === 'persistence')
        vi.spyOn(store, 'saveArchivePipelineState').mockRejectedValueOnce(
          failure
        )
      const pipeline = new ArchivePipeline(store, ops)
      const start = pipeline.start({
        trigger: 'manual',
        includeTranslation: false
      })
      const wait = pipeline.waitForCompletion()
      await expect(start).rejects.toThrow('synthetic failure')
      await wait
      expect(ops.transcribe).not.toHaveBeenCalled()
      expect(pipeline.isProcessing()).toBe(false)
      expect(
        (await pipeline.start({ trigger: 'manual', includeTranslation: false }))
          .started
      ).toBe(true)
      await pipeline.waitForCompletion()
    }
  )

  it('nessun lavoro o nessuna chiave libera lo slot; due resume ammettono un solo worker', async () => {
    const store = await createStore()
    const lectures: Lecture[] = []
    const ops = operationsFor(lectures)
    const pipeline = new ArchivePipeline(store, ops)
    expect(
      (await pipeline.start({ trigger: 'manual', includeTranslation: false }))
        .started
    ).toBe(false)
    expect(pipeline.isProcessing()).toBe(false)
    lectures.push(lecture('01'))
    ops.hasConfiguredKey.mockResolvedValueOnce(false)
    expect(
      (await pipeline.start({ trigger: 'manual', includeTranslation: false }))
        .status.status
    ).toBe('paused')
    expect(pipeline.isProcessing()).toBe(false)
    const runId = pipeline.getStatus().runId
    const gate = deferred<boolean>()
    ops.hasConfiguredKey.mockReturnValueOnce(gate.promise)
    const resumed = pipeline.resume()
    expect((await pipeline.resume()).started).toBe(false)
    expect(
      (await pipeline.start({ trigger: 'import', includeTranslation: false }))
        .started
    ).toBe(false)
    gate.resolve(true)
    expect((await resumed).started).toBe(true)
    await pipeline.waitForCompletion()
    expect(pipeline.getStatus().runId).toBe(runId)
    expect(ops.transcribe).toHaveBeenCalledTimes(1)
  })

  it('un errore del salvataggio finale non lascia rejection o slot bloccati', async () => {
    const store = await createStore()
    const save = store.saveArchivePipelineState.bind(store)
    vi.spyOn(store, 'saveArchivePipelineState').mockImplementation(
      async (status) => {
        if (status.status === 'completed' || status.status === 'paused')
          throw new Error('disk error sensitive path')
        await save(status)
      }
    )
    const pipeline = new ArchivePipeline(store, operationsFor([lecture('01')]))
    await pipeline.start({ trigger: 'manual', includeTranslation: false })
    await pipeline.waitForCompletion()
    expect(pipeline.isProcessing()).toBe(false)
    expect(pipeline.getStatus().status).toBe('paused')
    expect(pipeline.getStatus().message).not.toContain('sensitive')
  })

  it.each(['structured', 'thrown', 'legacy'] as const)(
    '403 %s sopravvive al riavvio; resume conserva run e successi',
    async (mode) => {
      const store = await createStore()
      const lectures = [lecture('01'), lecture('02'), lecture('03')]
      const ops = operationsFor(lectures)
      const transcribe = ops.transcribe.getMockImplementation()!
      const failure = normalizeGeminiError(new Error('403 forbidden'))
      ops.transcribe.mockImplementation(async (id) => {
        if (id !== '02') return transcribe(id)
        if (mode === 'thrown') throw failure
        return {
          success: false,
          error: failure.sanitizedMessage,
          ...(mode === 'structured'
            ? { failureKind: 'authentication' as const }
            : {})
        }
      })
      const pipeline = new ArchivePipeline(store, ops)
      await pipeline.start({ trigger: 'manual', includeTranslation: true })
      await pipeline.waitForCompletion()
      const paused = pipeline.getStatus()
      expect(paused.status).toBe('paused')
      expect(paused.message).toMatch(/permessi.*fatturazione/)
      expect(ops.transcribe.mock.calls.map(([id]) => id)).toEqual(['01', '02'])
      expect(
        paused.tasks.filter((task) => task.status === 'failed')
      ).toHaveLength(1)
      expect(
        paused.tasks.find(
          (task) => task.lectureId === '03' && task.stage === 'transcription'
        )?.status
      ).toBe('pending')
      if (mode === 'legacy') {
        paused.tasks.find((task) => task.status === 'failed')!.failureKind =
          'unknown'
        await store.saveArchivePipelineState(paused)
      }
      const recovered = new ArchivePipeline(store, ops)
      await recovered.initialize()
      expect(recovered.getStatus().status).toBe('paused')
      ops.transcribe.mockImplementation(transcribe)
      await recovered.resume()
      await recovered.waitForCompletion()
      expect(recovered.getStatus()).toMatchObject({
        runId: paused.runId,
        status: 'completed'
      })
      expect(ops.transcribe.mock.calls.map(([id]) => id)).toEqual([
        '01',
        '02',
        '02',
        '03'
      ])
    }
  )

  it.each(['input', 'source_changed', 'not_found', 'unknown'] as const)(
    'un errore locale %s non produce una pausa provider o una ripresa indiscriminata',
    async (kind) => {
      const store = await createStore()
      const ops = operationsFor([lecture('01'), lecture('02')])
      const transcribe = ops.transcribe.getMockImplementation()!
      ops.transcribe.mockImplementation(async (id) =>
        id === '01'
          ? {
              success: false,
              error: '403 errore locale arbitrario',
              failureKind: kind
            }
          : transcribe(id)
      )
      const pipeline = new ArchivePipeline(store, ops)
      await pipeline.start({ trigger: 'manual', includeTranslation: true })
      await pipeline.waitForCompletion()
      expect(pipeline.getStatus().status).toBe('completed_with_errors')
      expect(ops.transcribe).toHaveBeenCalledTimes(2)
      const status = pipeline.getStatus()
      status.status = 'paused'
      await store.saveArchivePipelineState(status)
      const recovered = new ArchivePipeline(store, ops)
      await recovered.initialize()
      await recovered.resume()
      await recovered.waitForCompletion()
      expect(ops.transcribe).toHaveBeenCalledTimes(2)
    }
  )

  it('ammette un solo avvio manuale/automatico durante la pianificazione', async () => {
    const store = await createStore()
    const lectures = [lecture('01', { transcriptFileName: '01.txt' })]
    const planning = deferred<Lecture[]>()
    const listLectures = vi
      .fn()
      .mockReturnValueOnce(planning.promise)
      .mockResolvedValue(lectures)
    const generateNotes = vi.fn(async () => {
      lectures[0].markdownFileName = '01.md'
      return { success: true }
    })
    const pipeline = new ArchivePipeline(store, {
      listLectures,
      hasConfiguredKey: async () => true,
      transcribe: async () => ({ success: true }),
      generateNotes,
      translate: async () => ({ success: true })
    })
    const first = pipeline.start({
      trigger: 'manual',
      includeTranslation: false
    })
    expect(pipeline.isProcessing()).toBe(true)
    const second = await pipeline.start({
      trigger: 'import',
      includeTranslation: false
    })
    expect(second.started).toBe(false)
    planning.resolve(lectures)
    expect((await first).started).toBe(true)
    await pipeline.waitForCompletion()
    expect(generateNotes).toHaveBeenCalledTimes(1)
  })

  it('sospende sul 403 legacy prima di chiamare la seconda lezione', async () => {
    const store = await createStore()
    const transcribe = vi.fn(async () => ({
      success: false,
      error:
        'Accesso negato: verifica i permessi o la fatturazione del progetto Google Cloud.'
    }))
    const pipeline = new ArchivePipeline(store, {
      listLectures: async () => [lecture('01'), lecture('02')],
      hasConfiguredKey: async () => true,
      transcribe,
      generateNotes: async () => ({ success: true }),
      translate: async () => ({ success: true })
    })
    await pipeline.start({ trigger: 'manual', includeTranslation: true })
    await pipeline.waitForCompletion()
    expect(transcribe).toHaveBeenCalledTimes(1)
    expect(pipeline.getStatus()).toMatchObject({ status: 'paused' })
    expect(pipeline.getStatus().tasks[0].failureKind).toBe('authentication')
  })
  it('esegue tutte le trascrizioni, poi le dispense e infine le traduzioni', async () => {
    const store = await createStore()
    const lectures = [
      lecture('01'),
      lecture('02', {
        transcriptFileName: '02.txt',
        status: 'transcript-available'
      }),
      lecture('03', {
        transcriptFileName: '03.txt',
        markdownFileName: '03.md',
        status: 'transcript-available'
      }),
      lecture('04', {
        transcriptFileName: '04.txt',
        markdownFileName: '04.md',
        markdownEnFileName: '04_en.md',
        status: 'transcript-available'
      })
    ]
    const calls: string[] = []
    const pipeline = new ArchivePipeline(store, {
      listLectures: async () => lectures,
      hasConfiguredKey: async () => true,
      transcribe: async (id) => {
        calls.push(`transcribe:${id}`)
        const item = lectures.find((candidate) => candidate.id === id)!
        item.transcriptFileName = `${id}.txt`
        item.status = 'transcript-available'
        return { success: true, transcript: 'raw transcript' }
      },
      generateNotes: async (id) => {
        calls.push(`notes:${id}`)
        lectures.find((candidate) => candidate.id === id)!.markdownFileName =
          `${id}.md`
        return { success: true, markdown: '# Dispensa' }
      },
      translate: async (id) => {
        calls.push(`translate:${id}`)
        lectures.find((candidate) => candidate.id === id)!.markdownEnFileName =
          `${id}_en.md`
        return { success: true, markdown: '# Notes' }
      }
    })

    await pipeline.initialize()
    const started = await pipeline.start({
      trigger: 'manual',
      includeTranslation: true
    })
    expect(started.started).toBe(true)
    await pipeline.waitForCompletion()

    expect(calls).toEqual([
      'transcribe:01',
      'notes:01',
      'notes:02',
      'translate:01',
      'translate:02',
      'translate:03'
    ])
    expect(pipeline.getStatus().status).toBe('completed')
  })

  it('blocca solo le dipendenze della trascrizione fallita e prosegue sulle altre lezioni', async () => {
    const store = await createStore()
    const lectures = [
      lecture('01'),
      lecture('02', {
        transcriptFileName: '02.txt',
        status: 'transcript-available'
      })
    ]
    const calls: string[] = []
    const pipeline = new ArchivePipeline(store, {
      listLectures: async () => lectures,
      hasConfiguredKey: async () => true,
      transcribe: async (id) => {
        calls.push(`transcribe:${id}`)
        return { success: false, error: 'File audio non leggibile.' }
      },
      generateNotes: async (id) => {
        calls.push(`notes:${id}`)
        lectures.find((candidate) => candidate.id === id)!.markdownFileName =
          `${id}.md`
        return { success: true, markdown: '# Dispensa' }
      },
      translate: async (id) => {
        calls.push(`translate:${id}`)
        return { success: true, markdown: '# Notes' }
      }
    })

    await pipeline.start({ trigger: 'manual', includeTranslation: true })
    await pipeline.waitForCompletion()

    expect(calls).toEqual(['transcribe:01', 'notes:02', 'translate:02'])
    const status = pipeline.getStatus()
    expect(status.status).toBe('completed_with_errors')
    expect(
      status.tasks.filter(
        (task) => task.lectureId === '01' && task.status === 'blocked'
      )
    ).toHaveLength(2)
  })

  it('si mette in pausa dopo un errore Gemini di rete o servizio e può riprendere', async () => {
    const store = await createStore()
    const lectures = [lecture('01')]
    let attempts = 0
    const pipeline = new ArchivePipeline(store, {
      listLectures: async () => lectures,
      hasConfiguredKey: async () => true,
      transcribe: async (id) => {
        attempts++
        if (attempts === 1) {
          return { success: false, error: '503 Service Unavailable' }
        }
        const item = lectures.find((candidate) => candidate.id === id)!
        item.transcriptFileName = `${id}.txt`
        item.status = 'transcript-available'
        return { success: true, transcript: 'raw transcript' }
      },
      generateNotes: async (id) => {
        lectures.find((candidate) => candidate.id === id)!.markdownFileName =
          `${id}.md`
        return { success: true, markdown: '# Dispensa' }
      },
      translate: async (id) => {
        lectures.find((candidate) => candidate.id === id)!.markdownEnFileName =
          `${id}_en.md`
        return { success: true, markdown: '# Notes' }
      }
    })

    await pipeline.start({ trigger: 'manual', includeTranslation: true })
    await pipeline.waitForCompletion()
    expect(pipeline.getStatus().status).toBe('paused')

    const resumed = await pipeline.resume()
    expect(resumed.started).toBe(true)
    await pipeline.waitForCompletion()
    expect(pipeline.getStatus().status).toBe('completed')
    expect(attempts).toBe(2)
  })

  it('mette in pausa anche il messaggio sanitizzato di limite RPM', async () => {
    const store = await createStore()
    const lectures = [lecture('01')]
    const pipeline = new ArchivePipeline(store, {
      listLectures: async () => lectures,
      hasConfiguredKey: async () => true,
      transcribe: async () => ({
        success: false,
        error: 'Limite di richieste al minuto (RPM) temporaneamente superato.'
      }),
      generateNotes: async () => ({ success: true, markdown: '# Dispensa' }),
      translate: async () => ({ success: true, markdown: '# Notes' })
    })

    await pipeline.start({ trigger: 'manual', includeTranslation: true })
    await pipeline.waitForCompletion()

    expect(pipeline.getStatus()).toMatchObject({
      status: 'paused',
      activeStage: null
    })
  })

  it('dopo un riavvio recupera la coda in pausa senza marcare completata l attività interrotta', async () => {
    const store = await createStore()
    const lectures = [lecture('01')]
    let releaseTranscription: (() => void) | undefined
    const transcriptionStarted = new Promise<void>((resolve) => {
      releaseTranscription = resolve
    })
    let markRunning: (() => void) | undefined
    const runningPersisted = new Promise<void>((resolve) => {
      markRunning = resolve
    })

    const operations = {
      listLectures: async () => lectures,
      hasConfiguredKey: async () => true,
      transcribe: async (id: string) => {
        await transcriptionStarted
        const item = lectures.find((candidate) => candidate.id === id)!
        item.transcriptFileName = `${id}.txt`
        item.status = 'transcript-available'
        return { success: true, transcript: 'raw transcript' }
      },
      generateNotes: async (id: string) => {
        lectures.find((candidate) => candidate.id === id)!.markdownFileName =
          `${id}.md`
        return { success: true, markdown: '# Dispensa' }
      },
      translate: async (id: string) => {
        lectures.find((candidate) => candidate.id === id)!.markdownEnFileName =
          `${id}_en.md`
        return { success: true, markdown: '# Notes' }
      }
    }
    const pipeline = new ArchivePipeline(store, operations)
    pipeline.setStatusCallback((status) => {
      if (
        status.tasks.some(
          (task) => task.stage === 'transcription' && task.status === 'running'
        )
      ) {
        markRunning?.()
      }
    })

    await pipeline.start({ trigger: 'manual', includeTranslation: true })
    await runningPersisted

    const recovered = new ArchivePipeline(store, operations)
    await recovered.initialize()
    const recoveredStatus = recovered.getStatus()
    expect(recoveredStatus.status).toBe('paused')
    expect(
      recoveredStatus.tasks.find((task) => task.stage === 'transcription')
        ?.status
    ).toBe('pending')
    expect(recoveredStatus.message).toContain('interrotta dalla chiusura')

    releaseTranscription?.()
    await pipeline.waitForCompletion()
  })
})
