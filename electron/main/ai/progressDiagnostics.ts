/** Only fixed phase labels and numeric counters enter logs, never generated titles. */
export function notesProgressMessage(step: string, percent: number): string {
  const section = step.match(/sezione (\d+) di (\d+)/i)
  if (section) return `Dispensa: sezione ${section[1]} di ${section[2]}${step.includes('checkpoint') ? ' ripristinata dal checkpoint' : ' in elaborazione'}.`
  const total = step.match(/(\d+) sezioni/)
  if (total) return `Dispensa: elaborazione didattica di ${total[1]} sezioni.`
  if (/panoramica/i.test(step)) return 'Dispensa: generazione della panoramica e del titolo.'
  if (/Estrazione.*esame/i.test(step)) return 'Dispensa: estrazione delle note importanti per l’esame.'
  if (/Segmentazione/i.test(step)) return 'Dispensa: divisione semantica della trascrizione.'
  if (/Assemblaggio/i.test(step)) return 'Dispensa: assemblaggio finale e note d’esame.'
  if (/checkpoint/i.test(step)) return 'Dispensa: ripresa del lavoro salvato.'
  if (percent === 100) return 'Dispensa: elaborazione completata.'
  if (/rapida/i.test(step)) return 'Dispensa: elaborazione rapida in corso.'
  return 'Dispensa: preparazione o attesa del servizio Gemini.'
}
