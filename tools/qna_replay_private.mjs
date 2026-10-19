import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, readdirSync, openSync, closeSync, unlinkSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { CANDIDATES, BenchError, loadCredentials, redact, streamRequest, estimatePromptTokens, reservation, actualCharge, waitingMs, canReserve, summarize } from './qna_benchmark_core.mjs'
import { terminalCheckpoint, reservedAttempts, missingAttemptCheckpoint } from './qna_benchmark_checkpoint.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifactRoot = join(root, 'local-artifacts', 'qna-benchmark')
const hash = data => createHash('sha256').update(data).digest('hex')
const runnerSource = readFileSync(fileURLToPath(import.meta.url), 'utf8')
const coreSource = readFileSync(join(root, 'tools/qna_benchmark_core.mjs'), 'utf8')
const checkpointSource = readFileSync(join(root, 'tools/qna_benchmark_checkpoint.mjs'), 'utf8')
const readJson = (path, fallback) => existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback
function atomicJson(path, value) {
  const temporary = `${path}.${process.pid}.tmp`
  writeFileSync(temporary, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 })
  renameSync(temporary, path)
}

export function replayMessages(testCase, contextMode = 'reconstructed-excerpt') {
  if (!['reconstructed-excerpt', 'reconstructed-document'].includes(contextMode)) throw new BenchError('private_context_mode_invalid')
  if (!testCase || typeof testCase.question !== 'string' || !testCase.question.trim() || typeof testCase.quote !== 'string' || !testCase.quote.trim() || typeof testCase.context !== 'string' || !testCase.context.includes(testCase.quote) || Buffer.byteLength(testCase.context) > (contextMode === 'reconstructed-document' ? 120000 : 5500)) throw new BenchError('private_case_invalid')
  // The original app does not persist the full-context switch. Explicitly label
  // this excerpt rather than claiming to reproduce the original request exactly.
  let system = 'Sei un professore universitario di un corso magistrale. Lo studente sta studiando la dispensa e ti fa domande specifiche su una porzione di testo che ha selezionato. Rispondi in italiano in modo chiaro, proporzionato (né troppo lungo né troppo corto), usando LaTeX ($...$ e $$...$$) per le formule matematiche. Mantieni il contesto del discorso.\n\n'
  system += `${contextMode === 'reconstructed-document' ? "CONTENUTO DELL'INTERA LEZIONE ATTUALE" : 'ESTRATTO RICOSTRUITO DALLA DISPENSA ATTUALE'}:\n${testCase.context}\n\nFRASE SELEZIONATA DALLO STUDENTE SU CUI VERTE LA DOMANDA:\n"${testCase.quote}"\n\n`
  if (testCase.contextHeading) system += `(La frase si trova sotto il paragrafo: "${testCase.contextHeading}")\n\n`
  const history = (testCase.history || []).filter(message => message.text?.trim()).map(message => {
    if (!['user', 'ai'].includes(message.role)) throw new BenchError('private_history_invalid')
    return { role: message.role === 'ai' ? 'assistant' : 'user', content: message.text }
  })
  return [{ role: 'system', content: system }, ...history, { role: 'user', content: testCase.question }]
}

export async function runReplay(args = process.argv.slice(2)) {
  let runId = null, live = false, candidateIds = CANDIDATES.map(c => c.id), waitLockMinutes = 0, maxOutput = 2048
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--run') runId = args[++i]
    else if (args[i] === '--live') live = true
    else if (args[i] === '--candidates') candidateIds = (args[++i] || '').split(',')
    else if (args[i] === '--wait-lock-minutes') waitLockMinutes = Number(args[++i])
    else if (args[i] === '--max-output') maxOutput = Number(args[++i])
    else throw new BenchError('arguments_invalid')
  }
  if (!/^[a-z0-9][a-z0-9-]{0,90}$/.test(runId || '')) throw new BenchError('run_id_invalid')
  if (!candidateIds.length || new Set(candidateIds).size !== candidateIds.length || candidateIds.some(id => !CANDIDATES.some(c => c.id === id))) throw new BenchError('candidate_invalid')
  if (!Number.isInteger(waitLockMinutes) || waitLockMinutes < 0 || waitLockMinutes > 90) throw new BenchError('lock_wait_invalid')
  if (!Number.isInteger(maxOutput) || maxOutput < 512 || maxOutput > 4096) throw new BenchError('output_limit_invalid')
  const candidates = CANDIDATES.filter(c => candidateIds.includes(c.id))
  const directory = join(artifactRoot, runId)
  const corpusRaw = readFileSync(join(directory, 'corpus.private.json'), 'utf8')
  const corpus = JSON.parse(corpusRaw)
  if (corpus.version !== 1 || corpus.private !== true || !Array.isArray(corpus.cases) || !corpus.cases.length || corpus.cases.length > 12 || new Set(corpus.cases.map(c => c.id)).size !== corpus.cases.length || corpus.cases.some(c => !/^real-\d{2}$/.test(c.id) || !c.sourceReadOnlyVerified)) throw new BenchError('private_corpus_invalid')
  const jobs = corpus.cases.flatMap((testCase, index) => candidates.map((_, offset) => ({ testCase, candidate: candidates[(index+offset) % candidates.length] })))
  jobs.forEach(job => replayMessages(job.testCase, corpus.contextMode))
  if (!live) { console.log(JSON.stringify({ dryRun: true, jobs: jobs.length, cases: corpus.cases.length, contextMode: corpus.contextMode, maxOutput })); return }
  const credentials = loadCredentials(join(root, '.env'))
  const controller = new AbortController()
  const abort = () => controller.abort()
  process.on('SIGINT', abort)
  process.on('SIGTERM', abort)
  const lockPath = join(artifactRoot, 'runner.lock')
  const lockDeadline = Date.now()+waitLockMinutes*60000
  if (waitLockMinutes && existsSync(lockPath)) console.log('Replay in coda: attendo il lock condiviso, senza inviare richieste o modificare il ledger.')
  while (waitLockMinutes && existsSync(lockPath) && !controller.signal.aborted) {
    const owner = readJson(lockPath, null)
    if (!Number.isInteger(owner?.pid) || owner.pid <= 0) throw new BenchError('lock_invalid')
    try { process.kill(owner.pid, 0) } catch (error) {
      if (error.code === 'ESRCH') break
      throw new BenchError('runner_locked')
    }
    if (Date.now() >= lockDeadline) throw new BenchError('lock_wait_timeout')
    await sleep(5000, undefined, { signal: controller.signal }).catch(() => {})
  }
  if (controller.signal.aborted) throw new BenchError('cancelled')
  if (existsSync(lockPath)) {
    const owner = readJson(lockPath, null)
    if (!Number.isInteger(owner?.pid) || owner.pid <= 0) throw new BenchError('lock_invalid')
    try { process.kill(owner.pid, 0); throw new BenchError('runner_locked') } catch (error) {
      if (error.code !== 'ESRCH') throw error
      unlinkSync(lockPath)
    }
  }
  let lock
  try { lock = openSync(lockPath, 'wx'); writeFileSync(lock, JSON.stringify({ pid: process.pid, at: new Date().toISOString() })) } catch { throw new BenchError('runner_locked') }
  try {
    mkdirSync(directory, { recursive: true })
    const signature = hash(JSON.stringify({ corpus: hash(corpusRaw), core: hash(coreSource), runner: hash(runnerSource), checkpoint: hash(checkpointSource), maxOutput, candidateIds }))
    const manifestPath = join(directory, 'manifest.json')
    const previous = readJson(manifestPath, null)
    if (previous && previous.signature !== signature) throw new BenchError('resume_configuration_changed')
    atomicJson(manifestPath, { signature, startedAt: previous?.startedAt || new Date().toISOString(), suite: 'real', private: true, jobs: jobs.length, cases: corpus.cases.length, contextMode: corpus.contextMode, originalFullContextFlagKnown: false, historicalAnswerIsGold: false, actualBillingPlanVerified: false, maxOutput, candidates })
    writeFileSync(join(directory, 'runner-source.mjs'), runnerSource)
    writeFileSync(join(directory, 'core-source.mjs'), coreSource)
    writeFileSync(join(directory, 'checkpoint-source.mjs'), checkpointSource)
    const ledgerPath = join(artifactRoot, 'budget-ledger.json')
    const ledger = readJson(ledgerPath, { version: 1, entries: [], cooldowns: {}, calibration: {} })
    if (ledger.version !== 1 || !Array.isArray(ledger.entries)) throw new BenchError('ledger_invalid')
    const disabled = new Set()
    for (const { candidate, testCase } of jobs) {
      if (controller.signal.aborted) break
      const jobId = `real-${candidate.id}-${testCase.id}`
      const resultPath = join(directory, `${jobId}.result.json`)
      const existing = readJson(resultPath, null)
      if (existing && existing.status !== 'skipped') continue
      const messages = replayMessages(testCase, corpus.contextMode)
      const bytes = Buffer.byteLength(JSON.stringify(messages))
      const inputEstimate = ledger.calibration[candidate.id] ? Math.ceil(bytes*ledger.calibration[candidate.id]*1.2)+64 : estimatePromptTokens(messages)
      const reserved = reservation(candidate, inputEstimate, maxOutput)
      const attempts = readJson(join(directory, `${jobId}.attempts.private.json`), [])
      const used = Math.max(attempts.length, reservedAttempts(ledger, runId, jobId))
      const recovered = terminalCheckpoint(attempts)
      if (recovered) {
        atomicJson(resultPath, redact({ ...recovered, jobId, candidateId: candidate.id, caseId: testCase.id, phase: 'real', repetition: 0, physicalAttempts: used, inputEstimate, maxOutput, waitingForQuotaMs: null, logicalTotalMs: null, requestHash: hash(JSON.stringify(messages)), contextMode: corpus.contextMode, screening: null, recoveredFromCheckpoint: true }, credentials))
        continue
      }
      const logicalStart = Date.now()
      let waitingForQuotaMs = 0, result = attempts.at(-1) || null
      const unknownAttempt = missingAttemptCheckpoint(ledger, runId, jobId, attempts)
      if (unknownAttempt) result = { status: 'skipped', errorCategory: 'interrupted_attempt_unknown', usage: null }
      for (let attempt = used; attempt < 2 && !unknownAttempt; attempt++) {
        const wait = waitingMs(candidate, ledger, reserved)
        const skip = disabled.has(candidate.id) ? 'candidate_disabled' : !canReserve(candidate, ledger, reserved) ? 'daily_budget' : inputEstimate+maxOutput > candidate.context ? 'context_limit' : wait === Infinity ? 'minute_budget' : wait > 120000 ? 'cooldown_limit' : null
        if (skip) { result ||= { status: 'skipped', errorCategory: skip, usage: null }; break }
        if (wait > 0) { await sleep(wait, undefined, { signal: controller.signal }).catch(() => {}); waitingForQuotaMs += wait }
        if (controller.signal.aborted) break
        if (!canReserve(candidate, ledger, reserved)) { result ||= { status: 'skipped', errorCategory: 'daily_budget', usage: null }; break }
        const entry = { runId, attempt: attempt+1, candidateId: candidate.id, provider: candidate.provider, timestamp: Date.now(), day: new Date().toISOString().slice(0, 10), charge: reserved, reserved, jobId, settled: false }
        ledger.entries.push(entry)
        atomicJson(ledgerPath, ledger)
        console.log(`${jobId}: invio tentativo ${attempt+1}`)
        const one = await streamRequest(candidate, messages, credentials, { maxOutput, signal: controller.signal })
        entry.charge = actualCharge(candidate, one.usage, reserved)
        entry.settled = true
        if (one.usage?.promptTokens > 0) ledger.calibration[candidate.id] = Math.max(ledger.calibration[candidate.id] || 0, one.usage.promptTokens/bytes)
        const remain = one.rateLimits['x-ratelimit-remaining-tokens']
        if (one.errorCategory === 'rate_limit' || (remain !== undefined && remain < inputEstimate+maxOutput)) ledger.cooldowns[candidate.id] = Date.now()+Math.max(one.rateLimits['retry-after-ms'] || 0, one.rateLimits['x-ratelimit-reset-tokens-ms'] || 0, one.errorCategory === 'rate_limit' ? 61000 : 1000)
        atomicJson(ledgerPath, ledger)
        attempts.push({ ...one, at: new Date().toISOString(), attempt: attempt+1 })
        atomicJson(join(directory, `${jobId}.attempts.private.json`), redact(attempts, credentials))
        result = one
        if (one.status === 'success' || one.answer || !['rate_limit', 'server_error', 'network_or_stream_error'].includes(one.errorCategory)) break
        if (one.errorCategory !== 'rate_limit') { await sleep(2000, undefined, { signal: controller.signal }).catch(() => {}); waitingForQuotaMs += 2000 }
      }
      result ||= { status: 'skipped', errorCategory: controller.signal.aborted ? 'cancelled' : 'attempt_budget', usage: null }
      result = { ...result, jobId, candidateId: candidate.id, caseId: testCase.id, phase: 'real', repetition: 0, physicalAttempts: Math.max(attempts.length, reservedAttempts(ledger, runId, jobId)), inputEstimate, maxOutput, waitingForQuotaMs, logicalTotalMs: used > 0 ? null : Date.now()-logicalStart, resumedPreviousAttempts: used > 0, requestHash: hash(JSON.stringify(messages)), contextMode: corpus.contextMode, screening: null, at: new Date().toISOString() }
      atomicJson(resultPath, redact(result, credentials))
      if (['authorization', 'invalid_request', 'model_unavailable'].includes(result.errorCategory)) disabled.add(candidate.id)
      console.log(`${jobId}: ${result.status}; primo testo ${result.ttftMs?.toFixed(0) ?? 'ND'} ms; totale ${result.totalMs?.toFixed(0) ?? 'ND'} ms`)
    }
    const records = readdirSync(directory).filter(name => name.endsWith('.result.json')).map(name => readJson(join(directory, name)))
    const summary = summarize(records)
    atomicJson(join(directory, 'summary.json'), summary)
    atomicJson(join(directory, 'completion.json'), { interrupted: controller.signal.aborted, completed: records.length, planned: jobs.length, at: new Date().toISOString() })
    console.log(JSON.stringify({ run: runId, summary }))
  } finally {
    closeSync(lock)
    unlinkSync(lockPath)
    process.off('SIGINT', abort)
    process.off('SIGTERM', abort)
    credentials.groq = ''; credentials.cloudflare = ''; credentials.account = ''
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runReplay().catch(error => {
  console.error(`Replay interrotto: ${error instanceof BenchError ? error.category : 'local_configuration_or_io_error'}.`)
  process.exitCode = 1
})
