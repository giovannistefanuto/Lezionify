# Mermaid nei PDF: confronto sul corso IR, 18 ottobre 2026

Decisione: D-0347.

Richiesta: esportare Intelligent Robotics in italiano con laboratori, ispezionare
come immagini le pagine 4, 7, 12, 20 e 23 e migliorare dimensioni e leggibilita.

## Metodo e risultati

Esportate tutte le 7 lezioni IR, di cui 3 contrassegnate Laboratorio, tramite
`PdfExportService` e renderer di produzione, con `includeLaboratory: true`.
Lettura diretta dei soli metadati e delle dispense italiane necessarie; nessuna
inizializzazione o sincronizzazione dell'archivio personale. Hash delle dispense
controllati prima e dopo ogni esportazione: originali invariati. Nessuna chiamata
AI o dipendenza aggiunta.

PDF iniziale di 104 pagine, definitivo di 99; 36 diagrammi in entrambi. Poppler
ha renderizzato le cinque pagine iniziali e le corrispondenti definitive,
ispezionate come PNG. Font misurati sul PDF effettivo con pdfplumber, altezza SVG
misurata nello stesso renderer prima della stampa:

| Pagina iniziale | Pagina definitiva | Font prima/dopo | Altezza SVG prima/dopo |
| --- | --- | --- | --- |
| 4 | 3 | 11,99 / 10,49 pt | 591,6 / 374,8 px |
| 7 | 7 | 11,99 / 10,49 pt | 306,0 / 204,0 px |
| 12 | 11 | 9,79 / 10,49 pt | 509,3 / 395,6 px |
| 20 | 20 | 5,72 / 10,49 pt | 68,8 / 299,4 px |
| 23 | 24 | 6,13 / 10,49 pt | 114,0 / 314,2 px |

I primi tre schemi riducono l'altezza rispettivamente del 37%, 33% e 22%.
Gli ultimi due crescono per rendere leggibili le etichette: la riduzione
indiscriminata avrebbe aggravato la loro situazione. Cinque flowchart su 36
usano una disposizione alternativa. Confrontata, per tutti gli SVG, la
molteplicita dei caratteri delle etichette escludendo gli spazi di impaginazione:
nessuna perdita. Non e una verifica semantica della dispensa, ne un benchmark
universale su tutti i tipi Mermaid.

PDF, SVG, misure, script diagnostici e immagini restano esclusivamente nella
cartella ignorata `local-artifacts/pdf-mermaid-review-2026-10-18/`. La libreria
personale non e copiata nei test o nei documenti versionati.

## Implementazione

- `MermaidPrintContext` attivo soltanto in `PdfExportDocument`: font base 14 px,
  spaziatura nodi 24 px, livelli 28 px, padding nodi 8 px, wrapping 180 px.
- Sequenze con font 14 px, messaggi e attori a capo e distanze ridotte.
- `src/utils/mermaidPrint.ts`: area prudente di 660 px per 230 mm su A4;
  scala massima senza ingrandimento e soglia indicativa di 8,5 pt.
- Se il flowchart eccede la soglia, prova la direzione perpendicolare e adotta
  l'SVG alternativo solo se la scala migliora di oltre 0,05. Cambia la sola
  direttiva iniziale, conservando testo, nodi, collegamenti e stili. Entrambi
  gli SVG passano la validazione; un errore opzionale conserva il primo valido.
- Sorgenti Markdown, audio, trascrizioni e profilo di lettura ordinario/Focus
  restano invariati. Il codice mostrato in caso di errore resta quello originale.

La soglia non promette caratteri minimi per grafi arbitrari: il profilo evita
le riduzioni inutili e sceglie il migliore dei due layout disponibili. Limiti
pagina e font di altri tipi Mermaid possono comunque richiedere adattamento.

## Collaudi

- Typecheck e lint mirato senza errori; build di produzione riuscita.
- 58 test Vitest pertinenti: sicurezza e rendering, selezione PDF e nuovo
  helper di disposizione. Le prove Vitest sono state eseguite fuori sandbox
  per il vincolo sui temporanei gia osservato nella sessione precedente.
- Scenario React/Electron `--reading-position-only` passato: lettura,
  posizione e Mermaid a scomparsa in Focus conservati.
- `npm run test:pdf-export` passato: corso IT/EN con laboratorio escluso/incluso,
  lezione singola, tre proporzioni SVG, fallback integrale, formule e riquadri,
  annullamento e protezione di output precedenti. Nuovo caso con catena larga,
  ramificazione larga e sequenza lunga; PDF.js verifica etichette presenti e
  caratteri di almeno 8,5 pt nel PDF reale sintetico.
- La prima build e l'avvio Electron sono stati bloccati dalla sandbox e poi
  eseguiti con autorizzazione. Nel nuovo test PDF.js e stata corretta la chiusura
  tramite il loading task, poi l'intero collaudo PDF e passato.

Nessun installer rigenerato, installazione, pubblicazione, commit o push.
