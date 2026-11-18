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

Esami e Piano raccolgono le azioni. Il selettore del piano è sotto il titolo, e l'azione Conferma compare quando è applicabile. Il dettaglio si apre dalla casella o dalla prova. Le bozze conservano l'ultima revisione confermata come base per Dashboard e promemoria. I rinvii seguono il [piano](piano-sessione.md). Google Calendar rimane una fase futura.
