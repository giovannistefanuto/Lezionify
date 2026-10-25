# Interventi del 20 ottobre 2026

## Perimetro e scelte confermate

Richiesta diretta di implementare insieme le voci **44–51**, posizioni
**30–37** della coda; D-0374/D-0375 raccolgono le idee, D-0376 registra
l'approvazione e le precisazioni. L'ordine delle altre attività resta invariato.

- **Q&A:** separatore trascinabile nelle viste ordinaria e Focus con larghezza
  locale persistente per vista. Zoom indipendente dei messaggi da 80% a 200%,
  pulsanti −/percentuale/+ e Ctrl+rotella; clic sulla percentuale ripristina 100%.
- **Memo:** doppio clic sul testo o F2/Invio per modificarlo; Invio salva, Esc
  annulla la sola modifica, uscita dal campo salva. Il testo vuoto non cancella
  l'attività. Identità, gruppo e completamento restano conservati.
- **Altri Q&A:** opzione esplicita inizialmente disattivata. Il main legge solo
  le discussioni della lezione richiesta, esclude quella corrente e gli scambi
  incompleti, seleziona localmente per sovrapposizione lessicale e titolo,
  massimo cinque discussioni e 12.000 caratteri di estratti. Le risposte AI
  sono etichettate come derivazioni potenzialmente errate, distinte dalle fonti.
  Lo storico della conversazione corrente continua a essere incluso.
- **Contesto completo:** rimane disattivato inizialmente, scelto prima di
  premere Invia. Il prompt chiede di usare e segnalare i paragrafi successivi
  solo quando l'intera lezione è disponibile, senza inventare distanze.
- **Batteria:** piccola emoji 🪫 fissa in basso a destra, anche in fullscreen,
  solo con carica valida strettamente sotto il 20% e alimentazione a batteria.
  Si nasconde collegando l'alimentatore o sopra soglia; tooltip con percentuale.
  Lettura Windows locale, controllo ogni 30 secondi e al ritorno nell'app;
  nessun suono, toast ripetuto o telemetria. Lettura assente/non valida: nascosta.
- **Riapertura Q&A:** pulsante con conteggio nella lezione e Focus; riprende
  l'ultima discussione consultata ancora esistente, altrimenti l'ultima salvata.
  Senza discussioni mostra uno stato vuoto. Aprire non avvia chiamate AI.
- **Suoni:** dieci nuove registrazioni, totale 16 (3 rumori e 13 paesaggi).
  Scarica individuale diventa Ascolta dopo verifica; Scaricali tutti conserva
  gli integri e ripara mancanti/corrotti. Stato di download e errori per suono;
  un errore non impedisce di provare gli altri. Nessun avvio automatico.
- **Mermaid:** il validatore degli stili non accettava il `;` terminale valido,
  già gestito da `classDef`. Riproduzione sul diagramma fornito e sul minimo
  `flowchart TD`, `A-->B`, `style A stroke-width:2px;`. Rimosso soltanto il
  terminatore ai fini della validazione; il sorgente rimane intatto e
  direttive concatenate restano rifiutate. Nessuna disattivazione della sicurezza.

## Nuovi suoni e provenienza

File distribuiti su richiesta esplicita, fuori dal setup e dal repository
applicativo. I sei suoni precedenti conservano URL e hash. Nuovi URL immutabili,
dimensioni e SHA-256 in `shared/ambientSounds.ts`; nessuna nuova dipendenza.
Le registrazioni provengono da:

- [Blanket, licenze per singolo suono](https://github.com/rafaelmardojai/blanket/blob/775f2a767230a9681850d1b1e085be58656f1382/SOUNDS_LICENSING.md),
  revisione `775f2a767230a9681850d1b1e085be58656f1382`.
- [AmbientSounds, autori e licenze](https://github.com/Muges/ambientsounds/blob/7ef9aefeeed93c37bca3cdb246a982dd1afce2f0/readme.md),
  revisione `7ef9aefeeed93c37bca3cdb246a982dd1afce2f0`.

Le fonti Freesound consultate riportano Attribution 4.0 per Storm, Heavy Rain,
Stream e Thunderstorm; per i suoni SoundBible è dichiarato Public Domain.
I crediti includono gli adattamenti/loop degli archivi di distribuzione.

| Suono | Autore | Licenza | Fonte | Byte |
| --- | --- | --- | --- | --- |
| Canto degli uccelli | kvgarlic | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Origine](https://freesound.org/people/kvgarlic/sounds/156826/) | 3063230 |
| Fuoco scoppiettante | ezwa | [Public Domain](https://soundbible.com/1543-Fireplace.html) | [Origine](https://soundbible.com/1543-Fireplace.html) | 325065 |
| Temporale | digifishmusic | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Origine](https://freesound.org/people/digifishmusic/sounds/41739/) | 486147 |
| Notte estiva con grilli | Lisa Redfern | [Public Domain](https://soundbible.com/2083-Crickets-Chirping-At-Night.html) | [Origine](https://soundbible.com/2083-Crickets-Chirping-At-Night.html) | 612962 |
| Vento nella natura | felix.blume | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Origine](https://freesound.org/people/felix.blume/sounds/217506/) | 289537 |
| Brezza all’aperto | felix.blume | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Origine](https://freesound.org/people/felix.blume/sounds/139337/) | 3200466 |
| Pioggia intensa | DWOBoyle (D W) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Origine](https://freesound.org/people/DWOBoyle/sounds/136971/) | 1027707 |
| Ruscello gorgogliante | mystiscool | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Origine](https://freesound.org/people/mystiscool/sounds/7138/) | 1777247 |
| Pioggia e tuoni | RHumphries | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Origine](https://freesound.org/people/RHumphries/sounds/2523/) | 4167282 |
| Focolare naturale | inchadney | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Origine](https://freesound.org/people/inchadney/sounds/132534/) | 2292050 |

Le registrazioni sono alternative sonore, anche per vento, fuoco e acqua:
non vengono presentate come dieci categorie acustiche differenti.
Nuovi download: 17241693 byte. I file di collaudo pubblico e il report di decodifica
restano in `local-artifacts/today-sounds/`, ignorato da Git.

## Verifiche e consegna

Stato: tutte le otto voci implementate e collaudate (D-0379); setup generato e verificato (D-0380).

- Regressione Mermaid osservata fallire prima della modifica e passare dopo;
  controlli su stili concatenati e fonte originale conservata.
- Scenari React/Electron dedicati a zoom, consenso contesto, persistenza,
  Memo Invio/Esc/focusout, batteria, download singolo/collettivo, riapertura
  senza AI e diagramma con sei nodi. Audio pubblici decodificati con Web Audio.
- Regressioni deterministiche su selezione storico e limiti, soglia batteria,
  IPC di opt-in, prompt, download parziale, errori, riparazione e riuso file.
- Il caso completo Mermaid è incluso anche nell'esportazione PDF reale.

Collaudi con contenuti sintetici e file audio pubblici. Nessuna nuova richiesta
Gemini reale, nessuna modifica alle fonti personali. La qualità linguistica
rimane dipendente dal modello; la selezione degli altri Q&A è lessicale e non
un nuovo motore RAG. L'indicatore batteria è verificato con stati simulati;
il comportamento hardware va osservato sul portatile durante la scarica.

Installer richiesto con backup, senza pubblicazione o installazione automatica.

Il controllo completo ha superato typecheck, lint, 634 Vitest in 46 file,
24 regressioni Python, 41 Node, scenari Electron e riavvio del profilo.
La verifica PDF aggiuntiva è passata dopo aver corretto l'asserzione del
launcher per le etichette SVG spezzate e le lezioni senza dispensa.
Downloader reale: dieci richieste al primo passaggio, zero al secondo, dieci
letture con hash riuscite (`local-artifacts/today-download-test/verification.json`).
Revisione Standards: nessun finding; Spec: un problema di memoria al cambio
lezione corretto e coperto da scenario di navigazione dedicato.


### Revisione Standards

Nessun difetto concreto rilevato rispetto ad AGENTS.md e CONTRIBUTING.md.
Invii AI espliciti, contesto completo indipendente, risposte precedenti
separate dalle fonti, download con integrità e nessuna dipendenza aggiunta.

### Revisione Spec

Un finding sulla memoria dell'ultima discussione passando da una lezione
all'altra è stato corretto: la preferenza ora si salva nel setter esplicito
associato alla lezione, non nell'effetto del drawer. Lo scenario con due
conversazioni in B e navigazione A → B distingue la discussione ricordata
dall'ultima nell'array. Correzione ricontrollata dal revisore e scenario passato.
Nessun altro requisito mancante rilevato. Revisioni in sola lettura;
i collaudi effettivi sono quelli descritti sopra.

La diagnosi Mermaid è confermata anche dal replay del validatore precedente:
rimuovere metadati o salto di riga dell'etichetta non elimina il rifiuto;
rimuovere i soli terminatori degli stili lo elimina. Il caso minimo con
`stroke-width:2px;` fallisce sul precedente validatore, senza `;` passa.
Report sintetico: `local-artifacts/today-mermaid-diagnosis.json`.


## Setup verificato — D-0380

Pacchetto NSIS x64 0.1.0 in `dist/Lezionify-Setup-0.1.0.exe`.
Chiudere Lezionify e avviare il setup. Nessuna installazione automatica,
commit o pubblicazione applicativa eseguiti da questo intervento.

- Dimensione: 190811192 byte.
- SHA-256: `5fee5297d8acd3b4b91559f197b854e4e15801f30f5f879dab4d02c203dde5b1`.
- Tutti 370 file della build corrispondono ai file nel pacchetto ASAR.
- Presenti FFmpeg e runtime traduzione offline; manifesto SHA-512, dimensione,
  blockmap e assenza di artefatti privati verificati.
- Backup del setup precedente, blockmap e manifesto in
  `local-artifacts/installer-backups/20261020-qna-memo-suoni/`, con report
  `verification.json`. Il vecchio setup ha SHA-256
  `ca9a78bd36883247fa5078a9bf6f0180ace6006e30fc912c9bc539fae34016b8`.

I dieci nuovi audio si scaricano dall'app; non sono incorporati nel setup.
