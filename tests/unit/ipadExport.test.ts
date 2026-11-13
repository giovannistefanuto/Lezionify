import { describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { IpadAnticipation } from '../../src/utils/ipadAnticipation'
import { validateIpadExport } from '../../shared/ipadExport'
vi.mock('electron', () => ({ nativeImage: { createFromBuffer: () => ({ isEmpty: () => false }) } }))
import { IpadExportService } from '../../electron/main/ipadExport'
const png = () => {
  const value = new Uint8Array(24)
  value.set([137, 80, 78, 71, 13, 10, 26, 10])
  const view = new DataView(value.buffer); view.setUint32(16, 100); view.setUint32(20, 100)
  return value
}
describe('anticipazione schemi iPad', () => {
  it('richiede entrambe le soglie e non usa il tempo di altri paragrafi', () => {
    const tracker = new IpadAnticipation()
    for (let index = 0; index < 299; index++) expect(tracker.tick('a')).toBe(false)
    expect(tracker.tick('a')).toBe(true)
    for (let index = 0; index < 9; index++) expect(tracker.tick('b')).toBe(false)
    expect(tracker.tick('b')).toBe(true)
    expect(tracker.tick(null)).toBe(false)
    expect(tracker.tick('b')).toBe(false)
  })
  it('riprende solo il totale della lezione e richiede nuovi 10 secondi sul blocco', () => {
    const tracker = new IpadAnticipation(300)
    for (let index = 0; index < 9; index++) expect(tracker.tick('a')).toBe(false)
    expect(tracker.tick('a')).toBe(true)
  })
  it('rifiuta percorsi al posto delle chiavi, immagini malformate e dimensioni eccessive', () => {
    expect(() => validateIpadExport({ key: '../file', png: png() })).toThrow()
    expect(() => validateIpadExport({ key: 'a'.repeat(64), png: new Uint8Array(24) })).toThrow()
    const large = png(); new DataView(large.buffer).setUint32(16, 13000)
    expect(() => validateIpadExport({ key: 'a'.repeat(64), png: large })).toThrow()
  })
  it('serializza concorrenti, deduplica dopo riavvio e conserva byte e preferenza', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lezionify-ipad-'))
    try {
      const destination = join(directory, 'photos'); await mkdir(destination)
      const service = new IpadExportService(directory, destination)
      const request = { key: 'a'.repeat(64), png: png() }
      const results = await Promise.all([service.export(request), service.export(request)])
      expect(results.map(result => result.duplicate)).toEqual([false, true])
      expect(await readdir(destination)).toHaveLength(1)
      expect(await readFile(join(destination, (await readdir(destination))[0]))).toEqual(Buffer.from(request.png))
      const restarted = new IpadExportService(directory, destination)
      expect((await restarted.export(request)).duplicate).toBe(true)
      expect(await restarted.status(false)).toEqual({ enabled: false, count: 1, bytes: 24 })
      await expect(restarted.export({ ...request, key: 'b'.repeat(64) })).rejects.toThrow('disattivato')
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
  it('ripristina uno schema rimosso dalla cartella anche se presente nel registro', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lezionify-ipad-'))
    try {
      const destination = join(directory, 'photos'); await mkdir(destination)
      const service = new IpadExportService(directory, destination)
      const request = { key: 'c'.repeat(64), png: png() }
      await service.export(request)
      await rm(join(destination, (await readdir(destination))[0]))
      expect((await service.export(request)).duplicate).toBe(false)
      expect(await readdir(destination)).toHaveLength(1)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
  it('permette il salvataggio manuale anche con automatismo disattivato e deduplica', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lezionify-ipad-'))
    try {
      const destination = join(directory, 'photos'); await mkdir(destination)
      const service = new IpadExportService(directory, destination)
      await service.status(false)
      const request = { key: 'd'.repeat(64), png: png(), manual: true }
      expect((await service.export(request)).duplicate).toBe(false)
      expect((await service.export(request)).duplicate).toBe(true)
      expect(await readdir(destination)).toHaveLength(1)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
  it('non crea false destinazioni iCloud né registra invii falliti', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lezionify-ipad-'))
    try {
      const service = new IpadExportService(directory, join(directory, 'missing'))
      await expect(service.export({ key: 'a'.repeat(64), png: png() })).rejects.toThrow('Salvataggio')
      expect((await service.status()).count).toBe(0)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
})
