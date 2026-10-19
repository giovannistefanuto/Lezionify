# Ultima lezione: ritorno alla lista — 16 ottobre 2026

Posizione 15 di LISTA_ORDINE, voce prodotto 27.

## Comportamento

Quando il salvataggio di una nuova marcatura «Completata» riesce e nel corso
non restano altre lezioni da studiare, appare «Ultima lezione · Ritorno a
Tutte le lezioni…». Dopo 2 secondi si chiude la lettura e si torna all'archivio
con corso e stato su Tutti, ricerca svuotata e scheda informativa del corso
chiusa. Il controllo considera l'intero archivio del corso, anche lezioni
precedenti a quella corrente, indipendentemente dai filtri della lista.

Vale sia nella vista ordinaria sia in Focus. Il ritorno automatico smonta il
drawer, esce dal fullscreen e salva il tempo di studio attraverso il ciclo di
vita esistente; non apre il Focus Lock di 15 secondi. Nei 2 secondi dell'avviso
il conteggio dello studio è fermo.

Un errore di salvataggio mantiene aperta la lezione e il messaggio di errore
esistente. La riapertura di una lezione già completata permette di leggerla:
il solo stato persistito non fa partire un ritorno automatico. Cambio lezione,
smontaggio o annullamento del completamento cancellano il timer; una risposta
tardiva riferita alla selezione precedente non può chiudere la nuova lezione.
Le lezioni senza corso assegnato mantengono la lettura ordinaria.

Se esistono altre lezioni da studiare nel corso, resta il flusso di avanzamento
esistente. Il pulsante completa/avanza ora attende il salvataggio riuscito e
non apre una lezione successiva già completata quando quella corrente esaurisce
il lavoro del corso. Le uscite manuali normali da Focus mantengono il Focus Lock.

## Verifiche

- Scenario React in Electron `runFinalLectureScenario`, anche in StrictMode:
  salvataggio pendente e fallito, corso con una sola lezione, 1999/2000 ms,
  callback aggiornata senza riavviare il timer, richieste duplicate, lezioni
  precedenti non completate, successive completate, altri corsi, riapertura,
  cambio stato/selezione, smontaggio e risposta tardiva.
- Scenario drawer: avviso ordinario e Focus, nessun avanzamento verso una
  successiva già completata, uscita fullscreen senza Focus Lock e salvataggio
  della sessione senza duplicati.
- `--study-pause-only` include il nuovo scenario e le regressioni del timer pausa.
- Suite Electron completa con riavvio passata, 513 test Vitest passati,
  typecheck, lint mirato senza avvisi e build di produzione passati.

I dati e le risposte dell'archivio sono sintetici. Nessuna chiamata AI,
dipendenza aggiunta o operazione sulla libreria personale. Installer non
ricostruito.
