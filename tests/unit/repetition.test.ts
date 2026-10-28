import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  RepetitionService,
  type RepetitionDependencies
} from '../../electron/main/repetition'
import type { UsbRecorderInfo } from '../../shared/archive'
import { REPETITION_HEADINGS } from '../../shared/repetition'
import {
  REPETITION_INSTRUCTION,
  validateRepetitionAssessment
} from '../../electron/main/ai/repetitionPrompt'

vi.mock('../../electron/main/logger', () => ({ logger: { error: vi.fn() } }))
const report = REPETITION_HEADINGS.map(
  (heading) => `## ${heading}\n\nEvidenze della sessione.`
).join('\n\n')
let directory: string,
  root: string,
  reference: string,
  source: string,
  checksum: string
let dependencies: RepetitionDependencies, service: RepetitionService
const settle = async () => {
  for (let i = 0; i < 200; i++) {
    if (!(await service.state()).busy) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('Sessione non terminata')
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'lezionify-repetition-'))
  root = join(directory, 'RIPETERE')
  reference = join(directory, 'appunti.txt')
  source = join(directory, 'ultimo.mp3')
  await writeFile(reference, '# Appunti\nRiferimento originale.')
  await writeFile(source, 'audio sintetico breve')
  checksum = createHash('sha256').update('audio sintetico breve').digest('hex')
  dependencies = {
    scan: vi.fn(
      async () =>
        ({
          detected: true,
          files: [
            {
              name: 'ultimo.mp3',
              fullPath: source,
              checksum,
              durationSeconds: 3,
              alreadyImported: true
            }
          ]
        }) as UsbRecorderInfo
    ),
    transcribe: vi.fn(async () => 'Provo a capire. Sbaglio, poi mi correggo.'),
    evaluate: vi.fn(async () => report)
  }
  service = new RepetitionService(root, dependencies)
})
afterEach(async () => {
  await service.stop()
  await rm(directory, { recursive: true, force: true })
})

describe('RIPETERE archivio e pipeline', () => {
  it('usa anche audio brevi già importati, conserva fonti e riapre senza nuove API', async () => {
    await service.setReference(reference)
    const [id, duplicate] = await Promise.all([
      service.startLatest(),
      service.startLatest()
    ])
    expect(id).toBe(duplicate)
    await settle()
    expect(dependencies.scan).toHaveBeenCalledTimes(1)
    expect(dependencies.transcribe).toHaveBeenCalledTimes(1)
    const document = await service.read(id)
    expect(document.session.status).toBe('completed')
    expect(document.reference).toContain('Riferimento originale')
    expect(document.transcript).toContain('mi correggo')
    expect(await readFile(await service.audioPath(id), 'utf8')).toBe(
      await readFile(source, 'utf8')
    )
    await writeFile(reference, 'Appunti aggiornati per una futura sessione')
    await service.startLatest()
    await settle()
    expect(dependencies.evaluate).toHaveBeenCalledTimes(1)
    expect((await service.read(id)).reference).toContain(
      'Riferimento originale'
    )
    expect(await readdir(directory)).not.toContain('library.json')
  })

  it('legge gli appunti aggiornati per ciascun nuovo audio e li conserva dopo il riavvio', async () => {
    await service.setReference(reference)
    await writeFile(reference, '# Versione aggiornata')
    const id = await service.startLatest()
    await settle()
    service = new RepetitionService(root, dependencies)
    expect((await service.state()).referenceName).toBe('appunti.txt')
    expect((await service.read(id)).reference).toBe('# Versione aggiornata')
    await rm(reference)
    expect(await service.startLatest()).toBe(id)
    expect(dependencies.evaluate).toHaveBeenCalledTimes(1)
  })

  it('non avvia API senza riferimento o senza audio e non espone percorsi negli errori', async () => {
    await expect(service.startLatest()).rejects.toThrow('Scegli il file')
    await service.setReference(reference)
    await rm(reference)
    await expect(service.startLatest()).rejects.toThrow(
      'Appunti non disponibili'
    )
    dependencies.scan = async () => ({ detected: false, files: [] })
    await expect(service.startLatest()).rejects.toThrow('Nessun audio')
    expect(dependencies.transcribe).not.toHaveBeenCalled()
  })

  it('rifiuta formati, riferimenti vuoti, binari, UTF-8 invalido e file troppo grandi', async () => {
    await expect(
      service.setReference(join(directory, 'file.pdf'))
    ).rejects.toThrow('Markdown o TXT')
    for (const content of [
      '',
      '\0binario',
      Buffer.from([0xff]),
      'x'.repeat(1024 * 1024 + 1)
    ]) {
      await writeFile(reference, content)
      await expect(service.setReference(reference)).rejects.toThrow()
    }
    expect(dependencies.transcribe).not.toHaveBeenCalled()
  })

  it('rileva audio modificato durante la copia senza esporre una sessione incompleta', async () => {
    await service.setReference(reference)
    await writeFile(source, 'modificato')
    await expect(service.startLatest()).rejects.toThrow('Audio cambiato')
    expect((await service.state()).sessions).toHaveLength(0)
    expect(dependencies.transcribe).not.toHaveBeenCalled()
  })

  it('riprende la valutazione dal checkpoint senza ritrascrivere o ripetere parti concluse', async () => {
    const text = 'a'.repeat(100000)
    dependencies.transcribe = vi.fn(async () => text)
    const evaluate = vi
      .fn()
      .mockResolvedValueOnce(report)
      .mockRejectedValueOnce(new Error('segreto non da mostrare'))
    dependencies.evaluate = evaluate
    await service.setReference(reference)
    const id = await service.startLatest()
    await settle()
    expect((await service.read(id)).session.status).toBe('failed')
    expect(JSON.stringify(await service.state())).not.toContain('segreto')
    expect((await service.read(id)).transcript).toBe(text)
    service = new RepetitionService(root, dependencies)
    dependencies.evaluate = vi.fn(async () => report)
    await service.startLatest()
    await settle()
    expect(dependencies.transcribe).toHaveBeenCalledTimes(1)
    expect(dependencies.evaluate).toHaveBeenCalledTimes(2)
    expect(vi.mocked(dependencies.evaluate).mock.calls[0][1]).toHaveLength(
      48000
    )
    expect(vi.mocked(dependencies.evaluate).mock.calls[0][2]).toBe(report)
    expect(vi.mocked(dependencies.evaluate).mock.calls[1][3]).toBe(true)
    expect((await service.read(id)).session.status).toBe('completed')
  })

  it('sospende, conserva la trascrizione e riprende anche dopo riavvio', async () => {
    let entered!: () => void
    const waiting = new Promise<void>((resolve) => {
      entered = resolve
    })
    dependencies.evaluate = async (_r, _t, _p, _f, _id, signal) => {
      entered()
      return new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(new Error('stop')), {
          once: true
        })
      )
    }
    await service.setReference(reference)
    const id = await service.startLatest()
    await waiting
    await expect(service.setReference(reference)).rejects.toThrow('interrompi')
    await service.stop()
    expect((await service.read(id)).session.status).toBe('paused')
    dependencies.evaluate = vi.fn(async () => report)
    service = new RepetitionService(root, dependencies)
    dependencies.scan = async () => ({ detected: false, files: [] })
    await rm(reference)
    await rm(source)
    await service.resume(id)
    await settle()
    expect(dependencies.transcribe).toHaveBeenCalledTimes(1)
    expect((await service.read(id)).session.status).toBe('completed')
  })

  it('blocca traversal e metadati alterati senza sostituire i dati', async () => {
    await expect(service.read('../fuori')).rejects.toThrow('non valida')
    await service.setReference(reference)
    const id = await service.startLatest()
    await settle()
    const path = join(root, id, 'session.json')
    const record = JSON.parse(await readFile(path, 'utf8'))
    await writeFile(
      path,
      JSON.stringify({ ...record, audioFile: '../../fuori.mp3' })
    )
    service = new RepetitionService(root, dependencies)
    await expect(service.audioPath(id)).rejects.toThrow('non validi')
    expect(JSON.parse(await readFile(path, 'utf8')).audioFile).toBe(
      '../../fuori.mp3'
    )
  })

  it('non valuta una trascrizione vuota e conserva audio e riferimento per riprovare', async () => {
    dependencies.transcribe = vi.fn(async () => '   ')
    await service.setReference(reference)
    const id = await service.startLatest()
    await settle()
    expect((await service.read(id)).session.status).toBe('failed')
    expect(dependencies.evaluate).not.toHaveBeenCalled()
    expect(await readFile(await service.audioPath(id), 'utf8')).toBe(
      'audio sintetico breve'
    )
    dependencies.transcribe = vi.fn(async () => 'Un nuovo tentativo valido.')
    await service.resume(id)
    await settle()
    expect((await service.read(id)).session.status).toBe('completed')
  })

  it('non combina checkpoint con una trascrizione o un riferimento modificati', async () => {
    dependencies.transcribe = vi.fn(async () => 'a'.repeat(50000))
    dependencies.evaluate = vi
      .fn()
      .mockResolvedValueOnce(report)
      .mockRejectedValueOnce(new Error('stop'))
    await service.setReference(reference)
    const id = await service.startLatest()
    await settle()
    const transcript = join(root, id, 'trascrizione.txt')
    await writeFile(transcript, 'b'.repeat(50000))
    dependencies.evaluate = vi.fn(async () => report)
    await service.resume(id)
    await settle()
    expect((await service.read(id)).session.status).toBe('failed')
    expect(dependencies.evaluate).not.toHaveBeenCalled()
    await writeFile(transcript, 'a'.repeat(50000))
    await writeFile(join(root, id, 'appunti.md'), 'Riferimento alterato')
    await service.resume(id)
    await settle()
    expect((await service.read(id)).session.status).toBe('failed')
    expect(dependencies.evaluate).not.toHaveBeenCalled()
  })
})

it('valida tutte le sezioni e il prompt distingue autocorrezioni, lettura e fonti fallibili', () => {
  expect(validateRepetitionAssessment(report)).toBe(report)
  expect(() => validateRepetitionAssessment('Risposta generica')).toThrow()
  expect(() =>
    validateRepetitionAssessment(
      report.replace('## Cosa devi rivedere', '## Altro')
    )
  ).toThrow()
  expect(() =>
    validateRepetitionAssessment(
      report.replace(/Evidenze della sessione\.$/, '')
    )
  ).toThrow()
  expect(REPETITION_INSTRUCTION).toContain('non chiamare lacuna')
  expect(REPETITION_INSTRUCTION).toContain('La lettura corretta non dimostra')
  expect(REPETITION_INSTRUCTION).toContain('spostalo nelle difficoltà superate')
})
