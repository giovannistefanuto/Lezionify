// Explicitly invoked, user-authorized private evaluation. No keys or source text in stdout.
import { app } from 'electron'
import { join, basename } from 'node:path'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { SettingsService } from '../../electron/main/settings'
import { GeminiRequestManager, type KeyConfig } from '../../electron/main/ai/geminiRequestManager'
import { GeminiTransport } from '../../electron/main/ai/geminiTransport'
import { GeminiError } from '../../electron/main/ai/geminiErrors'
import { completeCourseResponse, createCourseCompletionContext } from '../../electron/main/ai/courseRagCompletion'
import { CourseRagService } from '../../electron/main/courseRag'
import { splitCourseSource, ragHash, type IndexedCourseSource } from '../../electron/main/courseRagIndex'
import { LocalCourseSemantic } from '../../electron/main/courseRagSemantic'
import type { Lecture } from '../../shared/archive'
import { parseCourseGrounding } from '../../shared/courseGrounding'
import { courseGroundingPrompt } from '../../electron/main/courseRagGrounding'

const output = join(process.cwd(), 'local-artifacts/rag-completion-2026-10-23')
const profile = join(output, 'profile')
mkdirSync(profile, { recursive: true })
// Reuse only the encrypted OS crypt metadata so Electron can decrypt configured
// credentials without opening or writing the user's Chromium profile.
const crypt = JSON.parse(readFileSync(join(app.getPath('appData'), 'lezionify', 'Local State'), 'utf8')).os_crypt
if (crypt) writeFileSync(join(profile, 'Local State'), JSON.stringify({ os_crypt: crypt }))
app.setPath('userData', profile)
app.setName('Lezionify')
await app.whenReady()
await mkdir(output, { recursive: true })
const budgetPath = join(output, 'budget.json')
let budget: { used: number; tokens: number; attempts: { model: string; outcome: string; tokens?: number }[] } = { used: 0, tokens: 0, attempts: [] }
try { budget = JSON.parse(await readFile(budgetPath, 'utf8')) } catch { /* First explicit run. */ }
const stopAt = new Date('2026-10-23T13:50:00+02:00').getTime()
class CappedTransport extends GeminiTransport {
  override async generateContentStream(params: Parameters<GeminiTransport['generateContentStream']>[0]) {
    if (budget.used >= 60 || Date.now() >= stopAt) throw new GeminiError({ category: 'cancelled', isRetryable: false, isDailyQuota: false, recoveryDisposition: 'terminal', sanitizedMessage: 'Budget esplicito del collaudo esaurito.' })
    const attempt = { model: params.model, outcome: 'started', tokens: 0 }
    budget.used++; budget.attempts.push(attempt)
    await writeFile(budgetPath, JSON.stringify(budget, null, 2))
    let raw = ''
    try {
      const result = await super.generateContentStream({ ...params, onChunk: chunk => { raw += chunk; params.onChunk(chunk) } })
      attempt.outcome = 'completed'; attempt.tokens = result.usageMetadata?.totalTokenCount ?? 0; budget.tokens += attempt.tokens
      return result
    } catch (error) { attempt.outcome = error instanceof GeminiError ? error.category : 'failure'; throw error }
    finally {
      await writeFile(join(output, `response-attempt-${budget.attempts.indexOf(attempt) + 1}.txt`), raw)
      await writeFile(budgetPath, JSON.stringify(budget, null, 2))
    }
  }
}
const root = join(app.getPath('appData'), 'lezionify')
const settings = await new SettingsService(join(root, 'library')).getSettings()
const keys: KeyConfig[] = (settings.apiKeys?.length ? settings.apiKeys : [settings.apiKey]).flatMap((key, index) => key ? [{ key, id: `key-${index}`, quotaGroup: settings.apiKeyQuotaGroups?.[index] || 'default-project', quotaGroupKnown: Boolean(settings.apiKeyQuotaGroups?.[index] && settings.apiKeyQuotaGroups[index] !== 'default-project') }] : [])
if (!keys.length) throw new Error('Configured credentials unavailable')
const start = Math.max(0, Math.min(keys.length - 1, settings.activeKeyIndex ?? 0))
const rotatedKeys = [...keys.slice(start), ...keys.slice(0, start)]
const manager = new GeminiRequestManager(undefined, new CappedTransport())
const deps = { requestManager: manager, getSettings: async () => settings, getManagedKeys: async () => rotatedKeys }
const library = JSON.parse(await readFile(join(root, 'library/library.json'), 'utf8')) as { lectures: Lecture[] }
const corpora = new Map<string, IndexedCourseSource[]>()
for (const course of [...new Set(library.lectures.map(lecture => lecture.courseCode))]) {
  const lectures = library.lectures.filter(lecture => lecture.courseCode === course).sort((a, b) => (a.recordedAt ?? a.importedAt).localeCompare(b.recordedAt ?? b.importedAt))
  const ordinals = new Map(lectures.filter(lecture => !lecture.isLaboratory).map((lecture, index) => [lecture.id, index + 1]))
  const sources: IndexedCourseSource[] = []
  for (const lecture of lectures) for (const kind of ['transcript', 'notes'] as const) {
    const name = kind === 'transcript' ? lecture.transcriptFileName : lecture.markdownFileName
    if (!name || basename(name) !== name) continue
    const text = await readFile(join(root, 'library', kind === 'transcript' ? 'transcripts' : 'markdown', name), 'utf8')
    sources.push({ ...splitCourseSource({ id: ragHash(`${kind}:${lecture.id}`), title: `${kind} ${ordinals.get(lecture.id) ?? 'lab'}`, kind, provenance: kind === 'notes' ? 'ai-derived' : 'original', lectureId: lecture.id, lectureOrdinal: ordinals.get(lecture.id), version: ragHash(text), status: 'ready' }, [{ text }]), rawText: kind === 'transcript' ? text : undefined })
  }
  corpora.set(course, sources)
}
// Questions and expected concepts selected from source outlines BEFORE running retrieval.
const cases = [
  { id: 'gt-lottery', course: 'GT', question: 'Spiega nella lezione 2 il ruolo delle lotterie e degli assiomi di von Neumann-Morgenstern. Distingui valore atteso e utilità attesa, citando i passaggi.', expected: ['Preferenze sulle lotterie', 'utilità attesa', 'ruolo degli assiomi', 'rischio e valore atteso non equivalenti'] },
  { id: 'ir-embodiment', course: 'IR', question: 'Perché embodiment distingue un robot da un computer? Usa le fonti del corso e spiega il ruolo di ROS 2.', expected: ['Corpo e interazione fisica', 'percezione e azione', 'middleware e modularità', 'nessuna attribuzione fuori corso'] },
  { id: 'rc-adaptive', course: 'RC', question: 'Quali sono i due ingredienti del controllo adattativo diretto nella lezione 1? Spiega parametrizzazione lineare e ruolo della struttura di controllo, distinguendo stabilità e identificazione dei parametri.', expected: ['Regressore lineare nei parametri', 'struttura del controllo', 'stabilità con ipotesi esplicite', 'non garantire convergenza parametri senza ipotesi'] },
  { id: 'rl-comparison', course: 'RL', question: 'Confronta Q_pi e il ruolo della politica greedy nelle lezioni 5, 6 e 7. Distingui definizione, miglioramento e uso senza modello noto; migliorata significa sempre ottima?', expected: ['Tre lezioni distinte', 'definizione di Q', 'argmax e miglioramento', 'modello ignoto ed esperienza', 'miglioramento non equivale sempre a ottimalità'] },
  { id: 'gt-negative', course: 'GT', question: 'Quale teorema di crittografia post-quantistica viene dimostrato nelle fonti del corso? Fornisci la dimostrazione soltanto se documentata.', expected: ['Astensione esplicita', 'nessun teorema o prova inventata', 'non trovato non significa mai svolto'] },
  { id: 'ir-negative', course: 'IR', question: 'Nel materiale fornito qual è il PIN segreto di fabbrica del robot personale del docente? Non inventare dati mancanti.', expected: ['Astensione', 'nessun dato personale inventato'] }
]
await writeFile(join(output, 'annotations-before-run.json'), JSON.stringify(cases, null, 2))
const summaries: { id: string; outcome: string }[] = []
const selectedCase = process.argv.find(arg => arg.startsWith('--case='))?.slice(7)
const semantic = new LocalCourseSemantic(join(process.cwd(), 'local-artifacts/rag-semantic-model'))
const service = new CourseRagService(join(profile, 'course-rag'), {
  semantic, checkGrounding: true,
  archiveSources: async course => ({ sources: corpora.get(course) ?? [], missingTranscripts: 0 }),
  complete: async (prompt, signal, images, context) => {
    const ctx = context ?? createCourseCompletionContext()
    ctx.deadline = Math.min(ctx.deadline, Date.now() + 180000, stopAt)
    ctx.remainingAttempts = Math.min(ctx.remainingAttempts, 60 - budget.used)
    const name = `sent-${Date.now()}-${budget.used}`
    await writeFile(join(output, name + '.json'), prompt)
    return completeCourseResponse(deps, prompt, signal, images, ctx)
  }
})
try {
  for (let repetition = 1; repetition <= 2; repetition++) for (const item of cases) {
    const id = `${item.id}-${repetition}`
    if (process.argv.includes('--audit-only') || (selectedCase && selectedCase !== id)) continue
    try { await readFile(join(output, id + '.json')); continue } catch { /* No saved result. */ }
    const began = Date.now(), before = budget.used
    await service.saveThread(item.course, { id, title: 'Valutazione privata isolata', draft: '', messages: [], updatedAt: '' })
    try {
      const thread = await service.ask(item.course, id, item.question, id)
      await writeFile(join(output, id + '.json'), JSON.stringify({ ...item, repetition, thread }, null, 2))
      const answer = thread.messages.at(-1)!
      const summary = { id, outcome: 'completed', attempts: budget.used - before, elapsedMs: Date.now() - began, citations: answer.citations?.length ?? 0, grounding: answer.grounding?.status, unsupported: answer.grounding?.claims.filter(claim => claim.support === 'unsupported').length ?? 0 }
      summaries.push(summary); console.log(JSON.stringify(summary))
    } catch {
      const summary = { id, outcome: 'transport_or_contract_failure', attempts: budget.used - before, elapsedMs: Date.now() - began }
      summaries.push(summary); console.log(JSON.stringify(summary))
      await writeFile(join(output, id + '-failure.json'), JSON.stringify(summary))
    }
    await writeFile(join(output, 'summary.json'), JSON.stringify({ used: budget.used, tokens: budget.tokens, summaries }, null, 2))
    if (budget.used >= 48 || Date.now() >= stopAt) break
  }
  // Annotated adversarial support tests, deliberately independent of retrieval.
  const source = splitCourseSource({ id: 'audit-fixture', title: 'Synthetic evidence', kind: 'transcript', status: 'ready', version: '1', lectureOrdinal: 1 }, [{ text: 'Una politica migliorata non è necessariamente ottima. La convergenza dei parametri richiede eccitazione persistente. TCP ritrasmette i segmenti persi.' }])
  const evidence = source.passages.map(passage => ({ source, passage }))
  const checks = [
    { text: 'Una politica migliorata è sempre ottima.', expected: 'unsupported' },
    { text: 'La convergenza dei parametri è garantita senza alcuna ipotesi.', expected: 'unsupported' },
    { text: 'TCP ritrasmette i segmenti persi.', expected: 'supported' },
    { text: 'La lezione 2 dimostra che TCP usa UDP.', expected: 'unsupported' }
  ]
  const results = []
  for (const [index, item] of (selectedCase ? [] : checks).entries()) {
    if (budget.used >= 60 || Date.now() >= stopAt) break
    try {
      const ctx = createCourseCompletionContext(); ctx.remainingAttempts = Math.min(3, 60 - budget.used); ctx.deadline = Math.min(Date.now() + 120000, stopAt)
      const review = parseCourseGrounding(await completeCourseResponse(deps, courseGroundingPrompt(item.text, evidence), AbortSignal.timeout(120000), undefined, ctx), item.text, evidence)
      results.push({ index, expected: item.expected, review, pass: review.claims.some(claim => claim.support === item.expected) })
    } catch { results.push({ index, expected: item.expected, pass: false, failure: 'transport_or_contract' }) }
    await writeFile(join(output, 'audit-annotated.json'), JSON.stringify(results, null, 2))
  }
  console.log(JSON.stringify({ result: 'FINISHED', used: budget.used, tokens: budget.tokens, cases: summaries.length, auditCases: results.length, auditPassed: results.filter(result => result.pass).length }))
  if (summaries.some(item => item.outcome !== 'completed') || results.some(item => !item.pass)) process.exitCode = 1
} finally { service.dispose() }
app.exit(process.exitCode === 1 ? 1 : 0)
