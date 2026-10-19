import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { QnaImageStore } from '../../electron/main/qnaImages'
import { validateQnaThread } from '../../electron/main/archiveValidation'

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU1sAAAAASUVORK5CYII='
const directories: string[] = []
afterEach(async () => { vi.useRealTimers(); await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
async function fixture() { const path = await mkdtemp(join(tmpdir(), 'lezionify-images-')); directories.push(path); return { path, store: new QnaImageStore(path, () => ({ width: 1, height: 1 })) } }

it('salva PNG immutabili e metadati senza percorsi; recupera contesto dopo un riavvio e conserva fonti', async () => {
  const { store, path } = await fixture()
  await writeFile(join(path, 'original.pdf'), 'synthetic original')
  const image = await store.put('lecture-one', 'qna-one', { page: 7, data: png })
  expect(image).toMatchObject({ lectureId: 'lecture-one', threadId: 'qna-one', page: 7, width: 1, height: 1 })
  expect(JSON.stringify(image)).not.toContain(path)
  const restarted = new QnaImageStore(path, () => ({ width: 1, height: 1 }))
  expect(await restarted.forRequest([image.id], 'lecture-one', 'qna-one')).toEqual([{ page: 7, mimeType: 'image/png', data: png }])
  expect((await restarted.list()).map(item => item.id)).toEqual([image.id])
  await restarted.remove({ all: true })
  expect(await readFile(join(path, 'original.pdf'), 'utf8')).toBe('synthetic original')
})

it('rifiuta allegati di un altro thread o lezione, duplicati e allegati cancellati senza inviare contesto parziale', async () => {
  const { store } = await fixture()
  const image = await store.put('one', 'thread-one', { page: 1, data: png })
  await expect(store.forRequest([image.id], 'other', 'thread-one')).rejects.toThrow('non appartengono')
  await expect(store.forRequest([image.id], 'one', 'other')).rejects.toThrow('non appartengono')
  await expect(store.forRequest([image.id, image.id], 'one', 'thread-one')).rejects.toThrow('non validi')
  await store.remove({ id: image.id })
  await expect(store.forRequest([image.id], 'one', 'thread-one')).rejects.toThrow('cancellata')
  expect(await store.forRequest([], 'one', 'thread-one')).toEqual([])
})

it('cancella solo il giorno o la conversazione scelta e poi tutte le immagini', async () => {
  const { store } = await fixture()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-14T12:00:00Z'))
  const first = await store.put('one', 'thread-one', { page: 1, data: png })
  vi.setSystemTime(new Date('2026-10-15T12:00:00Z'))
  const second = await store.put('one', 'thread-two', { page: 2, data: png })
  const third = await store.put('two', 'thread-three', { page: 3, data: png })
  expect(await store.remove({ day: first.day })).toBe(1)
  expect((await store.list()).map(image => image.id).sort()).toEqual([second.id, third.id].sort())
  await store.removeThread('one', 'thread-two')
  expect((await store.list()).map(image => image.id)).toEqual([third.id])
  expect(await store.remove({ all: true })).toBe(1)
  expect(await store.list()).toEqual([])
})

it('valida dati immagini e selettori prima di accedere al filesystem o al decoder', async () => {
  const { path } = await fixture()
  const decode = vi.fn(() => ({ width: 1, height: 1 }))
  const store = new QnaImageStore(path, decode)
  for (const input of [{ page: 0, data: png }, { page: 1, data: 'file:///private.png' }, { page: 1, data: 'A'.repeat(2_700_000) }, { page: 1, data: Buffer.from('not a png').toString('base64') }]) await expect(store.put('one', 'thread', input)).rejects.toThrow()
  const bomb = Buffer.from(png, 'base64'); bomb.writeUInt32BE(100000, 16)
  await expect(store.put('one', 'thread', { page: 1, data: bomb.toString('base64') })).rejects.toThrow('Dimensioni')
  expect(decode).not.toHaveBeenCalled()
  for (const selection of [{ id: '../../original.pdf' }, { day: '2026-02-31' }, { all: false }, { all: true, id: 'anything' }, null]) await expect(store.remove(selection)).rejects.toThrow('non valida')
  expect(await store.list()).toEqual([])
})

it('non scambia dati alterati o un decoder fallito per un immagine leggibile', async () => {
  const { path, store } = await fixture()
  const broken = new QnaImageStore(path, () => ({ width: 0, height: 0 }))
  await expect(broken.put('one', 'thread', { page: 1, data: png })).rejects.toThrow('non leggibile')
  const image = await store.put('one', 'thread', { page: 1, data: png })
  await writeFile(join(path, 'qna-images', image.id + '.png'), 'corrupt')
  await expect(store.read(image.id)).rejects.toThrow('non è disponibile')
})

it('il contratto dei thread resta retrocompatibile e rifiuta identificativi immagini arbitrari', () => {
  const thread = { id: 'thread', quote: 'synthetic', messages: [{ role: 'user', text: 'question' }] }
  expect(() => validateQnaThread(thread)).not.toThrow()
  expect(() => validateQnaThread({ ...thread, attachmentIds: ['../../secret'] })).toThrow()
  expect(() => validateQnaThread({ ...thread, messages: [{ role: 'user', text: 'question', attachmentIds: ['invalid'] }] })).toThrow()
})
