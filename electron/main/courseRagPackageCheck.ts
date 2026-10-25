import { cp, mkdir, readFile, writeFile, readdir, rename } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { LocalCourseSemantic, COURSE_EMBEDDING_MODEL, COURSE_EMBEDDING_REVISION } from './courseRagSemantic'
import { CourseRagService } from './courseRag'
import { CourseRetrieval, ragHash, splitCourseSource, extractCoursePdf } from './courseRagIndex'

/** Explicit CLI diagnostic, always in a new temporary profile. No credentials or AI. */
export async function checkPackagedCourseRag(profile: string, fixture: string, download = false) {
  const root = resolve(profile)
  await mkdir(root, { recursive: true })
  const text = 'Il valore di uno stato usa ricompense future scontate e transizioni. La programmazione dinamica conosce il modello.'
  const source = splitCourseSource({ id: 'packaged-source', title: 'Fonte sintetica', kind: 'transcript', version: ragHash(text), status: 'ready', lectureId: 'synthetic', lectureOrdinal: 1 }, [{ text }])
  const passages = new CourseRetrieval([source]).all()
  const semanticRoot = join(root, 'semantic')
  let semantic = new LocalCourseSemantic(semanticRoot)
  if ((await semantic.state()).status !== 'missing' || (await semantic.rank('modello', passages, new AbortController().signal)).length) throw new Error('Missing-model fallback failed')
  // Read only the explicitly supplied local public-model fixture. No download.
  if (download) await semantic.prepare(message => console.log('RAG_PUBLIC_MODEL ' + message))
  else {
    await cp(join(fixture, 'models'), join(semanticRoot, 'models'), { recursive: true })
    await cp(join(fixture, 'ready.json'), join(semanticRoot, 'ready.json'))
  }
  let coldMs: number, warmMs: number
  try {
    const begin = performance.now()
    const cold = await semantic.rank('How do future rewards determine the value of a state?', passages, AbortSignal.timeout(60000))
    coldMs = performance.now() - begin
    if (cold[0] !== passages[0].passage.id) throw new Error('Cold ASAR inference failed')
    const warmed = performance.now()
    if (!(await semantic.rank('ricompense future e valore', passages, AbortSignal.timeout(30000))).length) throw new Error('Warm ASAR inference failed')
    warmMs = performance.now() - warmed
    const files = (await readdir(join(semanticRoot, 'vectors'))).filter(name => name.endsWith('.json'))
    await writeFile(join(semanticRoot, 'vectors', files[0]), '[null]')
    semantic.dispose()
    semantic = new LocalCourseSemantic(semanticRoot)
    if (!(await semantic.rank('valore delle ricompense', passages, AbortSignal.timeout(60000))).length) throw new Error('Vector corruption recovery failed')
    semantic.dispose()
    const weights = join(semanticRoot, 'models', COURSE_EMBEDDING_MODEL, COURSE_EMBEDDING_REVISION, 'onnx/model_quantized.onnx')
    await rename(weights, weights + '.saved')
    semantic = new LocalCourseSemantic(semanticRoot)
    if ((await semantic.state()).status !== 'missing') throw new Error('Missing weights not detected')
    await rename(weights + '.saved', weights)
    if ((await semantic.state()).status !== 'ready') throw new Error('Model restore failed')
  } finally { semantic.dispose() }
  const courseRoot = join(root, 'migration')
  await mkdir(courseRoot, { recursive: true })
  const file = join(courseRoot, ragHash('TEST') + '.json')
  await writeFile(file, JSON.stringify({ course: 'TEST', enabled: false, files: [], sources: [source], threads: [{ id: 'legacy', title: 'Legacy', draft: 'Conserva', messages: [{ id: 'message', role: 'assistant', text: 'Fonte storica', createdAt: '', citations: passages }], updatedAt: '' }] }))
  const service = new CourseRagService(courseRoot, { archiveSources: async () => ({ sources: [], missingTranscripts: 0 }), complete: async () => { throw new Error('Network forbidden') } })
  try {
    await service.saveThread('TEST', { id: 'legacy', title: 'Legacy', draft: 'Aggiornata', messages: [], updatedAt: '' })
    const state = await service.state('TEST')
    if (state.threads[0]?.messages[0]?.citations?.[0]?.passage.text !== text || !JSON.parse(await readFile(file, 'utf8')).corpusRevision) throw new Error('Legacy migration lost citations')
  } finally { service.dispose() }
  const stream = 'BT /F1 12 Tf 50 700 Td (ASAR PDF text) Tj ET\n'
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>', `<< /Length ${stream.length} >>\nstream\n${stream}endstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
  let pdf = '%PDF-1.7\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('') + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  if (!(await extractCoursePdf(new Uint8Array(Buffer.from(pdf))))[0].text.includes('ASAR PDF text')) throw new Error('Packaged PDF worker failed')
  return { result: 'PASS', packagedRuntime: true, modelPreparation: download ? 'explicit-public-download' : 'local-fixture', coldMs: Math.round(coldMs), warmMs: Math.round(warmMs), noModelFallback: true, corruptVectorRecovery: true, missingModelRestore: true, legacyMigration: true, inferenceNetworkBlocked: true, pdfWorker: true }
}
