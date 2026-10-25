# RAG: recupero da timeout e indisponibilità — 22 ottobre 2026

Implementazione e verifiche registrate in D-0395.

L’utente segnala ancora errori 503 e poi «nessun contenuto ricevuto entro 20s»,
chiedendo che la domanda non termini al primo esaurimento delle alternative.
La precedente diagnosi del 503 era corretta ma il recupero applicativo era troppo
breve: una catena percorsa una volta non copre un disservizio transitorio.

## Evidenza e riproduzione

Nei log tecnici locali del tentativo delle 14:36 Europe/Rome: primo modello in
timeout a 20 secondi, quattro fallback con HTTP 503, richiesta terminata dopo
circa 32 secondi. Nessun payload personale copiato in questo documento.

Il comando `npx --no-install vitest run tests/unit/courseRagCompletion.test.ts --maxWorkers=2`
ha riprodotto offline il difetto: sei errori simulati su tutta la catena causavano
il fallimento anche quando il settimo invio avrebbe risposto. Prima della
correzione: due test positivi e la nuova regressione negativa. Dopo: regressione
positiva e copertura aggiuntiva di budget, scadenza, annullamento e stati.

Ipotesi verificate: catena limitata a un giro, soglia iniziale troppo breve e
assenza di backoff fra fallback. Le tre condizioni sono presenti nel percorso
RAG precedente. Non si pretende di riprodurre o risolvere la disponibilità dei
server Google: gli errori vengono iniettati nel trasporto reale del gestore.

## Comportamento aggiornato

- Prima risposta: fino a 60 secondi per il primo contenuto, 90 nei tentativi
  successivi; inattività fra i contenuti fino a 90 secondi. Limite del singolo
  tentativo sempre presente, ridotto al tempo residuo della richiesta.
- Recupero fino a tre giri dei modelli disponibili, con attese crescenti fra
  fallback (2, 4, 8, 16, massimo 30 secondi) e fra giri (15–18 secondi iniziali,
  raddoppiati al giro seguente). I suggerimenti di attesa del servizio prevalgono
  quando più lunghi. Quote, pacing e concorrenza globali restano rispettati.
- **Massimo 12 invii fisici e 10 minuti per l’intera domanda**, condivisi anche
  dai tre eventuali approfondimenti: non si azzerano al cambio di modello,
  chiave o contesto. Il resto delle richieste Gemini conserva la politica
  precedente, normalmente sei tentativi.
- Gli stati in chat annunciano tentativo e attesa automatica. Interrompi resta
  disponibile anche durante le attese. Non si aggiungono conferme.
- Credenziali, permessi terminali, annullamento e quota giornaliera non riaprono
  cicli di recupero. Le alternative consentite possono essere controllate dal
  gestore entro lo stesso budget.
- A recupero esaurito la domanda resta nella conversazione e nella bozza;
  il pulsante diventa **Riprova domanda**. Il prefisso tecnico IPC viene tolto
  dal messaggio visibile; un retry non duplica la domanda pendente.
- Nessun ciclo infinito o ripresa automatica dopo la chiusura dell’app.
  Un’indisponibilità protratta di Google può ancora terminare il recupero.

## Verifiche

- Typecheck e lint superati; **695 test Vitest in 53 file** superati con due
  worker. Il test riproduce la sequenza timeout/503 e una risposta successiva.
- Verificati limite assoluto 12, budget condiviso fra approfondimenti, deadline,
  annullamento nell’attesa, permessi terminali e quota giornaliera.
- Scenario Electron `--course-rag-only` superato, includendo stato di recupero,
  Interrompi, conservazione della bozza, errore senza prefisso IPC e retry.
- Build di produzione superata. Log locali `rag-recovery-*` nella cartella
  `local-artifacts/interventi-2026-10-22/`.
- Dopo la richiesta esplicita dell’utente di provare una domanda RL reale,
  eseguiti **17 invii fisici complessivi** in quattro prove della stessa domanda,
  con contatore locale cumulativo e limite 18. Il vecchio contatore dei quattro
  invii sintetici resta distinto e invariato. Fonti RL inviate a Gemini per
  questa verifica richiesta; nessun altro corso usato nel payload.
- Profilo di prova separato: conversazioni originali e fonti non modificate.
  Risposte e passaggi personali restano solo in `local-artifacts/`, ignorato da
  Git e dal pacchetto. Nessuna chiave, domanda personale o estratto nei file
  versionati aggiunti. Nessuna nuova dipendenza o pubblicazione GitHub.

Documentazione Google sul backoff per 503 e timeout:
[guida ufficiale](https://ai.google.dev/gemini-api/docs/troubleshooting).

## Verifica della domanda reale RL e pertinenza

Il solo completamento della richiesta non era sufficiente. Le prime tre prove
hanno risposto ma con limiti: confronto incompleto, deviazione verso epsilon-greedy
oppure mancanza di una citazione per una delle lezioni richieste. Sono conservate
localmente per confrontare le risposte, senza versionare i contenuti.

La ricerca ora usa metadati derivati dell’ordine cronologico delle lezioni
teoriche (laboratori esclusi) e data della registrazione; non li presenta come
numerazione ufficiale garantita. Nei confronti espliciti riserva estratti per
ogni lezione e tipo di fonte, fino a 12 passaggi, mantenendo il limite totale
preesistente di 24 passaggi/32.000 caratteri. Normalizza notazioni come `Q_pi`,
`Q^\pi` e la forma parlata per cercare il simbolo richiesto; riduce il peso delle
parole vuote e privilegia il simbolo rispetto a temi greedy generici. Le altre
lezioni non occupano gli estratti iniziali del confronto esplicito.

Il completamento valida le citazioni di ciascuna lezione richiesta presente
negli estratti: se manca una citazione, la risposta viene recuperata anziché
accettata. Il prompt vieta di trasformare assenza dagli estratti in una prova
che il concetto non fosse stato trattato.

**Quarta prova reale riuscita e letta insieme alle tre citazioni**, dopo tre
errori transitori e successo al quarto invio. Confronto supportato:

- lezione teorica 5: definizione di Q e assunzione del modello noto;
- lezione teorica 6: regola greedy argmax Q e policy improvement già espliciti;
- lezione teorica 7: ruolo operativo di Q nel caso senza modello, da stimare
  attraverso l’esperienza, rispetto al limite del miglioramento dalla sola V.

La risposta finale copre il quesito: il concetto è precedente, la settima lezione
ne chiarisce l’uso nel contesto model-free. Non costituisce una garanzia su ogni
risposta futura: rimangono da leggere criticamente formulazioni assolute come
“unica quantità” e la distinzione fra miglioramento della politica e ottimalità.

Comando locale di verifica della richiesta: harness in
`local-artifacts/interventi-2026-10-22/run-rl-question.cjs`; non avviarlo
nuovamente senza una nuova necessità. Risposta finale con passaggi in
`local-artifacts/interventi-2026-10-22/rl-question/answer.md`; metadati tecnici
nel log `rl-question-live-accepted.log`. Nessuna citazione o fonte inventata
accettata per sostituire l’evidenza mancante.

## Distribuzione

Setup precedente e tre hash conservati in
`local-artifacts/installer-backups/20261022-rag-recovery/backup.json`.
Installer definitivo registrato in D-0396, generato dopo la prova RL accettata
con `npx --no-install electron-builder --win --publish never` (esito 0):

- `dist/Lezionify-Setup-0.1.0.exe`: **190,825,697 byte**.
- SHA256: `207481346116f2a84424f669ad8dae7d9f621fd3606df55bb354aa090e787748`.
- **372 file** della build identici nel pacchetto ASAR;
  marcatori recupero/confronto, runtime, FFmpeg, manifesto e blockmap verificati.
- Tre backup precedenti con hash verificati; nessun artefatto privato incluso.
- Comando: `node tools/verify_installer.cjs local-artifacts/installer-backups/20261022-rag-recovery`.
  Risultato locale in `verification.json` nella stessa cartella.

Chiudere Lezionify e avviare il setup. Nessuna installazione automatica eseguita.
