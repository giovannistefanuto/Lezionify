# Piano di correzione dei bug rilevati il 30 settembre 2026

**Stato:** R1–R4 implementati; verifica offline e consuntivo nella sezione 11 (1 ottobre 2026).  
**Destinatario:** modello o sviluppatore incaricato di implementare e verificare i fix.  
**Obiettivo:** correggere quattro difetti riprodotti offline nella pipeline archivio e nel Q&A Gemini, preservando dati locali, checkpoint, budget di richieste e comportamento delle funzioni esistenti.

Le sezioni 1–10 conservano il piano della revisione iniziale. Le cause e i riferimenti iniziali descrivono il comportamento precedente ai fix; la sezione 11 riporta ciò che è effettivamente implementato e verificato.

## 1. Istruzioni per chi prende in carico il lavoro

Leggere, nell'ordine, `AGENTS.md`, `IDEA_INIZIALE.md`, `STRUTTURA_PROGETTO.md` e le decisioni recenti di `DECISIONI.md`. Leggere quindi questo documento e le implementazioni correnti: i numeri di riga qui riportati identificano la revisione iniziale e possono cambiare.

Il working tree contiene molte modifiche non committate e file non tracciati, anche di giorni precedenti. L'ultimo commit osservato nella revisione era dell'11 settembre: non esiste un commit che isoli esattamente il lavoro del 30 settembre. Prima di modificare codice:

1. Controllare `git status --short` e i diff dei file interessati.
2. Preservare tutte le modifiche preesistenti; evitare reset, checkout dei file, clean o sostituzioni integrali non necessarie.
3. Verificare le decisioni D-0162, D-0163 e D-0164: descrivono telemetria, Q&A centralizzato e pipeline archivio da mantenere.
4. Introdurre regressioni permanenti che falliscono sul comportamento corrente e passano dopo i fix. Le riproduzioni della revisione verificano invece la presenza del bug: non copiarne le aspettative difettose nella suite definitiva.
5. Registrare ogni modifica non banale tramite `python tools/append_decision.py`, senza editare direttamente il Registro di `DECISIONI.md`.

Non sono necessarie nuove dipendenze per i quattro fix. Usare i meccanismi esistenti, Vitest, AbortController e le API effettivamente presenti nel SDK installato. Non cambiare modelli, quote, provider o contenuto dei prompt per correggere questi bug.

Le prove devono essere offline e sintetiche. Questa pianificazione non autorizza chiamate Gemini reali, uso di audio personali, accesso alle chiavi dell'utente, pubblicazione, commit, push o rilascio di installer. Un eventuale collaudo remoto richiede un'autorizzazione distinta. Non avviare gli script live per ottenere una verifica locale.

## 2. Evidenza e perimetro

La revisione ha confermato i seguenti problemi:

| ID | Priorità | Difetto | Effetto verificato |
| --- | --- | --- | --- |
| R1 | P1 | Ammissione non atomica di start/resume | Due avvii sovrapposti restituiscono entrambi `started: true` e generano due volte la stessa lezione |
| R2 | P1 | Timeout Q&A senza abort del SDK | La Promise locale fallisce mentre la richiesta SDK rimane attiva |
| R3 | P2 | Recupero automatico dopo output parziale | Un 429 di quota giornaliera dopo testo parziale produce fallback e concatenazione di due risposte |
| R4 | P2 | Classificazione testuale incompleta del 403 | Il messaggio italiano `Accesso negato` diventa `unknown`; la coda continua sulle altre lezioni |

Le quattro riproduzioni originali sono in `local-artifacts/review-2026-09-30/reproduction.ts`; il report è in `local-artifacts/review-2026-09-30/REPORT.md`. Sono artefatti locali ignorati da Git e potrebbero non essere disponibili in un altro checkout. Le descrizioni e i casi di test di questo documento sono quindi autosufficienti.

Per ripetere la dimostrazione dei difetti, se gli artefatti locali esistono:

```powershell
npx vitest run --config local-artifacts/review-2026-09-30/vitest.review.config.ts
```

Prima dei fix, `npm run check` passava con 191 test Vitest, 14 test Python e 24 scenari React/Electron, oltre a typecheck, lint e build. Il superamento della suite attuale non dimostra la risoluzione dei quattro problemi.

### Invarianti da preservare

- Una sola pipeline archivio ammessa alla volta, inclusa la preparazione; una sola richiesta Gemini fisica attiva secondo la policy globale.
- Le trascrizioni precedono le dispense ITA, che precedono le traduzioni ENG.
- Nessun secondo ciclo di retry/rotazione in `ArchiveService` o `ArchivePipeline`: questa responsabilità resta in `GeminiRequestManager`.
- Budget assoluto massimo di sei tentativi per richiesta logica e budget per coppia chiave-modello; limite RPM e gruppi quota invariati.
- Fallback prima dell'emissione di testo consentito secondo la policy; dopo testo parziale nessun nuovo tentativo automatico della stessa richiesta.
- Originali audio e trascrizioni grezze preservati; output già salvati e checkpoint granulari riutilizzati alla ripresa.
- Stato della pipeline persistito prima di avviare attività AI; nessuna chiamata avviata se la persistenza necessaria fallisce.
- Nessun oggetto Error, causa SDK, credenziale, prompt o contenuto di lezione aggiunto ai nuovi campi IPC, log o checkpoint di stato.

## 3. R1 — Ammissione atomica della pipeline

### Causa e file coinvolti

In `electron/main/ai/archivePipeline.ts`, `start()` controlla `this.processing` e poi attende `buildTasks()`, la presenza di chiavi e la persistenza. Lo slot viene occupato soltanto in `launch()`. `resume()` presenta la stessa finestra prima del lancio. Due chiamate entrano entrambe prima dell'assegnazione e condividono uno stato che viene sovrascritto.

Riferimenti iniziali: `start()` circa righe 197-245, `resume()`, `launch()`, `isProcessing()`, `waitForCompletion()` e `requestStop()`. Verificare anche `ArchiveService.queueAutomaticLectureProcessing()` e i comandi IPC in `electron/main/index.ts`.

### Comportamento desiderato

La prima chiamata valida acquisisce la proprietà dell'intero ciclo, dalla preparazione al completamento del worker. Una seconda chiamata mentre lo slot è occupato restituisce `started: false`, senza pianificare un altro run, generare un altro ID o mutare la coda.

La richiesta concorrente non deve restare in attesa per poi lanciare una seconda pipeline quando la prima termina. Si conserva la semantica di rifiuto dell'avvio mentre l'archivio è occupato. Una pipeline in pausa resta riprendibile tramite `resume()`; `start()` non sostituisce una coda sospesa.

### Disegno raccomandato

Introdurre una prenotazione privata acquisita sincronicamente **prima del primo await**, condivisa da `start()` e `resume()`. Può essere un oggetto interno contenente:

```typescript
interface PipelineRunReservation {
  token: symbol
  phase: 'preparing' | 'running'
  stopRequested: boolean
  completion: Promise<void>
  // Resolver interno della completion, mai esposto via IPC/persistenza.
}
```

Questo è uno schema di responsabilità, non codice da incollare. L'implementazione deve usare un resolver tipizzato e completarlo esattamente una volta. La prenotazione può convivere con `processing`, che continua a riferirsi al worker; non usarla come nuovo stato persistente.

Procedura di ammissione:

1. Controllare slot e precondizioni di stato senza await.
2. Se occupato/non ammissibile, restituire un risultato negativo con snapshot corrente coerente.
3. Creare e assegnare la prenotazione nello stesso tratto sincrono.
4. Preparare piano/preflight e persistire lo stato.
5. Trasferire la proprietà della prenotazione al worker quando il lancio avviene.
6. Se non si lancia, liberarla nel `finally` dell'ammissione.
7. Se si lancia, liberarla nel `finally` del worker, dopo la chiusura del run.

Il rilascio verifica l'identità del token: una finalizzazione vecchia non deve cancellare il riferimento a una nuova elaborazione. Non liberare la prenotazione incondizionatamente quando `start()` ritorna se il worker è ancora attivo.

È possibile riusare `electron/main/asyncMutex.ts`, ma solo preservando la semantica sopra. Un mutex che accoda l'intero run può trasformare due click in due elaborazioni successive; un mutex limitato alla preparazione deve comunque mantenere lo slot occupato fino al termine del worker. La prenotazione sincrona rende questi vincoli espliciti.

### Lifecycle e percorsi di uscita

| Caso | Risultato richiesto |
| --- | --- |
| Nessun lavoro mancante | Nessuna chiamata; stato finale coerente; slot liberato |
| Nessuna chiave configurata | Stato `paused` persistito; slot liberato; ripresa successiva possibile |
| Errore di pianificazione/preflight | Nessun worker; slot liberato; promessa osservabile conclusa; stato non bloccato in un falso running |
| Errore della persistenza iniziale | Nessuna attività AI; slot liberato; errore gestito dal chiamante; non fingere il salvataggio |
| Worker completo, in pausa o fermato | Prenotazione liberata solo dopo la finalizzazione effettiva |
| Errore del worker o del salvataggio finale | Nessuna rejection non osservata; slot liberato comunque; segnalazione locale sanitizzata |
| Interruzione durante preparazione | Prenotazione segnata per stop; appena il piano è disponibile, terminare senza iniziare una nuova attività AI |

`isProcessing()` deve includere la preparazione. `waitForCompletion()` deve attendere il ciclo ammesso che esiste al momento della chiamata, anche se `processing` non è ancora assegnato; non deve attendere run futuri estranei a quello snapshot. La completion della prenotazione può rappresentare l'intero ciclo e semplificare questa garanzia.

Non perdere uno stop richiesto durante un await sovrascrivendolo con `emptyStatus()` o con `stopRequested: false`: trasferire il flag della prenotazione nel piano/worker. Il pulsante resta cooperativo: se un'attività è già iniziata, finisce prima dell'arresto della coda.

Nel renderer si può aggiungere un guard sincrono tramite ref per avvio/ripresa e una disabilitazione durante l'invocazione IPC, ma è una protezione UX accessoria. La correttezza deve risiedere nel backend, anche per avvii automatici e chiamanti differenti. Il risultato negativo deve mostrare un messaggio di preparazione/occupazione appropriato, senza suggerire erroneamente che l'archivio sia completo.

### Test permanenti

In `tests/unit/archivePipeline.test.ts`, usare Promise controllabili per fermare pianificazione, preflight, persistenza e attività. Verificare:

- Due `start()` concorrenti: un solo piano/run ammesso, un solo worker, una sola generazione per lezione.
- Due `resume()` sulla stessa coda sospesa: una sola ripresa, medesimo run ID.
- Avvio automatico/manuale sovrapposti: un solo vincitore e nessuna coda silenziosamente sovrascritta.
- Lo slot è occupato durante ciascun await di preparazione.
- Nessuna chiave, nessun lavoro e fallimento della persistenza liberano lo slot.
- Dopo un errore, un successivo comando valido può partire.
- `waitForCompletion()` durante la preparazione non si risolve prima del worker.
- Stop durante preparazione: zero nuove attività AI; stato finale coerente.
- `finally` del ciclo precedente non libera il ciclo successivo.

Le fixture devono aggiornare i metadati quando un'operazione riesce, per non confondere un problema di deduplicazione con una fixture irrealistica. Gli assert devono essere sul numero di operazioni e sullo stato finale, non sui nomi dei nuovi campi privati.

## 4. R2 — Abort reale e pulizia del trasporto streaming

### Causa e file coinvolti

`electron/main/ai/geminiTransport.ts` rifiuta Promise locali ai timeout ma non passa `config.abortSignal` a `ai.models.generateContentStream()`. Il segnale ricevuto è usato solo dal wrapper. La richiesta sottostante può continuare e sovrapporsi al successivo tentativo.

Il SDK installato espone `GenerateContentConfig.abortSignal`. Verificarne tipi e implementazione in `node_modules/@google/genai` prima di lavorare; non nascondere incompatibilità con cast aggiuntivi. Controllare anche il timer del tentativo in `GeminiRequestManager` e `QNA_TIMEOUTS` in `geminiPolicy.ts`.

### Ownership dell'annullamento

Per ogni invocazione di trasporto creare un AbortController locale:

1. Collegarlo al segnale del tentativo, gestendo sia il segnale già annullato sia l'evento successivo.
2. Passare il segnale locale nel `config` del SDK, dopo lo spread delle altre opzioni: il chiamante non deve poterlo sostituire accidentalmente.
3. Ai timeout locali annullare il controller con una causa di tipo `timeout`.
4. Alla cancellazione esterna interrompere il controller conservando la causa corretta.
5. Disabilitare emissioni tardive prima di iniziare la pulizia.

Forma indicativa della chiamata:

```typescript
config: {
  ...config,
  abortSignal: transportController.signal
}
```

Questo passaggio da solo non basta: un timeout del primo testo/inattività deve effettivamente chiamare `abort()`, non limitarsi a rigettare una Promise.

### Deadline e classificazione

Preservare i valori configurati: primo contenuto entro 60 secondi, inattività entro 45 secondi, limite di tentativo Q&A 180 secondi. Usare gli override brevi già previsti per i test.

- Il budget iniziale parte prima dell'apertura del SDK e continua fino al primo testo utile. L'apertura dello stream non riavvia altri 60 secondi.
- Chunk di soli metadati non sono testo mostrato allo studente e non devono estendere indefinitamente il timeout iniziale.
- Dopo il primo testo, resettare il timer di inattività sui chunk di testo utili. Il limite totale resta attivo anche con chunk regolari.
- Un timeout del manager deve diventare un errore `timeout`, distinto da una cancellazione volontaria. L'attuale `abort()` senza motivo rischia di far classificare entrambe le situazioni come `cancelled`.

Il manager può annullare il suo controller con un `GeminiError` di categoria `timeout`; il trasporto conserva il motivo noto prima di normalizzare un eventuale `AbortError` generico del SDK. Una cancellazione dell'utente resta `cancelled`, senza retry. Non cambiare il comportamento dei timeout degli altri flussi senza prima verificarlo e aggiungere le regressioni pertinenti.

### Consumo e pulizia dello stream

Preferire una sola routine responsabile dell'apertura e del consumo del flusso. Evitare un task di lettura staccato dalla Promise pubblica che sopravvive silenziosamente alla sua conclusione.

La finalizzazione, sia per successo sia per errore, deve:

- cancellare tutti i timer locali;
- rimuovere tutti i listener aggiunti al segnale padre;
- impedire qualunque `onChunk` successivo alla conclusione;
- interrompere fetch/lettura tramite abort e chiudere l'iteratore se disponibile;
- osservare le rejection di apertura e lettura anche se arrivano tardi;
- non attendere indefinitamente un `iterator.return()` bloccato su un `next()`.

Se si usa una race per rendere la Promise pubblica reattiva, osservare e finalizzare anche il ramo perdente. `return()` dell'iteratore è una misura di pulizia, non sostituisce l'abort della rete. Con il SDK reale l'annullamento deve interrompere la lettura client prima di consentire un nuovo tentativo; verificarlo con una simulazione di fetch che rispetti il segnale.

Un mock che ignora deliberatamente abort può non concludersi mai: non usarlo come prova che il SDK reale sia stato annullato e non lasciare che blocchi indefinitamente il cleanup/test. Deve comunque risultare impossibile emettere suoi chunk tardivi. Non dichiarare garantita la cancellazione del calcolo lato Google: l'abort client interrompe la connessione, ma non garantisce lo storno di quote o costi già maturati.

### Integrazione con scheduler e recupero

Il trasporto termina il singolo tentativo. Il manager decide se ritentare, rispettando RPM, cooldown e budget. Un timeout prima del testo può essere recuperabile; dopo testo parziale si applica R3, anche quando il timeout del trasporto è normalmente retryable.

Non aggiungere retry nel trasporto. Controllare le opzioni HTTP effettive del SDK: una configurazione futura di retry non deve creare tentativi nascosti alla telemetria. Nella revisione non è stato confermato un bug di retry automatici del SDK; non assumere dal solo valore di default documentato che siano attivi senza verificarne il percorso effettivo.

### Test permanenti

Estendere `tests/unit/qnaRequest.test.ts` o introdurre una suite dedicata al trasporto, secondo lo stile del repository:

| Scenario | Assert necessari |
| --- | --- |
| Segnale già annullato | Nessuna chiamata SDK; errore cancelled |
| Apertura SDK bloccata | Segnale SDK annullato al timeout; errore timeout; nessuna richiesta ancora client-attiva |
| Apertura lenta poi primo testo lento | Budget unico dalla partenza, non due finestre successive |
| Stream aperto senza testo | Abort alla deadline iniziale, anche con chunk vuoti/metadati |
| Testo seguito da inattività | Abort del flusso; nessun chunk tardivo |
| Cancellazione durante apertura/lettura | Abort propagato; nessun retry utente; listener rimossi |
| Timeout totale con chunk regolari | Il limite 180s prevale; categoria timeout preservata |
| Successo e errore SDK immediato | Timer/listener puliti anche senza timeout |
| Timeout seguito da fallback | Contatore di trasporti client-attivi mai maggiore di uno |

Usare fake timer o Promise controllabili; ripristinare timer e mock nel teardown. Un test deve passare dal SDK reale con `fetch` simulato e dati sintetici, se tecnicamente possibile senza rete, per verificare che il segnale arrivi fino alla connessione. Gli altri possono simulare `getClient()`. Quando il SDK compone i segnali, verificare gli effetti dell'abort, non l'identità dell'oggetto passato a fetch.

## 5. R3 — Errore terminale dopo emissione di testo

### Causa

In `GeminiService.generateQnaResponse()` un errore dopo un chunk diventa `isRetryable: false`, conservando la categoria. In `GeminiRequestManager.runLogicalRequest()`, però, gli errori non retryable di categoria authentication/quota_exhausted/model_unavailable continuano rispettivamente su altre chiavi o modelli. Questo recupero è corretto prima del testo, ma è vietato dopo una risposta parziale.

La riproduzione confermata: primo tentativo emette `first partial answer; ` e fallisce con quota giornaliera; il fallback emette `new full answer`; la richiesta risulta riuscita con i due testi concatenati.

### Contratto da introdurre

Aggiungere alla rappresentazione interna `GeminiError` una proprietà esplicita, per esempio:

```typescript
type RecoveryDisposition = 'policy' | 'terminal'
// Campo opzionale nei dettagli in ingresso, default interno 'policy'.
// Proprietà readonly sull'istanza normalizzata.
```

`isRetryable` continua a indicare se lo stesso tipo di fallimento è transitorio. `recoveryDisposition: 'terminal'` vieta **tutte** le forme di recupero automatico della richiesta corrente, compresi rotazione e fallback. Lasciare `policy` come default conserva gli altri caller e gli errori di autenticazione anteriori al primo chunk.

Non usare una categoria fittizia `unknown` per forzare lo stop: perderebbe le informazioni di quota/permessi necessarie alla telemetria. Non rendere globalmente terminali tutti gli errori con `isRetryable: false`: si romperebbe il fallback legittimo prima del testo.

Nel Q&A, dopo il primo testo effettivamente emesso, ogni errore deve essere re-incapsulato con disposizione terminale, mantenendo categoria, status e segnale di quota; il messaggio visibile resta sanitizzato. La normalizzazione deve conservare questa proprietà se riceve un `GeminiError` già normalizzato.

### Ordine delle operazioni nel manager

Nel catch del tentativo:

1. Pulire timer e listener del tentativo.
2. Normalizzare conservando la disposizione.
3. Registrare il fallimento e la telemetria del tentativo.
4. Aggiornare cooldown/sospensione quota quando appropriato: il fatto che la richiesta sia terminale non rende falsa l'informazione sulla quota.
5. Se terminale, rilanciare immediatamente, prima di ogni ramo di rotazione, fallback, retry o backoff.
6. Negli altri casi mantenere la policy corrente.

La richiesta logica ha un solo summary finale `failed`; non deve risultare success dopo un errore terminale. Non chiamare `onRetry` o `onAttempt` per un secondo tentativo inesistente.

### Renderer e persistenza

`ArchiveService.generateQnaResponse()` restituisce `success: false` e invia stato error. Il codice corrente di `src/hooks/useQna.ts` ripristina la conversazione base e salva la risposta definitiva solo se il risultato è riuscito e non vuoto: preservare questo comportamento.

Alla conclusione fallita il testo parziale non deve restare come risposta completa nel file delle chat né nello storico della domanda successiva. La domanda dell'utente rimane disponibile per un retry esplicito; quest'ultimo è una nuova richiesta autorizzata dal click, non un recupero automatico del vecchio stream.

### Test permanenti

Parametrizzare gli errori dopo testo: quota giornaliera 429, authentication, model_unavailable, service_unavailable 503, network_error, timeout e cancelled. Per ciascuno verificare un solo tentativo, esito fallito, nessun fallback e nessuna concatenazione.

Includere un pool di almeno due chiavi e modelli fallback nei test che devono dimostrare il blocco del recupero: l'assenza di alternative può nascondere il bug. Verificare anche i casi anteriori al testo: 503, quota e autenticazione continuano secondo la policy e `autoRotateOnQuota` resta rispettato.

Aggiungere una regressione React/Electron in `tests/integration/hookRegression.browser.tsx` che emette testo parziale seguito da fallimento: la risposta parziale viene rimossa, la domanda resta, nessuna risposta parziale viene persistita e un retry esplicito produce soltanto la nuova risposta. Riutilizzare lo scenario di isolamento tra lezioni per non inviare chunk a un viewer differente.

## 6. R4 — Errori strutturati fino alla pipeline

### Causa

Il normalizzatore Gemini converte 403 in `Accesso negato: verifica i permessi o la fatturazione del progetto Google Cloud.`. `ArchiveService` restituisce solo la stringa e `ArchivePipeline.classifyFailure()` cerca termini che non includono quel messaggio italiano. La categoria diventa unknown e la pipeline continua a consumare tentativi sulle altre lezioni.

### Soluzione raccomandata

Usare il `PipelineFailureKind` già presente in `shared/archive.ts`, aggiungendo un campo opzionale `failureKind?: PipelineFailureKind` a `GenerationResult` e `TranscribeAudioResult`. Il campo è un codice finito; non serializzare `GeminiError` o importare tipi del main process nel contratto condiviso.

Introdurre un helper backend puro che converte gli errori Gemini noti nel risultato di fallimento usato dagli stage. Applicarlo nei percorsi `generateLectureNotes`, `transcribeAudio` e `translateLectureNotes`, mantenendo il messaggio per l'utente e aggiungendo la categoria per l'orchestratore.

| Categoria Gemini | PipelineFailureKind | Pausa della pipeline |
| --- | --- | --- |
| authentication, permission_denied | authentication | Sì; ripresa esplicita dopo correzione delle impostazioni |
| quota_exhausted | quota_exhausted | Sì |
| rate_limited | rate_limited | Sì quando il manager ha esaurito il recupero |
| network_error | network | Sì |
| service_unavailable, timeout, model_unavailable | provider_unavailable | Sì quando non è rimasto un fallback riuscito |
| invalid_request, invalid_output | input | No; errore dell'attività, dipendenze bloccate |
| cancelled | cancelled | Non ripetere automaticamente; rispettare stop/cancellazione espliciti |
| unknown | unknown | Politica corrente per errore non classificato |

La mappatura permission_denied → authentication mantiene il formato persistente v1 senza aggiungere un nuovo enum di autorizzazione. La telemetria Gemini conserva comunque la categoria originaria permission_denied. Le proprietà dell'errore interno terminale di R3 non vanno propagate nei checkpoint della pipeline, che non esegue Q&A.

Gli errori locali non devono essere normalizzati ciecamente come errori provider: lezione mancante → not_found, input vuoto/mancante → input, sorgente cambiata durante l'elaborazione → source_changed. Assegnare questi codici nei return locali dove la condizione è già nota. Un numero 404 in un errore locale non deve diventare indisponibilità del modello.

La classificazione dello stage deve usare prima `result.failureKind` e solo in assenza del campo il fallback testuale legacy. Quest'ultimo deve riconoscere almeno tutti i messaggi controllati del normalizzatore, inclusi Accesso negato e modello non disponibile, ma non sarà più la fonte autorevole dei nuovi flussi. Coprire anche eccezioni Gemini lanciate direttamente da un'operazione: non devono perdere la categoria nel catch generico del runner.

Per errori provider sconosciuti usare un messaggio generico sanitizzato quando non è possibile garantire che il testo sia innocuo. Non aggiungere cause, stack SDK o frammenti di credenziali ai risultati condivisi. La stringa visibile non deve essere usata come sostituto del codice strutturato.

### Stato e ripresa

Quando una richiesta termina con problema di autorizzazione:

1. La task corrente viene salvata come failed/authentication.
2. La pipeline si mette in paused e smette di avviare altre task.
3. Il messaggio di pausa indica di controllare chiave, permessi o fatturazione; non attribuisce sempre l'errore alla rete.
4. Le task future restano pending, incluse le dipendenze non ancora esaminate.
5. La ripresa esplicita rimette in pending la task riprovabile, preservando successi, run ID e checkpoint granulari.

La disposizione terminale di un errore Q&A e la riprendibilità manuale di una pipeline sono concetti diversi: il divieto di retry automatico non deve impedire un tentativo successivo esplicitamente avviato dall'utente.

Compatibilità: i risultati legacy senza campo restano validi; i file della pipeline già esistenti restano leggibili. Un vecchio errore salvato come unknown può essere rivalutato alla ripresa solo se il messaggio corrisponde a un pattern controllato noto, come Accesso negato. Testare questo recupero e non trasformare indiscriminatamente tutti gli unknown in task riprovabili. Non riscrivere le vecchie voci di DECISIONI.md.

### Test permanenti

- Test della mappatura per tutte le categorie Gemini, con copertura esaustiva del tipo.
- Test dei tre metodi di ArchiveService con un errore 403 normalizzato: failureKind authentication e messaggio sanitizzato.
- Pipeline con due lezioni: prima richiesta fallisce 403, seconda non viene chiamata; status paused e task future pending.
- Dopo correzione sintetica dei permessi, resume completa il lavoro e salta gli output già presenti.
- Stato persistito ricaricato: pausa e categoria sopravvivono al riavvio.
- Risultati legacy e vecchio checkpoint unknown/Accesso negato: compatibilità e ripresa mirata.
- Errori di input/source_changed/not_found non fanno scattare una falsa pausa provider.

La UI deve mostrare gli output già completati anche quando la pipeline si ferma a metà. Verificare `useArchivePipeline`: attualmente aggiorna la libreria solo per completed/completed_with_errors/stopped. Includere un refresh alla transizione a paused, evitando refresh ripetuti per snapshot uguali, e aggiungere uno scenario React che dimostri la visibilità degli output salvati prima del 403. Questo è un controllo di integrazione del fix, distinto dai quattro difetti originariamente riprodotti.

## 7. Mappa dei file e ordine di implementazione

| File | Intervento previsto |
| --- | --- |
| `electron/main/ai/archivePipeline.ts` | R1 prenotazione/lifecycle; R4 classificazione strutturata e pausa/ripresa |
| `electron/main/ai/geminiTransport.ts` | R2 abort, deadline iniziale e cleanup streaming |
| `electron/main/ai/geminiRequestManager.ts` | R2 causa timeout del tentativo; R3 disposizione terminale prima dei rami di recupero |
| `electron/main/ai/geminiErrors.ts` | R3 proprietà terminale compatibile con normalizzazione; eventuale helper di conversione R4 |
| `electron/main/gemini.ts` | R3 marcatura degli errori dopo emissione di testo |
| `electron/main/archive.ts` | R4 categorie nei risultati; integrazione di avvio automatico e completamento |
| `shared/archive.ts` | R4 campo opzionale failureKind nei risultati |
| `src/hooks/useArchivePipeline.ts` | Guard UX se adottato; refresh al passaggio in pausa |
| `src/hooks/useQna.ts` | Preservare rimozione/persistenza del parziale; modificare solo se il test rivela una lacuna |
| `tests/unit/archivePipeline.test.ts` | Regressioni R1 e R4 con attese controllabili e store reale temporaneo dove serve |
| `tests/unit/qnaRequest.test.ts` | Regressioni R2/R3 a livello service/transport |
| `tests/unit/geminiPhaseB.test.ts` | Policy del manager, budget, recupero prima del testo e terminalità |
| `tests/unit/archive.test.ts` | Propagazione categorie dai tre stage, compatibilità dei contratti |
| `tests/integration/hookRegression.browser.tsx` | Parziale Q&A rimosso, guard UI e libreria aggiornata dopo pausa |

Ordine suggerito:

1. Ricontrollare stato e baseline; aggiungere regressioni fallenti per i quattro difetti.
2. Implementare R1 e verificare tutti i percorsi di rilascio dello slot.
3. Introdurre R3 prima o insieme a R2, così i nuovi timeout dopo testo non possono innescare fallback impropri.
4. Completare R2 con abort reale e classificazione corretta del timeout.
5. Implementare R4 e verificare riavvio/ripresa/refresh UI.
6. Eseguire il quality gate completo; registrare le decisioni effettive e aggiornare conteggi/documentazione se necessario.

Le fasi possono essere separate in modifiche piccole, ma il risultato va verificato come insieme. Non aumentare tentativi o timeout per far passare test e non eliminare regressioni precedenti che evidenziano incompatibilità introdotte dai fix.

## 8. Manutenzione di sicurezza delle dipendenze

Rilievo separato dai quattro bug: l'audit del 30 settembre segnalava tre pacchetti con severità aggregata alta nelle dipendenze di sviluppo/build: brace-expansion, fast-uri e undici. `npm audit --omit=dev --json` riportava zero vulnerabilità. Non è stata dimostrata la sfruttabilità nell'app installata; non attribuire il rilievo alle modifiche odierne né dichiararlo risolto dai quattro fix applicativi.

Fonti verificate nella revisione: [brace-expansion](https://github.com/advisories/GHSA-qhr7-859c-m2p7), [fast-uri](https://github.com/advisories/GHSA-qw65-cvwx-89v3), [undici](https://github.com/advisories/GHSA-3wwx-pv8p-q78v). L'audit riportava anche altri advisory degli stessi pacchetti.

Se viene inclusa questa manutenzione nel lavoro successivo:

1. Ripetere audit completo e di produzione: risultati/versioni possono cambiare.
2. Usare `npm ls brace-expansion fast-uri undici` per identificare ciascuna catena, distinguendo versioni annidate e root.
3. Consultare gli advisory correnti e simulare gli aggiornamenti con `npm audit fix --dry-run`.
4. Preferire aggiornamenti compatibili dei pacchetti responsabili; usare overrides solo se giustificati e verificati nelle diverse versioni major.
5. Evitare `npm audit fix --force` indiscriminato e aggiornamenti major estranei al problema.
6. Registrare la scelta, eseguire il quality gate e, se cambia la toolchain di packaging, verificare anche il packaging locale senza pubblicare una release.
7. Riportare le vulnerabilità residue con dipendenza, versione e motivo; non dichiarare tutto sicuro dal solo audit di produzione.

Questa sezione è un percorso di manutenzione separato: la sua eventuale esecuzione non sostituisce le regressioni dei quattro bug e non richiede aggiunte di dipendenze per risolverli.

## 9. Verifica finale e criteri di accettazione

Durante lo sviluppo usare i test mirati; alla conclusione eseguire:

```powershell
npm run check
npm audit --omit=dev --json
npm audit --json
```

`npm run check` comprende typecheck, lint, Vitest, regressioni Python, scenari Electron e build. L'audit completo può restituire exit code non zero per le vulnerabilità già note: registrare il risultato separatamente, non mascherarlo e non usarlo per ignorare errori del quality gate.

Il lavoro è accettabile soltanto quando:

- [ ] Due avvii o riprese sovrapposti producono un unico ciclo, senza duplicare le chiamate applicative.
- [ ] Lo slot resta occupato dalla preparazione alla conclusione e viene liberato in ogni percorso di errore.
- [ ] Wait e stop sono corretti anche durante la preparazione.
- [ ] Timeout/cancellazione raggiungono il SDK e la lettura client; nessun chunk tardivo o tentativo di trasporto concorrente.
- [ ] I timeout sono distinti dalle cancellazioni volontarie; i budget iniziali non vengono riavviati all'apertura.
- [ ] Dopo testo parziale tutte le categorie di errore sono terminali per la richiesta corrente.
- [ ] Prima del testo restano funzionanti fallback, rotazione consentita, budget di sei tentativi e RPM.
- [ ] La risposta parziale fallita non è persistita come completa né riusata nello storico.
- [ ] Il 403 strutturato sospende la pipeline prima della seconda lezione e la ripresa manuale funziona dopo correzione dei permessi.
- [ ] Compatibilità con risultati/checkpoint precedenti e recovery al riavvio verificati.
- [ ] Output già salvati visibili dopo la pausa; audio e trascrizioni originali intatti.
- [ ] Test nuovi significativi verdi e quality gate completo superato.
- [ ] Nessuna nuova dipendenza necessaria ai fix, nessuna chiave o dato personale nelle fixture/log/errori nuovi.
- [ ] Decisioni registrate tramite lo script e documento aggiornato al comportamento effettivamente implementato.

Un collaudo manuale offline può simulare doppio click, stream fermo, errore quota dopo chunk e 403 dopo una lezione completata. I test devono documentare il numero di tentativi effettivi e i passaggi di stato; non serve un account Gemini per dimostrare le garanzie applicative.

## 10. Consegna richiesta al modello implementatore

La risposta finale del lavoro di implementazione deve indicare, per R1-R4: cosa è stato modificato, quali regressioni lo dimostrano e quali eventuali limiti restano. Elencare gli ID delle decisioni aggiunte, l'esito del quality gate e degli audit, e distinguere le simulazioni offline dai collaudi remoti eventualmente autorizzati.

Non affermare che il vecchio installer include i fix dopo la sola build del repository. Se non si rigenera il setup, dichiarare che il codice/build locale è aggiornato e l'installer precedente deve essere ricreato in un'attività dedicata.

### Prompt pronto per l'handoff

> Implementa i fix descritti in `docs/quality/bugfix-handoff-2026-09-30.md`. Leggi prima le istruzioni di AGENTS.md e i documenti di progetto nell'ordine previsto. Preserva il working tree esistente. Correggi R1-R4 con regressioni permanenti: prenotazione atomica della pipeline, abort reale dello streaming, terminalità di qualsiasi errore dopo testo parziale e categorie strutturate fino alla pausa/ripresa della pipeline. Mantieni scheduler, gruppi quota, fallback anteriori al testo, massimo sei tentativi, checkpoint e fonti originali. Non effettuare chiamate AI reali e non usare dati o chiavi personali. Registra ogni decisione non banale tramite tools/append_decision.py, esegui npm run check e riporta separatamente gli audit delle dipendenze. Aggiorna il piano con ciò che hai realmente implementato e consegna risultati, test e limiti verificabili. La manutenzione delle vulnerabilità dev/build è una fase distinta da valutare secondo la sezione 8; non dichiararla risolta dai soli fix applicativi.

## 11. Consuntivo di implementazione — 1 ottobre 2026

Al termine della prima consegna, le quattro correzioni erano applicate al codice e alla build locale. Le modifiche preesistenti sono state conservate. In quella fase non sono state introdotte dipendenze, modificati modelli o quote, contattato Gemini, lette credenziali personali, creati commit, eseguiti push o generati installer. Il successivo ricontrollo e packaging autorizzato sono descritti nella sezione 12.

### Implementazione e regressioni

| Fix | Comportamento implementato | Evidenza permanente |
| --- | --- | --- |
| R1 | Prenotazione sincrona prima del primo await, condivisa da start/resume e mantenuta fino alla finalizzazione. Secondi avvii rifiutati subito, wait esteso al ciclo completo e stop conservato durante preparazione. Rilascio per identità anche su errori di persistenza; nessuna AI prima del salvataggio iniziale. | `archivePipeline.test.ts`: pianificazione/preflight/persistenza sospesi con Promise controllabili, manuale/import concorrenti, due resume, wait fino al worker, stop in preparazione e ripresa, nessun lavoro/chiave, errori di ammissione e salvataggio finale, nuovo ciclo dopo il completamento. |
| R2 | Controller posseduto dal trasporto e propagato al SDK; deadline iniziale unica fino al primo testo utile, inattività sul testo utile e causa timeout conservata dal manager. Timer/listener rimossi, abort prima del cleanup, letture perdenti osservate e return non cooperativo non bloccante. | `geminiStreaming.test.ts` e `qnaRequest.test.ts`: apertura bloccata/lenta, metadati, cancellazione in apertura/lettura, inattività, chunk tardivi, rejection tardiva, cleanup, timeout totale con testo regolare e AbortError generico. SDK installato con fetch sintetico: abort in apertura/lettura e timeout seguito da fallback con massimo un trasporto client attivo. |
| R3 | GeminiError ha recoveryDisposition policy/terminal. Dopo il primo testo il Q&A mantiene categoria/status/quota ma vieta qualsiasi recupero; telemetria e sospensione quota sono aggiornate prima dello stop. | `qnaRequest.test.ts`: quota giornaliera, authentication, model_unavailable, 503, network, timeout e cancelled dopo testo, con due chiavi e fallback disponibili, producono un solo tentativo. `geminiPhaseB.test.ts`: un solo summary failed, nessun onRetry, quota conservata per richieste successive. Scenario React/Electron: rollback del parziale, domanda conservata e retry esplicito senza parziale nello storico. |
| R4 | failureKind opzionale nei due contratti IPC, helper `pipelineFailure.ts` esaustivo, permission_denied → authentication. Pipeline usa il codice prima del fallback legacy, si ferma sul 403 e propone controllo chiave/permessi/fatturazione. Refresh della libreria alla transizione paused senza duplicati. | `pipelineFailure.test.ts`: tutte le categorie e sanitizzazione. `archive.test.ts`: 403 nei tre stage, fonti intatte, input/not_found locali e source_changed per ASR/traduzione senza salvare output obsoleti. `archivePipeline.test.ts`: 403 strutturato/lanciato/legacy, seconda lezione non avviata, riavvio e resume con run ID/successi conservati; unknown legacy rivalutati solo per messaggi controllati. Scenario React/Electron: output salvati visibili dopo pausa e nuovo refresh dopo ripresa. |

Il formato persistente della pipeline resta v1. I risultati precedenti senza failureKind restano accettati; i checkpoint unknown/Accesso negato sono recuperabili manualmente senza rendere riprovabili tutti gli unknown. I fallimenti locali non vengono normalizzati come errori modello a partire da numeri HTTP nel loro testo. Errori provider sconosciuti e segnalazioni locali nuove usano messaggi generici sanitizzati.

I fallback precedenti al testo, autoRotateOnQuota, budget massimo di sei tentativi e budget per coppia chiave/modello restano coperti dalle regressioni esistenti. La domanda Q&A resta disponibile dopo il fallimento; la risposta parziale non viene salvata come completa né utilizzata dal retry esplicito.

### Verifiche

Prima delle correzioni, 93 test mirati esistenti passavano. Le prime nuove regressioni hanno prodotto sei fallimenti riconducibili ai quattro difetti: slot libero durante preparazione, seconda trascrizione dopo 403, mancato abort SDK e recuperi impropri dopo parziale per quota/authentication/model_unavailable. Le stesse regressioni passano dopo i fix.

- `npm run check`: typecheck, lint, 256 test Vitest, 14 test Python, 26 scenari React/Electron e build di produzione.
- SDK reale verificato esclusivamente con fetch simulato; le altre prove usano fixture sintetiche, store temporanei e timer controllati.
- Ultimo audit riuscito del 30 settembre, `npm audit --omit=dev --json`: zero vulnerabilità.
- Ultimo audit completo riuscito del 30 settembre, `npm audit --json`: tre pacchetti con severità alta, exit code 1; risultato separato dal quality gate.
- Aggiornamento dei due audit tentato il 1 ottobre: non disponibile, exit code 1 per `ENOTFOUND registry.npmjs.org`. Questo errore di rete non conferma né risolve vulnerabilità; i conteggi precedenti restano l'ultima evidenza disponibile.
- `git diff --check`: nessun errore di whitespace.

Decisioni aggiunte tramite `tools/append_decision.py`: D-0166 (R1), D-0167 (R2), D-0168 (R3), D-0169 (R4), D-0170 (consuntivo di qualità, audit e documentazione).

### Limiti e manutenzione residua

Le vulnerabilità dev/build restano: brace-expansion 1.1.18 e 2.1.4 nelle catene electron-builder e 5.0.9 nella catena eslint; fast-uri 3.1.6 tramite ajv di app-builder-lib; undici 6.28.0 tramite node-gyp di @electron/rebuild. La catena electron/@electron/get usa anche undici 7.29.1. Le versioni e le catene sono state controllate con `npm ls brace-expansion fast-uri undici`. Nessun aggiornamento delle dipendenze è incluso: la manutenzione resta un intervento distinto sulla toolchain con verifica di compatibilità e packaging, secondo la sezione 8.

Abort interrompe la connessione client, senza garantire arresto del calcolo o storno delle quote lato Google. Il cleanup di iteratori o mock che ignorano abort non viene atteso indefinitamente, ma non può emettere testo dopo la conclusione. Nessuna prova remota autorizzata è stata eseguita.

Alla prima consegna il setup in `dist/` non era stato rigenerato. È stato successivamente aggiornato su richiesta esplicita, come descritto nella sezione 12. La generazione del setup non modifica automaticamente l'app già installata.

## 12. Ricontrollo e installer Windows — 1 ottobre 2026

La revisione di ammissione, stop/wait, errori strutturati, abort, terminalità Q&A e refresh ha individuato un ulteriore difetto nel renderer: una risposta IPC di start/resume/stop poteva applicare uno snapshot obsoleto dopo un evento di avanzamento più recente. La regressione Electron ha riprodotto la UI che tornava running dopo paused. Il hook conserva ora una revisione degli eventi ricevuti e applica lo snapshot del comando solo se non sono arrivati progressi durante l'attesa IPC. La stessa regressione verifica anche che una risposta stop tardiva non sovrascriva stopped.

La correzione è registrata in D-0171. Il quality gate successivo è passato: typecheck, lint, 256 test Vitest, 14 test Python, **27 scenari React/Electron** e build. `git diff --check` non segnala errori di whitespace.

Il setup generale Windows NSIS x64 è stato generato con `npm run package:win -- --publish never` (exit code 0), mantenendo la versione configurata 0.1.0 e conservando una copia locale del vecchio installer in `local-artifacts/installer-backups/`. La decisione di packaging è D-0172.

| Artefatto/verifica | Esito |
| --- | --- |
| Installer | `dist/Lezionify-Setup-0.1.0.exe`, 167.914.976 byte |
| SHA256 | `45e0fb822038d9426459e34a74bb3a5a1154dd97e76122d7335d8ef3974e35a9` |
| Manifesto e blockmap | `dist/latest.yml` e `.exe.blockmap` rigenerati; entrambi gli SHA512 e la dimensione del manifesto corrispondono al setup |
| Contenuto ASAR | Tutti i 141 file di `out/` corrispondono byte per byte a quelli pacchettizzati |
| FFmpeg | Eseguibile presente in `app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg.exe` |
| Artefatti locali | Directory locali, libreria e trascrizione manuale escluse dall'archivio |
| Firma Authenticode | `NotSigned`; i messaggi signing della toolchain non equivalgono a una firma valida |
| Smoke del contenuto pacchettizzato | Main/preload/renderer caricati dall'ASAR nel runtime Electron, finestra nascosta, profilo temporaneo vuoto; bridge IPC disponibile, UI renderizzata, archivio idle → completed senza lavoro né chiamate AI, nessun errore renderer |

Lo smoke usa una libreria temporanea e blocca rete e scansione del registratore reale. Non è un collaudo Gemini remoto né un'installazione sul profilo personale. L'installer è pronto per l'installazione manuale, comprende R1–R4 e D-0171 e non è stato pubblicato. Non è stato aggiornato il vecchio eseguibile portable, che costituisce un artefatto distinto dal setup richiesto. I rilievi dev/build dell'audit restano separati dal packaging.
