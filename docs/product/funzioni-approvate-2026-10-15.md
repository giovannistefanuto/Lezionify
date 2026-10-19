# Funzioni approvate il 15 ottobre: uso e limiti

## Slide nella conversazione

In Focus apri il PDF della lezione e una discussione. Entra nel campo domanda,
anche senza scrivere: compaiono le caselle per scegliere le slide. Il passaggio
al PDF mantiene la selezione attiva; invio e chiusura la nascondono.
Seleziona le caselle di una o più pagine e
premi il pulsante per preparare gli allegati. Il PNG è indipendente dallo zoom
del lettore. Puoi allegare fino a quattro pagine attive, massimo 2 MB per PNG.
Vedi le anteprime nella conversazione prima di inviare la domanda a Gemini.

Le pagine rimangono attive nei messaggi successivi finché le rimuovi. La scelta
del contesto completo oppure estratto rimane disponibile. Rimuovere un allegato
dagli invii conserva la copia storica. Cancellare il thread elimina le sue copie.

Nelle impostazioni apri la raccolta immagini Q&A: elenco, anteprima su richiesta,
cancellazione di una singola immagine, tutte quelle di un giorno locale o tutte.
Le cancellazioni richiedono conferma. Se una conversazione conserva un riferimento
a una pagina cancellata, l'anteprima segnala il problema e l'invio viene bloccato
finché la rimuovi o alleghi nuovamente la pagina. Il PDF originale resta intatto.

Gli snapshot vivono nella directory `qna-images` dell'archivio locale, con
metadati e SHA-256. La selezione e il salvataggio non avviano una richiesta AI.
L'invio della domanda include le immagini attive, quindi può consumare più quota
di una domanda di solo testo. Trasporto verificato con client sintetico; non è
stata eseguita una nuova prova live di accuratezza vision.

## Modello per le domande

Su richiesta successiva dell’utente, il Q&A prova prima **Gemini 3.5 Flash-Lite**,
poi 3.1 Flash-Lite, 3.7 Flash e le altre riserve (compreso il modello configurato).
La [scheda ufficiale](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
conferma il modello stabile a bassa latenza e il supporto delle immagini;
la velocità assoluta sulla lezione personale non è stata misurata di nuovo.

Se non arriva testo entro 20 secondi dall’inizio del tentativo, oppure la risposta
è vuota o il modello non è disponibile, prova il successivo con identica domanda,
storico, contesto e immagini. Gli stati della conversazione mostrano il modello
usato. Limiti di quota, attese e budget totale continuano a valere. Se lo stream
si interrompe dopo avere mostrato testo, viene segnalato e puoi riprovare; non
vengono unite automaticamente risposte diverse. Annullamenti e blocchi espliciti
del provider interrompono la richiesta. Il modello delle dispense non cambia.

## Frasi offline

Ctrl+T apre il campo unico del vocabolario. Una parola usa il dizionario;
più parole attivano Mozilla/Bergamot dopo 500 ms. Ogni apertura parte IT → EN,
invertibile per l'apertura corrente. Puoi continuare a scrivere: vengono
scartate risposte e bozze intermedie obsolete, con un solo lavoro locale attivo.

Download e verifica/riparazione dei modelli sono in **Impostazioni → Traduttore
offline**, con collegamento dal vocabolario quando mancano. La bozza viene
conservata durante la configurazione. Nessun download o fallback online automatico.

Fino a 2000 caratteri; formule, codice tra backtick e URL protetti. Le frasi
non sono salvate in una cronologia. Termini tecnici e qualità linguistica
restano soggetti ai limiti dei modelli.
[Guida completa](vocabolario-offline.md).

## Musica

Apri **Musica** dalla sidebar oppure dal pulsante ♫ in Focus. La sorgente e
la navigazione Spotify sono ricordate tra le aperture; la compilation e il
computer riusano le preferenze esistenti. Account e consensi sono nelle
Impostazioni; i pannelli quotidiani contengono contenuti e riproduzione.

Le compilation riportano i sei video e i 54 inizi di traccia già forniti. Clicca
una traccia per aprire YouTube nel browser al punto scelto. La riproduzione può
proseguire nel resto del video; non sono creati file audio. Per quattro video non
erano disponibili i capitoli: puoi inserirli da **Impostazioni → Musica**,
con **Modifica titoli e timestamp**.
Formato: una riga `00:00 Titolo`, oppure `1:00:00 Titolo`, in ordine crescente.
Le correzioni restano nel profilo locale del renderer, non modificano YouTube.
Gli ultimi brani non hanno una fine inventata. I titoli non latini sono conservati.

Per Spotify apri le impostazioni. Nel Developer Dashboard crea la tua app e
registra esattamente `http://127.0.0.1:43821/callback`; incolla il Client ID pubblico
e collegati dal browser. Nessuna password o Client Secret in Lezionify.
Per il pilota personale serve che l'account sia ammesso dalla tua app Spotify.

La schermata ora ha due viste, **Spotify** e **YouTube**, con copertine e schede
cliccabili. Spotify carica automaticamente brano e computer quando apri Musica;
ricorda la scelta esplicita del dispositivo e aggiorna il player mentre è visibile.
Trovi pausa/ripresa, precedente/successivo, posizione e volume. Aprire il pannello
non trasferisce l’audio da altri dispositivi; premendo play il PC scelto viene
attivato, se necessario. Se il programma Spotify non è aperto sul PC, usa Apri Spotify.

Per vedere playlist e brani preferiti, premi una volta **Attiva playlist e preferiti**
e approva il consenso aggiuntivo nel browser. Il Client ID e il collegamento
esistente restano validi; i controlli base funzionano anche senza questo consenso.
Copertine integre, schede cliccabili, paginazione di 20 elementi e link al client.
I dati della libreria non vengono archiviati o inviati all’AI. Il PC preferito resta
nel profilo locale. Errori di rete/quota fermano gli aggiornamenti fino a Riprova.

YouTube mostra miniature, selezione e pulsanti sulle tracce; apre nel browser al
punto scelto. Le correzioni dei timestamp e l’ultimo video scelto sono ricordati.
[Dettagli del nuovo flusso e collaudi](musica-ui-2026-10-15.md).

Documentazione ufficiale ricontrollata:
[PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow),
[Redirect URI](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri),
[stato riproduzione](https://developer.spotify.com/documentation/web-api/reference/get-information-about-the-users-current-playback).
Il codice è collaudato con API simulate e callback HTTP reale. Account, quota
personale, dispositivi e cuffie attendono il pilota dell'utente.

## ENG e Focus

Se hai abilitato l'elaborazione automatica all'importazione, la sequenza ora
comprende trascrizione, dispensa ITA e traduzione ENG. La preferenza resta
facoltativa. Le pipeline personali precedenti non sono state riavviate.

In Focus lo scorrimento esterno della schermata lezioni è bloccato; all'uscita
ritrovi la posizione precedente. Il contenuto della lezione continua a scorrere.

## Balance

Compromessi salvati. È disponibile soltanto il
[nucleo del prototipo](../../prototypes/balance-pause/README.md), con test di
allarme, minuto successivo, duplicati, errori e scena aptica finita. Il trasporto
dal PC al watch dopo una sola apertura della mini app richiede ancora ricerca
e prova hardware. Nessuna installazione, associazione o cambio companion eseguito.
