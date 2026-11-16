// Read-only release gate. Keep package, notes and installer metadata in one release.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const yaml = require('js-yaml')

function validateRelease(root, artifacts = false, tag) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/, 'Serve una versione stabile crescente')
  assert.equal(lock.version, pkg.version)
  assert.equal(lock.packages[''].version, pkg.version)
  if (tag) assert.equal(tag, `v${pkg.version}`, 'Tag e versione non coincidono')
  const config = yaml.load(fs.readFileSync(path.join(root, 'electron-builder.yml'), 'utf8'))
  const notesPath = `docs/releases/${pkg.version}.md`
  assert.equal(config.releaseInfo.releaseNotesFile, notesPath)
  const notes = fs.readFileSync(path.join(root, notesPath), 'utf8').trim()
  for (const title of ['Novità', 'Dati e riavvio', 'Limiti noti']) assert(notes.includes(`## ${title}`), `Sezione note mancante: ${title}`)
  assert(notes.length > 150, 'Note troppo brevi')
  assert.equal(config.publish.provider, 'github')
  assert.equal(config.publish.owner, 'giovannistefanuto')
  assert.equal(config.publish.repo, 'Lezionify')
  if (artifacts) {
    const dist = path.join(root, 'dist')
    const info = yaml.load(fs.readFileSync(path.join(dist, 'latest.yml'), 'utf8'))
    assert.equal(info.version, pkg.version)
    assert.equal(info.releaseNotes.trim(), notes)
    const name = `Lezionify-Setup-${pkg.version}.exe`
    const file = info.files.find(file => decodeURIComponent(file.url) === name)
    assert(file, 'Installer mancante nel manifest')
    const payload = fs.readFileSync(path.join(dist, name))
    assert.equal(file.sha512, crypto.createHash('sha512').update(payload).digest('base64'))
    assert.equal(file.size, payload.length)
    assert(fs.statSync(path.join(dist, `${name}.blockmap`)).size > 0, 'Blockmap mancante')
  }
  return pkg.version
}
module.exports = { validateRelease }
if (require.main === module) console.log(`Release ${validateRelease(process.cwd(), process.argv.includes('--artifacts'), process.env.RELEASE_TAG)} verificata.`)
