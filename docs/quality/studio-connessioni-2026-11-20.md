# Studio, Q&A e connessioni — 20 novembre 2026

Decisione di riferimento: D-0588.

## Perimetro e scelte confermate

Autorizzati insieme implementazione delle voci 165–167, ripresa della 33,
connessione cuffiette (137), avvisi alimentazione e pubblicazione della release.
L'utente approva avvisi silenziosi di 5 secondi nell'intera app, preferenze
separate e nome predefinito EarFun Air Pro 4. Approva record di giorno,
settimana, concentrazione e serie con soglia di 10 minuti; escluso il record di
velocità della lezione. Non è un'invocazione LISTA_ORDINE.

## Ricerca e soluzioni

### Ragionamento Q&A

La [documentazione Gemini sul thinking](https://aistudio.google.com/docs/thinking)
descrive livelli diversi per modello. Anche
[Gemini 3.7](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-3-7-flash)
e [Gemini 3.5 Flash](https://deepmind.google/models/model-cards/gemini-3-5-flash/)
supportano ragionamento configurabile. Per i modelli 2.5 vengono usati i budget
token: [Flash arriva a 24576](https://developers.googleblog.com/start-building-with-gemini-25-flash/).
La [guida Firebase](https://firebase.google.com/docs/ai-logic/thinking) distingue
livelli e budget della famiglia 2.5; Pro usa 32768, Flash e Flash-Lite 24576.

Il difetto riprodotto era nella policy: Pensa di più sostituiva Hydrogen con
Flash-Lite, mentre altre scelte configurate erano usate soltanto come riserve.
`shared/qnaModelPolicy.ts` ora rispetta il modello scelto sia nella modalità
ordinaria sia in quella approfondita. Nessuna modifica alla catena per generare
le dispense. I fallback Q&A conservano la compatibilità del ragionamento;
la risposta memorizza modello e ragionamento effettivi. Un eventuale modello
non verificato non espone l'opzione come disponibile.

### Record

La [meta-analisi di Sailer e Homner](https://doi.org/10.1007/s10648-019-09498-w)
segnala effetti variabili della gamification e limiti dell'evidenza. Non prova
che uno specifico record migliori l'apprendimento. La scelta di prodotto è
quindi un confronto personale sul tempo già registrato, senza classifiche
competitive, premi per velocità o penalità per interruzioni.

`shared/studyRecords.ts` usa giorni locali e settimane lunedì-domenica,
gestendo il cambio dell'ora senza durate fisse di 24 ore. I record escludono
date future, mantengono la prima data in parità e applicano la soglia di 600
secondi alla serie. Finché oggi è sotto soglia, la serie fino a ieri resta
disponibile. La concentrazione deriva dai segmenti osservati e dagli eventi
di sistema, non dalla durata dichiarata delle sessioni. Sono conservate le
interruzioni e la continuità degli intervalli a cavallo della mezzanotte;
le sessioni rettificate senza posizione certa sono escluse da questo record.

### Cuffiette e alimentazione

Microsoft distingue [connessione, ricordo e autenticazione del dispositivo](https://learn.microsoft.com/en-us/windows/win32/api/bluetoothapis/ns-bluetoothapis-bluetooth_device_info_struct).
Il probe usa `BluetoothFindFirstDevice`/`BluetoothFindNextDevice` con
`fReturnConnected`, ricontrolla `fConnected` e non esegue inquiry. Una sola
PowerShell nascosta ospita le chiamate Win32 e invia campioni JSON in memoria.
Non viene installata alcuna dipendenza; nessun inventario, nome o indirizzo
viene scritto nei log. Il processo si chiude con la finestra.

Gli [eventi powerMonitor di Electron](https://www.electronjs.org/docs/latest/api/power-monitor)
`on-ac` e `on-battery` rappresentano le transizioni dell'alimentazione.
L'avviso batteria scarica esistente resta disponibile. Il portale delle nuove
notifiche segue il fullscreen, non accetta clic e non sposta il focus. Le
anteprime sono etichettate e non cambiano lo stato dei dispositivi.

## Ctrl+L: evidenza e limite

L'utente riferisce una cornice gialla attorno al testo in Full Focus, senza
cambio lingua. Il sintomo personale non è stato acquisito né attribuito a un
programma esterno. Le prove storiche restano in
[diagnosi del 16 ottobre](ctrl-l-diagnosi-2026-10-16.md).

`electron/main/languageShortcut.ts` intercetta il comando prima dei default
Chromium quando il renderer abilita la lettura Full Focus. Il renderer verifica
comunque disponibilità delle lingue, campi editabili, dialoghi visibili e pausa;
il comando non viene eseguito due volte. Sono aggiunti tasto fisico KeyL e
gestione in cattura per il percorso DOM. Un dialogo nascosto non blocca più
il comando. La diagnostica facoltativa include la nuova consegna nativa.

Prove native Electron: testo, selezione, barra, PDF reale, fullscreen HTML,
intera App, dialogo nascosto, controllo che consuma il comando per evidenziare
il pannello, L fisica con carattere di controllo e conservazione della bozza.
La simulazione del controllo che evidenzia il pannello verifica una protezione;
non dimostra la causa dell'episodio personale. Voce 33 ancora aperta per questa
conferma, senza bloccare le altre funzionalità della release.

## Collaudi e ripresa

- Test Q&A inizialmente rossi sul modello sostituito; ora il trasporto SDK è
  verificato per tutti gli undici modelli selezionabili, configurazione thinking,
  fallback, storico, allegati e cancellazione. Nessuna richiesta AI reale.
- Test record: soglia, giorni mancanti, cambio ora, settimane, parità, date
  future, corsi archiviati, rettifiche, osservazioni e pause.
- Test runtime: nomi di eventi di alimentazione, preferenze, campioni Bluetooth,
  stato non disponibile e rimozione dei listener. Persistenza delle preferenze
  verificata dopo riapertura e salvataggio di altre impostazioni.
- `node tools/check_device_notices.cjs`: probe Win32 reale in sola lettura,
  senza riportare inventario. Il sandbox non consente il probe; passato con
  il normale runtime Windows. Nessuna connessione fisica forzata.
- `node tools/run_hook_regressions.cjs --november20-only`: passato su profilo
  temporaneo. Pausa preset/libera, scadenza e ritorno esplicito, record vuoti e
  popolati nei due temi e a 390 px, notifiche di 5 secondi senza focus, portale
  fullscreen, impostazioni, Q&A e Ctrl+L nativo. Schermate sintetiche in
  `local-artifacts/november20-screenshots/`, escluse da Git.

Per la verifica residua Ctrl+L usare la nuova release e, se l'episodio persiste,
la diagnostica locale facoltativa già predisposta. Non ripetere semplicemente
i tentativi storici senza acquisire l'esito della consegna nativa.

Gate finale e verifica dei binari vengono registrati dopo la preparazione
completa, senza riutilizzare rapporti di build precedenti.

## Diagnosi del primo gate completo

Superati 977 test unitari, 49 Python, 41 Node, RAG offline, updater, scenari
React/Electron, build e raccolte compilate. Il primo gate si ferma in Sessione
compilata su `study did not start`. La ripetizione isolata conferma il difetto
della fixture: finestra attiva, fullscreen presente, due elementi modali
`repetition-overlay` / `recorder-choice`, nessuna Sessione aperta. Il rilevamento
USB stava consultando il registratore fisico collegato al PC e apriva il suo
pannello, sospendendo correttamente lo studio.

D-0589 isola il rilevamento USB nel solo launcher sintetico, senza modificare
le API o le condizioni del timer in produzione. Un'asserzione verifica
l'assenza del dispositivo nella fixture. Scenario compilato, sospensione e
ripresa, revisione confermata dopo riavvio passano; i test USB dedicati restano
inalterati. Il gate completo viene ripetuto, senza ridurre le verifiche.

## Dialoghi HTML nativi e Ctrl+L

Nella revisione finale è stata aggiunta una prova con un vero `dialog.showModal()`:
il test era rosso perché il selettore riconosceva solo attributi ARIA espliciti.
D-0590 include `dialog[open]` tra gli ostacoli al cambio lingua. La prova nativa
passa dopo la correzione e ora fa parte anche del percorso completo del gate.
La preparazione precedente è stata fermata prima del packaging; nessun installer
0.4.0 era stato prodotto o distribuito. Si riparte con un profilo completo sui
sorgenti finali. Questo difetto riprodotto resta distinto dalla cornice gialla
personale, per la quale non si attribuisce una causa senza evidenza.

## Gate e pacchetto finali

D-0591: `npm run release:local`, profilo completo, terminato con `complete: true`
e tutti i passaggi a uscita 0. Gate: 977 test unitari in 87 file, 49 Python,
41 Node, RAG offline, updater, scenari React/Electron compreso Ctrl+L nativo,
raccolte e Sessione su app compilata con riavvio, PDF reali. Nessun controllo
omesso. Gate 261,28 s; packaging 196,11 s; validazione asset 1,50 s, payload
NSIS 17,14 s, verifica installer 4,27 s.

Rapporto locale ignorato:
`local-artifacts/release-20261120-134304/report.json`.
Verificati 385 file di build nel pacchetto, nove componenti NSIS, tre backup,
assenza di artefatti privati e runtime corrispondente. Il controllo aggiuntivo
nell'ASAR conferma probe Win32, canali delle notifiche e percorso Ctrl+L nel
main e nel preload ESM. Audit Start passato anche dopo i collaudi compilati.

Setup `Lezionify-Setup-0.4.0.exe`: **300545797 byte**;
SHA256 `be7e1dc0a38d36f60272083c3cecb191962c0771fb47911c4c8c19b87b081e40`.
ASAR SHA256 `a6a9334083f96a5f459a062a16f1c4f6020154ac1b75299d4b05b34b4f3e2dcc`.
Firma effettiva **NotSigned**, non dedotta dal messaggio di signtool.
Installer non eseguito; upgrade temporaneo Windows, UAC e SmartScreen non
collaudati. Le limitazioni su prove AI e connessioni fisiche restano dichiarate.

Le ultime schermate sintetiche sono state rigenerate e verificate nei due temi;
il percorso mirato November20 e Ctrl+L è passato anche dopo il packaging, senza
modificare sorgenti o ricostruire la build.
