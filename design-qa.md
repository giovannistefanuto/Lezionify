# Verifica visiva: Sala di consultazione

Data: 25 ottobre 2026. Perimetro: proposta 1, solo nuovo ingresso.

## Riferimenti

- Sorgente: immagine generata scelta dall'utente,
  `C:/Users/Utente/.codex/generated_images/01a1737f-6f93-7641-939a-3d943f660b24/exec-fc13642c-0d05-4352-beaf-78a7c570bdc4.png`.
- Implementazione: `local-artifacts/consultation-start-2026-10-25/oct22-consultation-start.png`.
- Confronto nello stesso input: `local-artifacts/consultation-start-2026-10-25/reference-comparison.jpg`.
- Varianti ispezionate: `oct22-consultation-dark.png`,
  `oct22-consultation-low.png`, `oct22-consultation-narrow.png` nella stessa cartella.

## Esito del confronto

Nessuna difformità P0/P1/P2 aperta nel perimetro scelto.

- **Tipografia:** famiglia Inter con fallback del prodotto, titolo e testo
  di interfaccia con gerarchia coerente. Corpo del campo 16 px, etichetta 18 px.
- **Spazi e composizione:** colonna centrale, corsi sopra il titolo, domanda
  sotto la separazione, esempi a sinistra e invio a destra. Niente storico,
  risultati, conteggi o indice permanentemente esposti all'ingresso.
- **Colori:** token esistenti di Lezionify, verde primario e superfici chiare;
  scuro verificato con gli stessi token. Pulsante disabilitato a campo vuoto:
  differenza attesa dal mock, che mostrava l'azione attiva.
- **Asset:** marchio L già presente nel prodotto. Nessun nuovo asset generato
  o raster della schermata usato come interfaccia. Azioni testuali al posto
  delle icone decorative del mock: adattamento deliberato senza dipendenze.
- **Testi:** nomi dal catalogo, esempi generici invece di riferimenti a lezioni
  non presenti in tutti i corsi. Correzione dell'espansione IR del mock.
  Informativa di invio esplicito conservata; pulsante Chiudi mantenuto.
- **Adattamento:** azione raggiungibile nella finestra bassa, scorrimento
  verticale per il contenuto residuo; nessun overflow orizzontale del campo
  nella prova stretta. Layout risultati non riprogettato.

## Interazioni verificate

Esempi modificabili e senza invio, focus sul campo, storico su richiesta,
materiali, selezione del corso e bozze isolate, ritorno alla ricerca,
allegati e annullamento. Verifiche semantiche nell'harness React/Electron,
con catture native del renderer e dati sintetici.

## Limiti e rifiniture

- Nessuna certificazione WCAG o prova completa con screen reader.
- Il mock ha tre corsi; la fixture ne ha due per verificare la composizione
  dinamica senza simulare il catalogo personale.
- [P3] Un'eventuale libreria di icone condivisa potrà arricchire le azioni,
  previa scelta di dipendenza distinta.

final result: passed
