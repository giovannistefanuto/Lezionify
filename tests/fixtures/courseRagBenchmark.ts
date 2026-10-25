export const ragBenchmarkSources = [
  { id: 'bellman', ordinal: 1, text: '# Equazione di Bellman\n\nIl valore V di uno stato è la ricompensa immediata più il valore atteso scontato degli stati successivi. La programmazione dinamica usa il modello delle transizioni.' },
  { id: 'greedy', ordinal: 2, text: '# Miglioramento della politica\n\nLa funzione Q^\\pi(s,a) valuta una coppia stato azione. La politica greedy sceglie argmax Q^\\pi. Una politica migliorata non è necessariamente ottima.' },
  { id: 'td', ordinal: 3, text: '# Temporal Difference\n\nTD aggiorna una stima dopo ogni transizione usando ricompensa e valore dello stato successivo. Monte Carlo aspetta la fine dell episodio per calcolare il ritorno.' },
  { id: 'exploration', ordinal: 4, text: '# Esplorazione\n\nEpsilon-greedy sceglie casualmente una azione con probabilità epsilon. Una politica epsilon-soft assegna probabilità positiva a tutte le azioni.' },
  { id: 'tcp', ordinal: 5, text: '# Trasporto affidabile\n\nTCP ritrasmette i segmenti persi e usa acknowledgment e numeri di sequenza per consegnare i byte in ordine. UDP non garantisce la consegna.' },
  { id: 'deadlock', ordinal: 6, text: '# Stallo\n\nIl deadlock si verifica quando processi attendono risorse occupate reciprocamente. Mutua esclusione, attesa circolare, possesso e attesa e assenza di prelazione sono condizioni necessarie.' },
  { id: 'hash', ordinal: 7, text: '# Dizionari\n\nUna tabella hash associa chiavi a posizioni usando una funzione hash. Le collisioni si gestiscono con concatenamento o indirizzamento aperto.' },
  { id: 'gradient', ordinal: 8, text: '# Ottimizzazione\n\nLa discesa del gradiente aggiorna i parametri nella direzione opposta alla derivata della funzione obiettivo. Il learning rate determina la lunghezza del passo.' },
  { id: 'bayes', ordinal: 9, text: '# Inferenza\n\nIl teorema di Bayes combina probabilità a priori e verosimiglianza per ottenere la probabilità a posteriori dopo una osservazione.' },
  { id: 'noise', ordinal: 10, text: '# Importazione audio\n\nIl registratore salva file audio. La cartella di importazione contiene registrazioni e il player permette di ascoltare la lezione.' }
]
export const ragBenchmarkCases: { id: string; query: string; expected: string[]; category: string }[] = [
  { id: 'exact-bellman', query: 'Equazione di Bellman', expected: ['bellman'], category: 'termine' },
  { id: 'exact-tcp', query: 'TCP ritrasmette i segmenti', expected: ['tcp'], category: 'termine' },
  { id: 'exact-deadlock', query: 'Quali condizioni richiede il deadlock?', expected: ['deadlock'], category: 'termine' },
  { id: 'exact-hash', query: 'Come si gestiscono le collisioni hash?', expected: ['hash'], category: 'termine' },
  { id: 'exact-bayes', query: 'Teorema di Bayes e probabilità a posteriori', expected: ['bayes'], category: 'termine' },
  { id: 'notation', query: 'Come massimizzare Q_pi nella lezione 2?', expected: ['greedy'], category: 'formula' },
  { id: 'scope-correct', query: 'Valore e transizioni nella lezione 1', expected: ['bellman'], category: 'vincolo' },
  { id: 'scope-wrong', query: 'TCP nella lezione 1', expected: [], category: 'vincolo-assente' },
  { id: 'scope-missing', query: 'Riassumi la lezione 99', expected: [], category: 'vincolo-assente' },
  { id: 'overview', query: 'Riassumi la lezione 6', expected: ['deadlock'], category: 'panoramica' },
  { id: 'compare-overview', query: 'Confronta le lezioni 1 e 2', expected: ['bellman', 'greedy'], category: 'confronto' },
  { id: 'compare-range', query: 'Confronta lezioni 1-3', expected: ['bellman', 'greedy', 'td'], category: 'confronto' },
  { id: 'compare-topic', query: 'Valore stato politica nelle lezioni 1 e 2', expected: ['bellman', 'greedy'], category: 'confronto' },
  { id: 'td-contrast', query: 'TD e Monte Carlo aspettano la fine?', expected: ['td'], category: 'termine' },
  { id: 'exploration', query: 'Politica epsilon-soft', expected: ['exploration'], category: 'termine' },
  { id: 'gradient', query: 'Learning rate e gradiente', expected: ['gradient'], category: 'termine' },
  { id: 'semantic-value', query: 'How do future rewards determine the utility of the current situation?', expected: ['bellman'], category: 'parafrasi-en' },
  { id: 'semantic-deadlock', query: 'Programs are stuck forever because each waits for a resource held by another.', expected: ['deadlock'], category: 'parafrasi-en' },
  { id: 'semantic-tcp', query: 'Which protocol recovers lost data and delivers an ordered stream?', expected: ['tcp'], category: 'parafrasi-en' },
  { id: 'semantic-bayes', query: 'How can I revise my prior belief after seeing new evidence?', expected: ['bayes'], category: 'parafrasi-en' },
  { id: 'semantic-gradient', query: 'Come riduco un errore muovendo i pesi lungo la pendenza?', expected: ['gradient'], category: 'parafrasi-it' },
  { id: 'semantic-hash', query: 'Where do I store key value pairs and handle two keys landing in the same bucket?', expected: ['hash'], category: 'parafrasi-en' }
]

// Synthetic professor statements, never presented as facts about a real course.
export const ragStudySources = [...ragBenchmarkSources,
  { id: 'exam', ordinal: 11, text: '# Indicazioni esame\n\nIl docente dice: la dimostrazione dell equazione di Bellman non è richiesta all esame. Sono richiesti esercizi di aggiornamento TD; non sto escludendo altre tipologie di esercizio.' },
  { id: 'practice-a', ordinal: 12, text: '# Applicazione Bellman: magazzino\n\nUsiamo Bellman nella gestione delle scorte: lo stato è la disponibilità di magazzino, l azione è ordinare e il costo combina stoccaggio e domanda insoddisfatta.' },
  { id: 'practice-b', ordinal: 13, text: '# Applicazione Bellman: navigazione\n\nUsiamo Bellman per un robot in una griglia: le celle sono stati, i movimenti sono azioni, il modello descrive le transizioni stocastiche e il ritorno premia il raggiungimento dell obiettivo.' },
  { id: 'gradient-change', ordinal: 14, text: '# Learning rate e ipotesi\n\nNella discesa del gradiente deterministica precedente un learning rate costante sufficientemente piccolo era ammesso sotto le ipotesi dichiarate. Oggi il gradiente è stocastico e rumoroso: non abbiamo più la stessa garanzia di convergenza esatta con passo costante. Cambia l ipotesi sul rumore, non la definizione del learning rate.' }
]
export const ragStudyCases: typeof ragBenchmarkCases = [
  { id: 'study-exam', category: 'esame', query: 'Cosa ha detto il prof riguardo all esame? Ci sono esercizi TD oppure no?', expected: ['exam'] },
  { id: 'study-proof', category: 'obblighi-studio', query: 'La dimostrazione di Bellman che ha fatto qualche lezione fa è da studiare per l esame?', expected: ['exam'] },
  { id: 'study-applications', category: 'casi-pratici', query: 'In quali casi pratici sparsi nel corso abbiamo studiato Bellman?', expected: ['practice-a', 'practice-b'] },
  { id: 'study-explanation', category: 'spiegazione-mirata', query: 'Puoi riprendere la spiegazione di Bellman? Non ho capito ricompensa immediata, valore atteso e sconto.', expected: ['bellman'] },
  { id: 'study-exercise', category: 'esercizio-generato', query: 'Puoi generare un esercizio a partire dalla discesa del gradiente e dal learning rate?', expected: ['gradient'] },
  { id: 'study-difference', category: 'confronto-concetti', query: 'Che differenza c è tra TD e Monte Carlo?', expected: ['td'] },
  { id: 'study-coverage', category: 'copertura-corso', query: 'Il prof ha mai parlato di Bellman? In che termini e in che lezioni, dicendo cosa?', expected: ['bellman', 'exam', 'practice-a', 'practice-b'] },
  { id: 'study-hypotheses', category: 'cambio-ipotesi', query: 'Come mai un learning rate costante sembrava valido nelle lezioni precedenti ma oggi non lo è? Quali ipotesi sono cambiate?', expected: ['gradient', 'gradient-change'] }
]
