import { expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { AmbientSoundService } from '../../electron/main/ambientSounds'
import { AMBIENT_SOUNDS } from '../../shared/ambientSounds'
it('scarica il singolo richiesto, conserva i validi, ripara i corrotti e prosegue dopo un errore', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lezionify-sound-downloads-'))
  const data = [
    Buffer.from('sound-one'),
    Buffer.from('sound-two'),
    Buffer.from('sound-three')
  ]
  const sounds = data.map((bytes, index) => ({
    ...AMBIENT_SOUNDS[0],
    id: `sound-${index}`,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    url: `https://example.com/sound-${index}`
  }))
  const requests: number[] = []
  let fail = false
  const service = new AmbientSoundService(
    root,
    (async (url: string) => {
      const index = sounds.findIndex((sound) => sound.url === url)
      requests.push(index)
      return fail && index === 1
        ? new Response(null, { status: 503 })
        : new Response(data[index])
    }) as typeof fetch,
    sounds
  )
  try {
    await service.install(['sound-0'])
    expect(requests).toEqual([0])
    expect(
      (await service.status()).sounds.map((sound) => sound.installed)
    ).toEqual([true, false, false])
    fail = true
    await expect(service.install()).rejects.toThrow('HTTP 503')
    expect(requests).toEqual([0, 1, 2])
    expect(
      (await service.status()).sounds.map((sound) => sound.installed)
    ).toEqual([true, false, true])
    expect((await service.status()).failures).toHaveProperty('sound-1')
    fail = false
    await service.install()
    expect(requests).toEqual([0, 1, 2, 1])
    expect((await service.status()).installed).toBe(true)
    await writeFile(join(root, 'sound-0.mp3'), Buffer.from('corrupted'))
    expect((await service.status()).sounds[0].installed).toBe(false)
    await service.install()
    expect(requests.at(-1)).toBe(0)
    expect(await readFile(join(root, 'sound-0.mp3'))).toEqual(data[0])
    for (const invalid of [[], ['unknown'], 'sound-0', [1]])
      await expect(service.install(invalid)).rejects.toThrow('Selezione')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
