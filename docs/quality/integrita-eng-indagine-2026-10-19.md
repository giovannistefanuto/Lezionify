# Rifiuti ENG: indagine del 19 ottobre 2026

Stato aggiornato a D-0366: piano della prosa e ripristino locale dei contenuti
protetti, quote legacy prudenti, fallback ENG completi e recupero dei diagrammi
Mermaid originali implementati. Nuova traduzione reale riuscita in D-0365;
la risposta Mermaid rifiutata è accettata dal replay con la correzione D-0366.
Le prove e i limiti delle singole fasi sono conservati sotto in ordine storico.
Gli errori del provider e le risposte realmente incomplete restano possibili.
Per il controllo completo dei sorgenti successivo: [report di pubblicazione](pubblicazione-github-2026-10-19.md).

## Quadro storico prima della ripresa D-0361–D-0366

Nuovo rifiuto dei frammenti nella versione installata D-0358.
D-0359 aggiunge dettagli sanitizzati senza cambiare i criteri di accettazione.
609 test passati e un nuovo collaudo reale riuscito sulla stessa fonte;
la risposta originaria del nuovo rifiuto non è disponibile e la causa resta
aperta. La voce 43 e la posizione 29 restano aperte.
Le due precedenti prove riuscite su 40 e 36 sezioni restano evidenze storiche,
non una garanzia di assenza di errori successivi.
Le prime fasi sotto sono il resoconto storico di D-0353/D-0354; la correzione
e il collaudo conclusivo di D-0355 sono in fondo.
Richiesta: indagare il problema indicato nelle idee future e in LISTA_ORDINE.
Il riferimento documentale individuato è la voce 43, posizione 29 della coda;
non è stato eseguito il comando per avviare un'altra voce della coda.
L'utente ha confermato che la richiesta riguarda la traduzione ENG;
queste conclusioni non riguardano la trascrizione audio.

## Evidenze locali

Lettura in sola lettura del log del profilo standard, senza riportare
identificativi, testi delle lezioni o credenziali:

- Sette eventi con l'errore «titoli, formule, codice o riquadri non corrispondono»:
  tre il 15 ottobre e quattro il 19 ottobre, riferiti a due lezioni distinte.
- Nello storico conservato risultano 20 avvii di traduzione e otto salvataggi.
  Questi contatori non descrivono necessariamente lavori conclusi, non coprono
  log eventualmente rimossi e non sono una misura del tasso di fallimento.
- Una delle due lezioni interessate ha attualmente un riferimento alla dispensa
  inglese nel catalogo. Il dato non dimostra quando sia stata generata.

Il messaggio osservato è emesso da `validateTranslation`, dopo la verifica
di `finishReason=STOP`, dei confini, del loro ordine e dei contenuti esterni.
Per questi specifici eventi il punto di rifiuto è dunque il confronto della
firma strutturale di una sezione, oppure una sezione vuota, che condivide lo
stesso messaggio. Non è un errore del caricamento audio né un errore di quota
emesso dal trasporto. Non dimostra che altri problemi segnalati abbiano la
stessa origine.

## Riproduzione sintetica

Runner locale ignorato da Git:
`local-artifacts/eng-diagnosis-2026-10-19/probe.cjs`.
Esecuzione: `node local-artifacts/eng-diagnosis-2026-10-19/probe.cjs`.
Il runner compila il modulo reale con esbuild già disponibile nel progetto;
non chiama Gemini e non legge lezioni personali.

| Variazione | Risultato del validatore attuale |
| --- | --- |
| Titolo italiano tradotto, livello invariato | Accettata |
| Formula da `x^2` a `x^3` | Rifiutata, protezione attesa |
| Formula da `x + y` a `x+y` | Rifiutata con lo stesso errore segnalato |
| Fence di codice da backtick a tilde, corpo invariato | Rifiutata con lo stesso errore segnalato |
| Traduzione di `accDescr:` Mermaid su una riga | Accettata |
| Traduzione del testo di `accDescr { ... }` su più righe | Rifiutata con lo stesso errore segnalato |

La firma confronta formule e codice come stringhe esatte; per Mermaid maschera
etichette tra virgolette e descrizioni su una riga. Le differenze di spaziatura
e dei fence spiegano quindi alcuni rifiuti sintetici anche a contenuto
equivalente. La descrizione multilinea non è coperta dalla mascheratura.
La conservatività era già documentata in D-0293 e in
`docs/product/traduzione-dispense.md`: queste prove non dimostrano quale
variazione sia avvenuta nelle risposte reali.

I titoli normalmente tradotti non sono confrontati parola per parola: vengono
confrontati livello e numerazione. In `ArchiveService.translateLectureNotes`
l'override del titolo inglese di D-0349 si applica dopo la validazione; questo
passaggio non può direttamente causare l'errore precedente. Restano protetti
eventuali formule e codice inline presenti nel titolo sorgente.

## Verifiche e limite della diagnosi

Passati 126 test in quattro suite:

```powershell
$env:TEMP = Join-Path $PWD 'local-artifacts/eng-diagnosis-2026-10-19/tmp'
$env:TMP = $env:TEMP
npx vitest run tests/unit/translationIntegrity.test.ts tests/unit/lectureTitles.test.ts tests/unit/archive.test.ts tests/unit/geminiPhaseB.test.ts
```

La cache temporanea nel progetto evita un errore EPERM di rinomina incontrato
nel primo avvio sandbox, prima dell'esecuzione dei test. Nessuna configurazione
permanente modificata. Le suite verificano controlli strutturali, titoli,
percorso Gemini sintetico e conservazione delle fonti e dell'inglese precedente
in caso di errore. I sei probe sintetici sono passati. Non eseguiti build,
installer, chiamate AI o una nuova traduzione personale.

Le risposte rifiutate non sono conservate dai percorsi esaminati: il log
registra un messaggio comune senza indicare il componente differente o la
sezione. Manca dunque un replay del caso reale. Le possibilità ancora aperte
sono variazioni sintattiche equivalenti, modifiche effettive a elementi
protetti e variazioni Mermaid non riconosciute. Nessuna è dichiarata causa
degli episodi reali; non è stata applicata una correzione speculativa.

Prossimo passo per isolare la causa: aggiungere una diagnosi strutturale
sanitizzata che identifichi componente e indice della sezione senza salvare
testo, quindi osservarla al prossimo tentativo esplicito dell'utente. In
alternativa serve una risposta fallita acquisita localmente per il replay.
Solo dopo la riproduzione del caso reale scegliere una normalizzazione
mirata e verificarla anche contro alterazioni realmente dannose. Nessuna
disabilitazione del validatore e nessun retry AI implicito.

La voce 43 e la posizione 29 rimangono aperte; la coda non è stata riordinata.
Nessuna modifica al codice applicativo o alla libreria personale.

## Prosecuzione: risposta reale e causa isolata

L'utente ha confermato che si tratta della traduzione ENG e ha chiesto di
proseguire. Ha poi autorizzato esplicitamente **una sola richiesta Gemini**
sulla dispensa con il rifiuto più recente, con chiave configurata, consumo
di quota e cattura locale della risposta senza aggiornare la libreria.

Ispezione locale delle due fonti: nessuna ha descrizioni Mermaid multilinea.
La coppia IT/EN attualmente salvata per una delle due supera il controllo
originario, ricostruendo i confini in memoria; l'altra non ha l'inglese.
Il caso Mermaid sintetico della prima fase non spiega direttamente i rifiuti
di queste fonti. Non sono stati riportati contenuti o identificativi personali.

Prima del tentativo reale, sette regressioni diagnostiche sono state osservate
fallire e poi passare: il vecchio messaggio comune non distingueva componenti
o sezioni. `translationIntegrity.ts` ora aggiunge soltanto etichette fisse
di componente e indice della prima sezione non valida. Resta lo stesso
confronto esatto, inclusi ordine e ripetizioni di formule e codice inline.

Il runner è in `local-artifacts/eng-diagnosis-2026-10-19/`, ignorato da Git.
Un avvio iniziale nel profilo Electron isolato si è fermato senza chiavi
decifrabili, prima del client e dell'invio. La verifica offline con il profilo
originale ha risolto il caricamento di safeStorage. È stata poi eseguita
**una sola richiesta fisica**: budget del manager e dell'SDK pari a uno e lock
persistente creato prima dell'invio. Non sono stati eseguiti altri tentativi
di traduzione né salvati risultati nella libreria.

Risposta `STOP` di `gemini-3.7-flash`, 40 sezioni; metadati SDK: 13.848 token
di input, 11.285 di output, 2.495 di ragionamento, totale 27.628. Sono consumi
del tentativo diagnostico, non una stima di costo o delle quote residue.

Il nuovo errore indica **sezione 2; formule**. L'esame locale completo rileva:

- Nelle sezioni 2, 5, 9 e 10 cambia soltanto il testo di un comando LaTeX
  testuale dentro una formula per sezione; mascherando tali testi, le formule
  corrispondono. Non è una semplice differenza di spaziatura o delimitatori.
- Nella sezione 40 manca una delle sette occorrenze dello stesso riferimento
  matematico inline. Tutte le quattro espressioni matematiche distinte restano
  presenti; una ripetizione passa da sette a sei. Il confronto per sola presenza
  delle espressioni distinte non avrebbe rilevato l'omissione.
- Nelle altre sezioni la firma coincide. Titoli, riquadri, blocchi di codice e
  Mermaid coincidono anche nelle cinque sezioni interessate.

Replay ripetibile senza rete: `node
local-artifacts/eng-diagnosis-2026-10-19/isolate.cjs`. Il runner usa la risposta
catturata e applica variazioni soltanto in memoria:

1. Risposta originale: rifiuto alla sezione 2, formule.
2. Ripristino dei quattro span LaTeX originali: rifiuto alla sezione 40, formule.
3. Ripristino anche dell'occorrenza mancante nell'ordine atteso: controllo
   superato per l'intera risposta.

Questa prova isola tutte le differenze strutturali del tentativo. Non certifica
la fedeltà della prosa e non produce una dispensa corretta linguisticamente:
il ripristino della ripetizione serve soltanto all'esperimento. Nessun testo
così modificato è stato salvato o scritto nell'archivio.

### Intervento e limite residuo

La causa del tentativo è la mancata conservazione letterale dell'output del
modello, non un errore dei titoli manuali o del renderer. Il validatore applica
il contratto previsto da D-0293. La regola generale «traduci il linguaggio
naturale» è ora delimitata esplicitamente al testo fuori da matematica e codice:
in `TRANSLATION_SYSTEM_INSTRUCTION` si precisa che anche le parole italiane
in comandi LaTeX restano identiche e che ogni riferimento ripetuto deve essere
restituito, senza sostituzioni con pronomi o accorpamenti.

Non sono stati normalizzati spazi, comandi o formule, né disabilitati controlli.
La risposta già acquisita resta rifiutata anche con il codice aggiornato.
L'efficacia del nuovo prompt sul modello non è provata da fixture sintetiche:
richiede un prossimo tentativo esplicito. L'autorizzazione a una richiesta è
esaurita. La voce 43 e la posizione 29 restano aperte fino al collaudo reale
del comportamento aggiornato; nessuna attribuzione automatica agli altri
episodi storici e nessun riordino della coda.

Nuove regressioni sintetiche riproducono sia parole tradotte dentro LaTeX
sia una ripetizione omessa con tutte le formule distinte ancora presenti,
verificando che entrambe siano rifiutate e che i corrispondenti output
conservativi siano accettati. Esiti finali e decisione di prosecuzione sotto.

### Verifiche finali

- 162 test pertinenti passati in `translationIntegrity`, `lectureTitles`,
  `archive`, `geminiPhaseB` e `archivePipeline`, inclusi nove nuovi test.
- Typecheck, lint dei tre file TypeScript modificati e build passati.
- Ultima suite completa: 558/559 test passati. L'unico errore era EPERM nella
  rinomina di un backup in `quality.test.ts`; la suite intera interessata,
  rieseguita nella cartella temporanea standard, ha poi passato 49/49 test.
  Non è stato ottenuto un run completo tutto verde in questa sessione.
- I run precedenti in sandbox hanno incontrato blocchi loopback Spotify,
  junction e output della build; fuori sandbox questi blocchi non si sono
  ripresentati. Un precedente run completo fuori sandbox aveva un errore
  intermittente in `archivePipeline`, poi passato nella suite mirata e nel
  run completo successivo. Non modificati questi moduli estranei alla diagnosi.
- Lint globale ancora segnala due `no-require-imports` già presenti in
  `resources/course-rag/pdf-worker.cjs`; il lint dei file modificati è pulito.
- Replay di isolamento passato, senza ulteriori richieste di rete.
- Installer non rigenerato; nessun commit o push. Le modifiche applicative
  richiedono l'avvio della build aggiornata o un successivo nuovo installer.

Artefatti privati da conservare per il replay: `live-capture/envelope.json`,
`response.json`, `attempt.json`, `outcome.json` e `one-request.lock` nella cartella
locale indicata. Non contengono chiavi API; envelope e risposta contengono
materiale della lezione e devono restare ignorati da Git. Il lock impedisce
un nuovo invio dallo stesso runner: non rimuoverlo per eludere il limite.
Decisione di prosecuzione: D-0354.

## Correzione e collaudo conclusivo — D-0355

L'utente ha autorizzato ulteriori chiamate AI necessarie all'indagine. Sono
state eseguite quattro ulteriori prove reali, ciascuna con un solo invio,
senza retry automatici e senza scrivere i risultati nella libreria personale.
I vecchi lock e le catture sono conservati. Tutte le prove usano il modello
configurato `gemini-3.7-flash` e ricevono `finishReason=STOP`.

| Prova | Esito e differenza isolata | Token input / output / ragionamento / totale |
| --- | --- | --- |
| `updated-prompt-01` | Il prompt più esplicito conserva la matematica, ma il modello duplica il confine 8 e omette il 9. Rifiuto corretto. | 14.059 / 11.648 / 4.258 / 29.965 |
| `structured-01` | JSON con sezioni obbligatorie risolve la copia dei confini; resta omessa una ripetizione matematica nella sezione 40. Rifiuto corretto. | 13.075 / 10.490 / 2.768 / 26.333 |
| `protected-prose-01` | Correzione definitiva: 40 sezioni accettate in circa 155 secondi, firma protetta coincidente con la fonte. | 17.350 / 9.585 / 9.185 / 36.120 |
| `protected-prose-02` | Seconda lezione coinvolta nei rifiuti storici: 36 sezioni accettate in circa 111 secondi, firma protetta coincidente con la fonte. | 10.381 / 5.780 / 10.578 / 26.739 |

Consumo riportato dal provider delle quattro prove aggiuntive: 119.157 token;
includendo il primo tentativo di D-0354, cinque generazioni e 146.785 token.
Non sono prezzi, quote residue o una stima del consumo futuro. Queste due
lezioni non costituiscono un benchmark statistico di qualità o latenza.

### Pipeline adottata

`translationPlan.ts` separa ogni sezione in frammenti di prosa e span da
conservare. Usa la stessa scansione di formule, codice inline e fence del
validatore. Ogni occorrenza resta distinta anche se ripete la stessa formula.
Il documento completo, **inclusi gli span protetti**, è ancora inviato al
provider come contesto, con l'autorizzazione dell'utente; il cambiamento non
esclude formule o codice dall'invio. La risposta contiene invece soltanto
i frammenti di prosa, in un oggetto JSON con campi obbligatori per sezione e
frammento. Non ci sono richieste separate per i singoli frammenti.

L'app reinserisce gli span originali e gli spazi ai bordi dei frammenti secondo
il piano locale, poi applica il precedente validatore all'intero risultato.
Non accetta la traduzione alterata di una formula e non ne normalizza il
contenuto: formule e codice non vengono più riscritti dal modello. Il modello
può ancora tradurre le etichette Mermaid ammesse; una freccia o struttura
alterata viene rifiutata. Restano rifiutati campi sconosciuti, mancanti,
duplicati anche se mascherati da escape JSON, valori errati, frammenti vuoti,
matematica aggiunta in prosa e risposte non complete. I commenti temporanei
del validatore sono ora solo locali e non dipendono dalla copia del modello.

Il trasporto usa lo schema JSON dell'SDK già installato, verificato con la
[documentazione ufficiale Gemini](https://ai.google.dev/gemini-api/docs/structured-output)
e le due prove reali finali. Nessuna nuova dipendenza, strategia a richieste
multiple, riparazione silenziosa della risposta rifiutata o modifica alle
regole di salvataggio dell'archivio. Fonte cambiata durante l'attesa, inglese
precedente e titoli manuali restano gestiti dal percorso archivio esistente.

### Replay e limiti

`node local-artifacts/eng-diagnosis-2026-10-19/replay-plan.cjs
--run=protected-prose-01` e l'equivalente `protected-prose-02` ricostruiscono
offline le risposte e verificano che la firma strutturale completa coincida
con la fonte. Entrambi sono passati. I Markdown validati sono salvati soltanto
come `validated-en.md` nelle rispettive cartelle private di collaudo.

La garanzia riguarda struttura e contenuti protetti. Il sistema non certifica
la fedeltà o completezza linguistica della prosa; restano i limiti già
documentati su liste, tabelle, HTML, titoli Setext e lunghezza massima di output.
Le due prove non dimostrano l'assenza di ogni possibile errore futuro e non
attribuiscono automaticamente la stessa causa a tutti gli eventi storici.

Durante lo sviluppo un test del caso senza prosa aveva inizialmente lasciato
attivo il client reale con una chiave fittizia: le richieste di autenticazione
sono state respinte e contenevano solo una fixture sintetica, senza materiale
personale o credenziali reali. Il test è stato corretto con un mock che blocca
ogni invio prima dell'esecuzione, osservato fallire senza rete e poi passare
dopo l'integrazione. Questi errori di autenticazione non sono generazioni AI
e non hanno metadati di consumo token disponibili.

La voce 43 e la posizione 29 sono completate per la causa riprodotta, con
implementazione, regressioni e due collaudi reali. Nessun'altra voce avviata.
Installer non rigenerato: la correzione è nel codice e nella nuova build,
non ancora nel setup del 18 ottobre. Nessun commit o push.

### Esito finale delle verifiche D-0355

- **591/591 test Vitest, 41 suite passate**, eseguite fuori sandbox nella
  cartella temporanea standard. Trentadue nuove regressioni rispetto a D-0354.
- Typecheck, lint di tutti i sei file TypeScript modificati e build passati.
  Il lint globale conserva i due errori preesistenti del worker PDF descritti
  nella fase precedente; nessuna modifica a quel componente.
- Due richieste reali finali riuscite e due replay offline con firma protetta
  identica alla fonte. Le prove intermedie fallite sono conservate e documentate,
  senza tentare di salvarne il contenuto o disabilitare controlli.
- Nessuna nuova dipendenza, modifica di audio/trascrizioni o risultato di
  collaudo scritto nella libreria personale. Installer non rigenerato.

## Installer aggiornato — D-0356

Su richiesta esplicita successiva dell'utente, rigenerati build e setup NSIS
Windows x64 0.1.0 con pubblicazione disabilitata. Entrambi conclusi con codice 0.
Backup del setup precedente, blockmap e `latest.yml` in
`local-artifacts/installer-backups/20261019-111556/`, con manifesti e log locali.

Verificati 369 file di `out` identici al contenuto ASAR, presenza del piano di
traduzione protetto e dello schema JSON, titoli indipendenti, pagine Note,
opzione laboratori, Mermaid compatti, FFmpeg e runtime traduzione offline.
Esclusi gli artefatti diagnostici personali. Verificati hash SHA512 e dimensione
del manifesto, blockmap e integrità del backup precedente.

- Setup: `dist/Lezionify-Setup-0.1.0.exe`, 190.804.813 byte.
- SHA256: `9b3936c548b8d0ad10609b87d3660f74d9ebf3b56c7f89adaf1363d2d6c3b146`.
- Esito salvato in `verification.json` nella cartella del backup.

Restano validi i 591 test e i due collaudi reali di D-0355; nessuna ulteriore
modifica al prodotto o chiamata AI per il packaging. Nessuna installazione,
pubblicazione, commit o push eseguiti. Per aggiornare l'app, chiudere Lezionify
e avviare il nuovo setup.

## Ricorrenza nella versione installata — D-0357

L'utente segnala un nuovo errore **sezione 5; formule**. L'ASAR installato è
stato confrontato con quello del setup D-0356: hash identico e piano protetto
presente. Il processo era stato riavviato dopo l'installazione. La fonte e il
piano coincidono con quelli del precedente collaudo da 40 sezioni; una
ricostruzione con frammenti sorgente identici supera il validatore.

Con l'autorizzazione permanente alle chiamate AI diagnostiche, acquisita una
nuova risposta con `STOP`: rifiuto nelle sezioni 7 e 11, per formule. L'esame
locale individua tre formule display aggiunte dal modello nella prosa: sono
copie byte per byte di formule protette della stessa sezione, tutte su righe
autonome. Il piano aveva già reinserito le occorrenze originali, quindi queste
copie fanno fallire correttamente la firma. Non sono formule originali omesse.
La risposta del tentativo utente nella sezione 5 non è conservata: non si
attribuisce retroattivamente lo stesso dettaglio senza replay.

### Correzione circoscritta

`translationPlan.ts` esclude dalla sola prosa restituita le copie display
aggiuntive che soddisfano **tutti** questi criteri:

- Blocco `$$...$$` o `\[...\]`, non codice o Mermaid.
- Identico a uno span immutabile della stessa sezione, senza normalizzare
  spazi, comandi o contenuto matematico; CRLF/LF restano equivalenti.
- Nessun altro contenuto sulla riga di apertura o chiusura del blocco.
- Dopo l'esclusione ogni frammento di prosa mantiene testo non vuoto.

Ogni occorrenza della fonte continua a essere reinserita nell'ordine e nella
quantità originali. Il risultato deve superare lo stesso controllo globale.
Formule nuove, modificate, di altre sezioni, incorporate nella prosa o nel
codice restano rifiutate. Non si rimuovono tutti i blocchi matematici, né si
salva una risposta con firme diverse. Questo è un aggiornamento esplicito
alla ricostruzione D-0355, non un retry AI o una normalizzazione matematica.

Dopo il superamento dell'intero controllo, `GeminiService` registra nel log
`translation-integrity` soltanto indici di sezione e numero di copie escluse.
Nessun testo, formula, titolo, ID della lezione o chiave viene aggiunto a tale
diagnostica. Se la validazione fallisce non viene emesso l'evento di successo.

### Prove e limite residuo

Il comando `node local-artifacts/eng-diagnosis-2026-10-19/replay-plan.cjs
--run=recurrence-01` è stato osservato fallire prima della correzione con
«sezione 7; formule», e passare dopo, su tutte le 40 sezioni, con firma protetta
identica alla fonte. La risposta grezza è conservata invariata negli artefatti
privati ignorati. Nessun risultato è stato scritto nella libreria personale.

Nove nuove regressioni: copie display con due delimitatori e ripetizioni
originali, formule nuove/modificate/nel codice/nella prosa/di altra sezione,
frammento che diventerebbe vuoto e callback sanitizzata solo dopo successo.
Prima della correzione osservati i fallimenti dei casi validi, poi quello del
frammento svuotato e dell'evento mancante; tutte le regressioni ora passano.
Suite completa **600/600 test, 41 suite**, typecheck, lint dei file modificati
e build passati.

Un solo nuovo tentativo con la correzione ha ricevuto `quota_exhausted`, prima
di una risposta utilizzabile. Nessun retry o altra rotazione diagnostica è
stato avviato. È distinta dalla risposta di contenuto acquisita prima, che ha
consumato 17.350 token input, 9.667 output e 98 ragionamento, totale 27.115.
Non sono disponibili metadati token per la richiesta respinta per quota.

La voce 43 e la posizione 29 sono riaperte per il ricollaudo nell'app quando
la quota sarà disponibile. Il replay reale conferma la correzione della copia
display osservata; non viene dichiarata completata una nuova generazione che
il provider non ha eseguito.

### Setup della ricorrenza — D-0358

Rigenerato il setup NSIS x64 0.1.0 nello stesso flusso di aggiornamento richiesto
dall'utente, includendo D-0357. Build e packaging conclusi con codice 0;
pubblicazione disabilitata. Backup del setup D-0356, blockmap e manifesto in
`local-artifacts/installer-backups/20261019-113320/`.

Verificati 369 file della build identici all'ASAR, presenza della deduplicazione
display e del piano protetto, hash/dimensione del manifesto, blockmap, backup,
FFmpeg, runtime offline e assenza di artefatti privati. Esito in
`verification.json` nella cartella del backup. Setup aggiornato:
`dist/Lezionify-Setup-0.1.0.exe`, 190.804.760 byte, SHA256
`54a7f69668c2ce213c483298c44e80d56cdbcc963a0f843bdc8c9c84281b2ea2`.

Nessuna installazione automatica, pubblicazione, commit o push. Chiudere
Lezionify e avviare il nuovo setup per aggiornare l'app. Il limite del collaudo
online dovuto alla quota rimane esplicito: il packaging non lo risolve.

## Nuovo rifiuto dei frammenti — D-0359

Il log conferma un rifiuto dei frammenti successivo a quello delle formule.
Il processo installato contiene la deduplicazione D-0357: il suo main ha lo
stesso SHA256 del pacchetto D-0358. Non si attribuisce il nuovo errore a una
versione vecchia o alla deduplicazione senza la risposta rifiutata.

Il messaggio precedente univa nove rami: JSON invalido, radice non oggetto,
sezioni mancanti/inattese, sezione non oggetto, campi mancanti/inattesi,
tipo non stringa, testo vuoto, testo svuotato dopo la rimozione delle copie,
chiavi duplicate. Ora distingue questi casi e, quando disponibili, gli
indici di sezione e frammento. Nessun nome inatteso o testo del modello viene
riportato. I criteri di accettazione restano identici.

Nove regressioni del dettaglio osservate fallire prima della modifica e
passare dopo: `npx vitest run tests/unit/translationPlan.test.ts --maxWorkers=2`.
Verifica finale: **609/609 test, 41 suite**, typecheck, lint mirato e build
passati. Ripetuti anche i replay delle due risposte D-0355 e della ricorrenza
D-0357: tutti accettati con firma protetta identica alla fonte.

Le chiamate AI aggiuntive sono già autorizzate dall'utente. Ogni run resta
limitato a una richiesta fisica, senza retry o scritture nella libreria.
Il primo nuovo run sulla stessa fonte (40 sezioni, 39.944 caratteri) viene
respinto per quota; un secondo usa soltanto in memoria la successiva chiave
già configurata, senza cambiare impostazioni, e riesce in 163 secondi.
Replay accettato: 36.632 caratteri ENG e firma protetta identica. Consumi
provider: 17.350 input, 9.485 output, 20.906 ragionamento, totale 47.741.
La risposta è conservata solo negli artefatti privati ignorati. Il successo
non riproduce il rifiuto segnalato e non ne dimostra la risoluzione.

Un terzo run con la stessa chiave disponibile e la diagnostica D-0359 scade
per timeout a 180 secondi, con una sola richiesta fisica e senza risposta
acquisita. Il manager attende 2 secondi ma il budget impedisce altri invii.
Non vengono avviate altre prove AI in questa fase. Non sono disponibili
metadati token delle richieste respinte o scadute. Il rifiuto originale dei
frammenti resta non riprodotto: la diagnostica ora permette di identificarne
il ramo se si ripresenta nell'app aggiornata.

### Installer diagnostico — D-0360

Setup NSIS x64 0.1.0 rigenerato con D-0359, pubblicazione disabilitata.
Build e packaging conclusi con codice 0. Backup D-0358, blockmap e manifesto
in `local-artifacts/installer-backups/20261019-122031/`.
Verificati tutti i 369 file out identici all'ASAR, dettagli diagnostici nuovi,
piano protetto e deduplicazione, funzioni PDF/titoli/laboratori/Mermaid,
FFmpeg, runtime offline, assenza artefatti privati, backup e manifesto.
Setup: `dist/Lezionify-Setup-0.1.0.exe`, 190.804.821 byte; SHA256
`bcaf64897e43b49278022f02a186d7836c1bdd1dc6fdaf4307fc30d8536e6543`.
Nessuna installazione automatica. Questo setup migliora l'identificazione
del rifiuto; non viene presentato come correzione della causa non riprodotta.

## Ripresa del lavoro Gemini — D-0364

L'utente conferma che il problema riguarda ENG e che le traduzioni in passato
funzionavano. I log mostrano anche una traduzione riuscita il 17 ottobre:
non tutte le richieste o tutte le versioni erano necessariamente guaste.
La ripresa esamina le modifiche D-0361–D-0363 già presenti, senza attribuire
ogni errore storico alla stessa causa.

### Evidenze e correzioni

1. **Mermaid:** la risposta reale acquisita da Gemini, su 39 sezioni, viene
   rifiutata alla sezione 16 senza le due regole D-0361 e accettata con esse.
   Cambiano etichette sulle frecce, non la struttura. La correzione è mantenuta;
   rimossa una sola alternativa regex duplicata che causava un errore lint.
2. **Quote:** tutte le 18 chiavi personali hanno il metadato legacy
   `default-project`. Il fallback D-0363 per metadati assenti non si attivava.
   L'utente conferma progetti condivisi ma non ne conosce la mappa; trattare
   ogni chiave come progetto indipendente sarebbe un'assunzione ingiustificata.
   Ora `quotaGroupKnown` distingue il valore legacy dai gruppi personalizzati.
   RPM e cooldown restano comuni; per i progetti non verificati una quota
   giornaliera sospende solo la chiave provata sul modello. L'identità privata
   deriva dalla chiave, non dalla posizione: duplicati e riordini non eludono
   la sospensione. I gruppi espliciti restano sospesi insieme.
3. **Fallback ENG:** i log mostrano l'esaurimento della prima chiave sul
   modello completo, seguito subito da un Lite con frammenti vuoti o fatti
   soltanto di copie matematiche. D-0362 migliora l'ordine, ma permette ancora
   quel passaggio. La sola traduzione ENG ora usa modelli completi come
   alternative automatiche; resta rispettato un Lite scelto esplicitamente.
   Non si accettano frammenti vuoti o formule alterate e non si inserisce prosa
   italiana come sostituto di una traduzione assente.

I limiti Google sono [per progetto](https://ai.google.dev/gemini-api/docs/rate-limits),
non per chiave. Il comportamento sui gruppi ignoti evita di dedurre falsamente
che tutte le chiavi siano esaurite; non afferma che le loro quote siano
indipendenti. Restano scheduler seriale, pacing, cooldown e budget assoluto
di sei invii. Nessuna migrazione o riscrittura delle impostazioni personali.

### Verifiche deterministiche

Comando iniziale delle nuove regressioni:

```powershell
npx vitest run tests/unit/geminiPhaseB.test.ts tests/unit/archive.test.ts -t 'legacy|esaurisce i modelli completi' --maxWorkers=2
```

Prima del fix: tre regressioni fallite; quota legacy causa salto alla chiave
del Lite anziché alla seconda chiave sul modello completo, flag di progetto
assente, alternative ENG contenenti i Lite. Dopo: tutte passate. Due ulteriori
test coprono il caricamento reale delle impostazioni fino al manager e il
budget di sei invii con 18 chiavi, duplicati e riordino. Verificati anche RPM
condivisi, cooldown di 20 secondi e persistenza della sospensione tra job.

Suite finale: **615/615 test, 41 suite**; typecheck, lint dei file interessati
e build passati. Il primo tentativo nella sandbox aveva tre fallimenti di
ambiente (junction Windows e due callback loopback Spotify); riesecuzione
fuori sandbox tutta verde, senza modificare quei test.

Cinque replay finali accettati: fonti da 40, 36, 40, 40 e 39 sezioni.
Script e riepilogo locale ignorato:
`local-artifacts/eng-diagnosis-2026-10-19/continuation-replay.cjs` e
`continuation-replay-results.json`. Nessuna richiesta di rete nei replay.

### Nuovo collaudo reale autorizzato

Il controllo automatico inizialmente richiedeva consenso specifico all'invio
della dispensa; l'utente ha autorizzato tutte le richieste necessarie. Nessun
invio prima del consenso. Due bootstrap diagnostici non recuperavano le
credenziali; `--user-data-dir` inizializza correttamente il profilo Chromium.
Verificati soltanto conteggi: 18 chiavi cifrate leggibili, nessuna stampata.

- `live-continuation-01`: una sola richiesta fisica sul modello 3.7 Flash,
  HTTP 503 dopo circa 35 secondi; nessuna risposta o metrica token disponibile.
- `live-continuation-02`: pool configurato e stesso budget applicativo di sei
  tentativi, ma successo già al primo invio sul modello 3.7 Flash, in 111,2 s.
  Documento da 40 sezioni, 39.944 caratteri; risultato da 36.922 caratteri,
  `finishReason=STOP`, controllo completo superato e **244 contenuti protetti
  identici e nello stesso ordine**. Nessun fallback o retry in questo run.

Consumi della risposta riuscita: 17.350 token input, 9.536 output, 8.892
ragionamento, totale 35.778. Risposta e output validato restano soltanto negli
artefatti locali ignorati. Nessuna dispensa, trascrizione, audio o metadato
di libreria modificato dai due run; nessuna chiave API in chiaro nei log o nei
file creati.

La correzione delle cause osservate e i casi validi/invalidi sono verificati.
Restano i limiti dichiarati del modello sulla fedeltà della prosa e la
possibilità di errori del provider, come il 503 effettivamente osservato.
Una futura risposta con prosa mancante deve ancora essere rifiutata: il
successo del collaudo non autorizza ad allentare le protezioni.

### Setup finale — D-0365

Rigenerato `dist/Lezionify-Setup-0.1.0.exe` con D-0361 e D-0364, senza
pubblicazione. Backup del setup presente all'inizio della ripresa, blockmap
e manifesto in `local-artifacts/installer-backups/20261019-eng-continuation/`.
Build e packaging conclusi; il download dei componenti di packaging richiedeva
l'esecuzione fuori sandbox per la risoluzione DNS.

Verificati 369 file `out` identici al payload ASAR, presenza delle correzioni
di quote/fallback, piano protetto e deduplicazione, funzioni PDF, titoli,
laboratori, Mermaid, FFmpeg, runtime offline, assenza di artefatti privati,
backup, blockmap e hash/dimensione del manifesto. Risultato in
`verification.json` nella cartella del backup.

Setup da 190.804.761 byte, SHA256
`6255abda4bf6051e7be7756d10398615ccf9e111401de879bb736d3f54420f94`.
Chiudere Lezionify e avviare il setup per aggiornare l'app. Nessuna installazione
automatica, pubblicazione, commit o push eseguiti. Voce 43 e posizione 29
allineate alle cause riprodotte e ai collaudi riusciti; le nuove risposte
realmente incomplete restano rifiutate e gli errori del provider restano
distinti dai rifiuti di integrità.
## Recupero Mermaid richiesto dall'utente — D-0366

La prova richiesta sulle cinque dispense tradotte più recentemente ha prodotto
tre successi, un rifiuto Mermaid alla sezione 28 e un fallimento per sei HTTP
503 senza risposta utile. I dodici file controllati (libreria, impostazioni,
cinque italiani e cinque inglesi) sono rimasti identici. Selezione, risposte e
risultati sono negli artefatti locali ignorati `latest-five/` della diagnosi.

Su autorizzazione esplicita dell'utente il diagramma tradotto è ora facoltativo:
se la sua struttura non corrisponde, `restoreOriginalMermaid` reinserisce il
diagramma sorgente. Conserva il diagramma inglese se supera il confronto;
rimuove quelli aggiunti e recupera quelli mancanti rispettando l'ordine dei
blocchi di codice. Un diagramma mancante può essere spostato prima del codice
successivo o in fondo alla sezione. Prosa, formule e codice restano sottoposti
al controllo finale, senza sostituzione della prosa inglese con quella italiana.
Il recupero viene tracciato soltanto con indici di sezione e conteggi e dopo
il successo della validazione finale.

Replay offline della stessa risposta reale: prima `invalid_output`, sezione
28, diagrammi Mermaid; dopo accettata su 39 sezioni, 31373 caratteri, un
diagramma recuperato. Nessuna nuova richiesta AI e nessuna scrittura nella
libreria. Artefatti `mermaid-fallback-replay.*` nella cartella diagnostica.

Test mirati: 109/109. Suite completa: 619/619 in 41 file, eseguita fuori sandbox
per i test junction/loopback esistenti. Typecheck, lint mirato e build passati.
Il primo tentativo di test si è fermato per EPERM della cache temporanea;
con TEMP/TMP nella cartella diagnostica un test sui diagrammi omessi ha rilevato
un problema d'ordine, corretto prima del collaudo finale.

Setup aggiornato `dist/Lezionify-Setup-0.1.0.exe`: 190804241 byte, SHA256
`ba6b64416a489d28b644c4f942280576cc6b3d7ad37d1e2b2673aa294239b7aa`.
Packaging con `--publish never`; backup del precedente setup, blockmap e
manifesto in `local-artifacts/installer-backups/20261019-mermaid-fallback/`.
Verificati 369 file ASAR identici alla build, presenza del recupero Mermaid,
runtime e funzioni esistenti, esclusione degli artefatti privati, manifesto
SHA512, blockmap e hash del backup. Nessuna installazione o pubblicazione.
