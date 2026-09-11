# Checklist ufficiale delle modifiche

Elenco allineato a `DECISIONI.md` fino a **D-0119**. I riepiloghi storici e le priorità che duplicavano le stesse attività sono stati rimossi.

**Stato all'11 settembre 2026:** **43 interventi completati**, **0 da completare**.

**Verifiche correnti:** 120 test Vitest, 24 scenari React in Electron, collaudo Q&A Gemini reale, audit CSS, typecheck, lint e build superati.

## Cose da fare

Nessun intervento residuo nella checklist ufficiale.

## Cose già fatte

### Stabilità e dati

- [x] Salvataggio Q&A deterministico e isolato — **D-0071**.
- [x] Flush del timer con snapshot serializzati — **D-0073**.
- [x] Persistenza atomica, serializzata e recuperabile — **D-0075**.
- [x] Validazione rigorosa delle risposte audio AI — **D-0076**.
- [x] Segmentazione monotona senza perdita di testo — **D-0077**.
- [x] Commit di traduzioni e studio set vincolato alla fonte — **D-0078**.
- [x] Ricerca senza fallback completo e query obsolete scartate — **D-0079**.
- [x] Rinomina e fusione corsi transazionali — **D-0080**.
- [x] Cancellazione lezioni recuperabile — **D-0081**.
- [x] Importazione e sincronizzazione con rollback — **D-0084**.
- [x] Recovery della libreria e arresto controllato — **D-0085**.
- [x] Retry, polling e concorrenza Gemini controllati — **D-0091**.
- [x] Conversazione Q&A Gemini reale verificata su due turni — **D-0114**.
- [x] Quick Capture e highlights con scritture ordinate — **D-0094**.
- [x] Job AI concorrenti identificati e filtrati tramite ID IPC — **D-0104**.
- [x] Salvataggio del timer collaudato durante una trascrizione remota — **D-0105**.
- [x] Payload renderer validati e salvataggi settings serializzati — **D-0113**.

### Date, audio e prestazioni

- [x] Date di calendario locali — **D-0082**.
- [x] Streaming e seek HTTP Range corretti — **D-0083**.
- [x] Warm-up non bloccante e cache LRU — **D-0086**.
- [x] Logger con meno I/O e test silenziosi — **D-0087**.
- [x] Player sincronizzato agli eventi audio — **D-0098**.
- [x] Timer di pausa basato sul tempo reale — **D-0100**.
- [x] Statistiche aggregate in una passata con scritture idempotenti — **D-0106**.
- [x] Ricerca e conteggio memoizzati nelle trascrizioni lunghe — **D-0107**.
- [x] Durata MP3 reale, migrazione compatibile e test multi-bitrate — **D-0108**.
- [x] Renderer iniziale ridotto con chunk funzionali caricati su richiesta — **D-0115**.

### Interfaccia e accessibilità

- [x] Drag and drop ingannevole rimosso — **D-0088**.
- [x] Errori di traduzione visibili — **D-0089**.
- [x] Fullscreen sincronizzato con React — **D-0092**.
- [x] CSS Highlight Registry isolata — **D-0093**.
- [x] Submit del tempo manuale robusto — **D-0095**.
- [x] Card Dashboard attivabili da tastiera — **D-0096**.
- [x] Chiavi API gestite per identità stabile — **D-0097**.
- [x] Posizione di lettura conservata nel cambio lingua — **D-0099**.
- [x] Corsi con zero CFU coerenti tra backend e interfaccia — **D-0109**.
- [x] Quick Capture aggiornato immediatamente nella Dashboard — **D-0110**.
- [x] Confini IPC, persistenza e AI privi di `any` espliciti — **D-0111**.
- [x] Regressioni UI per fullscreen e più `MarkdownViewer` — **D-0112**.
- [x] Contratti renderer morti rimossi e comparatore Markdown corretto — **D-0116**.
- [x] Stili condivisi consolidati, inventariati e verificati sui due temi — **D-0117**.
- [x] Validazioni, pannello trascrizione e controller Focus separati dai monoliti — **D-0118**.
- [x] Diagrammi Mermaid locali, sicuri e bilingui nelle dispense — **D-0119**.

## Collaudi aggiuntivi su funzioni implementate

Questi controlli non fanno parte degli interventi ufficiali e non incidono sul conteggio. Restano annotati come prove manuali aggiuntive.

- **Eseguito:** conversazione Q&A reale con più turni.
- **Eseguito:** fullscreen rifiutato, Esc e uscita confermata su Windows.
- **Eseguito:** più `MarkdownViewer` insieme.
- **Eseguito:** cambio tab con quiz/studio set.
- **Prova manuale futura:** Dashboard usata interamente da tastiera.
- **Prova manuale futura:** cambio lingua a inizio, metà e fondo.
- **Prova manuale futura:** sospensione e ripresa durante una pausa.
- **Prova manuale futura:** riproduzione di un audio non leggibile.
- **Prova manuale futura:** chiamata Gemini reale per retry e disponibilità modello.

## Criterio di completamento

Una voce passa tra le cose già fatte quando implementazione, test pertinenti, typecheck, lint e build sono completati e la decisione non banale è registrata con `tools/append_decision.py`.
