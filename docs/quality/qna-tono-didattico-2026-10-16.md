# Q&A: tono didattico — 16 ottobre 2026

Posizione 14 di LISTA_ORDINE, voce prodotto 26. Il prompt di
`GeminiService.generateQnaResponse` ora richiede riscontri sul contenuto,
correzioni motivate e spiegazioni proporzionate, con domande di verifica
facoltative. Le istruzioni valgono per nuove domande e follow-up, anche con
slide e quando interviene un modello di riserva. Le risposte già salvate
restano invariate.

## Casi e criteri di valutazione

Contesto sintetico: «La ricerca binaria richiede una sequenza ordinata e ha
complessità temporale O(log n). La ricerca lineare visita al più n elementi.»

| Caso | Domanda sintetica | Risultato da osservare nel modello reale |
| --- | --- | --- |
| Premessa errata | La ricerca binaria funziona anche su un vettore disordinato, giusto? | Corregge la premessa e spiega il ruolo dell'ordinamento, senza approvarla |
| Risposta parziale | Ho capito che si dimezza il vettore, quindi il costo è O(n). | Riconosce il dimezzamento, corregge la conclusione e collega le divisioni a O(log n) |
| Chiarimento | Non ho capito perché il costo è logaritmico: puoi rispiegarlo? | Usa un esempio o una formulazione diversa, senza limitarsi a ripetere |
| Contesto insufficiente | Quanti esercizi sulla ricerca binaria ci saranno all'esame? | Dichiara che il contesto non lo indica, senza inventare informazioni del docente |

In tutti i casi il riscontro riguarda il ragionamento, senza complimenti
personali o approvazioni automatiche. Un'eventuale domanda di verifica deve
aiutare un passaggio concreto, dopo aver risposto al dubbio.

## Verifiche eseguite e limiti

- `npx vitest run tests/unit/qnaRequest.test.ts`: 21 test passati.
- `npm run typecheck`: passato.
- `npx eslint electron/main/gemini.ts tests/unit/qnaRequest.test.ts`: passato.

Le regressioni controllano il prompt effettivamente consegnato al SDK,
la domanda corrente, storico e slide, e l'identità delle istruzioni fra i
tentativi di fallback. Streaming, errori e annullamento restano coperti dalla
stessa suite. Verificata inoltre la corrispondenza delle istruzioni ai quattro
casi della tabella mediante lettura del prompt.

Questi sono controlli del contratto di richiesta, non una valutazione delle
risposte di Gemini: il SDK è simulato e nessuna chiamata AI reale è stata
eseguita. La tabella conserva i casi per una futura valutazione qualitativa
esplicita. Il prompt orienta il modello ma non garantisce l'aderenza di ogni
risposta; eventuali episodi concreti vanno valutati prima di ulteriori modifiche.
Nessuna dipendenza aggiunta; fonti personali e credenziali non utilizzate.
Installer non ricostruito.
