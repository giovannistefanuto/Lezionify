# Revisione iterativa delle richieste — 15 ottobre 2026

## Mandato e punto di ripresa

L'utente ha autorizzato l'esame di tutte le richieste aperte di
`idee-future-2026-10-13.md`: correggere difetti e interventi circoscritti con
obiettivo chiaro; conservare diagnosi, alternative, piani e prompt di ricerca
quando serve una scelta. Questa sessione non è una singola `LISTA_ORDINE`.
La revisione iniziale non deduceva scelte dai benchmark. Successivamente
l’utente ha risposto ai dieci punti e autorizzato l’implementazione: leggere
[scelte e avanzamento aggiornati](implementazione-scelte-2026-10-15.md).

Repository con numerose modifiche preesistenti: non ripristinare né attribuire
alla sessione tutto il diff Git. Non leggere credenziali o inviare materiale
personale per questi approfondimenti. Fonti e derivazioni locali da conservare.
Registrare le decisioni eseguendo `tools/append_decision.py`.

## Stato delle voci

Le caselle del backlog misurano l'implementazione, non la fine dell'analisi.
Le voci 1–4, 6 e 10–16 risultano già concluse nelle decisioni D-0256–D-0294;
non sono richieste nuove implementazioni su quelle voci.

| Voce | Stato di questa revisione | Prossimo passo |
| --- | --- | --- |
| 8 — Slide nel Q&A | Implementato e collaudato D-0306 | PNG persistenti e gestione immagini nelle impostazioni |
| 9 — Modelli Q&A | Successiva richiesta: Flash-Lite prima, fallback Gemini implementato | Alternative non Gemini rinviate; modello dispense indipendente |
| 7 — Frasi offline | Mozilla/Bergamot integrato D-0307/D-0308 | Modelli opzionali scaricabili; limiti tecnici visibili |
| 5 — Musica e appendice | Compilation e pannello Spotify implementati D-0309 | Utente configura Client ID; pilota reale ancora aperto |
| 17 — Amazfit Balance | Compromessi approvati, nucleo prototipo testato D-0310 | Trasporto e hardware da verificare; ricerca utente attesa |
| 18 — Tutti i Mermaid | Implementato e collaudato | Nessuna scelta necessaria |
| 19 — PDF fuori Focus | Già presente, verificato e chiarito il tooltip | Nessuna scelta necessaria |
| 20 — ENG nella pipeline | ENG automatico implementato D-0305; diagnosi storica distinta | Eventuali fallimenti personali richiedono caso riproducibile |
| 21 — «trascrivi» | Corretto e collaudato offline e in Electron | Nessuna scelta necessaria |

## Verifiche e consegna

Typecheck e collaudo mirato della lettura passati dopo il comando Mermaid.
Suite React/Electron completa e ripresa dopo riavvio passate, inclusi comando
collettivo e richieste PDF ITA/ENG nella vista ordinaria. Le prove storiche citate
nei documenti non sono collaudi di questa sessione. Installer non rigenerato.
Il documento è aggiornato a fine sessione; le nuove modifiche non sono incluse
nel precedente setup D-0296.

30 regressioni pipeline/pannello e 18 del vocabolario passate; filtro Electron
dictionary-only passato. Verificati dati reali, riconoscimento automatico/manuale,
lemma mancante, forme comuni, ambiguità e priorità delle voci esatte. Confronto
con i dati nella build precedente: tutte le 29.660 voci IT conservate e una sola
aggiunta; generatore idempotente.

**Controllo finale `npm run check` interamente passato:** typecheck, lint,
481 test Vitest, 24 Python, 41 Node, suite React/Electron completa, ripresa della
lettura dopo un vero riavvio Electron, build di produzione ed export PDF reale
ITA/ENG e singola lezione. Il collaudo PDF conferma che gli schemi esportati
restano visibili e proporzionati e che le fonti sono preservate. Nessuna API AI
reale usata dai collaudi. `git diff --check` passato; le numerose modifiche
preesistenti sono state conservate. Nessun commit, push o installer creato.

## Approfondimenti conclusi in questa sessione

D-0297 registra il mandato; D-0298 la conservazione delle analisi.

- [Slide nel Q&A: file, alternative, contratto e collaudi](../research/slide-contesto-qna-piano-2026-10-15.md).
- [Q&A, frasi, musica e watch: risultati recuperati, scelte e piani](../research/approfondimenti-backlog-2026-10-15.md).
  Contiene anche il prompt Deep Research facoltativo per l'ingresso sul watch
  dal quadrante, senza ripetere la proposta mst* esclusa dagli App Service.

Fonti primarie ricontrollate oggi, nessun nuovo benchmark live. I numeri del
13 ottobre rimangono storici. Non leggere il `.env` o riavviare vecchi benchmark
per dedurre una scelta automatica. Le cinque caselle di implementazione restano
aperte. Il setup D-0296 è precedente alle modifiche di questa sessione.

## Difetti e interventi circoscritti

- Mermaid: comando collettivo implementato, comandi individuali conservati,
  stati misti gestiti; nessun effetto sulla discussione o sulle fonti. D-0299.
- PDF ordinario: il pulsante esisteva già; verificato e migliorata descrizione
  della destinazione e della lingua. D-0299.
- ENG: [diagnosi dettagliata](../quality/versioni-eng-diagnosi-2026-10-15.md).
  Corretto il pannello, non attribuita una causa generale non provata. D-0300.
- Vocabolario: due cause riprodotte, lemma IT mancante e assenza di flessioni IT.
  Corretto senza dipendenze, rete o modifica dei dati dell'utente. La voce è
  completata per il caso segnalato, non per ogni coniugazione italiana possibile.

## Ripresa quando torna l'utente

1. Leggere questo resoconto e D-0297–D-0302; non rifare le ricerche già salvate.
2. Discutere le scelte nella tabella: allegati slide e loro conservazione;
   provider/contesto Q&A; motore e asset frasi; modalità musicale; ricezione watch
   dal quadrante o compromesso sull'apertura iniziale. Pro e contro nei piani.
3. Per ENG usare i dettagli del prossimo run fallito. Lo stato letto oggi non
   dimostra un difetto della traduzione manuale; non chiudere ancora la voce 20.
   L'eventuale ENG dopo import automatico richiede una scelta separata.
4. `LISTA_ORDINE` resta alla voce 9 della coda, slide nel Q&A: è pianificata,
   non implementata. Nessuna priorità è stata riscritta.
5. Il prompt Deep Research per il watch è già pronto nel documento di
   approfondimento. Non necessario per le tre voci completate.
6. Se richiesto l'aggiornamento dell'app installata, creare un nuovo setup dal
   codice verificato; quello attuale include solo le modifiche antecedenti.

Su successiva richiesta dell'utente, ricontrollati decisioni e report Balance
integrale: la pista del riuso del protocollo Zepp è ora concretizzata con sorgenti
Gadgetbridge congelati e API Android per le sveglie native. La sezione finale
della valutazione Balance conserva evidenze, limiti e testo da aggiungere alla
Deep Research avviata dall'utente. Nessun prototipo hardware o scelta definitiva.

## Dopo le risposte dell’utente

Implementazione: D-0304–D-0310. [Uso, limiti e azioni rimaste](funzioni-approvate-2026-10-15.md).
I resoconti e i conteggi sopra descrivono i controlli precedenti; lo stato finale
del blocco di implementazione è nel documento delle scelte, senza confondere
pilota Spotify simulato, traduzione WASM reale e prove Balance simulate.
