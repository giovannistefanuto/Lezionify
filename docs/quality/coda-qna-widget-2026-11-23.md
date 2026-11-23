# Coda, Q&A, aggiornamenti e widget — 23 novembre 2026

Perimetro esclusivo: voci 169–173; autorizzazione e chiarimenti in D-0593.
Release prevista Windows 0.5.0 e companion Android 0.1.2.

## Comportamento

Svuota coda interrompe il lavoro attivo e drena scritture e preparazioni,
poi salva uno stato idle privo di task e import accodati. Conserva fonti,
risultati e checkpoint granulari. Una generazione successiva è esplicita.
Gli import in preparazione sono invalidati da una revisione della coda.

Lo scheduler Gemini applica preemption alla richiesta background, mantenendo
in attesa il suo chiamante e riaccodandola davanti agli altri background.
Una domanda Q&A rinnova la scadenza di 180 secondi; nessun background riparte
prima della conclusione delle risposte attive. Limiti RPM, cooldown e quota
restano condivisi. La cancellazione manuale e l'aggiornamento prevalgono sul timer.
La richiesta fisica non completata può essere rifatta; il provider può contarla.

Aggiorna ora prepara i salvataggi renderer, conserva Q&A parziali etichettati,
poi congela IPC nuovi e arresta pipeline, richieste Gemini, raccolte, RIPETERE,
import video e richieste/indici RAG. Pubblicazioni già avviate vengono attese.
Si installa solo dopo lo scarico degli IPC precedenti, storage e log.
Un errore di preparazione lascia aperta l'app. Bozze Q&A, corsi e Sessione sono
locali e ripristinabili; le credenziali non sono salvate nelle bozze browser.

Pausa Home mantiene durate e accessibilità, con font 12px e minore enfasi.
Android usa la data corrente nel fuso dello snapshot per oggi/settimana/mese;
la cache e le lezioni rimanenti sono preservate. Allarme locale non esatto,
eventi calendario e aggiornamenti periodici non richiedono permessi aggiuntivi.

## Verifiche mirate

- 76 test su scheduler, pipeline e updater passati prima delle ultime regressioni aggiuntive; il gate definitivo riporta il totale corrente.
- Prova isolata import multipli passata; un timeout iniziale sotto carico non si è riprodotto nella suite ripetuta (76/76).
- Electron reale: updater con hash errato e publisher errato rifiutati; download e installazione espliciti, nessuna esecuzione del pacchetto sintetico.
- UI Electron: pausa compatta, Svuota coda serializzato, domanda e risposta parziale salvate prima dell'aggiornamento, errore di salvataggio bloccante e riavvio con viste aperte.
- Java: cambio giorno, lunedì, mese, anno, date intorno all'ora legale, giorni futuri e cache vuota.
- APK 0.1.2 compilato con Android SDK 35 e firma debug locale verificata.
- Emulatore Android API 36.1 avviato in sola lettura: APK originale 0.1.2 installato e aperto. Fixture con gli stessi bytecode/risorse e solo debuggable abilitato nel manifest per l'iniezione della cache: ieri 1h, oggi zero, settimana nuova zero, mese 1h e sette lezioni residue conservate. Fixture esclusa dalla distribuzione; emulatore chiuso senza salvataggio.
- Gate iniziale: 983 test unitari e periodi Java passati; fallimento del test raccolte perché il backend aveva due generazioni ma il renderer non aveva ancora completato il polling. Il test ora attende il selettore versioni con limite esplicito e stessa asserzione, senza modificare la funzione raccolte.
- Protezione estesa a dati della sessione, appelli e ripristino del pannello; dialogo updater nativo sopra altri editor modali. Regressioni Electron dedicate passate.
- Typecheck e lint da ripetere nel gate definitivo.

## Limiti

Nessuna chiamata AI con dati personali. Nessuna installazione sul profilo
Windows reale e nessun test UAC/SmartScreen o upgrade in Windows temporaneo.
Gli aggiornamenti Android possono essere differiti dal sistema in sospensione.
Il Q&A resta dipendente da rete, quote e provider. La parte non salvata della
richiesta interrotta non viene presentata come risultato completo.

## Isolamento dello scenario Sessione compilato

Il secondo gate ha raggiunto build e collaudi raccolte, poi è scaduto nel
segmento Full Focus. La copia diagnostica del launcher ha localizzato l'attesa
alla richiesta fullscreen: non era garantita una finestra attiva e i timer
potevano essere rallentati in background. Una fixture con background throttling
disattivato e show/focus prima della richiesta, con gli stessi bytecode e le
stesse asserzioni, ha passato entrambi i processi in circa 25 secondi.
Il launcher definitivo imposta quelle sole precondizioni; non modifica timer,
visibilità, conteggio o regole di pausa in produzione. Nessun timeout esteso
nel gate e nessuna asserzione rimossa.

## Release

Sorgenti definitivi: typecheck, lint, 983 test unitari e periodi Java passati.
Completati separatamente dopo il blocco hardware: RAG, 49 Python, 41 Node,
updater reale/UI, tutti gli scenari React/Electron, raccolte con due processi,
Sessione smoke e compilata con riavvio, esportazioni PDF reali.

Il controllo nativo Bluetooth ora fallisce: BluetoothFindFirstDevice restituisce
Win32 6, BluetoothFindFirstRadio restituisce 259 (nessuna radio disponibile).
I servizi risultano attivi ma Windows non espone una radio. Il probe invariato
aveva superato i gate precedenti della stessa sessione; il confronto con
SetLastError azzerato ha confermato che non si tratta di un errore residuo.
Nessuna modifica a hardware, driver, servizi o criteri del test. Riattivazione
richiesta all'utente; packaging/pubblicazione Windows ancora bloccati dal gate.

APK Android originale: 42.039 byte, SHA256
`d56319470d024191d1d1a87d90176ea9069b984cefcd44e9b38798c0a8c86b62`.
La fixture debuggabile è separata e non distribuibile. L'APK originale mantiene
la firma del companion 0.1.1. Pubblicazione Android indipendente in preparazione.
