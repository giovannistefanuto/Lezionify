# Memo, log, PDF e transizioni — 19 ottobre 2026

Richiesta diretta dell'utente: implementare le prime cinque attività della
classifica per facilità. Corrispondono alle voci 41, 39, 42, 40 e 38 delle
[idee future](idee-future-2026-10-13.md), non alle prime cinque posizioni storiche
di LISTA_ORDINE. Non sono stati avviati timer o acquisizione dal telefono.
Decisioni: D-0367, D-0368, D-0369, D-0370 in `DECISIONI.md`.

## Funzioni disponibili

- **Anteprima attività Memo (41, completata):** dopo un secondo di puntatore
  fermo sul testo compare il contenuto completo. Ogni movimento riavvia l'attesa
  e nasconde l'anteprima. Uscita, pressione, digitazione, scroll esterno, resize,
  perdita di focus e chiusura annullano la visualizzazione. Per testi molto lunghi
  si può usare la rotella senza muovere il puntatore sul testo dell'attività.
- **Grafica Memo (39, completata):** intestazione, conteggio delle attività aperte,
  gruppi selezionabili, comandi coerenti, stati vuoti e colonne adattabili alla
  finestra. Note, modifica del testo, trasferimenti, copia, scorciatoie e dati
  storici usano lo stesso modello e gli stessi salvataggi locali.
- **Log per giorno (42, completata):** prima oggi; al fondo un precedente giorno
  con eventi alla volta. Un pulsante permette lo stesso caricamento se la lista
  non riempie la finestra o i filtri non mostrano risultati. Giorni vuoti saltati;
  filtri e conteggi riguardano i giorni caricati. Aggiornamento di oggi ogni due
  secondi senza perdere le pagine precedenti, con deduplicazione e messaggi di
  errore recuperabili. Ogni evento mostra anche la data.
- **Esporta PDF (40, completata):** unico ingresso **Esporta** nell'archivio,
  nella lezione e in Focus. La modale offre Lezione e Corso con Indietro.
  Lezione elenca tutte le lezioni e apre il salvataggio sulla lingua scelta;
  la lingua senza dispensa è disabilitata. Corso elenca anche i corsi archiviati,
  mostra tutte le lezioni inizialmente selezionate, laboratori inclusi, permette
  modifiche individuali e selezioni collettive. Una selezione vuota è disabilitata.
  Annullare Salva con nome conserva le scelte. Titoli IT/EN, ordine cronologico,
  formule, Mermaid e pagine Note restano gestiti dal renderer esistente.
- **Dissolvenze locali (38, parziale):** passaggi tra suoni offline con durata
  iniziale di **1 secondo**, scelta dall'utente; opzioni persistenti 1, 2, 4 secondi
  nel pannello Suoni. Gli inviluppi mantengono la somma dei guadagni al massimo a
  uno anche con cambi rapidi. Pausa e audio della lezione fermano tutte le voci;
  caricamenti superati non possono riavviare un suono. L'errore nel caricare un
  nuovo suono lascia utilizzabile quello precedente.

Nomi PDF proposti, con data locale `YYYY-MM-DD`, spazi trasformati in underscore
e caratteri Windows non validi sostituiti:

```text
Lezione_<Titolo>_<IT/EN>_<Data_Lezione>.pdf
Corso_<Sigla>_<IT/EN>_<Data_Esportazione>.pdf
```

Se mancano alcune dispense, il PDF le segnala; se mancano tutte, l'esportazione
si interrompe. Non viene generato o tradotto alcun testo per esportare.
Il main valida gli ID selezionati, rifiutando duplicati, lezioni rimosse o di
altri corsi prima di leggere le dispense. I vecchi chiamanti IPC che utilizzano
`includeLaboratory` restano compatibili; la nuova UI usa `lectureIds` espliciti.

## Limiti delle transizioni musicali

La voce 38 resta aperta per canzone → canzone e canzone → suono.
La [Developer Policy di Spotify](https://developer.spotify.com/policy) vieta alle
integrazioni segue, mix e sovrapposizioni dei contenuti Spotify con altro audio,
anche altri contenuti Spotify. L'[endpoint del volume](https://developer.spotify.com/documentation/web-api/reference/set-volume-for-users-playback)
non espone una configurazione crossfade; la [guida Spotify alle transizioni](https://support.spotify.com/us/article/tracks-transitions/)
precisa inoltre i limiti durante l'uso di Connect. Verifica documentale del
19 ottobre 2026, senza richieste ad account personali.

YouTube viene aperto nel browser esterno dal codice esistente: l'app non dispone
del suo player né del volume. Cambiare la scheda delle sorgenti non certifica che
il player esterno sia fermo. Per passare ai suoni occorre interrompere prima la
musica nel suo player. I pannelli Suoni e Impostazioni Spotify chiariscono i limiti.
Non sono state aggiunte chiamate per simulare dissolvenze Spotify, né un'altra
sorgente musicale locale. Un ulteriore percorso richiede una scelta di prodotto
compatibile con i player disponibili. L'ascolto personale delle durate resta
da valutare; il valore è modificabile e non è dichiarato ottimale all'ascolto.

## Implementazione e conservazione dei dati

`MemoActivityPreview` incapsula attesa, cancellazione, posizione e scorrimento.
`PdfExportDialog` è condiviso dagli ingressi esistenti ed è portato anche nel
contenitore fullscreen. `AmbientLoopPlayer` centralizza sorgenti, guadagni e
pulizia; il provider conserva la scelta e invalida i caricamenti asincroni.

`AppLogger` costruisce una volta all'avvio l'indice in memoria degli intervalli
di byte del file già esistente. Questa costruzione e il recupero storico del
buffer leggono il file all'avvio; **aprire la finestra dei log legge soltanto
gli intervalli del giorno richiesto**, con letture serializzate rispetto a
scritture, rotazione e pulizia. Gli offset restano corretti anche in presenza di
byte UTF-8 corrotti. File e righe esistenti sono conservati; restano la rotazione
a 5 MB e il buffer di 5000 eventi precedenti. La disponibilità dei giorni riguarda
solo ciò che la rotazione preesistente ha conservato. Nessuna nuova dipendenza,
migrazione dell'archivio, modifica alla libreria personale o chiamata AI.

## Verifiche e ripresa

- **625 test Vitest verificati su 43 file.** Run completo fuori sandbox:
  624 passati, uno fallito nella pulizia di una cartella temporanea occupata;
  suite archivio ricontrollata: 77/77 passati. Primo run in sandbox: 622 passati,
  tre errori ambientali su loopback e junction; fuori sandbox questi passano.
- **61 test mirati** passati su log, PDF, inviluppi e qualità; ulteriore controllo
  dei log dopo la protezione contro byte corrotti: 52/52 passati con la suite qualità. Typecheck passato.
- Suite completa React/Electron passata, inclusa la ripresa della lettura in
  due processi distinti. Scenario dedicato `--memo-logs-export-only` passato:
  soglia di anteprima, reset, rotella, chiusura, selezioni PDF, annullamento,
  mancanza EN, pagine dei log, errore e retry, cambi rapidi e pausa audio.
- Catture sintetiche chiaro/scuro e finestre da 640 px ispezionate in
  `local-artifacts/memo-logs-export-2026-10-19/`, ignorata da Git.
- PDF reali dal renderer di produzione: corso IT/EN, singola EN, selezione
  parziale, diagrammi compatti e adattivi. Verificati nomi proposti, pagine Note,
  assenza di pagine vuote, formule, font Mermaid e conservazione dell'output
  precedente in caso di errore. Sei esportazioni controllate.
- Build di produzione passata. Lint dei file modificati passato; **lint globale
  ancora fermo sui due errori preesistenti** `no-require-imports` nelle righe 2 e 3
  di `resources/course-rag/pdf-worker.cjs`, estraneo a questo intervento.

Installer non rigenerato; nessuna installazione, pubblicazione, commit o push.
Per riprendere leggere prima D-0367–D-0370 e questo documento: completati
39/40/41/42, aperta 38 con i limiti sopra. La coda mantiene l'ordine e i rinvii
precedenti. Prima attività non rinviata ancora aperta: timer pausa sul telefono;
questa sessione non lo avvia.

## Installer aggiornato (D-0371)

Su richiesta successiva dell'utente è stato rigenerato il setup Windows NSIS
x64 `dist/Lezionify-Setup-0.1.0.exe`, versione 0.1.0, con le modifiche descritte
sopra. Build e packaging `--publish never` riusciti. Dimensione 190.809.181 byte;
SHA256 `ca9a78bd36883247fa5078a9bf6f0180ace6006e30fc912c9bc539fae34016b8`.
Verificati 370 file della build identici nel payload ASAR, nuove funzioni,
FFmpeg, traduzione offline, manifesto SHA512/dimensione, blockmap e assenza di
artefatti privati. Backup del setup precedente, log e `verification.json` in
`local-artifacts/installer-backups/20261019-memo-log-pdf-suoni/`.

Chiudere l'app e avviare il setup per aggiornare. Nessuna installazione o
pubblicazione automatica; i limiti della voce 38 restano quelli documentati.
