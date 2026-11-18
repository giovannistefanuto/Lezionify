# Sessione · verifica tecnica e design approvato

## Fase 0 · agganci esistenti

| Superficie | Percorso attuale | Integrazione |
|---|---|---|
| Date storiche | `CourseDefinition.examDate` e `CourseConfig.examDate` in `shared/archive.ts`; validazione in `archiveValidation.ts` e `settings.ts`. | Importazione esplicita per corso con entrambi i valori e relativa provenienza. Per i corsi fuori dal piano attivo resta la precedenza esistente della definizione. |
| Impostazioni corso | `CourseManagementModal` salva la definizione tramite il servizio archivio. `Dashboard` salva la configurazione tramite `useSettings.saveCourseConfig`. | Per i corsi inclusi nella sessione attiva, gli ingressi aprono il comando condiviso di modifica e conferma. Le preferenze di cadenza restano configurabili per corso. |
| Dashboard | Il riepilogo countdown e le statistiche per corso leggono entrambe le date storiche. | Condividere il risolutore delle prove confermate con i promemoria. Le esclusioni del piano sopprimono il ripiego. |
| Promemoria | `shared/examReminders.ts` pianifica gli avvisi; `ExamReminderService` registra ricevute e avvisi sotto `library/`; main, preload e renderer espongono lettura e conferma. | Identità per appuntamento, conservazione delle ricevute e ricalcolo sui dati confermati. |
| Identità del corso | `ArchiveService.renameCourse` aggiorna impostazioni e file collegati; `archivedCourseCodes` separa corsi attivi e archiviati. | La rinomina aggiorna i riferimenti alla sigla. I dati dei corsi archiviati restano consultabili mentre cessano le proiezioni attive. |
| Persistenza | `atomicFile` gestisce sostituzione atomica e backup; `AsyncMutex` serializza le mutazioni. | Registro versionato sotto `library/`, incluso in una copia di quella cartella, con verifica della revisione nel main. Impedire sovrascritture in caso di dati illeggibili. |
| Accesso e studio | `App`, `Sidebar`, `useQuickCapture`, `LectureDrawer`, `useStudyTracker` e `studyActivity`. | Overlay con ripristino del focus, ingresso da sidebar e Ctrl+Alt+S, guardia Focus Lock, motivo di sospensione Sessione nel tracciamento e nelle stime. |

## Design approvato il 18 novembre

Calendario da muro a sinistra, con tre mesi compatti e un quarto quando contiene appelli. Si può raggiungere un appello fuori finestra. A destra un post-it con una sola tabella dei countdown del piano visibile, una riga per prova. La data di oggi compare sopra i mesi. La legenda minima sta sotto il calendario.

Una X a due diagonali marca ogni giorno passato. Verde pieno per gli appuntamenti scelti, tratteggio e cerchio vuoto per le alternative, spunta riservata alle prove sostenute. Le date bloccate hanno lo stesso aspetto delle altre date scelte nel calendario. Il blocco è visibile e modificabile nel dettaglio e vincola la proposta di spaziatura.

Esami e Piano raccolgono le azioni. Il selettore del piano è sotto il titolo, e l'azione Conferma compare quando è applicabile. Il dettaglio si apre cliccando una prova nel calendario o nel post-it. Le bozze conservano l'ultima revisione confermata come base per Dashboard e promemoria. I rinvii seguono il [piano](piano-sessione.md). Google Calendar rimane una fase futura.

## Uso della prima versione locale

1. Apri Sessione dalla sidebar o con **Ctrl+Alt+S** e crea un periodo.
2. Da **Esami** aggiungi il totale, i parziali e gli appelli dei corsi. Le date precedenti sono importabili con la propria provenienza.
3. Scegli gli appelli dal calendario. Il dettaglio consente di bloccare una data. Puoi trascinare una scelta non bloccata su un altro appello della stessa prova. Per cambiare la data ufficiale, usa il comando esplicito nel dettaglio.
4. Da **Piano** puoi duplicare la bozza o aprire la proposta **Distanza gli esami**. La proposta distingue ricerca completa e ricerca interrotta al limite di 150.000 stati.
5. **Conferma piano** mostra gli appelli cambiati e i corsi rimandati. Il piano confermato alimenta i countdown in Dashboard e i promemoria dei corsi con cadenza attiva.
6. All'avvio vengono proposti gli esiti da aggiornare. Puoi anche modificare un esito dal menu **Esami** o dal dettaglio della prova.

`library/sessione.json` e la precedente copia `sessione.json.bak` sono nella
libreria locale. Le note degli appelli, gli esiti e le indisponibilità fanno
parte di quel registro. Le indisponibilità locali sono intervalli inclusivi
di giorni, facoltativamente vincolanti. Date, bozze, conferme ed esiti si
salvano senza invii di rete.

## Collaudo

- Test di archivio su riavvii, backup, errori di scrittura, revisioni concorrenti, correzione e rinvio degli esiti. I test dei promemoria coprono più prove per corso, cambi di piano, importazione e rinomina.
- Ricerca confrontata con enumerazione indipendente su 18 casi piccoli. Il caso sintetico da 11 esami con quattro alternative ciascuno raggiunge 150.000 stati in 319 ms in una misurazione locale e restituisce una proposta parziale.
- `npm run test:sessione` verifica configurazione, scelta e trascinamento, conferma, annullamento della proposta, accesso rapido, Focus Lock e ripristino del focus. La seconda prova apre la build Electron con il preload reale e riavvia un secondo processo sullo stesso profilo sintetico. Verifica worker, Dashboard, promemoria, Full Focus, timer e assenza di overflow a 900 px e zoom 125%, 150% e 200%.
- La regressione controllata del tracciamento verifica zero secondi e zero campioni di stima mentre Sessione è aperta. Sono state esaminate schermate della build in tema chiaro e scuro, anche a 900 px.

I collaudi dell'app usano dati sintetici. L'approvazione visiva è avvenuta
sul mockup, mentre una prova d'uso con dati personali richiede il profilo
dello studente.
