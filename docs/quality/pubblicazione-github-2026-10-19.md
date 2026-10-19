# Pubblicazione dei sorgenti — 19 ottobre 2026

Pubblicazione richiesta dall'autore per portare il repository GitHub allo stato
del checkout locale (D-0372), partendo da `c028058` dell'11 settembre. Il lavoro non
avvia altre voci di LISTA_ORDINE e non pubblica una release binaria.

## Perimetro

Sono inclusi codice Electron/React e contratti condivisi, pipeline AI,
pubblicazione opzionale dei testi, importazione video/USB, Focus e PDF,
chat RAG del corso, strumenti offline, Memo, musica, test, fixture sintetiche,
prototipo Balance e documentazione di prodotto, ricerca e qualità.

README e indici descrivono le funzioni implementate e i limiti ancora aperti.
La checklist di settembre resta uno storico esplicitamente datato. La mappa
non presenta più il progetto Android assente come parte del checkout.
Il report Gemini Transcribe preesistente è conservato in `docs/research/`
con una nota di provenienza e data; i dati del provider non sono stati
ricontrollati per questa pubblicazione.

Restano locali, senza cancellazione:

- `.env`, libreria personale, audio, PDF e trascrizioni reali;
- `local-artifacts/`, output dei benchmark, build, installer e backup;
- `TRASCRIZIONE_MANUALE.txt` e script diagnostici personali nella radice;
- `tools/run_transcription_live_test.cjs`, legato a file personali e a una build diagnostica;
- il duplicato `deep-research-report (10).md`, identico al report Balance già
  conservato nella cartella ricerca, e la copia originale del report Transcribe.

La scansione dei file candidati cerca formati di credenziali, chiavi private,
email e percorsi personali senza stamparne i valori. Le due chiavi Gemini
apparenti in `geminiPhaseB.test.ts` sono stringhe sintetiche ripetitive usate
per verificare la redazione dei log; gli indirizzi delle fixture sono sintetici.
I dizionari pubblici, con attribuzioni e licenza separata, sono i soli nuovi
file oltre 1 MB. Nessun archivio personale o risultato grezzo è incluso.

## Verifiche

- Typecheck e lint superati. Il worker PDF è intenzionalmente CommonJS:
  l'eccezione alla regola sugli import `require` riguarda solo quel file;
  le altre regole continuano a verificarlo.
- 625 test Vitest in 43 file superati, 24 test Python e 41 test Node superati.
- `npm run check` completo superato: suite React/Electron, riavvio della lettura,
  build di produzione e PDF reali IT/EN, selezioni, pagine Note, formule e Mermaid.
- Tre schermate Electron sintetiche ispezionate e copiate in `docs/assets/screenshots/`;
  collegamenti locali dei principali indici verificati senza riferimenti mancanti.
- CI Windows allineata a `npm run check`, includendo anche i test Node Q&A.
- Un tentativo nel sandbox si è fermato sulle rinomine della cache Vitest
  (`EPERM`), prima di eseguire i test. La riesecuzione usa il normale contesto
  Windows; questo errore ambientale non è stato aggirato modificando i test.

I controlli usano dati sintetici e profili temporanei. Nessuna nuova richiesta
AI, pubblicazione di lezioni o lettura delle credenziali dell'app è necessaria.

### Prima CI remota e test PDF.js

Il commit iniziale `3a2c023` è pubblicato su `main`, con README remoto identico
alla copia locale. La [prima CI Windows](https://github.com/giovannistefanuto/Lezionify/actions/runs/39277009892)
supera installazione, typecheck e lint ma fallisce il test di estrazione PDF.js
reale in `courseRag.test.ts`: scade il timeout Vitest predefinito di 5 secondi.
Non è un fallimento delle asserzioni sulle pagine o sul testo.

Il comando minimo `npx vitest run tests/unit/courseRag.test.ts -t "estrae testo e pagine" --reporter=verbose`
passa localmente: 605 ms con Node 24.11.1 e 443 ms con Node 22.23.3
(quest'ultimo avviato tramite runtime npm temporaneo, senza dipendenze aggiunte).
Entrambi i percorsi dei test usano il worker sorgente; la copia emessa dalla
build ha inoltre lo stesso SHA-256. Non si attribuisce il rallentamento a
Node 22 o a differenze del payload. Il carico e l'avvio a freddo nel runner
condiviso restano una spiegazione plausibile, non una misura diretta.

Il segnale rosso è la CI originale: non si aggiungono rallentamenti artificiali
per simulare un problema già osservato in quell'ambiente. La correzione
assegna 30 secondi **solo a questo test di integrazione con worker reale**,
conservando tutte le asserzioni, il timeout globale e il limite applicativo
di estrazione di 90 secondi. Nessun retry o test saltato. La suite completa
con Node 22 passa: 625 test in 43 file, lint del file modificato superato.
La nuova CI verifica la modifica nel runner Windows remoto.

## Audit delle dipendenze

`npm audit --json` del 19 ottobre segnala **19 vulnerabilità: 5 alte,
8 moderate e 6 basse; nessuna critica**. Non è un esito positivo dell'audit.
Le dipendenze dirette coinvolte comprendono `electron-builder`, `mermaid`,
`rehype-katex` e `remark-math`; le cinque segnalazioni alte riguardano
`brace-expansion`, `fast-uri`, `http-cache-semantics`, `source-map-js` e `undici`.
Il numero conta le voci del report npm, non il numero di exploit verificati.

La pubblicazione dei sorgenti conserva le versioni applicative già adottate:
nessun `npm audit fix --force`, downgrade o salto di major viene eseguito.
Resta necessario un intervento dedicato con analisi delle catene di dipendenze,
aggiornamenti compatibili e nuovi collaudi del renderer e del packaging.
Il report grezzo è locale in `local-artifacts/publish-audit-2026-10-19.json`.

## Limiti e seguito

Per questa pubblicazione non viene creata una release Windows firmata né
rigenerato l’installer; il packaging locale D-0371 resta documentato separatamente.
Restano i limiti documentati per fedeltà della prosa AI, PDF senza testo,
Spotify/dispositivi e transizioni fra player; il prototipo Balance non ha
trasporto BLE o collaudo hardware. La CI remota e l'allineamento del commit
pubblicato vengono controllati dopo il push, senza confonderli con l'esito locale.
