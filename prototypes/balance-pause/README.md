# Prototipo Balance: nucleo allarme e conferme

Stato: **nucleo eseguibile e collaudato con adattatori simulati; non è una mini
app installabile né una connessione PC–orologio funzionante**. Il report esterno
avviato dall'utente è ancora atteso. Nessuna associazione o sostituzione di Zepp.

Compromessi autorizzati il 15 ottobre: apertura mini app una volta per sessione,
telefono durante l'invio, minuto anziché countdown preciso, vibrazione breve
con stop automatico. Non implicano approvazione di cambiare companion.

`alarm-core.mjs` implementa validazione del comando, deadline arrotondata al minuto
successivo, creazione alarm prima dell'ACK, retry idempotenti, conflitti ID,
scadenza e rollback quando il salvataggio fallisce. Conserva otto ID. Gli alarm
precedenti non vengono cancellati quando ne arriva uno nuovo: non sostituire una
pausa sul watch senza un comando esplicito. Il PC deve mostrare ora effettiva e
stato in attesa; solo SCHEDULED/DUPLICATE con comando e scadenza corrispondenti
consentono di indicare la programmazione. L'ACK non dimostra che il polso vibrerà.

Adattatori da realizzare/provare sul dispositivo:

- `read` / `write`: memoria locale persistente della mini app; `write` deve
  completare prima dell'ACK e non nascondere errori.
- `setAlarm`: API `set` di `@zos/alarm`, permission `device:os.alarm`. La documentazione
  supporta `time` in secondi UTC, `store` e apertura di App Service; `0` indica errore.
  Verificare il percorso effettivo compilato del servizio prima dell'installazione.
- `cancelAlarm`: annulla esclusivamente l'ID appena creato durante rollback.
- `signalPauseEnd`: adattatore del Vibrator con costante
  `VIBRATOR_SCENE_DURATION_LONG`, scena finita documentata da 1000 ms. Iniettare
  l'istanza e la costante; non usare un timer JS per fermare la vibrazione.

Fonti ufficiali ricontrollate il 15 ottobre:
[alarm.set](https://docs.zepp.com/docs/reference/device-app-api/newAPI/alarm/set/),
[Vibrator](https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/Vibrator/).

## Blocco concreto per l'integrazione

Resta da dimostrare un trasporto ricevente che sopravviva all'uscita dalla mini app
dopo la singola apertura autorizzata. `mst*` non è ammesso nell'App Service.
Il canale Zepp Device App/Side Service non costituisce già un listener dal PC.
Non aggiungere un pulsante che dichiari invio riuscito simulando questo passaggio.
Gadgetbridge ha comandi nativi al minuto ma implica autenticazione e possibile
cambio companion, che non è stato scelto dall'utente. Evitare reset del watch.

La ricerca dell'utente deve chiarire: ingresso PC/telefono → watch dal quadrante,
vita del Side Service dopo chiusura pagina, ACK dopo programmazione, API minime
reali, installazione con Zepp presente e prova dopo riavvio. Una volta disponibile
un percorso dimostrato, collegare il nucleo al trasporto e al timer pausa Electron.
Prove hardware: schermo spento, quadrante, telefono scollegato dopo ACK, Non
disturbare, reboot, ritardi, duplicati, due pause, ritorno anticipato sul PC.

Test: `npx vitest run tests/unit/balanceAlarmPrototype.test.ts`.
