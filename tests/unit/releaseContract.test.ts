import { test, expect, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
const { validateRelease } = createRequire(import.meta.url)('../../tools/validate_release.cjs') as {
  validateRelease(root: string, artifacts?: boolean, tag?: string): string
}
const directories: string[] = []
afterEach(async () => { for (const root of directories.splice(0)) await rm(root, { recursive: true, force: true }) })
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'lezionify-release-test-'))
  directories.push(root)
  await mkdir(join(root, 'docs/releases'), { recursive: true })
  await mkdir(join(root, 'dist'))
  await writeFile(join(root, 'package.json'), JSON.stringify({ version: '0.2.0' }))
  await writeFile(join(root, 'package-lock.json'), JSON.stringify({ version: '0.2.0', packages: { '': { version: '0.2.0' } } }))
  const notes = '# Versione sintetica\n## Novità\nFunzione descritta in modo verificabile per chi scarica questa versione.\n## Dati e riavvio\nNessun cambio formato.\n## Limiti noti\nFixture locale.'
  await writeFile(join(root, 'docs/releases/0.2.0.md'), notes)
  await writeFile(join(root, 'electron-builder.yml'), 'publish:\n  provider: github\n  owner: giovannistefanuto\n  repo: Lezionify\nreleaseInfo:\n  releaseNotesFile: docs/releases/0.2.0.md\n')
  const payload = Buffer.from('synthetic EXE, never executed')
  const sha512 = createHash('sha512').update(payload).digest('base64')
  await writeFile(join(root, 'dist/Lezionify-Setup-0.2.0.exe'), payload)
  await writeFile(join(root, 'dist/Lezionify-Setup-0.2.0.exe.blockmap'), 'synthetic map')
  await writeFile(join(root, 'dist/latest.yml'), JSON.stringify({ version: '0.2.0', releaseNotes: notes, files: [{ url: 'Lezionify-Setup-0.2.0.exe', sha512, size: payload.length }] }))
  return root
}
test('release accetta soltanto versione, note e payload coerenti', async () => {
  const root = await fixture()
  expect(validateRelease(root, true, 'v0.2.0')).toBe('0.2.0')
  expect(() => validateRelease(root, true, 'v0.3.0')).toThrow()
  await writeFile(join(root, 'dist/Lezionify-Setup-0.2.0.exe'), 'changed after build')
  expect(() => validateRelease(root, true)).toThrow()
})
test('release respinge lock non aggiornato e note mancanti', async () => {
  const root = await fixture()
  await writeFile(join(root, 'docs/releases/0.2.0.md'), '')
  expect(() => validateRelease(root)).toThrow()
  await writeFile(join(root, 'package-lock.json'), JSON.stringify({ version: '0.1.0', packages: { '': { version: '0.1.0' } } }))
  expect(() => validateRelease(root)).toThrow()
})
