# Stima discreta, tempo effettivo e margine statistico — 8 novembre 2026

Intervento diretto sulle richieste 1, 2 e 6 della chat, corrispondenti alle
voci 126, 127 e 131. Nessuna chiamata AI, nuova dipendenza o modifica alle fonti.

## Comportamento

- In Focus resta una sola icona 🌱, distinta da cronometro, sveglia e pausa.
  Hover, focus da tastiera e clic aprono il dettaglio; il clic lo mantiene
  aperto. Escape chiude il dettaglio prima di uscire da Focus; clic esterno
  e perdita del focus chiudono il dettaglio. «Ricalcola da qui» è nel pannello.
- Cronometro, stima per blocco e tempi effettivi dello storico ricevono lo
  stesso tick accreditato di un secondo. Sono esclusi Memo/RIPETERE, pause,
  Focus Lock, finestre nascoste o senza focus, traduttore/dizionario e dialoghi
  modali. L'inattività segue la soglia già confermata nel tracker; non è
  introdotta una seconda soglia diversa per la stima. La sospensione del PC
  non viene convertita in tempo di studio.
- Nel Q&A il secondo va al blocco individuato univocamente dall'ancora della
  conversazione. Se manca o è ambigua, va all'ultimo blocco letto, oppure al
  primo visibile dopo una ripresa senza riferimento. Vale anche per domande
  su blocchi già superati: il campione viene aggiornato, non duplicato.
  Il Q&A non accredita esposizione di testo non letto. Le slide restano studio
  della lezione senza essere attribuite come lettura del paragrafo.
- Un lavoro di generazione/traduzione in background non impedisce di leggere
  o usare il Q&A. L'apertura del traduttore è invece un'esclusione esplicita.
  Una modifica ai contenuti invalida le previsioni in corso della vecchia fonte.
- La raccolta non distingue comprensione, lettura silenziosa e distrazione
  sulla stessa schermata: resta un limite del segnale disponibile. Non legge
  contenuti, applicazioni o siti usati nelle altre finestre.

## Che cosa significa il margine

L'obiettivo è il **tempo attivo in Focus ancora necessario fino alla conferma
«completata» nel drawer**. Le pause e le altre attività escluse non fanno parte
di questo esito. Non è l'orario sul calendario a cui si finirà la lezione.

La raccolta è prospettica: salva la prima previsione utilizzabile in ciascuna
delle tre fasi (primo, secondo e ultimo terzo), per lingua, prima di conoscere
il risultato. Il metodo usato è registrato: paragrafi e metodo precedente a
viewport non vengono mescolati nella calibrazione. Alla conferma riuscita
del completamento confronta previsione e secondi accreditati successivi.
Richiede anche una posizione osservata almeno al 90% del documento; non
trasforma un semplice scroll al fondo in completamento.

Un errore nel salvataggio dello stato non crea un esito. La ripresa conserva
il conteggio; la rigenerazione, «Ricalcola da qui» e la disattivazione della
stima scartano le previsioni incomplete. Il ricalcolo conserva i risultati
conclusi. La revisione del run impedisce al cleanup di un vecchio hook di
riscrivere una sessione già conclusa o scartata. Una lezione ristudiata
sostituisce il proprio caso, senza essere contata come una nuova lezione.

Per fase, lingua e metodo si usano fino a 100 lezioni distinte, escludendo
quella corrente. Occorrono almeno 20 lezioni confrontabili. Lo score è
`abs(effettivo - previsto) / max(previsto, 60 secondi)`; il margine applica
alla previsione corrente il quantile di rango `ceil((n + 1) * 0.9)` degli
score storici. Il minimo dell'intervallo è zero. I minuti sono arrotondati
verso l'esterno per i limiti mostrati.

La posizione seleziona gli errori storici della fase: **non impone che il
margine diminuisca verso la fine**. Questo deve emergere dai dati. Il livello
nominale scelto è 90%; separatamente si mostra la percentuale di esiti davvero
rientrati negli intervalli emessi prima del completamento, con il denominatore.
Se questa verifica successiva manca, l'interfaccia lo dichiara. Non usa il
vecchio errore medio per blocco come margine dell'intera lezione.

Il quantile corretto per campioni finiti segue la costruzione descritta in
[Angelopoulos e Bates, §1.1 e §2.3](https://arxiv.org/html/2107.07511v6).
Le garanzie formali della previsione conforme richiedono ipotesi sui dati e
sulla separazione fra addestramento e calibrazione; qui il ritmo personale
cambia e il modello si aggiorna durante l'uso. Per questo il prodotto dichiara
un **margine empirico con livello nominale**, non una probabilità garantita
sulla singola lezione. La copertura successiva va verificata sui dati reali.

## Dati e limiti

Solo nel profilo renderer locale:

- `lezionify.study-forecast.history.v1`: fino a 600 casi, senza testo o orari;
- `lezionify.study-forecast.run.v1:<id>` e relativa revisione: secondi, impronta
  dei contenuti, avanzamento massimo e fino a sei previsioni incomplete;
- campioni e progresso dei paragrafi preesistenti conservati; i nuovi campioni
  hanno una chiave per aggiornare il tempo senza moltiplicare le osservazioni.

I vecchi campioni non contengono previsioni complete ed esiti confrontabili:
non vengono usati per inventare una calibrazione retroattiva. All'inizio il
messaggio è «Margine statistico non disponibile: 0/20 lezioni confrontabili
in questa fase». La previsione puntuale può già funzionare con lo storico
precedente. I completamenti effettuati fuori dal drawer non creano casi.
La cancellazione del profilo locale elimina anche queste statistiche.

La funzione della voce 131 è implementata e verificata su dati sintetici;
**la casella resta aperta per la calibrazione personale e la verifica della
copertura**, che richiedono nuovi esiti reali. Nessun beneficio percentuale
personale è dichiarato con i soli test. Voci 126 e 127 concluse dopo le
regressioni complete; non è stata avviata un'altra voce della coda.

## Verifiche

- Regressione Electron inizialmente rossa: finestra visibile ma non attiva
  continuava a contare. Lo stesso scenario ora verifica anche traduttore,
  Memo, pause scadute, sospensione e salvataggi.
- `studyTimingScenarios.browser.tsx`: tick identici fra cronometro, stima e
  storico; nessuna copertura inventata dal Q&A, attribuzione a blocchi già
  superati, ripresa, completamento del drawer riuscito/fallito, controlli
  discreti, hover/focus/clic/Escape, temi, finestra stretta e zoom 200%.
- `studyForecast.test.ts`: quantile, soglie, fasi, lingue e metodi separati,
  esclusione della lezione corrente, duplicati, esiti prospettici, copertura
  successiva, ripresa, ricalcolo, rigenerazione e storage non disponibile.
- Screenshot sintetici in `local-artifacts/study-timing-2026-11-08/`, ignorati
  da Git. Nel gate generale è emerso un overflow a zoom 200%, corretto con
  vincoli CSS alla viewport e posizione aggiornata al resize della toolbar.

Gli esiti finali e l'eventuale distribuzione sono riportati nelle decisioni
successive e nell'aggiornamento conclusivo qui sotto.

## Esito finale e setup — D-0483

- 819 test unitari in 64 file, typecheck e lint superati.
- 24 regressioni Python e 41 Node superate. I primi errori di scrittura nei
  temporanei erano vincoli della sandbox; le stesse prove fuori sandbox passano.
- Regressioni generali React/Electron superate, compresa la ripresa dopo un
  riavvio completo del processo. Scenari mirati stima/Q&A e 28 ottobre passati;
  il test di inattività ora dichiara esplicitamente la finestra attiva.
- PDF reali IT/EN e quattro traduzioni WASM dal pacchetto superati.
- RAG pacchettizzato in profilo isolato superato con modelli già locali,
  inferenza senza rete, worker PDF e rifiuto del modello corrotto.
- Setup confrontato con tutti i 377 file della build; verificati i marker
  delle nuove funzioni, manifesto, tre backup e otto file del payload NSIS.

Installer: `dist/Lezionify-Setup-0.1.0.exe`, 299.981.359 byte, SHA256
`60473a58665bdc260eb90d5aceaacfebd00f38174241885f6f2a7c1206807f8f`.
Backup: `local-artifacts/installer-backups/20261108-stima-tempi/`.
Installare con Lezionify chiuso. Nessuna installazione sull'archivio personale
o pubblicazione del binario in una release è stata eseguita.
Commit e push dei file pubblicabili seguono la regola di `AGENTS.md`;
artefatti e dati personali restano ignorati da Git.
