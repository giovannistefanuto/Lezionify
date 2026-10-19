# Catture raggruppate e stima dello studio — 17 ottobre 2026

Implementazione delle voci 34 e 36 (posizioni 19 e 20), richiesta direttamente
nella stessa sessione e approvata dopo due round di `grilling`. Decisioni
[D-0341 e D-0342](../../DECISIONI.md). La richiesta esplicita comprende entrambe
le funzioni; non è un invio del comando LISTA_ORDINE.

## Catture rapide

Aprire con Ctrl+P o Ctrl+M. I dati precedenti restano in **Senza tag**.
**+ Gruppo** crea un gruppo con nome e lettera A–Z univoci. I gruppi sono
nell'ordine di creazione e valgono sia per le attività sia per le note.
Selezionare con clic o **Alt+lettera** mentre il pannello è aperto; le lettere
normali restano testo. Alla riapertura torna l'ultima selezione, inclusa Tutti.

Ogni attività appartiene a un gruppo e il selettore sulla riga la sposta.
Ogni gruppo ha un blocco di note con Ctrl+B per delimitare il grassetto.
Modificare il gruppo ne cambia nome o lettera senza cambiare contenuto.
Eliminare richiede conferma: attività e note passano in Senza tag, conservando
il nome del gruppo come intestazione delle note trasferite. Il trasferimento
viene bloccato con messaggio se le note unite superano il limite, lasciando
intatto il gruppo. Limiti: 26 gruppi, 1.000 attività complessive, nomi di 80
caratteri, attività di 10.000 caratteri e note di 1.000.000 per blocco.

**Tutti** mostra i gruppi con le rispettive due colonne. **Copia gruppo** copia
titolo, checklist con completati inclusi e note; **Copia tutto** fa lo stesso
per tutti i gruppi non vuoti. **Pulisci completati** riguarda il solo gruppo.
Dashboard aggiornata per includere le note di tutti i gruppi e indicare il
gruppo delle attività. Errori di lettura impediscono di modificare dati non
caricati; errori di salvataggio offrono un tentativo esplicito di riprova.

Dati nel file locale `scratchpad.json`, con campi opzionali `groups`,
`selectedGroupId` e `groupId` sulle attività. La lettura del formato precedente
resta valida; salvataggi atomici e coda seriale preservano tutti i campi.

## Stima dello studio restante

Stima lo studio della dispensa al ritmo osservato, comprese domande, slide e
riletture. Funziona in Focus; si attiva per default e si disattiva in
**Impostazioni → Generali → Studio in Focus**. La preferenza è salvata subito.

Il documento è suddiviso in 20 intervalli pesati per quantità di testo dei
blocchi visualizzati, usando la posizione superiore della zona di studio.
Un intervallo si consolida dopo 45 secondi di permanenza attiva; un salto non
riempie gli intervalli attraversati. Il progresso utile è il prefisso
consolidato senza buchi: una scorsa di cinque secondi e una lunga sosta al
fondo non equivalgono allo studio delle sezioni saltate.

La stima appare solo dopo almeno 10 minuti e il 60% consolidato, quando il
residuo calcolato è inferiore a 30 minuti. Formula: tempo attivo × intervalli
residui / intervalli consolidati. Le fasce sono di cinque minuti, aggiornate
al massimo ogni minuto con la mediana degli ultimi tre campioni disponibili.
Esempio: «Studio restante: circa 20–25 min». Nessun countdown, suono o
completamento automatico della lezione.

Le interazioni nel Q&A e nel PDF contano come tempo di studio, senza
consolidare la posizione rimasta visibile nella dispensa; l'indicatore resta
nascosto durante questa consultazione. Tornare indietro non sottrae progresso,
ma il tempo di rilettura può aumentare la previsione. Pause, Focus Lock,
finestre in secondo piano, catture rapide, dizionario e modali vengono esclusi.
Il limite di inattività è 15 minuti dall'ultima interazione, coerente con il
tracker esistente; i salti temporali di oltre cinque secondi sono scartati
per non attribuire sospensione o blocchi del processo allo studio.

Campioni locali per lezione in `localStorage`, senza testo o domande,
salvati ogni dieci secondi e alla chiusura del ciclo. Italiano e inglese
condividono i campioni; variazioni della dispensa italiana o di una traduzione
già campionata invalidano i campioni. **Ricalcola da qui** azzera tempo e
permanenze e avvia una nuova calibrazione sulla parte dal punto selezionato:
richiede nuovamente dieci minuti e il 60% di quella parte.

## Verifiche e limiti

- 524 test Vitest passati (37 file), inclusi 8 nuovi test per stima e gruppi.
- Dopo il controllo aggiunto alla lettura dello scratchpad: ripassati 83 test
  pertinenti, inclusi archivio, gruppi e stima.
- Scenario Electron mirato: `node tools/run_hook_regressions.cjs --study-tools-only`.
- Suite Electron completa `npm run test:hooks`, inclusa ripresa delle coordinate
  di lettura dopo un riavvio reale del processo.
- Typecheck, lint mirato senza avvisi, build produzione e controllo diff.

Gli scenari React in Chromium verificano compatibilità, creazione e modifica
dei gruppi, scorciatoie DOM, isolamento pulizia, conferma eliminazione,
conservazione delle note e ripresa. Per la stima usano un documento sintetico
e tempo controllato: scorsa rapida, avanzamento progressivo, pause, background,
sospensione, cambio lingua, Q&A, ricalibrazione e rigenerazione.

La permanenza non dimostra comprensione. Gli intervalli non sono capitoli
semantici; la condivisione IT/EN usa avanzamento normalizzato e può essere
approssimata. Scorrimenti molto ampi possono lasciare buchi e nascondere la
stima: è intenzionalmente prudente, con ricalibrazione manuale disponibile.
L'utilità motivazionale e le soglie richiedono osservazione nell'uso personale.

Nessuna dipendenza o chiamata AI aggiunta. Build aggiornata, installer non
rigenerato. Spotify e Ctrl+L restano rinviati; la prossima nuova voce dopo la
20 è la 21, timer sul telefono, non avviata in questa sessione.
