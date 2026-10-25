// Explicit CLI opt-in. Downloads only the public model; all inference is local.
import { LocalCourseSemantic } from '../../electron/main/courseRagSemantic'
import { CourseRetrieval, splitCourseSource } from '../../electron/main/courseRagIndex'
import { join } from 'node:path'

const semantic = new LocalCourseSemantic(join(process.cwd(), 'local-artifacts/rag-semantic-model'))
const electronApp = process.versions.electron ? (await import('electron')).app : undefined
if (electronApp) await electronApp.whenReady()
let passed = false
try {
  if (process.argv.includes('--download-model')) await semantic.prepare(message => console.log(message))
  const state = await semantic.state()
  if (state.status !== 'ready') throw new Error('Modello non pronto: usare --download-model esplicitamente.')
  const sources = [
    splitCourseSource({ id: 'dp', title: 'Programmazione dinamica', kind: 'transcript', version: '1', status: 'ready' }, [{ text: 'Il valore di uno stato dipende dalla ricompensa immediata e dal valore atteso scontato degli stati successivi. Questa relazione ricorsiva è la base della programmazione dinamica.' }]),
    splitCourseSource({ id: 'noise', title: 'Audio', kind: 'transcript', version: '1', status: 'ready' }, [{ text: 'Il registratore salva la lezione in formato audio e il file viene importato sul computer.' }])
  ]
  const retrieval = new CourseRetrieval(sources)
  const ids = await semantic.rank('How do future rewards determine the utility of the current situation?', retrieval.all(), AbortSignal.timeout(120000))
  if (!ids.length || retrieval.get(ids[0])?.source.id !== 'dp') throw new Error('Il modello locale non ha recuperato il passaggio atteso.')
  console.log(JSON.stringify({ result: 'PASS', localModel: state.status, firstSource: retrieval.get(ids[0])?.source.id, dimensions: 384, networkDocuments: 0 }))
  passed = true
} finally { semantic.dispose(); electronApp?.exit(passed ? 0 : 1) }
