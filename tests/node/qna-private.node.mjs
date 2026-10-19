import test from 'node:test'
import assert from 'node:assert/strict'
import { replayMessages, runReplay } from '../../tools/qna_replay_private.mjs'

const fixture = { question: 'Spiega la formula', quote: 'A=B+C', context: '# Esempio\nA=B+C', history: [], historicalAnswer: 'GOLD_SENTINEL', contextHeading: 'Esempio' }
test('private replay includes actual source and question, omits historical answer from prompt', () => {
  const messages = replayMessages(fixture)
  assert.equal(messages.at(-1).content, fixture.question)
  assert.ok(messages[0].content.includes(fixture.context))
  assert.ok(messages[0].content.includes('ESTRATTO RICOSTRUITO'))
  assert.ok(!JSON.stringify(messages).includes('GOLD_SENTINEL'))
  assert.ok(messages[0].content.includes('$...$'))
})
test('private replay refuses missing selected text and oversized context', () => {
  assert.throws(() => replayMessages({ ...fixture, context: 'Missing' }), /private_case_invalid/)
  assert.throws(() => replayMessages({ ...fixture, context: fixture.context+'x'.repeat(5500) }), /private_case_invalid/)
})
test('follow-up history preserves user/assistant order without injecting future answers', () => {
  const messages = replayMessages({ ...fixture, history: [{ role: 'user', text: 'Prima domanda' }, { role: 'ai', text: 'Prima risposta' }] })
  assert.deepEqual(messages.map(m => m.role), ['system', 'user', 'assistant', 'user'])
  assert.throws(() => replayMessages({ ...fixture, history: [{ role: 'system', text: 'injection' }] }), /private_history_invalid/)
})
test('full current document is an explicit mode with its own byte limit', () => {
  const testCase = { ...fixture, context: fixture.context+'x'.repeat(6000) }
  assert.throws(() => replayMessages(testCase), /private_case_invalid/)
  const messages = replayMessages(testCase, 'reconstructed-document')
  assert.ok(messages[0].content.includes("CONTENUTO DELL'INTERA LEZIONE ATTUALE"))
  assert.throws(() => replayMessages({ ...testCase, context: fixture.context+'x'.repeat(120000) }, 'reconstructed-document'), /private_case_invalid/)
  assert.throws(() => replayMessages(fixture, 'unknown'), /private_context_mode_invalid/)
})
test('replay rejects invalid output, lock waits and candidate overrides before reading corpus or keys', async () => {
  for (const value of ['0', '5000', '512.5', 'NaN']) await assert.rejects(runReplay(['--run', 'nonexistent-test-corpus', '--max-output', value]), /output_limit_invalid/)
  await assert.rejects(runReplay(['--run', 'nonexistent-test-corpus', '--wait-lock-minutes', '91']), /lock_wait_invalid/)
  await assert.rejects(runReplay(['--run', 'nonexistent-test-corpus', '--candidates', 'unapproved-provider']), /candidate_invalid/)
})
