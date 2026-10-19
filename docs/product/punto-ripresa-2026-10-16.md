# Punto di ripresa permanente — 16 ottobre 2026

Riepilogo richiesto dall'utente per conservare le informazioni prima di
proseguire. Le fonti dettagliate restano nei documenti collegati: questo file
è un indice dello stato, non sostituisce codice, test o registro delle decisioni.

## Regole e stato del lavoro

- Leggere [AGENTS.md](../../AGENTS.md), [idea iniziale](../../IDEA_INIZIALE.md),
  [struttura](../../STRUTTURA_PROGETTO.md) e decisioni recenti nel
  [registro append-only](../../DECISIONI.md).
- `LISTA_ORDINE` autorizza una sola voce. Consultare la
  [guida alle skill](guida-skill-codex.md), usare `grilling` se rimangono scelte,
  scegliere gli altri metodi pertinenti e preparare sempre `handoff` finale.
  D-0329 registra la richiesta permanente di handoff. Il documento temporaneo
  non svuota automaticamente la chat; questo riepilogo invece resta nel repo.
- Il repository contiene molte modifiche e file non tracciati preesistenti,
  da preservare. Nessun commit o push eseguito durante questi interventi.
- Dati personali, audio originali, trascrizioni, modelli e credenziali restano
  locali e fuori da Git. Nessun testo personale inviato a nuovi servizi AI.

## Coda e risultati acquisiti

La [coda autorevole](idee-future-2026-10-13.md#coda-lista_ordine) conserva
ordine e caselle. Non assumere che una voce rinviata sia completata.

| Posizione | Stato al punto di ripresa | Fonte |
| --- | --- | --- |
| 12 — Musica | Aperta e rinviata esplicitamente. Utente dichiara Spotify collegato, ma non vuole eseguire ora il pilota personale | D-0330/D-0331; [pilota](../quality/musica-pilota-2026-10-16.md) |
| 13 — Suggerimento vocabolario | Completata: rimossa la frase esplicativa, campo unico e Ctrl+T/Esc conservati; collaudo Electron passato | D-0331; voce 28 del backlog |
| 14 — Tono Q&A | Completata nel prompt: riscontri specifici, correzioni e domande di verifica solo utili. Contratto SDK verificato; tono delle risposte reali da osservare | D-0332; [report](../quality/qna-tono-didattico-2026-10-16.md) |
| 15 — Ultima lezione | Completata: avviso e ritorno a Tutte le lezioni dopo 2 s dal salvataggio riuscito, anche da Focus senza blocco di 15 s | D-0333; [report](../quality/ultima-lezione-2026-10-16.md) |
| 16 — Ctrl+L | Aperta e rinviata esplicitamente dall'utente, che proverà la copia diagnostica più avanti | D-0334/D-0335/D-0336; [diagnosi](../quality/ctrl-l-diagnosi-2026-10-16.md) |
| 17 — Lara 3 | Ricerca documentale conclusa, nessun benchmark reale o provider integrato | D-0336; [ricerca](../research/lara-translated-valutazione-2026-10-16.md) |
| 18 — Suoni offline | Completata: catalogo 6 suoni equivalenti scaricabili esplicitamente, Web Audio loop gapless persistente nel pannello Musica/Suoni, auto-pausa con AudioPlayer | Voce 30 del backlog; D-0337–D-0340 |

Le posizioni dalla 19 in avanti non sono state avviate.

## Ctrl+L: fatti da non richiedere di nuovo

L'utente riferisce il problema in Focus; il pulsante lingua funziona.
Ha già provato clic nel testo e pulsante lingua seguito da Ctrl+L senza
risolvere. Non chiedere questi tentativi alla cieca una seconda volta.

Il comando `node tools/run_hook_regressions.cjs --language-shortcut-only`
passa con input nativo, fullscreen HTML reale, testo selezionato, PDF e intera
App montata. Questo non chiude la segnalazione personale. È stata verificata
anche la presenza del gestore Ctrl+L nel codice installato.

La strumentazione temporanea `[DEBUG-ctrl-l]` è disattivata normalmente e si
attiva solo con `LEZIONIFY_TRACE_CTRL_L=1`. Osserva percorso e stati, senza
testo delle lezioni, caratteri grezzi o identificativi. Va rimossa quando la
causa sarà individuata e corretta; non è una correzione della scorciatoia.

Copia separata pronta, senza sostituire il setup ordinario:

- [Launcher diagnostico](../../local-artifacts/ctrl-l-diagnostic-2026-10-16/Avvia-diagnosi-CtrlL.cmd).
- [Istruzioni](../../local-artifacts/ctrl-l-diagnostic-2026-10-16/LEGGIMI.txt).
- [Verifica del pacchetto](../../local-artifacts/ctrl-l-diagnostic-2026-10-16/package-verification.json): 364 file build confrontati con ASAR; runtime e FFmpeg presenti; percorsi privati esclusi.

L'utente deve chiudere le altre copie, avviare il launcher e riprodurre una
volta. Poi Ctrl+Shift+L → Tutti → filtro `DEBUG-ctrl-l` → Copia Log. Attendere
quel tracciato prima di formulare una causa; al momento la prova è rinviata.

## Lara: conclusione da conservare

Nessun modello locale gratuito individuato nelle fonti ufficiali. API Free
10.000 caratteri/mese, distinta dal pool web e dal pilota commerciale.
Nessuna latenza Lara misurata sul PC: il claim 50 ms riguarda Flash su richiesta.
Base/Standard e Lara 3 non sono stati equiparati senza conferma del servizio.
Nel report sono documentati Learning/Incognito, parametro SDK `noTrace`,
condizioni da chiarire per un eventuale confronto e fonti primarie.

Conservato Bergamot. Tempi storici a caldo EN→IT: mediana 134 ms/p95 295 ms;
IT→EN: 85/189 ms. Sono tempi del pilota del 13 ottobre, non della UI attuale,
che attende 500 ms dopo la digitazione. Fixture: 24 casi sintetici, 1.982
caratteri complessivi; nessuna chiamata Lara effettuata.

## Qualità e distribuzione

Ultimo consuntivo applicativo D-0335: 514 Vitest, typecheck, lint mirato,
build, scenario nativo ed Electron completo con riavvio passati. Una prima
esecuzione parallela è fallita sul controllo Focus flottante; riesecuzione
isolata passata, limite registrato nel report Ctrl+L senza attribuirne la
causa alla scorciatoia. Le verifiche delle modifiche precedenti sono nei
rispettivi report; non dichiarare eseguito un nuovo quality gate per sola
documentazione.

Le modifiche del 16 ottobre sono nei sorgenti/build e nella copia diagnostica;
non è stato ricostruito o installato il setup NSIS ordinario. Non presumere
che l'app installata contenga già vocabolario, prompt Q&A e uscita rapida nuovi.

## Voce 18 completata: Suoni di sottofondo offline come Apple

Completata in D-0340 a seguito della risposta affermativa dell'utente ai tre punti
di grilling (catalogo 6 suoni equivalenti, UI dedicata in Musica con riproduzione persistente,
e auto-pausa durante l'ascolto della lezione):

1. **Catalogo equivalente:** 6 suoni (rumore bianco, rosa, marrone da *newagesoup* CC0;
   pioggia, onde e ruscello da *Blanket* CC BY 4.0/CC0). Definiti in `shared/ambientSounds.ts`
   con URL, SHA-256 e dimensioni (~11,1 MiB complessivi).
2. **Download esplicito e conservazione locale:** implementato in `electron/main/ambientSounds.ts`
   con scrittura atomica `.tmp` + rename in `userData/ambient-sounds` e verifica puntuale
   di dimensioni e SHA-256. Esposto al renderer tramite metodi IPC `archive:ambient-status`,
   `archive:ambient-install`, `archive:ambient-read`.
3. **Player Web Audio persistente:** implementato `AmbientSoundProvider` (`src/components/AmbientSoundContext.tsx`)
   montato a radice in `src/App.tsx`, con `AudioContext`, `GainNode` e `AudioBufferSourceNode`
   con `loop = true` per riproduzione gapless continua, disaccoppiata dall'apertura/chiusura
   del dialogo Musica.
4. **Interfaccia utente:** scheda "Suoni" integrata in `MusicButton.tsx` (`src/components/AmbientSoundPanel.tsx`),
   con visualizzazione stato installazione, avvio download esplicito, selezione suoni per card,
   barra del player attiva con slider volume (0–100%), avviso di pausa automatica e cassetto per
   i crediti d'autore e licenze. Preferenze volume e ultimo suono memorizzate in `localStorage`
   tramite `src/utils/musicPreferences.ts` senza autoplay all'avvio.
5. **Coordinamento con la lezione:** evento custom `lezionify:lecture-playback` emesso da
   `src/components/AudioPlayer.tsx` su play/pause/ended/unmount, che pone in pausa automatica
   il sottofondo durante l'ascolto della lezione e ne riprende la riproduzione alla fine.
6. **Verifiche e collaudi:** 516 test Vitest passati (inclusi 2 test unitari dedicati in
   `tests/unit/ambientSounds.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build`,
   `npm run test:hooks` e `npm run test:pdf-export` passati al 100%.

Prossima voce aperta nella coda: **Posizione 19 — Tag e gruppi nelle catture rapide** (voce 34).
