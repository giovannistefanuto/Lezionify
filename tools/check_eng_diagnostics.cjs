// Inspect counts and checkpoints only; never prints personal text or identifiers.
const { buildSync } = require('esbuild')
const { mkdtempSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const temp = mkdtempSync(join(tmpdir(), 'lezionify-eng-'))
try {
  buildSync({ stdin: { contents: "export { prepareTranslation } from './electron/main/ai/translationIntegrity'; export { prepareTranslationPlan, translationPlanSchema } from './electron/main/ai/translationPlan'", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', outfile: join(temp, 'plan.cjs') })
  const { prepareTranslation, prepareTranslationPlan, translationPlanSchema } = require(join(temp, 'plan.cjs'))
  const root = join(process.env.APPDATA, 'lezionify/library')
  const library = JSON.parse(readFileSync(join(root, 'library.json'), 'utf8'))
  const pipeline = JSON.parse(readFileSync(join(root, 'ai-jobs/archive-pipeline.json'), 'utf8'))
  const missing = library.lectures.filter(item => item.markdownFileName && !item.markdownEnFileName)
  for (const item of missing) {
    const source = readFileSync(join(root, 'markdown', item.markdownFileName), 'utf8')
    const envelope = prepareTranslation(source)
    const plan = prepareTranslationPlan(envelope)
    const fragments = Object.values(plan).flat().filter(part => 'key' in part).length
    const tasks = pipeline.tasks.filter(task => task.lectureId === item.id).map(task => ({ stage: task.stage, status: task.status, failureKind: task.failureKind }))
    console.log(JSON.stringify({ sourceBytes: Buffer.byteLength(source), sections: envelope.sections.length, fragments, schemaBytes: Buffer.byteLength(JSON.stringify(translationPlanSchema(plan))), tasks }))
  }
} finally { rmSync(temp, { recursive: true, force: true }) }
