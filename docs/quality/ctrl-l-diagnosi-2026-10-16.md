# Ctrl+L: diagnosi della nuova segnalazione — 16 ottobre 2026

Posizione 16 di LISTA_ORDINE, voce prodotto 33. **Aperta: difetto non riprodotto.**

## Segnalazione e perimetro

L'utente conferma che il problema si presenta in Focus e che il pulsante
ITA/ENG funziona nello stesso momento. Il sintomo originale è «Ctrl+L va a
selezionare la schermata ma non cambia la lingua».

La musica rimane rinviata e nessuna attività successiva viene avviata.

## Ciclo di verifica ripetibile

```powershell
node tools/run_hook_regressions.cjs --language-shortcut-only
```

Il comando carica il vero `LectureDrawer` e poi l'intera `App`, usa note IT/EN sintetiche e invia
Ctrl+L tramite `webContents.sendInputEvent`. Il passaggio in Focus avviene
con `requestFullscreen` reale mediante gesto utente nel runtime Electron;
`document.fullscreenElement` è verificato, senza simulare l'API. La finestra
di test viene resa visibile per questo passaggio e chiusa alla fine.
Il profilo è temporaneo; nessun dato della libreria personale viene caricato.

Esito: **PASS**, ripetuto anche dopo l'aggiunta dei casi PDF e campo editabile.
Passati inoltre suite Electron completa con riavvio, typecheck, lint dei file
TypeScript modificati e controllo sintassi Node del runner. Decisione D-0334.

Casi coperti:

- Ctrl+L cambia il testo visualizzato nelle due direzioni, in lettura ordinaria
  e Focus, anche con selezione nel testo.
- Il pulsante lingua e la tastiera producono lo stesso cambio lingua.
- Il comando funziona dal testo e dal pulsante della barra con focus.
- In Focus viene caricato un PDF sintetico reale tramite PDF.js; Ctrl+L cambia
  le note anche con focus sullo scorrimento delle slide.
- Un textarea con bozza conserva lingua e testo; dopo aver riportato il focus
  alla dispensa, la scorciatoia torna a cambiare lingua. Il textarea verifica
  la regola generale dei campi editabili, non l'intero flusso Q&A.
- Con l'intera app montata, sidebar, lista, caricamento dei file e scorciatoie
  globali attive: ingresso dalla lista e cambio lingua in Focus, anche dopo
  aver usato il pulsante. Anche questo caso passa.

Le prove precedenti del progetto generavano `KeyboardEvent` nel DOM. Questo
comando aggiunge la copertura della consegna nativa del tasto e del fullscreen.
Il launcher controlla ora anche la sintassi del main temporaneo prima di
avviare Electron, per evitare che un errore del collaudo apra un dialogo bloccante.

## Versione installata e limiti

Controllata in sola lettura la copia installata in
`%LOCALAPPDATA%/Programs/Lezionify/resources/app.asar`, modificata il 15 ottobre
alle 17:12 nell'orario locale osservato. Il suo asset
`LectureDrawer-BCkZ3Uhk.js` contiene il gestore Ctrl+L con le stesse condizioni
del sorgente corrente: vista, modificatori, campi editabili, dialoghi, stato
di caricamento e disponibilità della traduzione. La sola versione 0.1.0
non distingue tutte le build alpha e questa lettura non riproduce la sessione
dell'utente. Nessuna credenziale o contenuto personale è stato estratto.

Non è stata modificata la logica di cambio lingua. Il test passa nel contesto
costruito e non dimostra che la segnalazione personale sia risolta. Non è stata
formulata una causa senza una riproduzione fallita; non vengono attribuite
responsabilità al browser, al sistema operativo o a un campo con focus.

## Prossimo dato necessario

L'utente ha confermato di aver già provato sia il clic nel testo sia il pulsante
lingua seguito da Ctrl+L, senza risolvere. Non richiedere queste prove di nuovo.

## Diagnostica temporanea facoltativa

Per ricostruire la differenza con la sessione reale, la build diagnostica può
essere avviata con `LEZIONIFY_TRACE_CTRL_L=1`. Nell'avvio normale la diagnostica
è disattivata. Il flag è esposto dal preload come solo booleano.

- Main: `[DEBUG-ctrl-l] main-input` conferma l'arrivo di Ctrl/Cmd+L o del tasto
  fisico KeyL. Sono registrati solo booleani sui modificatori e la corrispondenza
  logica/fisica; nessun carattere grezzo o altro tasto.
- Renderer: `renderer-capture` conferma l'arrivo nella fase di cattura;
  `renderer-result` distingue evento escluso, interazione esclusa, note non
  disponibili, callback mancante e richiesta di cambio lingua. Sono aggiunti
  solo stati booleani e lingua corrente, senza contenuti o identificativi.
- `language-state` conferma la lingua effettivamente impostata.

Le tracce usano il log locale esistente con sorgente `shortcut-language`.
Non modificano la gestione del tasto. Un test unitario verifica il filtro degli
eventi e l'assenza di testo grezzo; lo scenario nativo verifica attivazione,
esito, stato effettivo e disattivazione del tracciamento nel renderer.
Passati 514 test Vitest, typecheck, lint mirato e build. Una prima esecuzione
della suite Electron insieme a build e test è fallita sul controllo del
pulsante Focus flottante; la riesecuzione isolata completa con riavvio è passata.
La causa di quel fallimento del collaudo non è stata attribuita a Ctrl+L.

Per la prova: chiudere l'app già aperta, usare il launcher diagnostico della
copia separata, riprodurre il problema una volta, aprire i log con Ctrl+Shift+L,
scegliere Tutti, cercare `DEBUG-ctrl-l` e copiare i soli log filtrati. Il prossimo
passo è leggere questo tracciato, non ripetere tentativi privi di osservazioni.
Rimuovere la strumentazione `[DEBUG-ctrl-l]` e il flag dopo aver identificato
e corretto la causa. Mantenere aperte posizione 16 e voce 33.

L'utente ha successivamente rinviato la prova della copia diagnostica,
richiedendo la voce seguente (D-0336). Attendere il suo tracciato quando
disponibile; il rinvio non chiude il difetto e non richiede nuove prove adesso.

Copia separata: `local-artifacts/ctrl-l-diagnostic-2026-10-16/`, con launcher
`Avvia-diagnosi-CtrlL.cmd` e istruzioni `LEGGIMI.txt`. Nessun installer sostituito
o installazione automatica; avvio sulla libreria reale lasciato all'utente.
Packaging directory Windows completato con pubblicazione disabilitata.
Confrontati 364 file di build con ASAR, codice diagnostico main/preload/renderer
presente, FFmpeg presente e percorsi privati esclusi. Esito e hash in
`local-artifacts/ctrl-l-diagnostic-2026-10-16/package-verification.json`.
ASAR: 244866816 byte, SHA-256
`d4d067d53deee2ed53fefcea70ec437bc2c8f182710dc33786e13603b4f0e33b`.
