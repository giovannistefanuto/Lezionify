const { readFileSync, existsSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { createHash } = require('node:crypto')
const assert = require('node:assert/strict')
function verifyYoutubeTools(directory) {
  const manifest = require('../resources/youtube-tools/manifest.json')
  for (const [key, name] of [['ytDlp', 'yt-dlp.exe'], ['deno', 'deno.exe']]) {
    assert.equal(createHash('sha256').update(readFileSync(join(directory,name))).digest('hex'), manifest[key].sha256, 'YouTube tool mismatch: '+name)
  }
  for (const name of ['GPL-3.0.txt','LICENSE.yt-dlp.txt','LICENSE.deno.txt','NOTICE.md','manifest.json']) {
    assert(existsSync(join(directory,name)), 'Missing YouTube notice: '+name)
    assert(readFileSync(join(directory,name)).equals(readFileSync(join(__dirname,'../resources/youtube-tools',name))), 'YouTube notice changed: '+name)
  }
  console.log('PASS pinned YouTube tools and licenses: '+directory)
}
module.exports = { verifyYoutubeTools }
if (require.main === module) verifyYoutubeTools(resolve(process.argv[2] || 'resources/youtube-tools'))
