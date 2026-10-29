import { app, nativeImage } from 'electron'
import { join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { GoogleGenAI } from '@google/genai'
import { SettingsService } from '../../electron/main/settings'
import { GeminiService } from '../../electron/main/gemini'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'
import { GeminiTransport } from '../../electron/main/ai/geminiTransport'
import { normalizeGeminiError, GeminiError } from '../../electron/main/ai/geminiErrors'
import { DEFAULT_GEMINI_POLICY } from '../../electron/main/ai/geminiPolicy'

async function run() {
  app.setName('Lezionify')
  await app.whenReady()
  const settings = await new SettingsService(join(app.getPath('appData'), 'lezionify', 'library')).getSettings()
  const keys = (settings.apiKeys.length ? settings.apiKeys : [settings.apiKey]).filter(Boolean).map(key => ({ key }))
  if (!keys.length) throw Error('Nessuna chiave configurata')
  const root = join(process.cwd(), 'local-artifacts', 'study-validation-2026-10-29')
  mkdirSync(root, { recursive: true })
  const budgetFile = join(root, 'budget.json')
  let used = 0
  try { used = JSON.parse(readFileSync(budgetFile, 'utf8')).used } catch { /* first authorized run */ }
  let stage = '', stageUsed = 0
  const rows: any[] = []
  const runStart = used
  const spend = (model: string) => {
    if (used >= 20 || stageUsed >= 5) throw new GeminiError({ category: 'cancelled', isRetryable: false, isDailyQuota: false, sanitizedMessage: 'Budget collaudo esaurito.' })
    stageUsed++
    writeFileSync(budgetFile, JSON.stringify({ used: ++used, limit: 20 }))
    console.log(JSON.stringify({ attempt: used, stage, model }))
  }
  class Capped extends GeminiTransport {
    override getClient(key: string): GoogleGenAI {
      const raw = new GoogleGenAI({ apiKey: key, httpOptions: { retryOptions: { attempts: 1 } } })
      return { models: {
        generateContent: async (params: any) => {
          if (process.argv.includes('--eng-no-schema') && params.config) delete params.config.responseJsonSchema
          spend(params.model)
          const start = Date.now()
          let response
          try { response = await raw.models.generateContent(params) } catch (error) {
            const message = error instanceof Error ? error.message : ''
            rows.push({ stage, model: params.model, status: (error as any)?.status, schemaComplexity: /schema|complex|states|properties/i.test(message), diagnostic: message.replace(/AIza[A-Za-z0-9_-]+/g, '<REDACTED>').replace(/([?&]key=)[^&\s]+/g, '$1<REDACTED>') })
            throw error
          }
          rows.push({ stage, model: params.model, ms: Date.now() - start, usage: response.usageMetadata, finishReason: response.candidates?.[0]?.finishReason, text: response.text })
          return response
        },
        generateContentStream: async (params: any) => { spend(params.model); return raw.models.generateContentStream(params) }
      } } as unknown as GoogleGenAI
    }
  }
  const transport = new Capped()
  const gemini = new GeminiService({ requestManager: new GeminiRequestManager(DEFAULT_GEMINI_POLICY, transport) })
  const reference = '# Catene di Markov e MDP\nUna policy induce una MRP da un MDP: P_pi(s,s_next)=sum_a pi(a|s)P(s_next|s,a). Una transizione dipende dallo stato corrente, non dalla storia completa. La funzione valore soddisfa v=r+gamma P v. Reward e return sono distinti. Con azioni A e B di probabilità 0.25 e 0.75 e probabilità di transizione 0.2 e 0.8, la probabilità marginale è 0.65.'
  const transcript = 'Leggo gli appunti. Penso che basti sommare 0.2 e 0.8. No, mi correggo: peso con la policy, 0.25 per 0.2 più 0.75 per 0.8 fa 0.65. Non capisco perché il risultato è una MRP. Il reward è tutta la somma futura? Forse reward e return sono la stessa cosa. Bellman somma reward immediato e valore futuro scontato. Markov vuol dire che dipende da tutti gli stati precedenti? Non sono sicuro. Puoi spiegare ogni dubbio?'
  let assessment = ''
  const check = async (name: string, task: () => Promise<void>) => {
    stage = name; stageUsed = 0
    try { await task(); console.log(name + ': PASS') } catch (error) { rows.push({ stage, error: normalizeGeminiError(error).category, status: (error as any)?.status ?? (error as any)?.code }); console.log(name + ': FAIL') }
    writeFileSync(join(root, `results-run-${runStart}.json`), JSON.stringify({ used, rows }, null, 2))
  }
  if (!process.argv.includes('--compare-only') && !process.argv.includes('--long-only') && !process.argv.includes('--eng-only') && !process.argv.includes('--qna-only')) await check('repetition', async () => {
    assessment = await gemini.evaluateRepetition({ keys, model: settings.model, reference, transcript, previous: '', final: true, id: 'synthetic-validation', signal: AbortSignal.timeout(120000) })
    if (!assessment.includes('0.65') && !assessment.includes('0,65')) throw Error('Coverage incomplete')
  })
  if (assessment) await check('exercises', async () => {
    const text = await gemini.replyRepetition({ keys, model: settings.model, reference, assessment, messages: [{ role: 'user', text: 'Reward è immediato, return è la somma scontata futura; la media sulle azioni della policy elimina la scelta di azione. È corretto? Perché?' }], signal: AbortSignal.timeout(120000) })
    if (!text.trim()) throw Error('Empty tutor reply')
  })
  if (!process.argv.includes('--compare-only') && !process.argv.includes('--long-only') && !process.argv.includes('--eng-only') && !process.argv.includes('--qna-only')) await check('qna', async () => {
    let text = ''
    for await (const chunk of gemini.generateQnaResponse({ keys, model: settings.model, fullLectureText: reference, responseLength: 'long', thread: { id: 'validation', quote: 'Reward e return', createdAt: '', updatedAt: '', messages: [{ role: 'user', text: 'Distingui reward e return. Calcola la probabilità marginale dell’esempio. Gli appunti danno una data di esame?', timestamp: '' }] }, signal: AbortSignal.timeout(90000) })) text += chunk
    rows.push({ stage, text })
    if (!text.trim()) throw Error('Empty Q&A')
  })
  if (process.argv.includes('--qna-only')) {
    const cases = [
      { name: 'qna-english-uncertainty', source: 'A mutex guarantees mutual exclusion but does not guarantee deadlock freedom. No budget or exam date is specified.', question: 'Il mutex elimina sempre i deadlock? Quanto costa il corso? Rispondi in italiano.' },
      { name: 'qna-code', source: 'counter += 1 performs read-modify-write. If both threads read zero and both write one, one update is lost. A critical section protected by a mutex prevents this interleaving.', question: 'Mostra i passaggi di due thread da counter=0 e spiega perché il risultato senza mutex può essere 1 invece di 2.' },
      { name: 'qna-image', source: 'Nessuna informazione sul colore nel testo. Usa soltanto l’immagine allegata.', question: 'Di che colore è il quadrato allegato?', image: true }
    ]
    for (const item of cases) await check(item.name, async () => {
      const image = item.image ? nativeImage.createFromBitmap(Buffer.from([0, 0, 255, 255]), { width: 1, height: 1 }).resize({ width: 64, height: 64 }).toPNG().toString('base64') : undefined
      const started = Date.now()
      let text = ''
      for await (const chunk of gemini.generateQnaResponse({ keys, model: settings.model, fullLectureText: item.source, responseLength: 'medium', images: image ? [{ page: 1, mimeType: 'image/png', data: image }] : undefined, thread: { id: item.name, quote: 'Contesto sintetico', createdAt: '', updatedAt: '', messages: [{ role: 'user', text: item.question, timestamp: '' }] }, signal: AbortSignal.timeout(90000) })) text += chunk
      rows.push({ stage, text, ms: Date.now() - started })
      if (!text.trim()) throw Error('Empty Q&A')
    })
  }
  if (process.argv.includes('--eng-only')) await check('eng-synthetic-many-fragments', async () => {
    const markdownIta = process.argv.includes('--eng-small') ? '# Dispensa sintetica\n\n## Argomento\nIl valore attuale dipende dallo stato corrente.' : '# Dispensa sintetica\n\n' + Array.from({ length: 31 }, (_, i) => '## Argomento ' + i + '\n' + Array.from({ length: 9 }, (_, j) => 'Il sistema mantiene il valore corrente e aggiorna una variabile. $x_' + j + ' = 1$. Il parametro controlla la transizione.').join('\n')).join('\n\n')
    const translated = await gemini.translateToEnglish({ keys, model: settings.model, markdownIta, jobId: 'eng-synthetic-validation', signal: AbortSignal.timeout(120000) })
    rows.push({ stage, outputCharacters: translated.length })
  })
  if (process.argv.includes('--long-only')) {
    const notes = '# Reti e concorrenza\nTCP è orientato alla connessione e offre consegna ordinata affidabile; UDP è a datagrammi senza garanzie analoghe. Il deadlock richiede mutua esclusione, possesso e attesa, assenza di prelazione e attesa circolare. Una race condition dipende dall’interleaving degli accessi concorrenti. Un mutex protegge la sezione critica; non garantisce da solo assenza di deadlock. La proprietà di Markov richiede uno stato sufficiente al futuro. Reward immediato e return futuro scontato sono diversi.'
    let previous = ''
    if (process.argv.includes('--late-only')) previous = JSON.parse(readFileSync(join(root, 'results-run-7.json'), 'utf8')).rows.find((row: any) => row.stage === 'long-first' && row.text)?.text || ''
    if (!previous) await check('long-first', async () => {
      const text = 'Leggo gli appunti e provo. TCP e UDP sono uguali? Non capisco l’ordinamento. Il mutex elimina sempre anche i deadlock? Mi sembra di sì. Quali sono le quattro condizioni del deadlock e perché servono? Markov significa dipendenza da tutto il passato? Reward è la somma futura? ' + 'Rileggo e cerco di capire i termini, senza una nuova conclusione. '.repeat(780)
      previous = await gemini.evaluateRepetition({ keys, model: settings.model, reference: notes, transcript: text, previous: '', final: false, id: 'long-synthetic', signal: AbortSignal.timeout(120000) })
      if (!previous.includes('TCP') || !/deadlock/i.test(previous)) throw Error('Missing early topics')
    })
    if (previous) await check('long-late-correction', async () => {
      const next = 'Mi correggo: TCP offre una connessione affidabile con consegna ordinata, UDP no. Un mutex evita accessi concorrenti alla sezione critica ma due thread che prendono due lock in ordine inverso possono andare in deadlock, quindi non lo elimina da solo. Però non so ancora spiegare le quattro condizioni. Anche reward e return li confondo ancora. La definizione di race condition letta non mi è chiara. Non ho risolto il dubbio su Markov.'
      previous = await gemini.evaluateRepetition({ keys, model: settings.model, reference: notes, transcript: next, previous, final: true, id: 'long-synthetic', signal: AbortSignal.timeout(120000) })
      if (!previous.includes('TCP') || !/Markov/.test(previous) || !/race/i.test(previous) || !/return/i.test(previous)) throw Error('Missing topics after late correction')
    })
  }
  if (!process.argv.includes('--long-only') && !process.argv.includes('--eng-only') && !process.argv.includes('--qna-only'))
  for (const model of ['gemini-3.8-flash', 'gemini-4-argon']) await check('compare-' + model, async () => {
    await transport.getClient(keys[0].key).models.generateContent({ model, contents: 'Genera una dispensa didattica italiana: spiega MDP -> MRP, reward/return, calcola l’esempio. Non inventare date di esame. Fonte sintetica: ' + reference, config: { temperature: 0.1, abortSignal: AbortSignal.timeout(90000) } })
  })
  console.log(JSON.stringify({ used, limit: 20, outcomes: rows.map(row => ({ stage: row.stage, error: row.error, model: row.model, chars: row.text?.length })) }))
  app.exit(0)
}
run().catch(() => { console.error('Collaudo AI non completato; dettagli sensibili omessi.'); app.exit(1) })
