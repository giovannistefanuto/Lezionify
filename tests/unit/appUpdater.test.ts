import { describe, it, expect, vi, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AppUpdater } from 'electron-updater'
import { AppUpdateService } from '../../electron/main/appUpdater'
import { UpdateShutdownGate } from '../../electron/main/updateShutdownGate'

const temporary: string[] = []
afterEach(async () => { for (const dir of temporary.splice(0)) await rm(dir, { recursive: true, force: true }) })
async function fixture(prepare = vi.fn(async () => {})) {
  const dir = await mkdtemp(join(tmpdir(), 'lezionify-update-unit-'))
  temporary.push(dir)
  const fake = Object.assign(new EventEmitter(), {
    checkForUpdates: vi.fn(async () => ({ isUpdateAvailable: true, updateInfo: { version: '0.2.1', files: [{ size: 120 }], releaseNotes: 'Novità sintetiche' } })),
    downloadUpdate: vi.fn(async () => ['verified.exe']), quitAndInstall: vi.fn(),
    autoDownload: true, autoInstallOnAppQuit: true, allowDowngrade: true, allowPrerelease: true
  })
  const resume = vi.fn()
  const notify = vi.fn()
  const receipt = join(dir, 'receipt.json')
  const service = new AppUpdateService(fake as unknown as AppUpdater, '0.2.0', notify, prepare, resume, receipt)
  return { service, fake, prepare, resume, notify, receipt }
}

describe('consenso e stato aggiornamenti', () => {
  it('non scarica durante il controllo né installa alla normale chiusura', async () => {
    const { service, fake } = await fixture()
    expect(fake.autoDownload).toBe(false)
    expect(fake.autoInstallOnAppQuit).toBe(false)
    expect(fake.allowPrerelease).toBe(false)
    expect(fake.allowDowngrade).toBe(false)
    await service.check()
    await service.install()
    expect(fake.downloadUpdate).not.toHaveBeenCalled()
    expect(fake.quitAndInstall).not.toHaveBeenCalled()
    expect(service.getState()).toMatchObject({ phase: 'available', version: '0.2.1', notes: 'Novità sintetiche' })
  })
  it('conserva il pacchetto pronto e installa solo dopo il salvataggio', async () => {
    const { service, fake, prepare, receipt } = await fixture()
    await service.check()
    await service.download()
    await service.check()
    expect(fake.checkForUpdates).toHaveBeenCalledTimes(1)
    expect(fake.quitAndInstall).not.toHaveBeenCalled()
    await service.install()
    expect(prepare).toHaveBeenCalledTimes(1)
    expect(fake.quitAndInstall).toHaveBeenCalledWith(true, true)
    expect(JSON.parse(await readFile(receipt, 'utf8'))).toMatchObject({ version: '0.2.1' })
  })
  it('un lavoro attivo o un salvataggio fallito rinviano il riavvio', async () => {
    const { service, fake, resume } = await fixture(vi.fn(async () => { throw new Error('busy') }))
    await service.check(); await service.download(); await service.install()
    expect(service.getState().phase).toBe('ready')
    expect(fake.quitAndInstall).not.toHaveBeenCalled()
    expect(resume).toHaveBeenCalled()
  })
  it('serializza controllo/download e permette di riprovare dopo un download fallito', async () => {
    const { service, fake } = await fixture()
    await Promise.all([service.check(), service.check()])
    expect(fake.checkForUpdates).toHaveBeenCalledTimes(1)
    fake.downloadUpdate.mockRejectedValueOnce(new Error('private credentials must never escape'))
    await service.download()
    expect(service.getState().phase).toBe('available')
    expect(JSON.stringify(service.getState())).not.toContain('private credentials')
    await Promise.all([service.download(), service.download()])
    expect(fake.downloadUpdate).toHaveBeenCalledTimes(2)
    expect(service.getState().phase).toBe('ready')
  })
  it('errore installazione sblocca il gate e conserva il retry', async () => {
    const { service, fake, resume } = await fixture()
    await service.check(); await service.download(); await service.install()
    fake.emit('error', new Error('installer failure'))
    expect(service.getState().phase).toBe('ready')
    expect(resume).toHaveBeenCalled()
  })
  it('mostra le novità dopo l aggiornamento una volta sola', async () => {
    const { service, receipt } = await fixture()
    await service.check(); await service.download(); await service.install()
    const next = new AppUpdateService(null, '0.2.1', () => {}, async () => {}, () => {}, receipt)
    await next.initialize()
    expect(next.getState().installedNotes).toBe('Novità sintetiche')
    await next.acknowledge()
    const reopened = new AppUpdateService(null, '0.2.1', () => {}, async () => {}, () => {}, receipt)
    await reopened.initialize()
    expect(reopened.getState().installedNotes).toBeUndefined()
  })
})

describe('barriera di riavvio', () => {
  it('attende operazioni IPC pendenti e respinge quelle nuove dopo il lock', async () => {
    const gate = new UpdateShutdownGate()
    let release!: () => void
    const running = gate.run(() => new Promise<void>(resolve => { release = resolve }))
    expect(() => gate.lock(false)).toThrow()
    release(); await running
    expect(() => gate.lock(true)).toThrow()
    gate.lock(false)
    await expect(gate.run(() => 'new work')).rejects.toThrow()
    gate.unlock()
    await expect(gate.run(() => 'saved')).resolves.toBe('saved')
  })
})
