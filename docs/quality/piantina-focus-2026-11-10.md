# Duplicazione della piantina in Focus — 10 novembre 2026

La piantina apre la stima del tempo di studio. Nella barra Focus,
`StudyEstimateDetails` e `SectionRegenerator` usavano entrambi
`key={selectedLecture.id}` pur essendo fratelli. La collisione durante la
riconciliazione React lasciava copie della piantina nel DOM; i successivi
aggiornamenti della barra, incluso il timer ogni secondo, le accumulavano.

La correzione assegna alla stima una chiave `study-estimate:<id lezione>`,
distinta da quella della rigenerazione e stabile durante lo studio. Il cambio
di lezione continua a resettare lo stato del dettaglio. Nessuna dipendenza,
chiamata AI o modifica dei dati personali.

## Riproduzione e regressione

`node tools/run_hook_regressions.cjs --focus-pdf-only` usa il vero
`LectureDrawer` in Electron con lezione e PDF sintetici. Prima della correzione:

```text
FAIL: Error: Focus duplicated the estimate icon: 2 plants
```

Dopo la correzione il test passa. Il controllo richiede esattamente una
piantina dopo il caricamento e dopo ciascuno di 71 heartbeat simulati:
65 durante la lettura, tre con il dettaglio aperto e tre nel Q&A. Verifica
anche che il cronometro reale raggiunga 1:05, che pulsante e dettaglio non
vengano rimontati durante i tick e che lo smontaggio non lasci residui.
Restano coperti focus da tastiera, Escape, allegati PDF e assenza di invii AI.

Il precedente selettore dell'ultimo pulsante (`at(-1)`, D-0491) non controllava
l'unicità e poteva nascondere questa duplicazione. Ora il test conta tutti i
pulsanti prima di selezionare l'unico elemento atteso.

## Distribuzione

`npm run check` superato: typecheck, lint, 837 test unitari in 66 file,
24 test Python, 41 test Node, suite Electron completa con riavvio, build
di produzione ed export PDF reali IT/EN.

Sul pacchetto sono passati RAG con modello locale e inferenza senza rete,
worker PDF, rifiuto del modello corrotto e quattro regressioni WASM IT/EN.

Setup generale NSIS x64 rigenerato con `npm run package:win -- --publish never`:
299.990.784 byte, SHA256
`e04acd093f4d2227e2c4d1cfa5f989ef9f5f0452b456511e99222436562541bf`.
Verificati 378 file build identici al pacchetto, presenza della nuova chiave,
manifesto, tre backup e otto file estratti dal payload NSIS senza installarlo.
Il setup precedente è conservato con hash in
`local-artifacts/installer-backups/20261110-focus-estimate-key/`.
L'installer resta un artefatto locale ignorato da Git; per applicare la correzione
occorre chiudere Lezionify e installare il nuovo setup.
