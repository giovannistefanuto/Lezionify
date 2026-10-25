import { app } from 'electron'
import { LocalCourseSemantic } from '../../electron/main/courseRagSemantic'
import { splitCourseSource } from '../../electron/main/courseRagIndex'
import { join } from 'node:path'
app.setPath('userData', join(process.cwd(), 'local-artifacts/rag-semantic-cancellation/profile'))
await app.whenReady()
const semantic = new LocalCourseSemantic(join(process.cwd(), 'local-artifacts/rag-semantic-model'))
const source = (id: string) => splitCourseSource({ id, title: 'Synthetic', kind: 'transcript', version: id, status: 'ready' }, [{ text: `Sample ${id}. ` + 'La politica usa ricompense e un modello delle transizioni. '.repeat(45) }])
const passages = Array.from({ length: 8 }, (_, n) => source(`cancel-${Date.now()}-${n}`)).flatMap(source => source.passages.map(passage => ({ source, passage })))
let cancelled = false
try {
  await semantic.rank('ricompense', passages.slice(0, 1), AbortSignal.timeout(60000))
  const controller = new AbortController()
  const pending = semantic.rank('modello ricompense', passages, controller.signal)
  setTimeout(() => controller.abort(), 250)
  try { await pending } catch { cancelled = controller.signal.aborted }
  if (!cancelled) throw new Error('Cancellation not propagated')
  // Stay alive while native inference finishes; an unsafe terminate crashes here.
  await new Promise(resolve => setTimeout(resolve, 2000))
  console.log('SEMANTIC_CANCEL_PASS')
} finally { semantic.dispose() }
app.exit(cancelled ? 0 : 1)
