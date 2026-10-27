# Indagine sulle dodici segnalazioni del 27 ottobre 2026

## Perimetro ed esito

Stato iniziale, seguito più sotto da D-0433 con correzione e packaging.
Richiesta: registrare le idee future e successivamente indagare errori e
problemi. Aggiunte undici voci 106–116 e aggiornata la 71 già aperta, senza
riordinare la coda. Nessuna correzione applicativa, installer o chiamata AI
reale in questo intervento. Le caselle restano aperte.

Il checkout aveva già modifiche a DECISIONI.md e alla lista: conservate.
Fetch riuscito, HEAD e origin/main allineati; pull non eseguito perché il
checkout non è pulito, secondo AGENTS.md. Nessun reset, stash o rebase.

## Riproduzioni deterministiche

Comando eseguito: `npx vitest run tests/unit/october27Diagnosis.test.ts`.
Prima esecuzione utile: il diagramma fallisce con l'esatto messaggio
«Il diagramma contiene una direttiva non consentita». Il primo tentativo di
minimizzare il caso matematico non riproduceva il sintomo; usando il tratto
con `0.50\$$` si ottengono **due test falliti** prima di qualsiasi modifica
applicativa. Il markup prodotto contiene la prosa in elementi MathML `mi`,
con spazi persi e apostrofo reso come apice: riproduce il sintomo segnalato.
La prima esecuzione sandbox era stata bloccata da EPERM sulla cache temporanea
Vitest; la ripetizione fuori sandbox è riuscita.

Ipotesi verificate una alla volta: stili del diagramma di stato, metadati
accessibili, delimitatori monetari. Rimuovere soltanto gli stili fa accettare
il diagramma originale con i metadati; il caso minimo `stateDiagram-v2` con
`A --> B` è accettato, aggiungere `style A fill:#fff` provoca il rifiuto.
Lo stesso stile su `flowchart TD` passa. Il controllo è in
`src/components/MermaidDiagram.tsx`, funzione `validateMermaidSource`:
`supportsStaticStyles` comprende solo graph/flowchart. **Causa del rifiuto
locale confermata**; il parsing e il rendering Mermaid completo del diagramma
con stili richiedono un successivo collaudo, non sono certificati qui.

Per la matematica, il frammento minimo usa `c = 0.50\$$` e termina con
`\Pi < 0$`. Il primo dollaro è escapato, quello successivo apre matematica
inline fino al dollaro finale. `normalizeDisplayMath` ripara soltanto blocchi
display multilinea: lascia questo caso invariato. Con un solo dollaro
monetario escapato e una coppia di delimitatori attorno alla vera formula,
la prosa resta normale e la formula viene renderizzata senza `katex-error`.
**Meccanismo riprodotto**, ma il testo incollato dall'utente non è una copia
certificata del Markdown salvato: non è ancora dimostrato se il delimitatore
errato provenga dalla generazione, da una trasformazione o dal testo copiato.
Non modificato alcun materiale personale o normalizzatore globale.

Le due aspettative di comportamento desiderato sono conservate come
`it.fails`, fallimenti attesi esplicitamente associati alle voci ancora aperte;
non rappresentano correzioni riuscite. Due ulteriori prove isolano le cause.
Quando si correggeranno i difetti, rimuovere `fails` e richiedere il verde.

## Stato delle altre segnalazioni

| Voce | Evidenza nel checkout | Limite / prossimo controllo |
| --- | --- | --- |
| 106 EarFun | Nessuna gestione `mediaSession`, `setActionHandler` o tasti MediaPlayPause/MediaTrackNext trovata in src, electron e shared. I suoni offline usano Web Audio. | Manca l'integrazione esplicita; non prova un guasto delle cuffie. Servono modello EarFun e prova sul player attivo per verificare il comportamento dei gesti. |
| 71 Dizionario italiano | Ancora aperta, posizione 25. Esistono dati bilingui EN/IT e traduzione offline, non la modalità di definizioni italiane richiesta. | Selezionare corpus monolingue, copertura e licenza secondo i criteri già registrati. |
| 108 Sveglia | `FocusReminders.describeReminder` restituisce soltanto l'ora per una sveglia attiva; il conteggio residuo è già disponibile per il timer. | Richiesta di estensione confermata, nessuna aggiunta effettuata. |
| 109 Q&A | `QnaSidebar` non assegna focus automatico alla textarea; useFullContext parte false, includeOtherQna false; lunghezza letta dalla preferenza persistente, default brief. Invio già invia, Shift+Invio conserva il ritorno a capo e IME è escluso dall'invio. | Implementare focus e nuove scelte iniziali, verificando le preferenze precedenti e mantenendo visibile ciò che verrà inviato. |
| 110 Modelli | `getModelFallbackChain` in electron/main/gemini.ts: modello scelto prima; poi pool 3.7 Flash, 3.5 Flash, 3.8 Flash, 3.5 Flash-Lite, 3.1 Flash-Lite, escluso il preferito. Senza preferenza: 3.7 → 3.5 → 3.8 → 3.5 Lite → 3.1 Lite. | Non esiste un'attesa fissa prima del 3.8: il manager prova modelli/chiavi in base a errori, quote, cooldown e tentativi. Se scelto come preferito, 3.8 è primo. Gemini 4 non è nel pool attuale. Nessuna misura reale della saturazione effettuata. |
| 111 Evidenziatore | In Focus esiste il comando evidenziatore; modello e hook memorizzano intervalli e colore, senza modalità di sottolineatura dedicata. | I test highlights passano ma replicano un algoritmo nel test: non verificano l'hook né la selezione DOM, la resa o la persistenza reale. Non certificano «funziona bene» nell'app. |
| 112 Online | Non trovata configurazione googleSearch nel percorso AI attuale. Il provider documenta il supporto al grounding. | Fattibile a livello API; richiede integrazione esplicita, citazioni, gestione costo e compatibilità dei fallback. Nessun tool web abilitato nell'app da questa indagine. |
| 113 Stima | `studyEstimate.ts`: 20 intervalli, almeno 45 secondi in ciascuno dei primi intervalli consecutivi, almeno 600 secondi totali e 60% consolidato dal punto iniziale; mostra soltanto residui inferiori a 30 minuti e nasconde a fine documento. | Queste soglie spiegano molti casi di assenza, non dimostrano da sole la causa nell'episodio personale. Nessun modello parole/numeri o storico per tipologia implementato. |
| 114 Slide | `LectureDrawer` passa canSelectSlides solo se isQnaSidebarOpen e isQnaComposing; FocusWorkspace passa il callback al PDF solo in quel caso. QnaSidebar attiva la composizione al focus/cambio del campo; il PDF mostra la barra dopo caricamento riuscito. | Percorso da provare: aprire Q&A, cliccare il campo domanda, aprire/caricare il PDF e selezionare le pagine. Se manca ancora, serve il percorso personale; non riprodotta l'intera UI. |
| 115 Registratore | `findUsbRecorderDrive` cerca RECORD da D a Z oppure usa il percorso esplicito. Prima di restituire attende scanAudioFiles; per ogni audio, in sequenza, esegue stat e checksum SHA256 completo. Gli MP3 vengono riletti interamente per readMp3Duration. | Sono costi I/O e CPU concreti, non una misura della lentezza personale. Mancano tempi sul registratore: separare ricerca unità, hashing e durata prima di scegliere cache, progressione UI o ottimizzazioni. |

In `useStudyEstimate`, **Ricalcola da qui** crea uno stato nuovo con baseline
nell'intervallo corrente, azzera secondi/dwell/storico e nasconde la stima
finché non sono nuovamente soddisfatte le soglie sul tratto residuo. Non è
un comando per mostrare subito il tempo e non usa i dati storici per adattare
una formula. Il salvataggio dell'estimatore contiene impronta, baseline,
secondi e 20 dwell; non contiene tempi etichettati per paragrafo, conteggi di
parole/numeri o un dataset pronto al fitting. L'inventario di eventuali altri
dati personali per la nuova stima resta da fare.

## Verifica del provider per modelli e ricerca web

Fonti ufficiali consultate il 27 ottobre 2026:

- [Modelli Gemini](https://ai.google.dev/gemini-api/docs/models.md): elenca
  Gemini 4 Argon e 3.8 Flash. La presenza del 4 non dimostra che il 3.8 sia
  meno carico: disponibilità, quote e qualità richiedono misure sul progetto.
- [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash):
  supporta search grounding; eventuali confronti vanno fatti usando parametri
  supportati dal modello.
- [Grounding con Google Search](https://ai.google.dev/gemini-api/docs/google-search)
  e [prezzi](https://ai.google.dev/gemini-api/docs/pricing): per Gemini 3 e
  successivi, 5.000 query di ricerca gratuite al mese condivise, poi
  14 USD per 1.000 query, oltre ai token del modello. Una domanda può generare
  più query fatturabili; la franchigia non implica che ogni progetto senza
  fatturazione possa usare il tool. Verificare piano, modello e tariffa prima
  di implementare o svolgere prove a pagamento.

Nessuna nuova chiave letta, nessuna chiamata Gemini, ricerca di materiale
personale o modifica alle preferenze eseguita. Le ricerche web dell'indagine
usano soltanto termini tecnici pubblici.

## Verifiche e ripresa

Comando finale eseguito:

```powershell
npx vitest run tests/unit/october27Diagnosis.test.ts tests/unit/studyEstimate.test.ts tests/unit/highlights.test.ts tests/unit/usbRecorder.test.ts tests/unit/markdownMath.test.ts tests/unit/todayMermaid.test.ts
```

Esito: **6 file, 25 test superati e 2 fallimenti attesi**, 27 casi totali.
I due difetti riprodotti restano aperti: nessuna dichiarazione di correzione.
USB su fixture sintetiche, nessuna misura hardware; nessun collaudo visivo
Electron, cuffie, traduttore monolingue o benchmark Gemini reale. Nessuna
strumentazione temporanea o modifica ai materiali sorgente dell'utente.

Per riprendere la correzione, usare le voci 107 e 116 con le riproduzioni
conservate. Per la scansione misurare prima; per le slide provare la sequenza
documentata. La prima attività di LISTA_ORDINE resta la voce 33, posizione 18:
questa richiesta diretta non ne modifica l'ordine.

## Ripresa dopo le precisazioni dell'utente

L'utente conferma: la domanda è aperta e sta scrivendo, con PDF nella colonna
interna di Focus; non riesce comunque ad allegare. Inoltre non ha mai visto
la stima residua nelle varie sessioni di studio. Le spiegazioni preliminari
non chiudono questi due casi.

### Stima: difetto di campionamento riprodotto

Esteso lo scenario React/Electron reale in
`tests/integration/studyToolsScenarios.browser.tsx`: documento sintetico di
20 blocchi alti 1.000 px, viewport di 2.000 px; lettura di otto schermate
consecutive, 90 secondi ciascuna. Timer simulato, nessuna attesa di 12 minuti
e nessun dato personale. Lo scorrimento avanza di una schermata: nessun tratto
viene saltato, viene letto l'80% del documento in 720 secondi.

Comando eseguito prima della caratterizzazione:
`node tools/run_hook_regressions.cjs --study-tools-only`.
L'aspettativa «mostrare Studio restante» fallisce. Ultimo snapshot persistito:
711 secondi, dwell iniziali `[90,0,90,0,90,0,90,0,90,0,90,0,90,0,81,0,0,0,0,0]`.
I nove secondi di differenza dipendono dal salvataggio ogni dieci secondi.

`studyBin` restituisce soltanto l'intervallo alla cima della colonna e `tick`
accredita solo quello. Gli altri intervalli visibili non ricevono tempo;
`estimateStudyMinutes` richiede invece una sequenza iniziale senza buchi.
Il conteggio si ferma pertanto dopo il primo intervallo, pur avendo letto
le schermate intere. Questo è un **difetto riproducibile del campionamento**,
compatibile con l'assenza persistente riferita, non la dimostrazione del
tracciato esatto delle sessioni personali precedenti. Ulteriori soglie e
condizioni di sospensione rimangono possibili concause.

Nessuna correzione applicata. Lo scenario conserva una caratterizzazione
esplicita del difetto aperto (voci 70/113): controlla buchi e assenza della
stima, non certifica il funzionamento desiderato. Quando si implementerà la
correzione, sostituire tale controllo con la richiesta di una stima valida e
verificare anche salti veloci, lettura dal basso, pause, Q&A e documenti corti.
Non basta ridurre la soglia del 60%: occorre rappresentare la porzione letta
senza inventare avanzamento dai salti. Valutare anche uno stato esplicito di
raccolta dati anziché lasciare l'indicatore completamente invisibile.

### Allegati: spiegazione iniziale esclusa, caso personale ancora aperto

Eseguito `node tools/run_hook_regressions.cjs --focus-pdf-only` con PDF.js,
React e layout CSS reali: mostra selettori e barra, prepara due PNG delle sole
pagine selezionate e li passa al callback. Esteso lo scenario in
`tests/integration/focusPdfScenarios.browser.tsx` per digitare davvero una
domanda prima della selezione e controllare che entrambi i comandi restino
presenti. Non viene chiamato Gemini; profilo e PDF sono sintetici.

Il test non usa l'intero LectureDrawer né il pacchetto installato: non esclude
un difetto nella loro integrazione, nel layout personale o nella versione
in esecuzione. Non trovata finestra o app Lezionify accessibile tramite gli
inventari Computer Use della sessione; nessuna interazione con materiali
personali eseguita. Nessuna causa certa attribuita al caso personale.
Per proseguire serve osservare l'episodio nell'app: controllare se mancano
entrambi barra e caselle di pagina, oppure se sono presenti ma fuori vista;
confrontare il pacchetto in uso con il sorgente e lo stato di composizione.

## Correzione e nuovo installer richiesti successivamente — D-0433

La successiva richiesta dell'utente autorizza correzioni e rigenerazione
dell'installer. La diagnosi e le limitazioni sopra restano lo storico.

`studyVisibleRange` misura entrambi i bordi del pannello con la ponderazione
testuale esistente; `sampleVisibleStudy` accredita la frazione visibile di
ciascun intervallo, una sola volta per il tempo totale. Non interpola i salti
di scorrimento, non aggiunge dwell fuori dalla viewport né prima della
baseline. Le soglie restano 10 minuti, 60% consolidato, 45 secondi per
intervallo e meno di 30 minuti residui. I campioni precedenti restano leggibili,
senza attribuire retroattivamente tempi ai tratti mai campionati. In Focus
appare «Stima: raccolta dati» o «Stima sospesa» quando il numero è assente;
il tooltip riporta le condizioni. Il modello storico parole/numeri della
voce 113 resta da sviluppare.

La nuova prova di lettura per schermate, prima rossa, richiede ora una stima
ed è verde. Adeguata anche la vecchia fixture: mostrava solo 400 px di blocchi
da 1.000 px e saltava i restanti 600, pur aspettandosi una lettura completa;
ora mostra realmente l'intero blocco. Restano verdi i controlli di scorsa
veloce, pause, background/sospensione, Q&A, riavvio, cambio lingua,
rigenerazione e ricalcolo. Due nuovi test puri verificano tempo non duplicato,
frazioni, baseline, input non validi e intervalli saltati.

Per gli allegati non è stata riprodotta la causa dell'episodio personale,
neppure con il LectureDrawer completo. È stata invece corretta la mancanza
di un ingresso esplicito: ora nella composizione Q&A di Focus c'è
**Allega slide**, con istruzione per selezionare le pagine nella colonna PDF
e confermare l'allegato. Il comando abilita la selezione anche senza aver
focalizzato il campo domanda; resta disabilitato durante la generazione.
Il contesto non viene inviato all'AI dalla sola selezione o preparazione.

Test del drawer completo prima rosso per assenza del comando, poi verde:
apertura Focus/PDF/Q&A, clic del comando, digitazione, selezione pagina,
rendering PNG reale, salvataggio immagine e riferimento nella discussione,
anteprima, conservazione della bozza e zero richieste AI. Il test non equivale
a una conferma dell'episodio personale storico. La voce 114 conserva quindi
esplicitamente questo limite di verifica.

Verifiche prima del packaging: typecheck main/renderer e lint completi
riusciti; **747 test unitari superati e 2 fallimenti attesi** su 57 file.
I fallimenti attesi restano quelli di valuta/formule e stili Mermaid:
non riguardano stima o allegati e non sono corretti da questo intervento.

Superate anche tutte le regressioni React/Electron e il riavvio completo del
processo: scorrimento, checkpoint, pause, posizioni, lettore PDF, selezione e
persistenza allegati, Q&A e altri scenari esistenti. Voce 70 chiusa; 113 resta
aperta per il modello predittivo futuro; 114 resta aperta per la conferma
personale, pur essendo disponibile e verificato il nuovo ingresso esplicito.

### Installer generale verificato

Rigenerato con `npm run package:win -- --publish never`, senza installazione
o pubblicazione di una release binaria:

- Setup: `dist/Lezionify-Setup-0.1.0.exe`, **294.217.750 byte**.
- SHA256: `c8024721ff6df03831b75ae8a0736f7b2f992781e867ab0d790ab3b7374374b0`.
- ASAR: `ae8236f6b881ca80af226a518baf93e193521982057fcbaf620741cca17c07c2`.
- Tre file del setup precedente conservati e verificati in
  `local-artifacts/installer-backups/20261027-focus-slides-estimate`.

`tools/verify_installer.cjs` conferma 372 file build identici al pacchetto,
SHA512 e dimensioni del manifesto, blockmap, componenti richiesti e assenza
degli artefatti privati. `tools/verify_nsis_payload.cjs` estrae il setup senza
eseguirlo e verifica otto componenti critici identici al runtime controllato.
Il controllo `tools/check_packaged_rag.mjs` passa in profilo isolato con
modello pubblico già locale, inferenza senza rete e worker PDF; nessun nuovo
download o invio AI. Passate anche le esportazioni PDF reali IT/EN.

Ispezionata la schermata sintetica del drawer con pulsante, caselle delle
pagine e anteprima allegata visibili. Catture e risultati locali rimangono
ignorati; nessuno screenshot o materiale personale è incluso nel commit.
Per usare l'aggiornamento occorre installare il nuovo setup con Lezionify
chiuso. Il commit comprende tutte le modifiche pubblicabili preesistenti,
come richiesto da AGENTS.md; il binario resta escluso da Git.
