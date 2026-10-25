import { referencedLectureOrdinals } from '../../shared/courseRag'

export interface CourseQueryPlan {
  query: string
  lessons: number[]
  intent: 'lookup' | 'comparison' | 'overview'
  topic: string
  courseWide: boolean
  teacherEvidence: boolean
  assessment: boolean
}

const stopWords = new Set(('oggi nella nelle nello nel della delle dello degli dei del dell abbiamo parlato risolvere problema uso ma non avevamo gia già introdotta cosi così precedenti lezione lezioni con che come per una uno un il lo la gli le di da in e a al alla alle si è confronta confrontare confronto differenza differenze tra fra riassumi riassunto sintesi spiega spiegami cosa quale quali quanto descrivi rispetto the of and explain compare lecture lectures').split(' '))

export function normalizeCourseNotation(text: string): string {
  return text.normalize('NFKC')
    .replace(/([qv])\s*[_^]\s*\{?\\?(?:pi|π)\}?/gi, '$1pi')
    .replace(/\b([qv])\s+(?:of\s+)?pi\b/gi, '$1pi')
}

/** Scope is derived from the user's request, never from a tool's reformulation. */
export function planCourseQuery(question: string, previousQuestions: string[] = []): CourseQueryPlan {
  let lessons = referencedLectureOrdinals(question)
  const assessment = /\b(?:esam[ei]|exam(?:s|ination)?|da studiare|devo studiare)\b/i.test(question)
  const courseWide = assessment || /\b(?:tutto il corso|intero corso|spars[oaie]\s+nel corso|in (?:che|quali) lezioni|mai (?:parlato|trattato|spiegato)|lungo il corso)\b/i.test(question)
  const teacherEvidence = assessment || /\b(?:prof(?:essore|essoressa)?|docente)\b/i.test(question)
  const followup = /\b(?:quest[oaie]|quell[oaie]|invece|e poi|approfondisci|continua|perché|perche)\b/i.test(question)
  const previous = previousQuestions.at(-1)
  if (!lessons.length && !courseWide && followup && previous) lessons = referencedLectureOrdinals(previous)
  const topicOf = (value: string) => normalizeCourseNotation(value.slice(0, 1500))
    .replace(/(?:lezion[ei]|lectures?)\s*(?:n(?:umero)?\.?\s*)?\d+(?:\s*(?:,|e|ed|and|[-–])\s*\d+)*/gi, ' ')
    .replace(/[\\_^{}]/g, ' ').split(/[^\p{L}\p{N}]+/u)
    .filter(word => word && !stopWords.has(word.toLowerCase())).join(' ')
  const topic = topicOf(question)
  const query = followup && previous && topic.split(' ').length < 3 ? `${topicOf(previous)} ${topic}`.trim() : topic
  return {
    query: query.slice(0, 1000), topic,
    lessons, courseWide, teacherEvidence, assessment,
    intent: lessons.length > 1 || /confront|differenz|compare/i.test(question) ? 'comparison' : /riassu|sintesi|panoramica|overview/i.test(question) ? 'overview' : 'lookup'
  }
}

/** Answer obligations for realistic study questions; these are policies, not course facts. */
export const courseStudyPolicy = [
  'Esame e studio: distingui indicazioni esplicite del docente da consigli tuoi. Una dimostrazione svolta non implica che sia obbligatoria, e un esercizio visto non implica che sia incluso nell esame. Cita gli originali pertinenti e la data; se manca una disposizione esplicita, dichiara che non puoi confermare obblighi o esclusioni.',
  'Esempi e copertura: per casi pratici sparsi o domande su dove il docente abbia parlato di un tema, cerca lezioni diverse e presenta per ciascuna caso, ruolo e citazione. La selezione recuperata non è un elenco esaustivo; non trovato nelle fonti consultate non significa mai trattato.',
  'Spiegazione mirata: riprendi il concetto chiesto e affronta separatamente i punti non capiti, indicando ipotesi e passaggi; non sostituirlo con un tema affine.',
  'Esercizi nuovi: etichetta esplicitamente esercizio generato e soluzione proposta come Deduzione o Integrazione generale; cita le fonti del solo argomento di partenza. Non attribuire al docente testo, numeri, soluzione o pertinenza all esame che hai inventato. Fornisci dati, ipotesi e una soluzione verificabile.',
  'Confronti: confronta A e B sulle stesse dimensioni e ipotesi. Per ieri, oggi o giorni fa usa le date delle lezioni disponibili, non la data di importazione o una presunta lezione tenuta nel giorno corrente. Se non puoi identificare le due lezioni, esplicita l ambiguità e chiedi quali. Verifica se sono cambiate ipotesi, dominio o approssimazione prima di dichiarare una contraddizione: la versione più recente non sostituisce automaticamente la precedente.'
].join('\n')
