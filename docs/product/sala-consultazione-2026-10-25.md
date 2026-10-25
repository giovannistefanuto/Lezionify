# Sala di consultazione: nuovo ingresso al corso

Decisione D-0413, 25 ottobre 2026.

## Perimetro scelto

L'utente ha scelto **solo la proposta 1, schermata iniziale pulita**. Le due
proposte di riorganizzazione dei risultati non sono implementate. La consultazione
parte dal materiale del corso, con Gemini come strumento di riordino e senza
presentare l'ingresso come un assistente generalista.

## Uso

- La voce **Consulta** della sidebar apre la Sala di consultazione.
- I pulsanti dei corsi mostrano codice e nome reali; la selezione evidenzia il
  corso e conserva separatamente le bozze. Non contiene l'espansione errata di
  IR presente nel mock generato: i nomi vengono dal catalogo locale.
- La nuova ricerca mostra titolo del corso, campo domanda ed esempi modificabili.
  Gli esempi compilano e focalizzano il campo, senza inviare richieste.
- **Consulta il corso** invia esplicitamente domanda ed estratti pertinenti a
  Gemini. Rimangono annullamento, recupero errori, allegati PDF e relativa
  informativa. Il campo resta disabilitato durante il caricamento del corso.
- **Ricerche recenti** apre lo storico; **Materiali del corso** apre fonti,
  copertura, PDF, sincronizzazione e strumenti locali. Questi ultimi non
  occupano la schermata iniziale. Assenza di materiali ed errori dell'indice
  hanno un avviso contestuale.
- Al caricamento del corso si riusa l'ultima ricerca vuota; se lo storico
  contiene soltanto ricerche con messaggi se ne crea una vuota, senza cancellare
  le precedenti. Riaprire il pannello conserva la ricerca corrente e la bozza.
- Dopo l'invio il layout dei risultati resta quello esistente. **Nuova ricerca**
  torna all'ingresso pulito. Le citazioni e i conteggi restano disponibili.

Nessuna nuova dipendenza, modifica al prompt, filtro delle domande o chiamata AI
automatica. L'interfaccia orienta alla consultazione, ma non introduce un divieto
software di risolvere esercizi. Una simile politica richiede una scelta distinta.

## Verifiche

Scenari React nel runtime Electron, su dati sintetici e profilo temporaneo:
ingresso pulito, esempi senza invio, accesso allo storico e ai materiali,
cambio corso con bozze isolate, riapertura, allegati PDF e invio esplicito,
citazioni aggiornate, conteggi, annullamento e recupero. Lo scenario storico
del 22 ottobre apre ora esplicitamente la ricerca precedente e ne conserva
le venti risposte.

Controllo visivo chiaro/scuro a 1440 × 960, finestra bassa 900 × 640 e
componente a 390 × 844. La distribuzione desktop conserva il proprio limite
di larghezza esistente; la prova stretta non introduce supporto mobile.
Schermate e confronto col riferimento sono in
`local-artifacts/consultation-start-2026-10-25/`, esclusi da Git.
Il rapporto di confronto è in `design-qa.md`.

I test non effettuano nuovi invii AI reali. Non viene dichiarata una nuova
validazione della qualità delle risposte RAG; restano i limiti delle voci 90–92.

Suite completa `npm run check` superata: typecheck, lint, 739 test Vitest in
56 file, 24 Python, 41 Node, scenari React/Electron e riavvio, build e PDF reali.
Ripetuti typecheck, lint e scenario RAG dopo l'ultima protezione dei comandi
durante l'invio. Gate pubblico offline `npm run test:rag-retrieval` superato.

## Distribuzione

Installer precedente conservato in
`local-artifacts/installer-backups/20261025-consultation-start/`, insieme a
manifesto e blockmap. Setup generale rigenerato con
`npm run package:win -- --publish never`:

- `dist/Lezionify-Setup-0.1.0.exe`, **294.217.195 byte**.
- SHA256: `4cd7fb9dd8ed4efd51f6d6761c75564bb73e14b224a1fd1984f4d82bfe28aad2`.
- ASAR: `f6456d6cb668563ef11ce9726a2fbb33fdeb754b1bbee630db99299adeeb9aed`.

Verificati 372 file build, i marcatori della nuova schermata, assenza di artefatti
privati, manifesto SHA512, blockmap e tre file backup. Gli otto componenti critici
estratti dal payload NSIS sono identici al runtime verificato. Nessun installer
eseguito; nessuna release binaria pubblicata.

Il RAG nel nuovo eseguibile passa modello assente, inferenza senza rete con
fixture pubblica locale, cache fredda/calda, recupero vettori corrotti,
ripristino, migrazione citazioni e worker PDF. Superato anche il rifiuto di un
modello corrotto. Nessun nuovo download del modello: quello pubblico era già
disponibile nella fixture locale. Report in
`local-artifacts/rag-package-2026-10-23/` con le impronte del pacchetto attuale;
log di questa rigenerazione in `local-artifacts/consultation-start-2026-10-25/`.

Commit e push includono anche le modifiche documentali pubblicabili già presenti
su workflow Git e roadmap di distribuzione, come richiesto. Gli artefatti ignorati
restano locali. Chiudere Lezionify prima di avviare il nuovo setup.
