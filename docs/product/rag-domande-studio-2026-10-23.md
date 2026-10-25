# RAG: domande realistiche di studio — 23 ottobre 2026

Ripresa autorizzata dall'utente con otto esempi di domande e «Continua lavoro»,
dopo il completamento del pacchetto Focus/traduttore/Spotify D-0405.
Le correzioni e il collaudo conclusivo sono registrati in D-0406/D-0407 e
confluiscono nell'installer finale.

## Le otto famiglie di domande

| Domanda | Comportamento richiesto |
| --- | --- |
| Cosa ha detto il prof sull'esame? Ci sarà l'esercizio A? | Cercare comunicazioni originali, anche in inglese; distinguere inclusione, esclusione e assenza di indicazioni esplicite. |
| La dimostrazione A è da studiare? | Non dedurre l'obbligo dalla sola presenza della dimostrazione. Citare una disposizione del docente o dichiarare il limite. |
| In quali casi pratici sparsi nel corso abbiamo studiato A? | Distribuire il recupero tra lezioni diverse, indicando esempi e copertura della selezione. |
| Riprendi A: non ho capito B, C, D. | Affrontare i punti separatamente, con ipotesi e passaggi, senza sostituire il concetto con un tema affine. |
| Genera un esercizio su A. | Marcare esercizio e soluzione nuovi come Deduzione o Integrazione generale; non attribuirli al docente o garantirne l'uscita all'esame. |
| Che differenza c'è tra A e B? | Confrontare le stesse dimensioni e condizioni, citando i passaggi pertinenti. |
| Il prof ha mai parlato di A, in quali lezioni e come? | Preferire originali, mostrare lezioni e termini usati. «Non trovato» non prova che non sia mai stato trattato. |
| Perché ieri A era vera e oggi no? | Controllare date, ipotesi, dominio e approssimazioni. Non assumere che la versione più recente sia corretta; chiedere quali lezioni se i riferimenti temporali non sono identificabili. |

Queste sono regole di risposta consegnate al modello, non fatti del corso e
non una garanzia che una qualsiasi risposta generata sia corretta.

## Correzioni riprodotte

1. Un seguito «Perché questo compare in casi pratici sparsi nel corso?»
   ereditava erroneamente il vincolo alla lezione 3 dalla domanda precedente.
   Ora una richiesta esplicitamente trasversale riapre il corso; i numeri
   di lezione indicati nella domanda corrente restano vincoli obbligatori.
2. Dodici dispense della stessa lezione potevano occupare tutti i risultati,
   escludendo otto originali di lezioni diverse. Ora, nelle ricerche
   trasversali, il primo passaggio di lezioni diverse precede le versioni
   aggiuntive della stessa lezione. Per attribuzioni al docente viene
   preferito l'originale disponibile tra i candidati di quella lezione.
   Questo non è un nuovo verificatore di pertinenza semantica: resta un
   criterio di distribuzione dei risultati entro i limiti del contesto.
3. Una comunicazione in inglese sull'esame poteva essere persa dietro molti
   risultati tecnici italiani. Le domande su esame o obblighi di studio
   riservano fino a due passaggi originali con termini esatti esame/esami o
   exam/exams/examination, mantenendo spazio per il tema tecnico. La ricerca
   esatta evita di confondere exam con example. Il vincolo di lezione resta
   applicato anche a questi passaggi.
4. Il controllo locale delle assenze globali non segnalava «Il professore
   non ha mai parlato di A». Ora produce un avviso di incertezza, senza
   affermare che la frase sia falsa. Le formulazioni limitate agli estratti
   consultati non producono questo avviso.

Le quattro regressioni sono state osservate rosse e poi verdi. Un ulteriore
test del servizio verifica che una riformulazione `search_course: Bellman`
non perda la copertura trasversale della domanda originale.

Il prompt descrive ora correttamente `lectureOrdinal` come numero stabile o
ufficiale, separato da `chronologicalOrdinal`; il catalogo espone anche la
base di numerazione. Corretto il precedente testo che descriveva ancora
tutti i numeri come ordine cronologico.

## Valutazione

- **739 test Vitest in 56 file**, tutti passati; typecheck e lint puliti.
- **8 nuovi casi sintetici**, uno per ciascun esempio: recall@8 = 1,000;
  MRR@8 = 0,9375 con il modello semantico locale. Il significato è che tutti
  i passaggi attesi compaiono nei primi otto risultati: non misura la
  correttezza delle risposte generate.
- **22 casi sintetici precedenti**: recall@8 = 1,000; MRR@8 = 0,9375.
- **32 varianti sulle fonti reali**, otto per ciascuno dei quattro corsi:
  33 lezioni, 66 fonti, 2.205 passaggi; originali nei risultati di 23 varianti.
  Le domande tecniche possono recuperare dispense derivate: la presenza di
  un risultato non conferma un obbligo d'esame, una dimostrazione o un cambio
  delle ipotesi. Estratti e risultati restano negli artefatti locali ignorati.
- Collaudo React/Electron della chat RAG, citazioni PDF, invio visivo
  esplicito, bozze, conteggi e isolamento dei corsi superato.

Durante l'ispezione iniziale delle domande sull'esame, un conteggio cercava
soltanto la parola italiana. Il controllo bilingue corretto trovava già una
menzione originale di exam nei risultati di ciascun corso: non si attribuisce
quindi il difetto sintetico a tutte e quattro le prove reali. La regressione
bilingue resta utile e indipendente da quel conteggio iniziale.

Nessun nuovo invio Gemini: **59 su 60** complessivi per il lavoro autorizzato.
Nessuna nuova valutazione delle risposte generate dichiarata conclusa.
Le voci **90–92 restano parziali**, in particolare validazione umana, supporto
delle affermazioni su nuovi casi, calibrazione di astensione e pertinenza.
Il recupero mirato è lessicale e non copre automaticamente ogni parafrasi di
una disposizione d'esame. I riferimenti «ieri/oggi» non vengono convertiti
automaticamente nella prima e ultima lezione: se ambigui, vanno chiariti.

## Riproduzione e installer

```text
npx --no-install vitest run --maxWorkers=2
node tools/benchmark_course_rag.mjs --study-questions --semantic
node tools/benchmark_course_rag.mjs --semantic
node tools/run_course_rag_private_local.mjs --study-questions
node tools/run_hook_regressions.cjs --course-rag-only
```

Il comando sulle fonti personali richiede autorizzazione esplicita, già data
per questa sessione; non invia i documenti online.

Il nuovo setup comprende anche tutte le modifiche Focus, traduttore e Spotify
di D-0404/D-0405. Il pacchetto precedente è conservato in
`local-artifacts/installer-backups/20261023-rag-domande-studio`.
Setup finale: **`dist/Lezionify-Setup-0.1.0.exe`**, **294.215.067 byte**.
SHA256: `ab37b1cbc4fcd58f353800038025917d1c330f27e5d0bdcf26d5e2262bc8327e`.
ASAR: `a177699cd541ca76b9c13ab6124de5f14b9eb51416127b498527fb4c2571f292`.

Verificati 372 file della build, manifesto SHA512, blockmap e tre file di
backup. Gli otto componenti critici estratti dall'installer NSIS corrispondono
al runtime collaudato. Il setup non è stato eseguito o pubblicato.

Nel nuovo eseguibile, in profili temporanei isolati, passano: modello RAG
assente, download esplicito del modello pubblico, inferenza senza rete,
cache fredda/calda, modello corrotto rifiutato, recupero dei vettori corrotti,
ripristino, migrazione delle citazioni e worker PDF. I report con le impronte
del pacchetto sono in `local-artifacts/rag-package-2026-10-23`; quelli del
pacchetto precedente sono conservati anche nel suo backup.

Chiudere Lezionify prima di avviare il setup. Non occorre riscaricare i
modelli già installati per le sole modifiche al recupero; modello e indice
restano preparabili esplicitamente da Fonti. Per il traduttore, usare le
Impostazioni soltanto se i suoi modelli non sono già presenti.
