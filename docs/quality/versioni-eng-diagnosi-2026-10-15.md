# Versioni ENG nella pipeline — diagnosi del 15 ottobre 2026

Voce 20: **parzialmente diagnosticata**, non chiusa come difetto generale risolto.
Nessuna chiamata AI, lettura delle credenziali o modifica della libreria personale.

## Risultati verificabili

- `ArchiveService.startArchivePipeline()` avvia manualmente con
  `includeTranslation: true`; tutte le trascrizioni precedono tutte le dispense
  ITA, poi arrivano le traduzioni. Una traduzione in attesa può quindi non essere
  ancora iniziata anche se la sua dispensa ITA è pronta.
- `queueAutomaticLectureProcessing()` usa intenzionalmente
  `includeTranslation: false`. La preferenza nelle impostazioni promette
  trascrizione e ITA, non ENG. Il pulsante «Elabora tutto» completa gli ENG
  mancanti senza rigenerare fonti o dispense già presenti.
- Una quota/rete/autenticazione esaurita sospende la pipeline e richiede ripresa
  esplicita; fallimenti di contenuto e dipendenze si riflettono nei task.
- Il pannello precedente mostrava solo successi/totale e «da controllare», senza
  distinguere traduzioni non richieste, in attesa, fallite e bloccate né mostrarne
  la causa. Questo difetto di diagnosi è corretto nella sessione.
- Letto in sola lettura lo stato pipeline del profilo standard, senza stamparne
  titoli, ID o testi: ultimo run manuale, ENG abilitato, completato, una traduzione
  riuscita; nessun errore di integrità nello snapshot. È solo l'ultimo run e
  **non spiega la frequenza** riferita dall'utente né ricostruisce run precedenti.

## Correzione circoscritta

`ArchivePipelinePanel.tsx` mostra ENG «Non richieste» per la pipeline che le
esclude, contatori separati di attesa/esecuzione/fallimento/blocco, spiegazione
dell'ordine delle fasi e dettagli apribili con errore del singolo task. Il testo
indica quando riprendere la pipeline e quando usare «Elabora tutto». Riusa gli
errori controllati già restituiti dal servizio, senza aggiungere contenuti ai log.

Non viene cambiata la preferenza d'importazione né vengono avviate nuove
traduzioni in modo implicito. Includere ENG automaticamente all'importazione
sarebbe una scelta di flusso e consumo da discutere con l'utente.

## Riproduzione e collaudi

Regressione offline in `archivePipeline.test.ts`: import automatico senza ENG,
poi avvio manuale che esegue solo la traduzione mancante. Un'altra lezione con
ENG già disponibile resta intatta. Riutilizzate le regressioni esistenti di
sequenza, fallimenti, quote, ripresa e riavvio.

`archivePipelinePanel.test.ts` distingue run senza ENG, attesa prima della fase
EN, risposta incompleta, dipendenza assente e quota con ripresa esplicita.
Un primo controllo del test cercava «0/0» in tutto il pannello e intercettava
correttamente le trascrizioni già disponibili: limitato alla riga ENG.
Esito finale dei controlli nel resoconto della sessione.

## Per chiudere la segnalazione

Al prossimo caso mancante, osservare il tipo di avvio e i nuovi dettagli senza
rigenerare subito l'intera lezione. Se il run è manuale, annotare fase, categoria
d'errore e stato finale; non servono chiavi o testo privato. Verificare la
traduzione isolata o il retry esplicito solo dopo la diagnosi. Lo snapshot
attuale non autorizza ad attribuire tutti i casi a quote o al controllo D-0293.

Nessuna Deep Research necessaria per questo punto: serve un caso fallito o
uno stato persistito che lo descriva. La casella resta aperta per tale verifica.

## Verifica successiva delle priorità 1–5

La diagnosi sopra descrive lo stato precedente a D-0305: il codice attuale
include ENG anche nell'import automatico quando la preferenza è abilitata.
L'utente non ha ancora verificato un episodio dopo l'ultimo setup (risposta C).

Rieseguiti i test sintetici di pipeline, pannello e importazione: sequenza
trascrizione/ITA/ENG, preferenza disattivata, chiavi assenti, attesa,
fallimenti, blocchi, quota e recupero delle sole traduzioni mancanti.
Corretto il messaggio del pannello che attribuiva ancora a tutti gli import
l'esclusione dell'inglese: adesso descrive la singola elaborazione storica e
chiarisce il comportamento dei nuovi import. Regressione del rendering prima
fallita e poi passata.

Questa verifica non riproduce un nuovo difetto personale e non completa le
vecchie lezioni tramite AI. La segnalazione generale resta aperta per un caso
reale riproducibile. Esiti nel [documento delle priorità](../product/priorita-1-5-2026-10-15.md).
