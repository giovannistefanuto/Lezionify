import { app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { SettingsService } from '../../electron/main/settings'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'
import { GeminiTransport } from '../../electron/main/ai/geminiTransport'
import { GeminiError } from '../../electron/main/ai/geminiErrors'
import { completeCourseResponse } from '../../electron/main/ai/courseRagCompletion'
import { parseCourseAction } from '../../shared/courseRag'
import { CourseRagService } from '../../electron/main/courseRag'
import { ragHash, splitCourseSource } from '../../electron/main/courseRagIndex'

async function run() {
  app.setName('Lezionify')
  app.setPath('userData', join(app.getPath('appData'), 'lezionify'))
  await app.whenReady()
  const directory = join(process.cwd(), 'local-artifacts', 'interventi-2026-10-22')
  mkdirSync(directory, { recursive: true })
  const budgetPath = join(directory, 'rag-live-budget.json')
  let used = 0
  try { used = JSON.parse(readFileSync(budgetPath, 'utf8')).used } catch { /* first run */ }
  const settings = await new SettingsService(join(app.getPath('appData'), 'lezionify', 'library')).getSettings()
  const keys = (settings.apiKeys?.length ? settings.apiKeys : [settings.apiKey]).filter(Boolean)
  if (!keys.length) throw new Error('No configured key')
  class CappedTransport extends GeminiTransport {
    override async generateContentStream(params: Parameters<GeminiTransport['generateContentStream']>[0]) {
      if (used >= 4) throw new GeminiError({ category: 'cancelled', isRetryable: false, isDailyQuota: false, recoveryDisposition: 'terminal', sanitizedMessage: 'Budget di quattro invii reali esaurito.' })
      writeFileSync(budgetPath, JSON.stringify({ used: ++used }))
      return super.generateContentStream(params)
    }
  }
  const requestManager = new GeminiRequestManager(undefined, new CappedTransport())
  if (process.argv.includes('--end-to-end')) {
    const sourceText = 'Una politica epsilon-greedy assegna alla azione greedy probabilità 1-epsilon+epsilon/n e alle altre epsilon/n. Una politica epsilon-soft assegna ad ogni azione almeno epsilon/n.'
    const source = splitCourseSource({ id: 'synthetic-source', title: 'Lezione sintetica', kind: 'transcript', lectureId: 'synthetic-lecture', version: ragHash(sourceText), status: 'ready' }, [{ text: sourceText }])
    const service = new CourseRagService(join(directory, 'rag-live-profile'), {
      archiveSources: async () => ({ sources: [{ ...source, rawText: sourceText }], missingTranscripts: 0 }),
      complete: async (prompt, signal, images) => {
        const text = await completeCourseResponse({ requestManager, getSettings: async () => settings, getManagedKeys: async () => keys.map((key, i) => ({ key, id: `key-${i}` })) }, prompt, signal, images)
        const action = parseCourseAction(text)
        const input = JSON.parse(prompt)
        console.log(JSON.stringify({ check: 'RAG_ACTION', action: action.action, passages: input.passages.length, citations: action.action === 'answer' ? action.passageIds.length : null, unknown: action.action === 'answer' ? action.passageIds.filter(id => !input.passages.some((item: { passage: { id: string } }) => item.passage.id === id)).length : null }))
        return text
      }
    })
    const id = `synthetic-${Date.now()}`
    await service.saveThread('SYNTHETIC', { id, title: 'Prova RAG sintetica', messages: [], draft: '', updatedAt: '' })
    try {
      const result = await service.ask('SYNTHETIC', id, 'Nel materiale fornito quale probabilità riceve l’azione greedy con la politica epsilon-greedy? Cita la fonte.', id)
      const answer = result.messages.at(-1)
      const pass = answer?.role === 'assistant' && Boolean(answer.text.trim()) && Boolean(answer.citations?.length)
      console.log(JSON.stringify({ check: 'RAG_END_TO_END', outcome: pass ? 'PASS' : 'FAIL', used, citations: answer?.citations?.length ?? 0, messages: result.messages.length }))
      app.exit(pass ? 0 : 1)
    } catch (error) {
      console.log(JSON.stringify({ check: 'RAG_END_TO_END', outcome: 'FAIL', used, category: error instanceof GeminiError ? error.category : error instanceof Error && error.message.startsWith('Risposta con citazioni') ? 'unverified_citations' : error instanceof Error && error.message.startsWith('Limite') ? 'round_limit' : 'local_or_contract' }))
      app.exit(1)
    } finally { service.dispose() }
    return
  }
  const prompt = JSON.stringify({ instructions: 'Restituisci solo JSON: {action:"answer",text:"risposta in italiano con una formula LaTeX",passageIds:["s1"]}. Usa solo questa fonte sintetica. Spiega la differenza epsilon-greedy e epsilon-soft con una formula cases.', question: 'Spiega la politica epsilon greedy.', passages: [{ passage: { id: 's1', text: 'Una politica epsilon-greedy assegna alla azione greedy probabilità 1-epsilon+epsilon/n e alle altre epsilon/n. Una politica epsilon-soft assegna ad ogni azione almeno epsilon/n.' } }] })
  try {
    const text = await completeCourseResponse({ requestManager, getSettings: async () => settings, getManagedKeys: async () => keys.map((key, i) => ({ key, id: `key-${i}` })) }, prompt, AbortSignal.timeout(90000))
    const action = parseCourseAction(text)
    console.log(JSON.stringify({ check: 'RAG_REAL', outcome: 'PASS', action: action.action, used, characters: text.length }))
    app.exit(0)
  } catch (error) {
    console.log(JSON.stringify({ check: 'RAG_REAL', outcome: 'FAIL', category: error instanceof GeminiError ? error.category : error instanceof SyntaxError ? 'json_syntax' : 'contract', used }))
    app.exit(1)
  }
}
run().catch(() => { console.log('RAG_REAL: ambiente non disponibile'); app.exit(1) })
