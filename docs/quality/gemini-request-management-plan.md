# Piano di implementazione: gestione affidabile delle richieste Gemini

Data: 2026-09-29. Stato: piano da implementare da parte di un altro modello.

Questo documento e' un handoff operativo completo. La sua presenza non significa che le correzioni siano gia' implementate o collaudate online. Le impostazioni proposte sotto sono decisioni di implementazione da registrare quando adottate; non sono quote garantite da Google.

## 1. Obiettivo e risultato atteso

Rendere affidabili e comprensibili trascrizione, generazione dispense, traduzione, quiz/flashcard, Q&A e chiamate accessorie a Gemini.

Il sistema deve:

- coordinare tutte le richieste concorrenti attraverso un unico gestore nel processo Electron main;
- distinguere sovraccarico del servizio, quota temporanea, quota giornaliera, credenziali errate, modello non disponibile, problemi di rete e output non valido;
- riprovare o cambiare chiave sulla singola operazione fallita, conservando il lavoro gia' riuscito;
- rispettare realmente limiti configurati, indicazioni di attesa e budget di tentativi;
- non interpretare un errore di trascrizione come assenza di parlato;
- poter interrompere, riprendere e diagnosticare le operazioni senza esporre dati personali o segreti;
- mantenere audio originale, trascrizione grezza e contenuti derivati separati;
- offrire una verifica offline completa, seguita da un collaudo reale opzionale ed esplicitamente autorizzato.

Non rientrano nel lavoro: rifacimento generale della UI, nuovi provider, RAG tra corsi, cambio indiscriminato dei modelli, pubblicazione di release, refactoring di tutto ArchiveService o modifica del benchmark Python se non emerge una dipendenza concreta.

## 2. Prima di implementare

1. Leggere AGENTS.md, IDEA_INIZIALE.md, STRUTTURA_PROGETTO.md e le decisioni piu' recenti in DECISIONI.md, nell'ordine richiesto dal repository.
2. Leggere questo piano integralmente e riconciliare i riferimenti con il codice corrente: i numeri di riga della revisione possono essere cambiati.
3. Eseguire `git status --short` e analizzare i diff dei file interessati. Il working tree contiene molte modifiche utente, tra cui la nuova trascrizione, USB e la gestione dei 503: preservarle.
4. Non fare reset, checkout distruttivi, pulizia di file locali, commit/push o packaging automatici. Non leggere/decrittare le chiavi per la fase offline.
5. Verificare la versione effettivamente installata di `@google/genai`, il supporto ad abort/timeout e i retry di Models, Files e Interactions. Non basarsi su interfacce ricordate o su cast `unknown` per nascondere incompatibilita'.
6. Prima dei cambiamenti, registrare baseline dei test locali e inventario delle chiamate SDK. Nessuna chiamata remota nella baseline.
7. Per ogni modifica non banale, usare direttamente `tools/append_decision.py` come richiesto da AGENTS.md. Non modificare manualmente il Registro.

Non aggiungere dipendenze se TypeScript, API Node e Vitest esistenti sono sufficienti. Se serve una dipendenza, motivarla e registrarla.

## 3. Evidenze della revisione da trasformare in regressioni

| ID | Evidenza osservata | Conseguenza | Priorita' |
| --- | --- | --- | --- |
| R1 | Il fallback audio passa `contents: [file, prompt]`; con lo SDK installato il payload offline contiene una parte vuota, senza URI audio | Il recupero multimodale non riceve correttamente l'audio | P1 |
| R2 | Errori della trascrizione e del fallback vengono catturati; il testo vuoto diventa un marker di assenza di parlato | Falso successo, mancata rotazione, possibile dispensa incompleta | P1 |
| R3 | La rotazione avvolge l'intera generazione della dispensa | Se fallisce una sezione si ripetono segmentazione e sezioni riuscite | P1 |
| R4 | Sezioni sequenziali e pause di 1,2/1,5 s; nessun coordinamento comune con Q&A e operazioni manuali | Nessuna garanzia sul numero totale di richieste al minuto | P1 |
| R5 | Il parser riconosce `retry after`, non `Please retry in` o `RetryInfo.retryDelay` | Un suggerimento di 42,5 s puo' diventare 1,2 s | P1 |
| R6 | Timeout con Promise wrapper, senza abort del trasporto; Q&A limita solo l'apertura dello stream | Richieste ancora attive dopo timeout; stream bloccati | P1 |
| R7 | Interactions ha retry interni nello SDK oltre al wrapper applicativo | Moltiplicazione di tentativi e tempi non visibili | P2 |
| R8 | Segmentazione e logistica possono fallire con catch generici; i fallimenti hanno semantiche diverse | Degradazioni non spiegate e stato poco affidabile | P2 |

La revisione ha eseguito 144 test Vitest con successo. Questo non certifica i casi sopra: servono test mirati. Non sono stati raccolti dati di produzione sufficienti a quantificare quale problema provochi la maggior parte degli errori dell'utente.

## 4. Inventario dei flussi da coprire

| Flusso | Operazioni remote | Completamento corretto |
| --- | --- | --- |
| Dispensa breve | Generazione unica; eventuale logistica | Markdown valido salvato atomicamente |
| Dispensa lunga | Segmentazione, overview, note esame, N sezioni; logistica ed eventuale merge | Tutte le parti obbligatorie valide; warning separati per parti accessorie |
| Trascrizione | Upload, polling Files, Interactions per chunk, fallback Models, cleanup | Tutti i chunk risolti; nessun errore mascherato come silenzio |
| Traduzione | Models sull'intera dispensa | Output non vuoto, sorgente ancora identica al momento del salvataggio |
| Quiz/flashcard | Models JSON, validazione | Struttura e campi semanticamente validi |
| Q&A | Apertura stream, lettura chunk | Risposta completa, timeout/abort reali, nessun testo duplicato tra tentativi |
| Verifica chiave | Richiesta minima di verifica | Distinguere chiave invalida da modello/quota/servizio indisponibile |

Includere tutte le invocazioni manuali, batch, automatiche e le richieste avviate via IPC. Non basta cambiare il percorso delle dispense.

## 5. Architettura proposta

Separare trasporto, politica di esecuzione e orchestrazione dei contenuti. I nomi seguenti sono indicativi; mantenere poche responsabilita' chiare, senza framework generici superflui.

| Modulo | Responsabilita' |
| --- | --- |
| `electron/main/ai/geminiErrors.ts` | Normalizzazione errori, parsing attese, messaggi sanitizzati |
| `electron/main/ai/geminiTransport.ts` | Adattatore SDK: una chiamata fisica per tentativo, payload, abort, stream e Files |
| `electron/main/ai/geminiRequestManager.ts` | Unica istanza condivisa, scheduler, budget, retry, selezione chiave, cooldown |
| `electron/main/ai/geminiPolicy.ts` | Default e validazione di limiti, timeout, categorie di operazioni |
| `electron/main/ai/aiJobStore.ts` | Checkpoint locali versionati e scritti atomicamente |
| `electron/main/gemini.ts` | Prompt, parsing e composizione dei contenuti; delega l'esecuzione al manager |
| `electron/main/archive.ts` | Coordinamento lezioni/libreria, job, commit finale e IPC progress |

Non creare un nuovo manager per ogni richiesta o istanza del client SDK: verrebbe perso il coordinamento globale. Iniettarlo nei servizi dal punto di composizione dell'app; nei test iniettare clock, attesa, jitter e trasporto simulato.

Ogni richiesta logica deve avere almeno: `jobId`, `requestId`, scopo, modello/endpoint, priorita', indice della fase/chunk se applicabile, budget, deadline e AbortSignal. La callback del trasporto riceve la credenziale selezionata e il segnale del singolo tentativo.

Il manager non deve conoscere il testo delle lezioni per schedulare o registrare eventi. Il risultato del trasporto conserva gli eventuali usage metadata disponibili; l'assenza di usage non equivale a zero token.

## 6. Politica di errori, retry e chiavi

### 6.1 Errori tipizzati

Normalizzare in un solo punto, dando precedenza a codice HTTP, status e dettagli strutturati. Il parsing della stringa e' soltanto un fallback compatibile.

Categorie minime: `rate_limited`, `quota_exhausted`, `service_unavailable`, `network_error`, `timeout`, `authentication`, `permission_denied`, `model_unavailable`, `invalid_request`, `invalid_output`, `cancelled`, `unknown`.

Distinguere quota per minuto/token da quota giornaliera solo se i dettagli lo consentono. Non classificare ogni 429 come quota giornaliera e non classificare ogni 403 come chiave certamente invalida. Conservare causa/codice per la diagnostica, senza serializzare oggetti SDK grezzi nei log/UI.

### 6.2 Parsing dell'attesa

Supportare, ove esposti dal trasporto:

- header `Retry-After` espresso in secondi o data HTTP;
- dettagli `google.rpc.RetryInfo.retryDelay`, incluse durate con frazioni;
- eventuali rappresentazioni SDK equivalenti documentate;
- messaggi `Please retry in 42.5s`, `retry after 42.5s`, `retry-after`.

Ignorare valori negativi/non finiti e non ricavare durate da numeri casuali nel messaggio. Usare la maggiore attesa pertinente tra backoff, cooldown, disponibilita' dello scheduler e suggerimento server. Il jitter non deve anticipare il minimo indicato dal server.

Se il suggerimento supera la deadline o il budget di attesa, sospendere/fallire in modo riprendibile mostrando quando riprovare. Non troncarlo a 15/60 secondi per poi inviare troppo presto.

### 6.3 Politica iniziale esplicita

Default proposti, centralizzati e testabili:

- massimo 6 tentativi fisici complessivi per richiesta logica, sommando chiavi e fallback di modello;
- massimo 3 tentativi sulla stessa coppia credenziale/modello per errori transitori, salvo budget globale piu' restrittivo;
- backoff esponenziale base 2 s, cap 30 s sul solo backoff locale, jitter; il cap non riduce Retry-After;
- deadline della richiesta logica di 10 minuti, includendo coda, retry e cambi chiave;
- timeout di singolo tentativo differenziati per scopo, inizialmente 180 s testo, 300 s trascrizione/upload;
- Q&A: 60 s per primo contenuto, 45 s di inattivita' tra chunk, 180 s complessivi del tentativo;
- tutte le attese sono annullabili; il cleanup ha un budget separato e finito, ad esempio 15 s.

Non confondere deadline della singola richiesta con durata massima dell'intero job: una lezione lunga contiene molte operazioni e puo' durare piu' di 10 minuti. Esaurita la deadline di una richiesta, conservare checkpoint e offrire ripresa, senza reset automatico infinito del budget.

Questi valori sono punti di partenza di prodotto, non proprieta' garantite di Gemini. Se il codice/SDK richiede aggiustamenti, motivarli nel report e nel registro.

### 6.4 Quota, progetto e rotazione

Google applica i limiti per progetto e modello, non per API key. Non dedurre il progetto dalla stringa della chiave.

- Consentire di associare facoltativamente le chiavi a un gruppo di quota locale, tramite metadati non segreti. Usare identificatori stabili delle credenziali, non l'indice mutevole dell'array.
- Le chiavi senza associazione condividono un unico gruppo prudenziale `unknown-project`.
- Chiavi dichiarate dello stesso progetto condividono contatori e cooldown. Cambiare chiave non azzera il limite.
- Su 429 temporaneo attendere il cooldown; se configurato e verificato un altro gruppo indipendente, il manager puo' selezionarlo rispettandone i limiti.
- Su quota giornaliera esplicita sospendere il gruppo interessato fino al reset noto o a un controllo successivo; non riprovare ogni pochi secondi. Se il reset non e' noto, dirlo.
- Su 503/500/502/504 applicare backoff sulla richiesta corrente. Un cambio chiave non e' una cura garantita: evitare di scorrere tutte le chiavi dello stesso gruppo.
- Dopo 3 fallimenti consecutivi di disponibilita' del modello aprire un cooldown di 30 s per nuove generazioni su quel modello; una sola richiesta di prova alla scadenza, raddoppio fino a 120 s se continua a fallire. I successi chiudono il cooldown. Testare che altri job non mandino richieste di prova contemporanee.
- Su autenticazione realmente invalida escludere la credenziale per la sessione e segnalare l'azione necessaria. Evitare retry identici.
- Su 400 o errore di validazione non ruotare ciecamente le chiavi.
- Rispettare `autoRotateOnQuota`: se disabilitato, nessun cambio automatico di credenziale. Aggiornare descrizione UI se l'opzione copre piu' categorie di errore.

Fallback di modello soltanto da una lista esplicita, compatibile con lo scopo e resa visibile. Non introdurre automaticamente modelli a pagamento o piu' costosi. Su 404 distinguere modello mancante da file remoto inesistente. Convalidare i nomi effettivi; non aggiungerne di nuovi per supposizione.

### 6.5 Un solo proprietario dei retry

Disabilitare/configurare esplicitamente i retry SDK per Models e Interactions in modo che un tentativo del manager corrisponda a una chiamata fisica. Verificarlo con trasporto intercettato, non soltanto leggendo un'opzione.

Se un endpoint non consente questo controllo, documentare il comportamento e includere i tentativi interni nel budget: non lasciare retry annidati ignoti. Upload/resumable e polling richiedono una strategia distinta; non presumere che ogni POST sia idempotente o che una richiesta interrotta non sia stata elaborata dal server.

## 7. Scheduler globale e limiti

- Concorrenza di generazione predefinita: 1 per tutta l'app, comprese pipeline automatica, batch, Q&A, traduzione e quiz.
- Il limite va applicato ai tentativi fisici, non all'intero job. Durante backoff/cooldown il job non occupa inutilmente lo slot.
- Lo streaming occupa lo slot fino a completamento/abort; il timeout deve annullare il trasporto, non liberare lo slot lasciando la chiamata attiva.
- Implementare finestra mobile di 60 s per gruppo di quota e modello. Contare anche i tentativi falliti inviati. Non usare solo `setTimeout(1500)`.
- Default provvisorio per limiti non configurati: 5 RPM nel gruppo sconosciuto, indicato come limite locale scelto dall'app, non come quota reale del Free Tier. L'utente deve poterlo ridurre/aumentare secondo AI Studio. Un 429 aggiorna il cooldown anche se il limite locale non e' stato raggiunto.
- Per ridurre raffiche, distribuire le partenze in funzione degli RPM configurati oltre al controllo della finestra mobile. Non attendere inutilmente dopo una chiamata gia' durata piu' dell'intervallo richiesto.
- Non promettere copertura dei limiti TPM/RPD soltanto con un limitatore RPM. Raccogliere usage quando disponibile e gestire i relativi errori. Non stimare token con una formula arbitraria presentandola come quota esatta.
- Priorita': richieste interattive davanti al background, senza interrompere una chiamata in corso. Dopo 3 richieste interattive servite, far passare un background eleggibile se in attesa, cosi' non rimane escluso indefinitamente.
- Files upload/get/delete passano dal gestore per abort, timeout, errori e diagnostica, ma usano una corsia limitata separata: il polling Files non consuma artificialmente gli RPM del modello. Max 1 upload concorrente, polling ogni 3 s con deadline finita; cleanup best effort limitato.
- Deduplicare job identici per lezione, scopo e revisione della sorgente. Un click manuale durante l'elaborazione automatica deve agganciarsi allo stesso job, non duplicarlo.

Persistenza dei cooldown: conservare almeno reset lunghi/quota giornaliera quando conosciuti, evitando che riaprire l'app faccia ripartire immediatamente richieste bloccate. Per il limite breve, conservare timestamp recenti o applicare un periodo prudenziale al riavvio. I checkpoint non sono una coda di invio automatico: la ripresa dopo crash deve essere esplicita.

## 8. Trascrizione: correttezza prima del recupero automatico

1. Correggere il payload del fallback con `fileData: { fileUri, mimeType }`, o helper equivalente dello SDK, e controllare il corpo HTTP effettivo tramite test offline.
2. Separare per chunk gli esiti `transcribed`, `no_speech`, `failed`, `needs_review`. Un errore di rete/quota/servizio non puo' produrre `no_speech`.
3. Il testo scarso/WPM basso e' un segnale di dubbio, non una prova di silenzio. Se il recupero fallisce e il primo risultato e' sospetto, mantenere `needs_review`, non promuoverlo automaticamente a completo.
4. Conservare separatamente output ASR e fallback nel checkpoint locale quando entrambi presenti. Il fallback non deve cancellare la fonte precedente; il risultato scelto conserva provenienza e motivazione.
5. Dopo esaurimento dei tentativi, lasciare il chunk in errore/riprendibile. Non restituire successo globale e non avviare automaticamente la dispensa finche' tutti i chunk obbligatori sono risolti.
6. Rendere ispezionabili i risultati parziali, distinti dalla trascrizione completa. La semplice presenza di un nome file non basta a determinare la completezza.
7. Registrare timestamp e confini di ciascun chunk; riutilizzare quelli del checkpoint durante la ripresa. L'overlap va deduplicato solo nell'assemblaggio previsto, una volta, senza modificare i grezzi salvati.
8. Upload, polling e cleanup devono avere timeout/abort reali. Conservare metadati necessari alla pulizia, senza URI/credenziali nei log generici.
9. Non riusare un URI Files con una chiave di un progetto diverso. Cache upload associata a gruppo/credenziale e validita' del file remoto; re-upload solo quando necessario.
10. Se manca la durata o il file e' troppo grande, non inviarlo come chunk unico senza controllo. Segnalare l'errore di preparazione e preservare la sorgente.

Non garantire completezza semantica della trascrizione usando solo soglie WPM. Conservare marker e provenienza per consentire verifica umana.

## 9. Dispense: checkpoint e ripresa per fase

La rotazione entra nel manager della singola chiamata; rimuovere il ciclo esterno che rigenera l'intera dispensa per ogni chiave.

Fasi persistenti: segmentazione, overview, note d'esame, sezione 1..N, assemblaggio, logistica, eventuale merge logistica. Salvare ogni risultato valido prima di passare alla fase successiva.

- Segmentazione: distinguere errore API da output senza tagli utilizzabili. Non assorbire indiscriminatamente tutti gli errori con `cuts = []`. Un fallback deterministico di segmentazione e' consentito solo se limita la dimensione delle parti e produce un warning esplicito.
- Overview e sezioni didattiche sono obbligatorie. Errore finale: job riprendibile, vecchia dispensa valida preservata.
- Note d'esame e logistica sono accessorie: `nessuna indicazione` e `estrazione fallita` sono esiti distinti. In caso di fallimento conservare un warning e consentire retry della sola fase accessoria.
- Non inventare note d'esame sostitutive quando la chiamata fallisce.
- Salvare la nuova dispensa finale solo dopo validazione e controllo della revisione della trascrizione sorgente. Se la sorgente cambia, evitare commit di un risultato obsoleto.
- Il merge logistica dello stesso corso deve essere serializzato oppure usare controllo di versione e retry del merge. Il mutex del filesystem da solo non impedisce due merge basati sulla stessa vecchia versione.
- Rimuovere le pause fisse locali quando tutti i percorsi sono migrati al manager, per non sommare pacing vecchio e nuovo.

Esempio obbligatorio di accettazione: se fallisce la sezione 4, riprendere dalla sezione 4 senza richiamare segmentazione, overview o sezioni 1..3, anche dopo riavvio dell'app.

## 10. Persistenza e compatibilita'

Usare una sottocartella `ai-jobs/` dentro la directory dati privata della libreria, non dentro il repository. Riutilizzare scritture atomiche e recovery esistenti.

Checkpoint versionato, minimo:

- ID job, lezione, scopo, schema version, stato e timestamp;
- hash della sorgente e revisione: hash audio originale per ASR, testo completo per dispense/traduzione/studio set;
- versione dei prompt/parser, lingua, piano dei chunk o delle sezioni, configurazione che influenza il contenuto;
- modello realmente usato per ogni fase, output valido, stato e warning;
- tentativi/cooldown pertinenti e riferimenti di pulizia remota, ma mai chiavi API;
- errore sanitizzato e fase da riprendere.

Invalidare il riuso quando cambiano sorgente, lingua, prompt, algoritmo di chunking o modello richiesto in modo incompatibile. Un fallback autorizzato e registrato puo' produrre parti con modelli diversi: renderlo esplicito. Un tentativo con risposta persa puo' essere duplicato alla ripresa; non promettere esecuzione esattamente una volta se il provider non offre idempotenza.

Gestire checkpoint corrotti, versioni sconosciute, lezione eliminata durante il job e crash tra scrittura del risultato e aggiornamento dello stato. Recovery idempotente; nessuna ricreazione di lezioni eliminate e nessun overwrite di modifiche manuali.

Compatibilita' librerie esistenti: non classificare retroattivamente tutte le vecchie trascrizioni come complete verificate o come fallite. Usare provenienza legacy/non verificata dove serve, senza avviare chiamate automatiche.

Migrazione impostazioni: mantenere chiavi cifrate, indice attivo e opzioni esistenti; aggiungere default compatibili e ID stabili senza stampare le credenziali. Rimozione/riordino di una chiave non deve assegnare i suoi cooldown a un'altra.

## 11. Traduzione, quiz, Q&A e verifica chiave

### Traduzione e quiz

Usare lo stesso manager. Traduzione vuota o output troncato non sono successi. Per quiz/flashcard validare campi, opzioni, indice della risposta corretta e contenuti minimi. Non ruotare una chiave per un errore di parsing locale.

Se e' previsto un tentativo di riparazione dell'output, limitarlo a uno, conteggiarlo nel budget e passarlo nello scheduler. Non sostituire una versione valida salvata con un output invalido.

### Q&A streaming

- AbortSignal reale fino al trasporto; cancellazione da UI, eliminazione lezione e chiusura applicazione.
- Prima del primo chunk sono ammessi retry/fallback entro budget.
- Dopo contenuto visibile, default: terminare con stato `interrupted` e conservare il testo parziale marcato come tale; offrire rigenerazione esplicita. Non concatenare automaticamente una risposta nuova al prefisso della vecchia.
- Se si implementa un restart automatico, introdurre `attemptId` ed evento di reset, testando che il renderer scarti chunk tardivi del tentativo precedente. Non e' necessario per la prima implementazione se si adotta il comportamento sopra.
- Escludere le risposte interrotte dallo storico utilizzato come risposta completa, o includerle soltanto con semantica esplicita.
- Separare attesa in coda, connessione, risposta in corso, interruzione e completamento.

### Verifica chiave

Usare una chiamata minima attraverso il manager, senza bypass dei limiti. Un 503/429 rende la verifica inconcludente, non dimostra che la chiave sia invalida. Non dichiarare la chiave valida con certezza sulla sola base di un 404 ambiguo. Verificare il modello selezionato o un modello di test esplicitamente compatibile e documentato.

## 12. Stato, IPC, UI e diagnostica

Estendere i tipi condivisi e le validazioni IPC senza esporre credenziali. Modelli possibili di stato: `queued`, `running`, `waiting_rate_limit`, `retrying`, `paused`, `completed`, `completed_with_warnings`, `failed`, `cancelled`; chunk e streaming hanno gli stati specifici descritti sopra.

- Progressi sempre correlati a job/lezione e fase. Non emettere un evento terminale `error` prima di una rotazione che prosegue il job.
- Mostrare motivo dell'attesa, istante previsto del prossimo tentativo, numero tentativo, sezione/chunk e possibilita' di annullare/riprendere.
- Nessun salto arbitrario al 60% durante ogni retry. Tenere separato progresso del lavoro e tentativi della richiesta.
- ETA include coda e cooldown conosciuti; se la stima non e' affidabile, indicarlo invece di mostrare un conto alla rovescia fittizio.
- Esporre una vista compatta dei job attivi e riprendibili, riutilizzando le superfici esistenti. Non costruire un nuovo dashboard generale.
- La pipeline automatica avvia dispense solo su trascrizione completa; dopo un fallimento riprendibile deve poter passare alla lezione successiva senza retry infinito.
- Disabilitare l'automazione impedisce nuovi job automatici; per job gia' in corso mantenere semantica esplicita e pulsante annulla.

Eventi diagnostici strutturati, con lista di campi ammessi: job/request ID, scopo, modello, ID opaco del gruppo/credenziale, tentativo, codice/categoria, durata, attesa, esito, token quando disponibili. Non registrare prompt, trascrizioni, audio, URL contenenti credenziali, header, oggetti errore integrali o titoli personali.

Riutilizzare il logger locale; rinforzare redazione e messaggi costruiti esplicitamente. Nessuna telemetria esterna. Il report deve poter distinguere tempo di coda, upload, elaborazione, backoff e numero di richieste realmente inviate.

## 13. Sequenza di implementazione e gate

### Fase A — Baseline e regressioni dei bug critici

- Inventario delle chiamate e confronto del diff recente.
- Test offline del payload audio, dei doppi fallimenti ASR/fallback e del parsing Retry-After.
- Correzioni minime R1/R2/R5, mantenendo compatibilita'. Aggiornare chiamanti affinche' un risultato parziale non scateni la dispensa.
- Gate: i tre scenari passano; errori API non diventano silenzio; nessun nuovo invio remoto nei test.

### Fase B — Gestore condiviso e trasporto

- Normalizzatore errori, adattatore SDK, budget, abort e retry unico.
- Scheduler globale, gruppi di quota, cooldown e priorita'.
- Test deterministici con clock iniettato; nessun `NODE_ENV=test` che cambi le regole di produzione.
- Gate: budget fisico misurabile, limite nella finestra mobile rispettato, annullamento reale.

### Fase C — Migrazione di tutti i chiamanti

- Migrare dispense, traduzioni, set di studio, Q&A, trascrizione, logistica, Files e verifica chiave.
- Rimuovere cicli esterni di rotazione e attese fisse superati; non lasciare due politiche attive.
- Gate: ricerca delle invocazioni SDK dimostra che i flussi applicativi passano dal trasporto/manager. Script remoti standalone sono inventariati separatamente, non eseguiti.

### Fase D — Checkpoint, ripresa e integrita' dei dati

- Store locale versionato, stato per chunk/fase, commit finali protetti e migrazioni.
- Deduplica auto/manuale, ripresa dopo crash, cleanup controllato, logistica per corso.
- Gate: sezione/chunk riusciti non sono rigenerati dopo riavvio; modifica sorgente e cancellazione lezione non vengono sovrascritte.

### Fase E — UI, IPC e osservabilita'

- Stati di attesa, warning, errore riprendibile, cancellazione e ripresa.
- Streaming interrotto senza concatenazioni, limiti configurabili, associazione facoltativa dei gruppi di quota.
- Gate: scenario React/Electron con job automatico e Q&A concorrenti, nessun evento terminale prematuro e nessun leak di dati nei log.

### Fase F — Verifica finale e documentazione

- Eseguire il quality gate completo del repository.
- Aggiornare documentazione, struttura reale, decisioni e report della revisione.
- Preparare protocollo di collaudo reale; eseguirlo soltanto se autorizzato, con dati sintetici e budget esplicito.
- Gate: criteri della sezione 15 verificati o limiti esterni esplicitamente dichiarati. Nessuna pretesa di collaudo online se sono stati fatti solo test offline.

Per ogni fase produrre un riepilogo di file, comportamento cambiato e verifiche. Le fasi sono dipendenti: non passare a una riscrittura ampia prima di aver fissato regressioni ed esiti attesi.

## 14. Matrice minima dei test

I test devono verificare effetti osservabili, conteggi di chiamate, payload, persistenza e tempi virtuali. Non limitarsi a mockare `generateLectureNotes` con un successo fisso.

| Area | Scenari obbligatori |
| --- | --- |
| Payload SDK | Fallback serializza `fileData.fileUri` e MIME; nessuna parte vuota; upload get/delete usano riferimenti corretti |
| Attese | `retry in`, `retry after`, RetryInfo, header secondi/data; 42,5 s rispettati; valore oltre deadline sospende; input invalido ignorato |
| Errori | 429 temporaneo/giornaliero/ambiguo; 503/500/502/504; fetch failure; 400/401/403/404; cancellazione non ritentata |
| Retry | Tentativi fisici entro budget anche con SDK Interactions; nessun reset del budget al cambio chiave/modello |
| Scheduler | Auto + manuale + Q&A simultanei; concorrenza totale 1; finestre a 59/60/61 s; backoff libera slot; gruppi noti e sconosciuti |
| Cooldown | Chiavi stesso gruppo non aggirano quota; cooldown condiviso; una sola richiesta di prova; reset noto e sconosciuto |
| Equita' | Interattivo prioritario senza starvation del background; annullamento job in coda |
| Abort | Timeout interrompe trasporto; nessun risultato tardivo salvato; attesa/polling/stream annullabili; listener e timer puliti |
| ASR | Primario fallisce, fallback riesce; entrambi falliscono; silenzio reale; testo corto sospetto; fallback fallisce dopo testo incompleto |
| Chunk | Chunk 1..3 riusciti e 4 fallito; ripresa dopo riavvio solo da 4; overlap non applicato due volte; upload scaduto o altro progetto |
| Dispensa | Sezione 4 fallisce: 1..3/overview/tagli non ripetuti; breve e lunga; warning logistica/esame; nessuna indicazione distinta da errore |
| Integrita' | Sorgente modificata durante job; lezione eliminata; vecchia dispensa preservata; merge logistica concorrente |
| Checkpoint | Scrittura interrotta, JSON corrotto, versione ignota, hash/prompt/lingua cambiati, crash a cavallo del commit finale |
| Output | Traduzione vuota/troncata; JSON quiz malformato o indice scorretto; eventuale riparazione limitata |
| Streaming | Errore prima/dopo primo chunk; stream inattivo; testo parziale marcato; chunk tardivi ignorati; storico coerente |
| Impostazioni | Libreria legacy; riordino/rimozione chiave; rotazione disabilitata; limiti invalidi; modello fallback non consentito |
| UI | Attesa esplicita e ripresa; percentuale non resettata dai retry; errori transitori non chiudono il job; doppio click deduplicato |
| Privacy | Nessuna credenziale/prompt/trascrizione o URL sensibile in log, IPC errori, checkpoint di diagnostica o fixture versionate |

Le fonti testuali necessarie ai checkpoint applicativi restano nella libreria privata: non confonderle con log/report diagnostici. Nei test usare fixture sintetiche e directory temporanee.

Comandi di verifica:

```powershell
npm test
npm run test:hooks
npm run check
```

Durante le fasi eseguire solo i test pertinenti; alla fine `npm run check` include typecheck, lint, test TypeScript/Python, scenari Electron e build. Non ripetere suite complete senza cambiamenti o dubbi nuovi. L'esistenza di test verdi non sostituisce le asserzioni specifiche sopra.

## 15. Criteri di completamento

- [ ] Payload del fallback audio corretto, provato attraverso lo SDK reale con HTTP simulato.
- [ ] Nessun errore API puo' produrre una trascrizione completa con marker fittizio di silenzio.
- [ ] Una sola politica di retry e una sola istanza di scheduler per l'app.
- [ ] Nessuna richiesta applicativa di generazione bypassa conteggi, timeout e budget.
- [ ] Concorrenza 1 e RPM verificati globalmente, non soltanto nella funzione delle sezioni.
- [ ] Attese del server rispettate o job sospeso senza invio prematuro.
- [ ] Rotazione limitata alla richiesta fallita, sensibile a gruppi di quota e preferenze utente.
- [ ] Retry/cambio chiave/cambio modello non moltiplicano il budget.
- [ ] Timeout e annullamento propagati realmente al trasporto e allo stream.
- [ ] Ripresa di dispense/chunk dopo crash senza ripetere risultati gia' validi.
- [ ] Dati originali e contenuti validi precedenti preservati; sorgenti cambiate protette.
- [ ] UI distingue completo, parziale, warning, in attesa e fallito/riprendibile.
- [ ] Log utili per misurare tentativi/attese, privi di contenuti sensibili.
- [ ] Migrazione compatibile con impostazioni e libreria esistenti.
- [ ] `npm run check` riuscito; eventuali problemi preesistenti separati con evidenza.
- [ ] Registro aggiornato tramite script, documentazione coerente con il comportamento reale.
- [ ] Report conclusivo dichiara cosa e' stato simulato e cosa e' stato collaudato online.

## 16. Collaudo reale opzionale e misurazione

Non necessario per iniziare o completare il lavoro offline. Richiede autorizzazione esplicita a inviare dati e consumare quota; verificare se gia' presente nella conversazione dell'esecutore. Non usare audio privati, trascrizioni reali o script che recuperano automaticamente chiavi per far partire una prova non autorizzata.

Prima della prova annotare modello effettivo, quota visualizzata in AI Studio, gruppi di progetto delle chiavi e budget massimo di richieste/costo. I limiti attuali non sono deducibili dal numero di chiavi o dal solo nome del modello.

Usare breve audio sintetico e testo sintetico abbastanza lungo per almeno 4 sezioni. Verificare trascrizione, dispensa, traduzione, quiz, Q&A e accodamento mentre un job e' attivo. Non tentare di provocare 429/503 consumando deliberatamente la quota: testarli con fault injection locale tra trasporto e manager.

Registrare soltanto metriche sanitizzate: richieste inviate, retry per categoria, lavoro riutilizzato, durata attiva, tempo di coda/backoff, token disponibili, esiti finali. Dopo una prova interrotta verificare ripresa e pulizia dei file remoti. Arrestare la prova al budget concordato o se il provider resta indisponibile.

Confronto con baseline: stesso scenario sintetico e stessa sequenza di errori iniettati. Il miglioramento dimostrabile e' meno chiamate duplicate, nessun falso successo, rispetto dei limiti e ripresa corretta; non promettere una riduzione misurata dei 503 reali senza campione adeguato.

## 17. Documentazione e handoff finale

Aggiornare `STRUTTURA_PROGETTO.md` quando esistono i nuovi moduli; `README.md` per gestione AI automatica, limiti locali e stato della qualita'; `tests/README.md` per i nuovi test; `docs/quality/` con report sintetico. Mantenere IDEA_INIZIALE.md come documento storico.

Registrare nuove decisioni che chiariscono/superano le parti pertinenti di D-0134, D-0136 e D-0147, senza riscrivere il Registro. La dichiarazione precedente secondo cui 1,2-1,5 s garantiscono 5 RPM deve essere corretta tramite nuova decisione, non cancellata retroattivamente.

Nel report finale elencare: difetti corretti, politica adottata e default, esito dei test, limiti residui, eventuale collaudo remoto, file principali. Non generare installer, pubblicare o fare push se non richiesto.

## 18. Prompt pronto da dare al modello esecutore

> Implementa il piano `docs/quality/gemini-request-management-plan.md` nel repository Lezionify. Leggi prima i documenti prescritti da AGENTS.md e il piano integralmente. Preserva tutte le modifiche locali esistenti. Procedi per le fasi A-F, iniziando dai test di regressione del payload audio, dei falsi successi ASR e delle attese suggerite dal server. Implementa il gestore condiviso, migra tutti i flussi Gemini, aggiungi checkpoint/ripresa, integra stati e cancellazione nella UI e completa il quality gate. Usa solo test offline con dati sintetici finche' non esiste autorizzazione esplicita al collaudo remoto. Registra le decisioni tramite tools/append_decision.py. Non cambiare provider o introdurre modelli a pagamento, non pubblicare e non creare installer. Se il codice e' cambiato rispetto al piano, verifica le evidenze e adatta l'implementazione preservando i criteri di completamento; documenta le differenze. Consegna il risultato implementato e verificato, indicando separatamente i limiti esterni non collaudati.

## Riferimenti

- Quote per progetto/modello: https://ai.google.dev/gemini-api/docs/rate-limits
- Errori e backoff: https://ai.google.dev/gemini-api/docs/troubleshooting
- Revisione locale del 2026-09-29: codice applicativo, SDK installato e prove offline descritte nella sezione 3.

Le pagine del provider sono riferimenti da ricontrollare durante l'implementazione per dettagli che possono cambiare. Non trasformare le quote o la disponibilita' dei modelli in assunzioni non verificate.
