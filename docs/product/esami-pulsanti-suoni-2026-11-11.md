# Esami, pulsanti, Musica e suoni — 11 novembre 2026

Richiesta diretta sulle posizioni 78, 79, 81 e 82 della coda (voci 132, 133,
135 e 136). Timebox assoluto: ore 17:45 Europe/Rome. La voce 134 non è inclusa.

## Implementazione

- **Scatola esami:** ingresso dedicato nella Sala di consultazione, selezione
  nativa dei PDF, copia locale per corso con nome basato sull'hash, verifica
  firma/dimensione e deduplicazione. I file originali restano intatti e la copia
  continua a funzionare se l'originale viene spostato. Indicizzazione PDF,
  copertura parziale, citazioni/pagine e ricerca usano il RAG esistente.
  Rimuovere un esame lo esclude dalle fonti, conservando i file. La mancata
  corrispondenza non dimostra che il professore non abbia mai chiesto un tema.
- **Pulsanti:** gestione corsi resa coerente nella sidebar; azioni di studio
  raggruppate nel cruscotto; dimensioni, focus e controlli dei materiali RAG
  uniformati. Il testo sui pulsanti primari usa un colore distinto nei due
  temi per evitare bianco sul verde luminoso del tema scuro. La revisione
  riguarda le famiglie di controlli condivise e i flussi verificati, senza
  modificare il layout della lettura Focus.
- **Musica:** accesso in evidenza sopra la ricerca della sidebar e nel
  cruscotto, con testo e icona riconoscibili. La barra ridotta mantiene
  l'accesso dedicato e il ritorno del focus dal dialogo.
- **Suoni:** quattro scelte aggiuntive, catalogo da 16 a 20: Onde avvolgenti
  (variante livellata della registrazione esistente), Motore della barca,
  Viaggio in treno e Brusio del caffè. Gli ultimi tre sono nuove registrazioni;
  sono raggruppati in Ambienti avvolgenti. Ordine e file dei sedici suoni
  precedenti restano conservati. Download espliciti con hash/dimensione.

Il livellamento opera solo sui nuovi profili dopo la decodifica, prima della
cache Web Audio: finestre di due secondi, guadagno massimo 4, raccordo ciclico
e limitazione morbida dei picchi. File scaricati e volume scelto restano
indipendenti; non viene modificato l'audio originale.

## Provenienza audio e misure

Commit Blanket già utilizzato: `775f2a767230a9681850d1b1e085be58656f1382`.
[Licenze e autori](https://github.com/rafaelmardojai/blanket/blob/775f2a767230a9681850d1b1e085be58656f1382/SOUNDS_LICENSING.md).
Boat: Falcet, CC0; Train: SDLx, CC BY 3.0; Coffee Shop: stephan, Public Domain.
La variante onde conserva attribuzione e licenza della voce waves esistente.
L'intervento di Lezionify sul volume è indicato nelle attribuzioni in app.

Decodifica FFmpeg reale e stesso algoritmo del renderer, mono 16 kHz:

| Profilo | Durata | RMS prima / dopo | Picco dopo |
| --- | ---: | ---: | ---: |
| Onde | 118,03 s | 0,039 / 0,110 | 0,815 |
| Barca | 41,56 s | 0,026 / 0,096 | 0,799 |
| Treno | 7,24 s | 0,018 / 0,071 | 0,577 |
| Caffè | 16,66 s | 0,077 / 0,121 | 0,631 |

Le variazioni naturali non sono azzerate: non si promette volume piatto.
Hash dei quattro file e licenze sono nel catalogo; analisi e file di controllo
in `local-artifacts/four-items-2026-11-11/`, ignorato da Git.

## Verifiche e avanzamento

- 859 unit, 24 Python e 41 Node passati; typecheck, lint, build e PDF reali
  passati prima del pacchetto.
- Electron mirato: scatola esami, importazione/rimozione senza AI, citazioni,
  isolamento corsi, sidebar lunga/ridotta e suoni Web Audio passati.
- Prima suite Electron completa: limite di 180 s raggiunto durante Musica.
  Lo scenario musicale isolato è passato; una successiva suite ha rilevato
  due aspettative ferme a 16 schede, aggiornate a 20. Il runner consente un
  limite esplicito fino a 300 s; il default resta 180 s.
- Screenshot di controllo: sidebar, cruscotto, Materiali/Scatola, temi e
  finestre ridotte nella cartella diagnostica. I dati sono sintetici.

Stato della suite finale, del timebox e dell'eventuale installer da registrare
solo dopo i rispettivi esiti. Non considerare il presente documento una
conferma anticipata di stabilità o di distribuzione.


**Esito alle 17:41:** suite Electron completa e riavvio passati; QA finale su scatola stretta/scura e pulsante Casuale passata, build finale riuscita. Le quattro voci sono concluse. Avviata la preparazione del setup; distribuzione non ancora verificata.


## Distribuzione finale — proroga alle 17:55

Stop originario rispettato: il confezionamento precedente era stato interrotto e il setup originale conservato identico. Su richiesta esplicita successiva, lavoro ripreso con scadenza 17:55. Verificati i 378 file del pacchetto intermedio, poi rigenerato NSIS. Il primo candidato riusava un archivio cache incompleto del processo interrotto (setup di circa 7 MB): rifiutato dal verificatore e conservato solo negli artefatti ignorati. La rigenerazione senza quell archivio supera tutti i controlli.

Setup finale: 299995415 byte; SHA256 `62f84dc4f91ed16d382272544c5d075e5d9af70c6d840a51739b80ee9d6ccb52`. Verificati 378 file della build, otto componenti incorporati NSIS, manifesto SHA512/blockmap e tre backup. Passati runtime RAG offline e PDF, rifiuto modello corrotto, preparazione esplicita del modello pubblico e traduttore WASM EN/IT del pacchetto. Installer non eseguito e nessuna installazione automatica.

Sono inclusi anche i sorgenti ENG D-0500; il limite del collaudo linguistico completo e gli errori del provider restano documentati nella relativa voce aperta. Commit/push automatici secondo AGENTS.md; verificare il riferimento remoto prima di dichiarare la pubblicazione conclusa.
