# Q&A senza Gemini — registro di preparazione ed esecuzione

Data: 13 ottobre 2026, Europe/Rome. Stato: esecuzione conclusa entro i cap
locali; prove saltate per budget e limiti della revisione nel
[report dei risultati](qna-benchmark-risultati-2026-10-13.md).

## Controllo delle informazioni registrate

| Informazione | Dove è conservata | Esito |
| --- | --- | --- |
| Idee future e voce 9 Q&A | D-0256, `docs/product/idee-future-2026-10-13.md` | Presente |
| Richiesta di modelli diversi da Gemini e gratuità rinnovabile | D-0262, valutazione e voce 9 aggiornata | Presente |
| Ricerca ricevuta, nome riconoscibile, integrità e fonti | D-0262, report e valutazione | Presente; report originale preservato |
| Candidati, quote, limiti dei token/s e assenza di misure iniziali | Valutazione e piano | Presente |
| Piano a fasi, pilota, qualità, contesto e sessioni | D-0263 e piano | Presente |
| Preferenza dell'utente per inserimento diretto nel `.env` | D-0264 e piano | Presente |
| Tentativo PowerShell bloccato e configuratore rimosso | D-0264 e piano | Presente; nessun salvataggio cifrato effettuato |
| Conferma che l'utente ha compilato le credenziali | Questo registro | Presenza dei tre campi verificata senza mostrarne i valori; Account ID nel formato previsto |
| Richiesta esplicita di preparare, verificare ed eseguire tutto il benchmark | D-0265 e questo registro | Presente |
| Proposta di usare domande già fatte nelle dispense e contesto allegato | D-0268–D-0273 e risultati | 21 risposte reali complete, tre domande riutilizzate con condizioni distinte |
| Richiesta di registrare con Python le informazioni utili | Script append_decision e qna_research_snapshot | Decisioni append-only e journal aggregato senza testi personali |

Non vengono conservati il valore delle chiavi o l'identificativo personale
dell'account nei report. `.env` è ignorato da Git; il runner legge il file
senza trasferire le credenziali nell'ambiente dei processi figli.

## Procedure di accesso fornite all'utente

- [Groq Quickstart](https://console.groq.com/docs/quickstart) e
  [API Keys](https://console.groq.com/keys): account, chiave dedicata al benchmark.
- [Groq Billing FAQ](https://console.groq.com/docs/billing-faqs): mantenere Free;
  Developer attiva fatturazione a consumo.
- [Cloudflare Workers AI REST](https://developers.cloudflare.com/workers-ai/get-started/rest-api/):
  Workers AI, Use REST API, token e Account ID; accesso senza pubblicare un sito.
- [Token Cloudflare](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/):
  permessi Workers AI Read/Edit limitati all'account interessato.
- [Account ID Cloudflare](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/):
  comando Copy account ID della dashboard o sezione Workers & Pages.

## Runner e corpus realizzati

- `tools/qna_benchmark.mjs`: CLI, fasi, preflight, checkpoint, manifest con hash,
  file CSV/JSON e report, lock e ledger persistente, attese e retry controllati.
- `tools/qna_benchmark_core.mjs`: lettura `.env`, redazione segreti, endpoint e
  modelli fissi, SSE, timeout/abort, usage, metriche, screening e budget.
- `tests/fixtures/qna-benchmark/`: dodici casi iniziali ITA/ENG, contesto
  deterministico sintetico e varianti aggiuntive. Nessuna lezione personale.
- `tests/node/qna-benchmark.node.mjs`: 31 regressioni offline passate prima del
  terzo run. La suite è inclusa anche in `npm run check` (e nella CI che lo usa).
  Nessuna nuova dipendenza runtime o sviluppo.
- Nome `.node.mjs` per evitare che Vitest carichi come propria suite un file
  destinato a `node --test`; la prima esecuzione del quality gate aveva rilevato
  questa collisione, mentre i 439 test applicativi erano passati.
- Credenziali usate solo negli header verso i due servizi scelti. Redirect
  vietati; errori HTTP/trasporto registrati tramite categorie senza body privati.
- Retry massimo due tentativi, solo su errori transitori prima del testo;
  nessun fallback di modello/provider o ricomposizione di stream parziali.
- Una richiesta riserva il costo prima dell'invio. Usage mancante conserva
  la riserva prudenziale; un crash non azzera il consumo stimato.
- Quote locali: 6.400 TPM/160.000 token giornalieri per modello Groq e 8.000
  Neurons giornalieri condivisi Cloudflare. Si tiene conto anche degli header
  e dei cooldown. Il ledger copre queste prove, non altri utilizzi dell'account.
  L'accesso API confermato non è una verifica amministrativa del piano di billing.
- Prezzi e stime del corpus sono documentali: il numero effettivo di token
  viene letto dalla risposta. Il corpus breve produce circa 2–2,6k token sui
  tokenizer osservati; non viene modificato per favorire uno dei modelli.

## Primo pilota e correzione empirica

Run `pilot-20261013`: accesso riuscito per entrambi i servizi e nove risposte
ricevute, ma le misure di contenuto sono **invalidate**. Il parser iniziale
ignorava i delta di contenuto numerici: nella domanda matematica i numeri
sparivano dal testo salvato. Non attribuire questa perdita ai modelli.

Una richiesta diagnostica sintetica ha confermato delta JSON sia stringa sia
numero. Non è possibile stabilire da questa sola osservazione quale componente
del percorso di rete abbia prodotto il formato: la correzione riguarda il
flusso effettivamente ricevuto. La riserva di consumo della diagnostica è stata
aggiunta al ledger (20 Neurons prudenziali).

Correzione: conversione dei delta numerici finiti in testo; errore esplicito
per strutture inattese; test sulle formule e registrazione dei tipi di delta.
File `INVALIDATED.json` nel run iniziale spiega il motivo. Gli originali sono
conservati e il nuovo run usa un nome distinto, senza mescolare i campioni.

## Run corretto

Un secondo run, `benchmark-20261013-v2`, ha esteso il controllo al codice
Python: il flusso restituiva anche delta di contenuto `[]`, da preservare come
lista vuota. Il parser li rifiutava. Sono state aggiunte normalizzazione di
letterali JSON semplici e regressioni; lo screening riconosce anche unità
LaTeX senza scambiarle per risposte sbagliate. Il run v2 è invalidato e conservato.
L'interruzione del processo ha verificato che le riserve già salvate restano nel
ledger; l'avvio successivo ha recuperato il lock del processo terminato.

Run di confronto valido: **`benchmark-20261013-v3`**. Un'interruzione di stream
nel suo pilota è un errore reale distinto dalle incompatibilità dei parser
precedenti: i risultati restano validi e l'errore non è nascosto con un retry
dopo il testo parziale.

Comando:

```powershell
npm run benchmark:qna -- --suite all --run benchmark-20261013-v3 --live
```

Fasi della suite all: pilota (9), corpus breve (108), contesto lungo Cloudflare
(6), confronto sezione/documento (18), varianti aggiuntive (180, su tutti e tre
i candidati), sessioni distanziate (60, 20 per candidato). Totale previsto:
381 prove logiche. Questa esecuzione confronta tutti i candidati anche nelle
varianti, invece di selezionare automaticamente finalisti dai soli marcatori.

Il runner differisce o salta prove se il budget gratuito prudenziale non basta;
le prove saltate non sono risposte riuscite e vengono segnalate nel report.
La sessione parte dalla sua fase, non dall'avvio del run, con una domanda ogni
tre minuti. Le prove precedenti e le eventuali diagnostiche consumano lo stesso
budget giornaliero. Nessuna promessa che tutte le 381 prove entrino in un giorno.

File locali: `local-artifacts/qna-benchmark/benchmark-20261013-v3/`.
Ogni prova conserva `.result.json` e `.attempts.json`; `summary-by-phase.json`
permette confronti sul medesimo corpus senza mischiare lunghezze e fasi.
Le metriche del singolo tentativo e la durata logica con retry sono distinte.
`tools/qna_analyze.mjs <nome-run>` produce `analysis.json` con mediane,
minimo/massimo, p90 descrittivo solo per almeno 20 campioni, tentativi,
consumi e finestre temporali per fase. Non legge le credenziali; rifiuta i
run marcati INVALIDATED. Le attese prima del dispatch sono nella timeline;
`waitingForQuotaMs` nel singolo risultato misura soltanto le attese dei retry.
Questi dati non sono ancora i tempi dalla domanda al renderer di Lezionify.

## Prove private e diagnostiche aggiuntive

La proposta dell'utente di usare domande già fatte è registrata con D-0268.
Il pilota `real-20261013` comprende tre domande con citazione verificabile e
paragrafo ricostruito, nove richieste complete. Archivio e fonti sono letti in
sola lettura. Non vengono inviati audio, trascrizioni grezze, impostazioni o chiavi.
I testi necessari e le risposte restano negli artefatti locali privati.

Il flag contesto completo e le informazioni sul modello originale non sono
persistiti per domanda: l'esperimento non replica il payload storico in modo
esatto e non usa le vecchie risposte come gold. La selezione verbatim favorisce
i casi più facilmente ricostruibili; il piccolo campione non rappresenta tutte
le domande dell'archivio e non verifica follow-up reali.

Run aggiuntivi completati e separati: `real-document-20261013` (dispensa intera, Cloudflare),
`real-format-20261013` (una domanda con prompt esplicito per i delimitatori e
output 1.024), `real-no-think-20261013` (tre domande Cloudflare con switch soft
Qwen). Il replay con documenti completi attende il lock condiviso con scadenza;
gli esperimenti non vengono inseriti nei risultati della baseline.
`real-document-no-think-20261013` completa il confronto del comando soft con
la dispensa intera. La diagnostica non streaming è completa, con codice Python
sintatticamente valido; la diversa generazione impedisce inferenze causali forti.

Il comando `/no_think` è descritto dal
[team Qwen](https://qwenlm.github.io/blog/qwen3/). Il supporto concreto nel
servizio Cloudflare va misurato: non è equiparato a un parametro API garantito.
La [scheda Cloudflare](https://developers.cloudflare.com/ai/models/%40cf/qwen/qwen3-30b-a3b-fp8/)
documenta modello, contesto e endpoint compatibile. La singola diagnostica
`tools/qna_nonstream_diagnostic.mjs --live` usa lo stesso problema Python
sintetico con `stream: false`: una nuova generazione può dare un indizio sul
formato, non dimostrare da sola una causa di trasporto.

Il giornale `tools/qna_research_snapshot.py` appende snapshot di soli conteggi,
latenze, errori e hash dei messaggi. Non registra domande o risposte; la privacy
è verificata anche con un sentinel sintetico nei test Python. L'analizzatore
distingue assenza di screening da screening fallito e legge i tentativi privati.
Il replay conserva la versione del codice caricata all'avvio, prima di eventuali
attese, e impedisce resume con configurazione diversa.

Durante la preparazione il `.env` è tornato vuoto in due occasioni; causa non
determinata. L'utente ha reinserito i valori, il preflight di ripresa è riuscito,
e il file risulta ancora compilato dopo la chiusura della scheda dell'editor.
Runner e test non scrivono il `.env`; nessun valore è registrato qui.

Collaudi al 13 ottobre: 41 Node e 24 Python passati, typecheck/lint e 439
Vitest passati. Il quality gate completo fallisce nel test della posizione
delle slide nascoste. Il collaudo isolato della ripresa PDF/Markdown nei due
processi Electron è passato; build ed export PDF sono stati verificati
separatamente. Nessun fix del viewer o integrazione dei provider nel runtime.

Esiti della suite sintetica: 381 registrati, 270 risposte complete, due errori
di rete/stream e 109 prove saltate per budget. Sessione Cloudflare: 19/20
complete, una richiesta fallita prima di ricevere HTTP anche dopo il retry.
Conservati due tentativi fisici e riserve prudenziali. Il run termina con
`remaining: 0` ed exit code 0; non equivale a successo di ogni prova.

Il journal restituisce null quando non esiste un confronto a tre candidati,
anziché un esito positivo vacuo. Snapshot del runner/core/corpus sintetico e
dei replay recenti conservati localmente; i payload del pilota privato iniziale
sono riproducibili dal corpus congelato e verificati contro gli hash originali.
Fonte della ricerca
originale e fonti Q&A/Markdown risultano integre; nessuna credenziale nei file
scansionati. La timeline delle prenotazioni include anche preliminari e
diagnostiche, senza corpi dei messaggi.

Dopo le misure il runner include anche l'orchestrazione e il helper di
checkpoint nel fingerprint: manifest nuovi versione 2. Recupera successi o
risposte parziali salvate prima del file risultato; le riserve con checkpoint
mancante diventano `interrupted_attempt_unknown` e non vengono reinviate.
Riserve e tentativi sono distinti per run, con cap due tentativi; una sessione
ripresa mantiene l'intervallo minimo tra domande dello stesso candidato.
Cinque regressioni nuove e dry run passati, nessuna nuova chiamata API dopo
queste correzioni. Per le misure future usare nomi nuovi: il run storico v3
e i replay precedenti mantengono le rispettive versioni e gli artefatti.

## Limiti della valutazione

- Lo screening controlla marcatori e valori attesi: la correttezza e la
  chiarezza richiedono anche lettura delle risposte. Non dichiarare accuracy
  universale o probabilità di allucinazione dai soli controlli automatici.
- Le varianti sono sintetiche e alcune condividono struttura con i casi base;
  non equivalgono a una distribuzione indipendente di domande universitarie.
- Il controllo di quota riserva input stimato e output massimo; dopo il pilota
  calibra l'input sulle usage osservate. Ritardi locali sono distinti dalla
  reattività del provider. Il budget giornaliero è conservativo e persistente.
- La prova non misura ancora il tempo dal clic al renderer né concorrenza
  con la pipeline di dispense; non integra nuovi provider nel runtime.
- Le mediane di un solo periodo temporale non dimostrano prestazioni in ogni
  fascia oraria. Cache, reasoning e quote restano condizioni da riportare.

Riferimenti: [piano](qna-benchmark-piano-2026-10-13.md),
[valutazione](qna-alternative-gratuite-valutazione-2026-10-13.md),
[registro decisioni](../../DECISIONI.md).
