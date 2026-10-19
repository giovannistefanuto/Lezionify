import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { AppLogger } from '../../electron/main/logger'
import { localLogDay } from '../../shared/appLogs'

const logger = AppLogger.getInstance()
let root: string
beforeEach(async () => {
  await logger.flush()
  root = await mkdtemp(join(tmpdir(), 'lezionify-log-days-'))
})
afterEach(async () => {
  await logger.flush()
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})
const entry = (id: string, timestamp: string) => ({
  id,
  timestamp,
  source: 'system',
  level: 'info',
  message: `Messaggio ${id} è locale`
})
describe('lettura dei log per giorno locale', () => {
  it('legge dal disco soltanto gli intervalli del giorno, anche dopo riavvio e con giorni vuoti', async () => {
    const yesterday = new Date(2026, 9, 18, 23, 59)
    const today = new Date(2026, 9, 19, 0, 1)
    const older = entry('old', new Date(2026, 9, 16, 10).toISOString())
    const rows = [
      older,
      entry('yesterday', yesterday.toISOString()),
      entry('today', today.toISOString())
    ]
    await writeFile(
      join(root, 'app.log'),
      rows.map((row) => JSON.stringify(row)).join('\n') + '\n'
    )
    logger.init(root)
    const nativeOpen = fs.promises.open.bind(fs.promises)
    const sizes: number[] = []
    const open = vi
      .spyOn(fs.promises, 'open')
      .mockImplementation(async (...args) => {
        const file = await nativeOpen(...args)
        const nativeRead = file.read.bind(file)
        vi.spyOn(file, 'read').mockImplementation(((...readArgs: any[]) => {
          sizes.push(readArgs[2])
          return (nativeRead as any)(...readArgs)
        }) as typeof file.read)
        return file
      })
    const page = await logger.getLogDay(localLogDay(today))
    expect(page.entries.map((row) => row.id)).toEqual(['today'])
    expect(page.previousDay).toBe(localLogDay(yesterday))
    expect(open).toHaveBeenCalledTimes(1)
    expect(sizes).toEqual([Buffer.byteLength(JSON.stringify(rows[2]) + '\n')])
    const file = await open.mock.results[0].value
    // Full-file read helpers are never used by paging.
    const readFile = vi.spyOn(fs.promises, 'readFile')
    expect((await logger.getLogDay('2026-10-17')).entries).toEqual([])
    expect((await logger.getLogDay('2026-10-17')).previousDay).toBe(
      '2026-10-16'
    )
    expect(readFile).not.toHaveBeenCalled()
    expect(file.fd).toBe(-1)
  })
  it('aggiorna indice e contatori dopo scrittura, cancellazione e riavvio', async () => {
    logger.init(root)
    logger.info('system', 'Prima')
    const first = await logger.getLogDay()
    expect(first.entries).toHaveLength(1)
    await logger.clearLogs()
    expect((await logger.getLogDay()).entries).toEqual([])
    logger.info('system', 'Dopo')
    await logger.flush()
    logger.init(root)
    expect(
      (await logger.getLogDay()).entries.map((row) => row.message)
    ).toEqual(['Dopo'])
  })
  it('valida date e conserva le righe corrotte senza esporle', async () => {
    await writeFile(
      join(root, 'app.log'),
      Buffer.concat([Buffer.from([0xff, 10]), Buffer.from(JSON.stringify(entry('valid', new Date().toISOString())) + '\n')])
    )
    logger.init(root)
    expect((await logger.getLogDay()).entries.map((row) => row.id)).toEqual([
      'valid'
    ])
    for (const value of ['../../secret', '2026-02-30', null, 42])
      await expect(logger.getLogDay(value)).rejects.toThrow('non valido')
  })
})
