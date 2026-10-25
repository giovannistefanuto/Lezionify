# Distribuzione di Lezionify agli studenti: fonti e valutazione iniziale

Data: 25 ottobre 2026. Ricerca documentale su fonti primarie e lettura dei file locali; nessuna app Mac costruita o collaudata, nessuna pubblicazione, nessuna chiamata AI. Le indicazioni operative sono proposte, non decisioni di prodotto già approvate. Il pull iniziale resta da completare per le modifiche locali preesistenti; il fetch è riuscito. L'analisi è indipendente dalla sincronizzazione.

Il percorso operativo successivo è nella [roadmap di distribuzione](../publishing/roadmap-distribuzione-2026-10-25.md), con attività, dipendenze e criteri di completamento. Questa nota conserva fonti e valutazione iniziale.

## Prova privata su Mac senza iscrizione Apple a pagamento

**Conclusione:** è possibile provare la strada della distribuzione diretta di un'app macOS non notarizzata, con autorizzazione locale del destinatario. Apple Developer Technical Support distingue esplicitamente i canali App Store/Developer ID, entrambi a pagamento, dalla consegna di un binario che richiede di superare Gatekeeper o del sorgente da compilare personalmente. Questo non garantisce che il pacchetto attuale di Lezionify funzioni su quel Mac. [Risposta Apple DTS](https://developer.apple.com/forums/thread/761393?answerId=799007022).

Il limite dei sette giorni documentato da Apple riguarda App ID, dispositivi e profili di provisioning del **Personal Team** in Xcode. Non è una scadenza generale imposta a ogni app desktop Mac distribuita fuori dallo Store. Una build diretta senza quel provisioning non va presentata come una beta da reinstallare obbligatoriamente ogni settimana. [Account e Personal Team](https://developer.apple.com/help/account/basics/about-your-developer-account/).

Apple documenta, dopo un primo tentativo di apertura, il comando **Impostazioni di Sistema → Privacy e sicurezza → Apri comunque** per un'app non notarizzata o di sviluppatore non identificato. L'eccezione riguarda l'app specifica; la disponibilità dipende dalle condizioni descritte da Apple. Non estendere questa procedura a software rilevato come dannoso, pacchetti danneggiati o Mac gestiti da un'organizzazione. Non serve proporre la disattivazione globale di Gatekeeper. [Apertura sicura delle app](https://support.apple.com/it-it/102445).

Per una distribuzione con Developer ID e notarizzazione occorre il relativo certificato: la notarizzazione rifiuta firme ad hoc o certificati non Developer ID. Il programma costa **99 USD all'anno**, con prezzo in valuta locale e varianti regionali: non è una tariffa per ogni Mac degli utenti. Firma, notarizzazione e pubblicazione sul Mac App Store sono passaggi distinti. [Developer ID](https://developer.apple.com/developer-id/), [requisiti notarizzazione](https://developer.apple.com/documentation/security/resolving-common-notarization-issues), [iscrizione e prezzo](https://developer.apple.com/help/account/membership/program-enrollment).

**Proposta:** per il primo test identificare chip Intel/Apple Silicon e versione macOS, costruire e provare il relativo pacchetto su macOS, quindi collaudare l'installazione scaricata come la riceverà la tester. Non assumere che rinominare lo `.exe` produca un'app Mac. electron-builder avverte che dipendenze native e firma richiedono una strategia specifica per piattaforma; la firma macOS si esegue su macOS. Il progetto usa electron-builder 26: le istruzioni v27 hanno opzioni diverse. [Build multipiattaforma v26](https://www.electron.build/v26/docs/features/multi-platform-build/), [firma macOS v26](https://www.electron.build/v26/docs/features/code-signing/code-signing-mac/).

## Aggiornamenti: sorgenti, release e installazione sono distinti

Un push Git non aggiorna un'app già installata. GitHub Releases permette di allegare pacchetti e note a una versione; gli archivi sorgente automatici sono differenti dagli installer allegati. È possibile avere una pagina stabile per l'ultima release, adatta anche a un QR sul volantino. [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases), [link alle release](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases).

electron-updater prevede pacchetti, metadati di versione e interrogazione del server di pubblicazione; può usare GitHub Releases. Su macOS l'aggiornamento automatico richiede un'app firmata. La documentazione v26 richiede anche il target ZIP per produrre i metadati Mac, oltre al DMG. La sola presenza di `latest.yml` in una build Windows non dimostra che l'app controlli o installi aggiornamenti. [Auto Update v26](https://www.electron.build/v26/docs/features/auto-update/).

**Proposta:** iniziare con release versionate e un comando «Controlla aggiornamenti» che mostra versione, novità e download corretto. Valutare l'installazione automatica dopo aver verificato firma, recupero dagli errori, conservazione dei dati e compatibilità delle migrazioni. Non promettere l'aggiornamento Mac automatico con la stessa strategia della prima prova non notarizzata.

## Chiavi API, costi e termini Gemini

Una chiave API è una credenziale: chi la possiede può consumare quote e generare addebiti. Non includere chiavi dell'autore nell'installer pubblico. Per la prova privata è preferibile che la tester configuri un proprio progetto; se il titolare finanzia il test, una credenziale/progetto dedicati e revocabili riducono il raggio del danno rispetto alla chiave personale principale. Questa è una raccomandazione operativa, non una conclusione contrattuale sulla condivisione. [Sicurezza chiavi Gemini](https://ai.google.dev/gemini-api/docs/api-key).

**Questione da chiarire prima della beta esterna:** i termini Gemini, efficaci dal 23 marzo 2026, richiedono maggiorenni, escludono API client rivolti o probabilmente accessibili a minori e prevedono soltanto Paid Services quando si rendono API client disponibili a utenti SEE/Svizzera/Regno Unito. Definiscono Paid l'accesso Gemini tramite progetto con billing attivo e descrivono l'uso come sviluppo professionale/business, non consumer. La stessa pagina applica le condizioni di uso dati dei Paid Services anche alle quote gratuite nel SEE: Google non usa prompt/risposte per migliorare i prodotti, ma conserva log temporanei per sicurezza e obblighi normativi. Questa eccezione sui dati non abroga la distinta clausola sulla distribuzione. L'app locale BYOK per uso personale e la sua distribuzione ad altri meritano chiarimento specifico con Google; non promettere una distribuzione conforme basata esclusivamente sul free tier. [Termini Gemini: Age Requirements, Use Restrictions, Unpaid/Paid Services](https://ai.google.dev/gemini-api/terms).

Un **budget di soli avvisi** Google Cloud non blocca automaticamente la spesa. La documentazione distingue ora anche spend cap per servizi idonei, con ritardi di applicazione e possibili eccedenze: non presupporre che ogni servizio/progetto Gemini li supporti. Quote effettive e controllo dei consumi vanno verificati sul progetto del test. [Budget e avvisi](https://docs.cloud.google.com/billing/docs/how-to/budgets), [spend cap e limiti](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps).

## Pubblico, gratuito e open source

**Fatto locale:** `LICENSE` dichiara `All rights reserved`, permette la consultazione per portfolio, istruzione e valutazione, e non concede copia, modifica o redistribuzione sostanziale senza permesso scritto. I dizionari hanno un'eccezione separata. Quindi il repository oggi non è open source. Rendere visibili i sorgenti non equivale a concedere le libertà necessarie: GitHub distingue espressamente le due situazioni. Non modificare questa scelta senza concordare quale libertà si vuole dare agli utenti. [Licenze dei repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

**Scelta aperta:** software gratuito con licenza d'uso e sorgenti consultabili, oppure licenza open source standard. La prima può bastare per installazione/uso gratuito se la concessione è scritta chiaramente; la seconda consente anche modifica e redistribuzione nei termini scelti. In entrambi i casi restano da rispettare le licenze di terzi.

**Audit da fare sul pacchetto effettivamente distribuito:**

- `ffmpeg-static` locale 5.3.0 dichiara `GPL-3.0-or-later`. FFmpeg può essere LGPL o GPL in base alla build; occorre identificare binario, opzioni e sorgenti corrispondenti e preparare gli adempimenti. Il wrapper npm e il binario non vanno trattati come una generica dipendenza MIT. Il semplice avvio di un eseguibile separato non basta, da solo, per decretare che tutto Lezionify debba essere GPL. [FFmpeg licenze](https://www.ffmpeg.org/legal.html), [provenienza dei binari ffmpeg-static](https://github.com/eugeneware/ffmpeg-static).
- `public/dictionaries/NOTICE.md` attribuisce i dizionari e le modifiche sotto CC BY-SA 3.0; conservare attribuzioni, licenza e indicazione delle modifiche nei dati e nel prodotto. La licenza dei dati non determina automaticamente quella del codice. [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/legalcode).
- `resources/translation/NOTICE.md` descrive Bergamot e modelli Mozilla MPL-2.0, incluso un worker modificato: verificare disponibilità del sorgente esatto e delle modifiche insieme alla distribuzione. [MPL FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/).
- Verificare inoltre runtime nativi, modelli opzionali, font, suoni, immagini e marchi. `public/music/NOTICE.md` e il catalogo dei suoni danno contesto, non sostituiscono la verifica dell'artefatto finale. Non è stato svolto un inventario legale completo delle dipendenze transitive.

## Registrazioni, materiali universitari e dati personali

Distribuire lo strumento e distribuire le lezioni sono attività diverse. Il Garante, nelle FAQ sulla scuola, ammette la registrazione per studio personale compatibilmente con le disposizioni dell'istituto; per altri usi o diffusione richiede informazione e consenso delle persone coinvolte. È un riferimento scolastico, non una licenza universitaria universale. Per esempio Bologna pubblica condizioni specifiche per le lezioni online, tra cui consenso del docente e uso individuale privato. Occorre leggere le regole dell'ateneo e del corso effettivi. [Garante: FAQ scuola](https://www.garanteprivacy.it/it/temi/scuola), [esempio istituzionale UniBo](https://www.unibo.it/it/allegati/Privacy_InfograficaRegistrazioni2020.pdf/@@download/file/Protezione-dati-personali-registrazioni-video-lezioni-esami-online.pdf).

Le eccezioni didattiche al diritto d'autore hanno condizioni: ad esempio l'art. 70-bis disciplina utilizzi sotto la responsabilità di un istituto, in luoghi o ambienti sicuri e accessibili ai destinatari indicati. «È per studenti» e «è gratis» non autorizzano indiscriminatamente la pubblicazione di slide, libri e trascrizioni altrui. [Normattiva: introduzione dell'art. 70-bis](https://www.normattiva.it/eli/id/2021/11/27/21G00192/ORIGINAL).

**Proposte concrete per la beta:** distribuire archivio vuoto o esempi sintetici; spiegare prima dell'invio AI quali dati escono dal dispositivo, verso quale provider e con quale costo; non chiedere audio o chiavi nei bug report. «Local-first» non significa «nessun invio a terzi». Se in futuro l'autore riceve telemetria, file degli utenti o ospita un servizio AI, occorre rivalutare i propri ruoli e obblighi privacy su quel flusso reale; questa ricerca non determina automaticamente tali ruoli né prescrive documenti generici scollegati dall'architettura.

## Inventario del progetto: cosa esiste e cosa manca

Ispezione statica del checkout `7266c1a`, con modifiche documentali locali preesistenti conservate. Non è un nuovo audit visuale o di sicurezza e non sostituisce prove nel pacchetto.

| Area | Evidenza locale | Conseguenza per la distribuzione |
| --- | --- | --- |
| Piattaforme | `electron-builder.yml` configura NSIS Windows x64; `package.json` offre `package:win` e portable Windows; `.github/workflows/ci.yml` esegue Windows | Mac da preparare e verificare. Nessuna promessa per Linux, Windows ARM, telefoni o tablet. |
| Benvenuto | `src/components/LectureList.tsx` contiene già Benvenuto, tre passaggi e pulsante chiave Gemini | Estendere e verificare il percorso esistente. Non serve partire da zero; la menzione Colab non deve obbligare a conoscere il flusso personale dell'autore. |
| Automazioni | `electron/main/settings.ts`: `autoProcessOnImport: false`, pubblicazione disabilitata inizialmente | Buona base per un primo avvio senza invii impliciti; verificare che l'utente capisca quando attiva automazioni successive. |
| Credenziali | `settings.ts` usa safeStorage, ma salva chiavi Gemini in chiaro quando la cifratura non è disponibile | Correggere o disciplinare esplicitamente il fallback prima della beta. Non promettere cifratura incondizionata. Su Mac provare Keychain e recupero dopo riavvio. |
| USB | `electron/main/usbDetector.ts` cerca automaticamente unità D–Z e accetta un percorso personalizzato | Su Mac iniziare dall'importazione esplicita di file/cartella; rilevamento dei volumi da adattare se richiesto. |
| Batteria | `electron/main/battery.ts` legge la percentuale soltanto su Windows | Su Mac la funzione è limitata; non è una prova che l'intera applicazione sia incompatibile. |
| Comandi Mac | Alcune scorciatoie accettano già Ctrl o Meta; `index.ts` rimuove il menu applicazione e gestisce chiusura/riattivazione Mac | Provare Cmd+C/V, menu, scorciatoie, chiusura della sola finestra, Dock, sospensione e riapertura. La riattivazione dei servizi disposti alla chiusura è un rischio da collaudare, non un bug qui riprodotto. |
| Componenti nativi | FFmpeg, ONNX/Sharp, worker PDF/RAG e runtime traduzione sono inclusi o estratti da ASAR | Installare dipendenze per OS/architettura di destinazione; provare il pacchetto reale e i modelli opzionali, non solo il renderer. |
| Aggiornamenti | Nessun `electron-updater` in `package.json`, nessun `checkForUpdates` trovato nel codice applicativo; versione ancora `0.1.0` | Progettare versioni incrementali e release. I metadati prodotti dal builder non costituiscono un updater implementato. |
| Lingue | UI e messaggi applicativi in italiano, `index.html` con `lang="it"`; README bilingue e dispense EN sono funzioni separate | Inglese dell'app richiede estrazione delle stringhe, messaggi main/IPC, date, plurali, fallback e collaudi; non basta tradurre il README. |
| Sicurezza | `index.ts`: contextIsolation attivo e nodeIntegration disattivo, ma `sandbox: false`; limiti già documentati | Completare revisione Electron e dipendenze prima del reclutamento pubblico; non attribuire uno specifico exploit senza riproduzione. |
| Verifiche | Report 25 ottobre: 739 Vitest, 24 Python, 41 Node e scenari Electron/PDF su Windows | Evidenza storica Windows, non test Mac né nuova esecuzione in questa ricerca. README ancora riferito ai 625 test del 19 ottobre: riallinearlo nella preparazione della release. |
| UX | Audit 21 ottobre, rilievi U01–U13 implementati il 22 ottobre; NVDA non verificato | Riutilizzare il lavoro esistente. Il prossimo controllo utile è con nuovi utenti, includendo tastiera/zoom/VoiceOver sul Mac scelto. |

Fonti locali: [packaging](../../electron-builder.yml), [script e dipendenze](../../package.json), [benvenuto](../../src/components/LectureList.tsx), [impostazioni](../../electron/main/settings.ts), [main](../../electron/main/index.ts), [USB](../../electron/main/usbDetector.ts), [batteria](../../electron/main/battery.ts), [audit UX](../quality/audit-ux-ui-2026-10-21.md), [verifiche 25 ottobre](../quality/pubblicazione-github-2026-10-25.md). Riferimento per la revisione proposta: [raccomandazioni ufficiali Electron](https://www.electronjs.org/docs/latest/tutorial/security).

## Percorso proposto, da scegliere prima dell'implementazione

### 1. Prova privata: una persona, un Mac, un corso

Non richiede completare tutte le funzioni pubbliche. Richiede un pacchetto adatto al Mac, profilo pulito, gestione sicura delle credenziali, istruzioni brevi, invii/costi comprensibili e un modo per recuperare i dati. Chiarire prima l'inquadramento Gemini anche per l'uso da parte di un'altra persona. Non trasferire il profilo dell'autore con chiavi, materiali, repository e preferenze personali.

Prova proposta di 7–14 giorni, senza implicare scadenze tecniche dell'app: osservare prima installazione e prima lezione, poi lasciare uso autonomo. Compiti concreti: creare un corso, importare materiale proprio autorizzato, elaborare una lezione, affiancare le slide, fare una domanda, esportare PDF, riaprire il lavoro dopo riavvio. Annotare tempo fino al primo risultato, punti in cui serve aiuto, errori, consumi e ritorno spontaneo all'app. Domande finali: quale compito ha sostituito, che cosa ha fatto perdere tempo, quando è tornata agli strumenti precedenti e perché. Il giudizio di una persona vicina è utile ma non dimostra interesse generale.

### 2. Beta piccola: 5–10 studenti maggiorenni, piattaforme dichiarate

Prima del volantino aperto, raccogliere adesioni a una beta limitata. Definire sistemi supportati, requisiti hardware/disco e chi paga le API. Criterio proposto per iniziare: una persona esterna installa e completa una lezione con la sola guida; un aggiornamento conserva l'archivio; i problemi si possono segnalare senza chiavi o contenuti privati. I numeri sono una proposta pratica, non una soglia statistica.

| Priorità proposta | Intervento | Evidenza di completamento |
| --- | --- | --- |
| Prima della beta | Licenza d'uso/open source, termini del provider, licenze del bundle | Concessione comprensibile e inventario delle componenti effettivamente distribuite. Nessuna licenza scelta in questa ricerca. |
| Prima della beta | Compatibilità, sicurezza credenziali, dipendenze e hardening Electron | Prove su sistemi dichiarati e gestione chiara dei fallimenti, senza credenziali in chiaro a sorpresa. |
| Prima della beta | Primo avvio e guida rapida | Primo risultato autonomo, con chiara distinzione locale/AI/costi e guida riapribile. |
| Prima della beta | Versioni, release e aggiornamento manuale sicuro | Installer giusto per OS/chip; versione identificabile; installazione successiva conserva dati e configurazione. |
| Prima della beta | Dati e assistenza | Percorso dati comprensibile, procedura backup/ripristino e istruzioni per feedback depurato dai dati personali; non confondere il backup del solo indice con quello delle fonti. |
| Dopo i primi riscontri | Comando verifica aggiornamenti e avviso discreto | Controllo remoto limitato alle versioni, errori di rete non bloccanti, nessun invio di documenti, note e link corretti. |
| Dopo i primi riscontri | Inglese UI e rifiniture mirate | Stringhe e messaggi coperti, preferenza persistente, scorciatoie corrette per piattaforma. Anticipare se i tester lo richiedono. |
| Successivamente | Installazione automatica degli aggiornamenti | Firma dove richiesta, pacchetti verificati, consenso al riavvio, gestione dei lavori AI e migrazioni/recupero provati. |

Benvenuto proposto: breve spiegazione del risultato, esempio sintetico facoltativo senza API, creazione corso/importazione, spiegazione dei dati inviati e del costo prima di configurare Gemini, prima elaborazione. Evitare un lungo tutorial obbligatorio; screenshot e tour aiutano, ma non sostituiscono azioni comprensibili. Scorciatoie come acceleratori: comandi visibili anche senza ricordarle, tooltip/menu con Ctrl o Cmd e riepilogo richiamabile. Una revisione completa del design va motivata dagli ostacoli osservati; non è un prerequisito già deciso.

### 3. Distribuzione universitaria e portfolio

QR o link stabile verso una pagina per utenti: cosa fa, screenshot sintetici, sistemi supportati, costi AI separati dalla gratuità dell'app, pulsante download, guida di due minuti e canale feedback. Il repository mantiene codice, test e decisioni per chi vuole approfondire; non occorre cancellare o impoverire la documentazione tecnica. Per l'affissione verificare la procedura dell'ateneo.

Racconto portfolio: problema di studio personale → alternative provate → scelte motivate → prodotto utilizzabile → prove con persone esterne → modifiche basate sui riscontri. Specificare il ruolo dell'autore e quello degli assistenti AI nello sviluppo; mostrare limiti e risultati osservabili invece di usare il solo conteggio dei test. Nessun feedback, dato di adozione o risparmio di tempo è stato ancora misurato qui. Il [piano portfolio esistente](../product/repository-portfolio-plan.md) contiene contesto storico; alcune proposte sono state superate dai README e dai materiali pubblici attuali.

La presenza di concorrenti non dimostra assenza di mercato; questa ricerca non valuta disponibilità a pagare né dimensione della domanda. L'obiettivo proposto è verificare utilità e sostenibilità del supporto per un piccolo gruppo. L'app può avere valore personale e di portfolio anche senza monetizzazione.

## Incognite e verifiche ancora necessarie

1. La prima tester usa un Mac con **M3 Pro**, come confermato dall'utente: destinazione Apple Silicon/arm64. Restano da verificare versione di macOS e possibilità di build e collaudo sul Mac reale.
2. Esito di installazione scaricata, archivio vuoto, importazione, PDF, credenziali, worker nativi e modelli su quella piattaforma.
3. Inquadramento contrattuale Gemini della distribuzione gratuita BYOK e requisiti di billing per utenti italiani.
4. Scelta esplicita della licenza del progetto e audit del pacchetto di terzi.
5. Regole dell'ateneo su registrazione, invio a servizi AI e affissione di volantini.
6. Una release riproducibile, istruzioni utente, modalità di feedback e tempi di supporto sostenibili.

Le verifiche svolte qui sono documentali. Non certificano compatibilità Mac, conformità legale complessiva, sicurezza della build o qualità didattica delle risposte AI.
