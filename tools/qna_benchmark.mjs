import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, readdirSync, openSync, closeSync, unlinkSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { CANDIDATES, BenchError, loadCredentials, redact, streamRequest, estimatePromptTokens, reservation, actualCharge, waitingMs, canReserve, screenAnswer, summarize } from './qna_benchmark_core.mjs'
import { buildMessages } from '../tests/fixtures/qna-benchmark/context.mjs'
import { terminalCheckpoint, reservedAttempts, missingAttemptCheckpoint, sessionDelay } from './qna_benchmark_checkpoint.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifactRoot = join(root, 'local-artifacts', 'qna-benchmark')
const cases = JSON.parse(readFileSync(join(root, 'tests/fixtures/qna-benchmark/cases.json'), 'utf8'))
const abortController = new AbortController()
process.on('SIGINT', () => abortController.abort())
process.on('SIGTERM', () => abortController.abort())

function atomicJson(path, data) {
  const temporary = `${path}.${process.pid}.tmp`
  writeFileSync(temporary, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 })
  renameSync(temporary, path)
}

function hash(data) { return createHash('sha256').update(JSON.stringify(data)).digest('hex') }
function safeId(id) { if (!/^[a-z0-9][a-z0-9-]{0,90}$/.test(id)) throw new BenchError('run_id_invalid'); return id }
function readJson(path, fallback) { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback }

function parseArgs(args) {
  const options = { suite: 'pilot', run: `run-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}`, live: false, maxOutput: 2048 }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--live') options.live = true
    else if (arg === '--suite') options.suite = args[++i]
    else if (arg === '--run') options.run = safeId(args[++i] || '')
    else if (arg === '--max-output') options.maxOutput = Number(args[++i])
    else throw new BenchError('arguments_invalid')
  }
  if (!['pilot', 'main', 'extended', 'long', 'context', 'session', 'all', 'report', 'preflight'].includes(options.suite)) throw new BenchError('suite_invalid')
  if (!Number.isInteger(options.maxOutput) || options.maxOutput < 512 || options.maxOutput > 4096) throw new BenchError('output_limit_invalid')
  return options
}

export function createJobs(suite) {
  const jobs = []
  const add = (candidate, testCase, repetition, phase, target = 2000, position = 'middle', scope = 'document', notBeforeOffset = 0) => {
    jobs.push({ id: safeId(`${phase}-${candidate.id}-${testCase.id}-${target}-${position}-${scope}-${repetition}`), candidateId: candidate.id, caseId: testCase.id, repetition, phase, target, position, scope, notBeforeOffset })
  }
  if (suite === 'pilot' || suite === 'all') for (const testCase of cases.filter(c => c.pilot)) for (const candidate of CANDIDATES) add(candidate, testCase, 0, 'pilot')
  if (suite === 'main' || suite === 'all') {
    for (let repeat = 0; repeat < 3; repeat++) {
      for (let i = 0; i < cases.length; i++) {
        // Rotate model order to avoid always putting the same provider first.
        for (let offset = 0; offset < CANDIDATES.length; offset++) add(CANDIDATES[(i + repeat + offset) % CANDIDATES.length], cases[i], repeat, 'main')
      }
    }
  }
  if (suite === 'long' || suite === 'all') for (const target of [8000, 20000]) for (const position of ['start', 'middle', 'end']) add(CANDIDATES[2], cases[2], 0, 'long', target, position)
  if (suite === 'context' || suite === 'all') for (const candidate of CANDIDATES) for (const testCase of cases.filter(c => ['formula-it', 'followup-amdahl', 'missing-it'].includes(c.id))) for (const scope of ['section', 'document']) add(candidate, testCase, 0, 'context', 2000, 'middle', scope)
  if (suite === 'extended' || suite === 'all') {
    for (let repeat = 0; repeat < 2; repeat++) for (let i = 0; i < 30; i++) {
      const base = i < 10 ? cases[i % 2 ? 11 : 10] : cases[(i - 10) % 10]
      const testCase = variant(base, i)
      for (const candidate of CANDIDATES) add(candidate, testCase, repeat, 'extended', 700, ['start', 'middle', 'end'][i % 3])
    }
  }
  if (suite === 'session' || suite === 'all') for (let i = 0; i < 20; i++) for (const candidate of CANDIDATES) add(candidate, cases[i % cases.length], i, 'session', 2000, 'middle', 'document', i * 180000)
  return jobs
}

function variant(base, index) {
  // New contexts, not merely another random seed of the same question.
  const testCase = structuredClone(base)
  testCase.id = `v${index}-${base.id}`
  if (base.kind === 'missing') {
    const names = ['Ambra', 'Topazio', 'Onice', 'Corallo', 'Quarzo', 'Agata', 'Giada', 'Opale', 'Berillo', 'Granato']
    const name = names[index % names.length]
    testCase.context = `La dispensa sintetica ${name} descrive un algoritmo con conferme e una coda. Non indica né il timeout iniziale né la capacità numerica del buffer. L identificativo del documento è R${index + 100}; tale identificativo non è un parametro dell algoritmo.`
    testCase.question = index % 2 ? `What exact buffer capacity does algorithm ${name} use? If absent, start with NON_PRESENTE_NEL_CONTESTO. Do not guess a capacity.` : `Qual è il timeout iniziale numerico dell algoritmo ${name}? Se assente, inizia con NON_PRESENTE_NEL_CONTESTO e non inventarlo.`
    testCase.rubric = { required: ['^NON_PRESENTE_NEL_CONTESTO'], forbidden: ['\\b\\d+\\b'] }
  } else if (base.kind === 'formula' && base.id === 'formula-it') {
    const expected = 3 * (index + 10) + 2
    testCase.context = `La formula sintetica è C=3A+2B. A=${index + 10} ms e B=1 ms. Non usare altre formule.`
    testCase.question = 'Calcola C in millisecondi e mostra i passaggi in italiano.'
    testCase.rubric = { required: [`\\b${expected}\\b`, 'ms|millisecond'], forbidden: [] }
  } else {
    testCase.context += `\nVincolo del nuovo esempio ${index}: distingue sempre il dato osservato dalle ipotesi e spiega il limite della conclusione.`
    testCase.question += '\nAggiungi una breve frase sul limite della tua conclusione.'
  }
  return testCase
}

function testCaseFor(job) {
  if (!job.caseId.startsWith('v')) return cases.find(c => c.id === job.caseId)
  const match = /^v(\d+)-(.+)$/.exec(job.caseId)
  return variant(cases.find(c => c.id === match[2]), Number(match[1]))
}

function recordFiles(directory) {
  return readdirSync(directory).filter(name => name.endsWith('.result.json')).sort().map(name => readJson(join(directory, name)))
}

function writeReport(directory, records, credentials) {
  const aggregate = summarize(records)
  atomicJson(join(directory, 'summary.json'), redact(aggregate, credentials))
  const columns = ['candidateId', 'phase', 'caseId', 'repetition', 'status', 'errorCategory', 'ttftMs', 'text20Ms', 'totalMs', 'waitingForQuotaMs', 'physicalAttempts', 'promptTokens', 'completionTokens', 'totalTokens', 'automaticCheck']
  const csv = [columns.join(','), ...records.map(row => columns.map(name => {
    const value = name === 'automaticCheck' ? row.screening?.passed : name.endsWith('Tokens') ? row.usage?.[name] : row[name]
    return `"${String(value ?? '').replaceAll('"', '""')}"`
  }).join(','))].join('\n')
  writeFileSync(join(directory, 'results.csv'), csv)
  const ms = value => value === null ? 'ND' : `${(value / 1000).toFixed(2)} s`
  let report = '# Benchmark Q&A senza Gemini — risultati locali\n\n'
  report += 'Dati sintetici. I controlli automatici sono uno screening di marcatori, non una percentuale certificata di correttezza. Latenze del provider separate dalle attese per le quote. Nessuna integrazione nel renderer.\n\n'
  report += '| Candidato | Successi / prove | Primo testo mediano | Completa mediana | Screening passato | Usage mancante |\n| --- | --- | --- | --- | --- | --- |\n'
  for (const row of aggregate) report += `| ${row.candidateId} | ${row.successes}/${row.planned} | ${ms(row.ttftMedianMs)} | ${ms(row.totalMedianMs)} | ${row.automaticChecksPassed} | ${row.usageMissing} |\n`
  report += '\nLe mediane aggregate comprendono fasi diverse: usare summary-by-phase.json per il confronto sul medesimo corpus. Campione di una sessione temporale, non benchmark universale.\n'
  const phases = [...new Set(records.map(r => r.phase))]
  atomicJson(join(directory, 'summary-by-phase.json'), Object.fromEntries(phases.map(phase => [phase, summarize(records.filter(r => r.phase === phase))])))
  for (const row of aggregate) if (Object.keys(row.errors).length) report += `\nErrori ${row.candidateId}: ${JSON.stringify(row.errors)}.\n`
  writeFileSync(join(directory, 'report.md'), report)
  return aggregate
}

async function preflight(credentials, directory) {
  const result = { observedAt: new Date().toISOString(), groq: null, cloudflare: null }
  for (const provider of ['groq', 'cloudflare']) {
    const url = provider === 'groq' ? 'https://api.groq.com/openai/v1/models' : 'https://api.cloudflare.com/client/v4/user/tokens/verify'
    try {
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${credentials[provider]}` } })
      if (!response.ok) { result[provider] = { httpStatus: response.status, accessible: false }; await response.body?.cancel(); continue }
      const data = await response.json()
      result[provider] = provider === 'groq'
        ? { httpStatus: response.status, accessible: true, models: CANDIDATES.filter(c => c.provider === provider).map(c => ({ id: c.model, available: data.data?.some(m => m.id === c.model) === true })) }
        : { httpStatus: response.status, accessible: data.success === true && data.result?.status === 'active' }
    } catch { result[provider] = { accessible: false, errorCategory: 'preflight_network_error' } }
  }
  atomicJson(join(directory, 'preflight.json'), redact(result, credentials))
  console.log(JSON.stringify(result))
  return result
}

async function run() {
  const options = parseArgs(process.argv.slice(2))
  mkdirSync(artifactRoot, { recursive: true })
  const directory = join(artifactRoot, safeId(options.run))
  mkdirSync(directory, { recursive: true })
  if (options.suite === 'report') {
    console.log(JSON.stringify(writeReport(directory, recordFiles(directory), {}), null, 2))
    return
  }
  const credentials = loadCredentials(join(root, '.env'))
  const jobs = createJobs(options.suite)
  const signature = hash({ jobs, cases, maxOutput: options.maxOutput, core: readFileSync(join(root, 'tools/qna_benchmark_core.mjs'), 'utf8'), context: readFileSync(join(root, 'tests/fixtures/qna-benchmark/context.mjs'), 'utf8'), runner: readFileSync(fileURLToPath(import.meta.url), 'utf8'), checkpoint: readFileSync(join(root, 'tools/qna_benchmark_checkpoint.mjs'), 'utf8') })
  if (!options.live) { console.log(JSON.stringify({ dryRun: true, suite: options.suite, jobs: jobs.length, candidates: CANDIDATES.map(c => c.id), signature })); return }

  const lockPath = join(artifactRoot, 'runner.lock')
  if (existsSync(lockPath)) {
    const owner = readJson(lockPath, null)
    if (!Number.isInteger(owner?.pid) || owner.pid <= 0) throw new BenchError('lock_invalid')
    try { process.kill(owner.pid, 0) } catch (error) {
      if (error.code !== 'ESRCH') throw new BenchError('runner_locked')
      // Only our fixed, non-recursive lock file; never remove output directories.
      unlinkSync(lockPath)
    }
  }
  let lock
  try { lock = openSync(lockPath, 'wx'); writeFileSync(lock, JSON.stringify({ pid: process.pid, at: new Date().toISOString() })) } catch { throw new BenchError('runner_locked') }
  const ledgerPath = join(artifactRoot, 'budget-ledger.json')
  let ledger
  try {
    ledger = readJson(ledgerPath, { version: 1, entries: [], cooldowns: {}, calibration: {} })
    if (ledger.version !== 1 || !Array.isArray(ledger.entries)) throw new BenchError('ledger_invalid')
    const manifestPath = join(directory, 'manifest.json')
    const existing = readJson(manifestPath, null)
    if (existing && existing.signature !== signature) throw new BenchError('resume_configuration_changed')
    atomicJson(manifestPath, { version: 2, signature, startedAt: existing?.startedAt || new Date().toISOString(), suite: options.suite, maxOutput: options.maxOutput, jobs: jobs.length, candidates: CANDIDATES, sourceHash: hash(cases), freePlanRequired: true, actualBillingPlanVerified: false })
    const access = await preflight(credentials, directory)
    if (options.suite === 'preflight') return
    for (const job of jobs) {
      const saved = readJson(join(directory, `${job.id}.result.json`), null)
      if (saved && saved.status !== 'skipped') continue
      const attempts = readJson(join(directory, `${job.id}.attempts.json`), [])
      const last = terminalCheckpoint(attempts)
      if (!last) continue
      const testCase = testCaseFor(job)
      const messages = buildMessages(testCase, job.target, job.position, job.scope)
      atomicJson(join(directory, `${job.id}.result.json`), redact({ ...last, jobId: job.id, candidateId: job.candidateId, caseId: job.caseId, phase: job.phase, repetition: job.repetition, targetTokensApprox: job.target, position: job.position, scope: job.scope, physicalAttempts: Math.max(attempts.length, reservedAttempts(ledger, options.run, job.id)), waitingForQuotaMs: null, logicalTotalMs: null, requestHash: hash(messages), screening: last.status === 'success' ? screenAnswer(last.answer, testCase.rubric) : null, recoveredFromCheckpoint: true }, credentials))
    }
    const results = recordFiles(directory)
    const completed = new Set(results.filter(r => r.status !== 'skipped').map(r => r.jobId))
    const pending = jobs.filter(job => !completed.has(job.id))
    let sessionStart = null
    let sessionClock = null
    const disabled = new Set()
    let currentPhase = null
    while (pending.length && !abortController.signal.aborted) {
      // Preserve phase order; within a phase select a ready candidate to avoid
      // blocking Cloudflare behind a Groq cooldown.
      currentPhase = pending[0].phase
      if (currentPhase === 'session' && sessionStart === null) {
        const sessionPath = join(directory, 'session-clock.json')
        sessionClock = readJson(sessionPath, null) || { startedAtMs: Date.now(), intervalMs: 180000, samples: 20, lastDispatch: {} }
        sessionClock.lastDispatch ||= {}
        sessionStart = sessionClock.startedAtMs
        atomicJson(sessionPath, sessionClock)
      }
      const phaseJobs = pending.filter(job => job.phase === currentPhase)
      let selected = null, minWait = Infinity
      for (const job of phaseJobs) {
        const candidate = CANDIDATES.find(c => c.id === job.candidateId)
        const testCase = testCaseFor(job)
        const messages = buildMessages(testCase, job.target, job.position, job.scope)
        const bytes = Buffer.byteLength(JSON.stringify(messages))
        const inputEstimate = ledger.calibration[candidate.id] ? Math.ceil(bytes * ledger.calibration[candidate.id] * 1.2) + 64 : estimatePromptTokens(messages)
        const reserved = reservation(candidate, inputEstimate, options.maxOutput)
        let skip = null
        if (missingAttemptCheckpoint(ledger, options.run, job.id, readJson(join(directory, `${job.id}.attempts.json`), []))) skip = 'interrupted_attempt_unknown'
        else if (disabled.has(candidate.id)) skip = 'candidate_disabled'
        else if (access[candidate.provider]?.accessible === false && candidate.provider === 'groq') skip = 'preflight_failed'
        else if (candidate.provider === 'groq' && access.groq?.models?.some(m => m.id === candidate.model && !m.available)) skip = 'model_unavailable'
        else if (inputEstimate + options.maxOutput > candidate.context) skip = 'context_limit'
        else if (!canReserve(candidate, ledger, reserved)) skip = 'daily_budget'
        let wait = waitingMs(candidate, ledger, reserved)
        if (wait === Infinity) skip = 'minute_budget'
        if (skip) {
          const result = { jobId: job.id, candidateId: candidate.id, caseId: job.caseId, phase: job.phase, repetition: job.repetition, status: 'skipped', errorCategory: skip, usage: null }
          atomicJson(join(directory, `${job.id}.result.json`), result)
          pending.splice(pending.indexOf(job), 1)
          console.log(`${job.id}: skipped (${skip})`)
          continue
        }
        if (job.phase === 'session') wait = Math.max(wait, sessionDelay(job, sessionClock))
        if (!selected || wait < minWait) { selected = { job, candidate, testCase, messages, inputEstimate, reserved, bytes }; minWait = wait }
      }
      if (!selected) continue
      if (minWait > 0) {
        console.log(`Attesa quota/sessione: ${Math.ceil(minWait / 1000)} s (${currentPhase}); checkpoint salvati.`)
        await sleep(Math.min(minWait, 30000), undefined, { signal: abortController.signal }).catch(() => {})
        continue
      }
      const { job, candidate, testCase, messages, inputEstimate, reserved, bytes } = selected
      const existingAttempt = readJson(join(directory, `${job.id}.attempts.json`), [])
      const physicalAttempts = Math.max(existingAttempt.length, reservedAttempts(ledger, options.run, job.id))
      let result = null
      const logicalStart = Date.now()
      let waitingForQuotaMs = 0
      if (job.phase === 'session') {
        sessionClock.lastDispatch[candidate.id] = { jobId: job.id, sentAtMs: Date.now() }
        atomicJson(join(directory, 'session-clock.json'), sessionClock)
      }
      for (let attempt = physicalAttempts; attempt < 2 && !abortController.signal.aborted; attempt++) {
        if (!canReserve(candidate, ledger, reserved)) break
        const waited = waitingMs(candidate, ledger, reserved)
        if (waited > 120000) break
        if (waited > 0) { await sleep(waited, undefined, { signal: abortController.signal }).catch(() => {}); waitingForQuotaMs += waited }
        if (abortController.signal.aborted) break
        const entry = { runId: options.run, attempt: attempt+1, candidateId: candidate.id, provider: candidate.provider, timestamp: Date.now(), day: new Date().toISOString().slice(0, 10), charge: reserved, reserved, jobId: job.id, settled: false }
        ledger.entries.push(entry)
        atomicJson(ledgerPath, ledger) // Reserve before sending, including crash recovery.
        console.log(`${job.id}: invio tentativo ${attempt + 1}`)
        const one = await streamRequest(candidate, messages, credentials, { maxOutput: options.maxOutput, signal: abortController.signal })
        entry.charge = actualCharge(candidate, one.usage, reserved)
        entry.settled = true
        if (one.usage?.promptTokens > 0) ledger.calibration[candidate.id] = Math.max(ledger.calibration[candidate.id] || 0, one.usage.promptTokens / bytes)
        const limits = one.rateLimits
        const remain = limits['x-ratelimit-remaining-tokens']
        if (one.errorCategory === 'rate_limit' || (remain !== undefined && remain < inputEstimate + options.maxOutput)) {
          const delay = Math.max(limits['retry-after-ms'] || 0, limits['x-ratelimit-reset-tokens-ms'] || 0, one.errorCategory === 'rate_limit' ? 61000 : 1000)
          ledger.cooldowns[candidate.id] = Date.now() + delay
        }
        atomicJson(ledgerPath, ledger)
        existingAttempt.push({ ...one, attempt: attempt + 1, at: new Date().toISOString() })
        atomicJson(join(directory, `${job.id}.attempts.json`), redact(existingAttempt, credentials))
        result = { ...one, jobId: job.id, candidateId: candidate.id, caseId: job.caseId, phase: job.phase, repetition: job.repetition, targetTokensApprox: job.target, position: job.position, scope: job.scope, inputEstimate, maxOutput: options.maxOutput, physicalAttempts: Math.max(existingAttempt.length, reservedAttempts(ledger, options.run, job.id)), waitingForQuotaMs, logicalTotalMs: physicalAttempts > 0 ? null : Date.now() - logicalStart, resumedPreviousAttempts: physicalAttempts > 0, requestHash: hash(messages), screening: one.status === 'success' ? screenAnswer(one.answer, testCase.rubric) : null, at: new Date().toISOString() }
        // Never retry after any visible text; preserve partial failures separately.
        if (one.status === 'success' || one.answer || !['rate_limit', 'server_error', 'network_or_stream_error'].includes(one.errorCategory)) break
        if (one.errorCategory !== 'rate_limit') { await sleep(2000, undefined, { signal: abortController.signal }).catch(() => {}); waitingForQuotaMs += 2000 }
      }
      if (!result) result = { jobId: job.id, candidateId: candidate.id, caseId: job.caseId, phase: job.phase, repetition: job.repetition, status: 'skipped', errorCategory: abortController.signal.aborted ? 'cancelled' : 'attempt_budget', physicalAttempts: Math.max(existingAttempt.length, reservedAttempts(ledger, options.run, job.id)), usage: null }
      atomicJson(join(directory, `${job.id}.result.json`), redact(result, credentials))
      if (['authorization', 'invalid_request', 'model_unavailable'].includes(result.errorCategory)) disabled.add(candidate.id)
      pending.splice(pending.indexOf(job), 1)
      console.log(`${job.id}: ${result.status}; primo testo ${result.ttftMs?.toFixed(0) ?? 'ND'} ms; totale ${result.totalMs?.toFixed(0) ?? 'ND'} ms; controllo ${result.screening?.passed ?? 'ND'}`)
      writeReport(directory, recordFiles(directory), credentials)
    }
    const aggregate = writeReport(directory, recordFiles(directory), credentials)
    console.log(JSON.stringify({ run: options.run, suite: options.suite, interrupted: abortController.signal.aborted, remaining: pending.length, summary: aggregate }, null, 2))
  } finally {
    closeSync(lock)
    unlinkSync(lockPath)
    credentials.groq = ''; credentials.cloudflare = ''; credentials.account = ''
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(error => {
    console.error(`Benchmark interrotto: ${error instanceof BenchError ? error.category : 'local_configuration_or_io_error'}. Nessun dettaglio sensibile viene stampato.`)
    process.exitCode = 1
  })
}
