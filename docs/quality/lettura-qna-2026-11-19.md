# Lettura dispense e Q&A — 19 novembre 2026

Implementate le voci 158, 159, 161, 162 e 164 nella 0.3.1 (D-0581/D-0582).
La 161 riguarda il **tempo rimanente della dispensa**, come chiarito dall'utente.

## Comportamento

- `useStudyPreview` interroga il modello dei paragrafi in sola lettura sulla colonna che scorre davvero, usando il contenitore esterno solo quando necessario. Il pannello della stima è disponibile anche nella vista ordinaria: niente nuovi secondi, campioni o previsioni storiche. Senza dati sufficienti la stima lo dichiara.
- Il Q&A riserva più altezza ai messaggi. Le opzioni stanno in un gruppo richiudibile, chiuso all'invio; contesto e slide attive scorrono insieme alla conversazione. Ogni domanda mostra le sue slide storiche, anche se rimosse dagli invii successivi.
- «Allega slide» ripristina il PDF nascosto e la selezione. A 900 pixel la spiegazione cede temporaneamente il posto al PDF: ritorno esplicito e automatico dopo un allegato riuscito, senza perdere la bozza o inviare domande AI.
- La policy condivisa determina modello/Think previsti; il main restituisce modello effettivo e configurazione del ragionamento. Il renderer li conserva sulle nuove risposte. I campi sono facoltativi, validati e visualizzati come testo; nessuna attribuzione retroattiva alle risposte precedenti.
- `InlineMathTitle` rende solo le formule del titolo con KaTeX, senza abilitare HTML o collegamenti non fidati. Titoli in elenco, vista ordinaria e Full Focus condividono il rendering. Il testo salvato resta invariato.
- Ctrl+rotella, tastiera e pulsanti della dispensa Full Focus usano passi del 5%; il valore è arrotondato e limitato a 50–400%. PDF e Q&A mantengono controlli indipendenti.

## Verifiche

Riprodotto prima della correzione il mancato rendering della formula nel titolo con il runner `--focus-pdf-only`. La regressione passa ora anche con tempo rimanente fuori Full Focus, scorrimento della colonna, zoom 105%, PDF nascosto e selezione a 900 pixel. La bozza viene preservata e non si chiama l'AI durante la preparazione delle slide.

Il vecchio test degli allegati contava tutte le miniature come se rappresentassero solo gli invii futuri. È stato aggiornato per verificare distintamente un allegato attivo e cinque miniature nelle domande storiche dopo il rimontaggio; verifica anche persistenza e visualizzazione del modello di fallback e di HIGH. Nessuna asserzione sulla conservazione dei dati è stata eliminata.

`npm run release:local`, profilo **full**, completato su sorgenti invariati:

- inventario, typecheck e lint;
- 954 test unitari in 83 file, 49 Python, 41 Node e gate del recupero locale;
- updater e regressioni React/Electron, compreso il riavvio completo;
- raccolte con archiviazione reale e conversione media, app compilata e due processi;
- Sessione compilata con IPC, worker, riavvio e Full Focus;
- esportazione PDF reale IT/EN e formule;
- build unica riusata nel packaging, manifesto e note coerenti, 384 file build e nove file NSIS confrontati;
- tre asset del backup verificati e assenza di artefatti privati nel pacchetto.

Rapporto completo ignorato: `local-artifacts/release-20261119-123902/report.json`.
Screenshot sintetici locali: `local-artifacts/reading-2026-11-19/`.

## Voce 131 e limiti

Nessun gruppo dello storico prospettico raggiunge le 20 lezioni confrontabili per lingua, metodo e fase. La calibrazione personale resta aperta: non si abbassano le soglie e non si trasformano i soli totali dello studio in esiti prospettici.

Nessuna nuova prova di qualità o consumi Gemini reali: i contratti AI sono verificati con risposte sintetiche. Installer `NotSigned`, verificato senza eseguirlo sul profilo personale. Upgrade Windows reale, UAC e SmartScreen restano fuori dai collaudi. Vedere anche le [note 0.3.1](../releases/0.3.1.md).
