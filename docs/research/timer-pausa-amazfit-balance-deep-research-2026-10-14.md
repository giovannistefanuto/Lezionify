# Fattibilità di un timer pausa offline Lezionify → Amazfit Balance originale

Ricerca aggiornata al **14 ottobre 2026**, riferita specificamente ad **Amazfit Balance originale** con Zepp OS 4 e firmware indicato `3.28.50.1`, non al Balance 2.

## Verdetto esecutivo

Il risultato più importante è netto: **l’architettura diretta PC ↔ Amazfit Balance è tecnicamente realizzabile con API pubbliche solo se il Balance agisce da BLE Central e Windows da BLE Peripheral/GATT Server; tuttavia, sul Balance originale le API BLE Central `mst*` non sono utilizzabili dentro un App Service**. Poiché l’App Service è proprio il meccanismo Zepp OS che continua a vivere quando l’utente abbandona la mini app e torna al quadrante, questo impedisce di documentare come fattibile l’esperienza completa «watch sul quadrante → comando dal PC → ricezione silenziosa in background» richiesta dal collaudo decisivo. Zepp OS documenta espressamente che gli App Service sopravvivono all’uscita dalla Device App, ma che le API BLE il cui nome inizia con `mst` sono escluse. citeturn17view0turn18view0

La parte **successiva alla ricezione**, invece, è molto più promettente. Il Balance originale è elencato da Zepp con **Zepp OS 4.0 e API_LEVEL massimo/corrente 3.7**, mentre il Balance 2 è un dispositivo diverso, API_LEVEL 4.2 / Zepp OS 5.0. Il Balance originale dispone quindi, a livello di modello, delle API BLE Central introdotte a 3.0, degli alarm persistenti introdotti a 3.0 e delle API avanzate del vibratore introdotte a 3.6. citeturn18view1turn22view1turn23view5turn24view0

**Non si può però dedurre da “Zepp OS 4” che il dispositivo abbia API_LEVEL 4.0.** Zepp definisce API_LEVEL come garanzia di disponibilità delle API per uno specifico firmware e lo considera separato dalla versione Zepp OS; per il Balance originale la tabella ufficiale si ferma a 3.7. L’API `createSysTimer`, particolarmente interessante per un callback temporizzato in background indipendente dallo schermo, richiede invece API_LEVEL 4.0: quindi **non va progettata per questo Balance**. citeturn18view2turn18view1turn15search0

Per il firmware specifico `3.28.50.1` non ho trovato in documentazione primaria una matrice pubblica firmware→API_LEVEL che permetta di affermare con certezza che quel firmware esponga 3.7. Il primo prototipo deve leggere direttamente:

```ts
import { getSystemInfo } from '@zos/settings'

const info = getSystemInfo()
// info.osVersion
// info.firmwareVersion
// info.minAPI
```

`getSystemInfo()` restituisce ufficialmente `osVersion`, `firmwareVersion` e `minAPI`. Per questa ricerca la disponibilità di API_LEVEL ≥3.6 sul firmware esatto va quindi classificata **“da verificare sul dispositivo”**, non semplicemente dedotta dalla stringa del firmware. citeturn24view1turn18view2

### Verdetto per le due famiglie di soluzione

| Soluzione | Offline | Riceve dal quadrante con mini app chiusa | Telefono necessario durante l’uso | Timer autonomo dopo ACK | Interazione watch | Verdetto |
|---|---:|---:|---:|---:|---|---|
| **PC GATT Server → Balance BLE Central `mst*`** | Sì | **No, non documentato/supportato via App Service** | No | **Sì, progettualmente con `@zos/alarm`** | Mini app deve essere attiva almeno al momento della ricezione | **Parzialmente fattibile**. Il limite di background impedisce l’UX completa. citeturn22view0turn18view0turn23view5 |
| **PC BLE Central → Balance custom GATT Peripheral** | Potenzialmente sì | Sarebbe ideale | No | — | Nessuna | **Non supportato dalle API pubbliche trovate**: Zepp documenta Central `mst*`, non un server GATT custom/advertiser per mini app. citeturn22view0turn22view1 |
| **PC → Android BLE → Balance generic GATT `mst*`** | Sì | **No** | Sì | Sì dopo ricezione | Stesso problema: app watch attiva | **Non migliora il collo di bottiglia** rispetto al collegamento diretto. citeturn18view0turn19search1 |
| **PC → Android → Zepp Side Service → watch** | Potenzialmente sì | Potenzialmente compatibile col background watch | Sì al momento del comando | Sì dopo ricezione | Potenzialmente nessuna | **End-to-end non accertato**: manca un ingresso offline pubblico/documentato da un’app Android arbitraria verso il Side Service Zepp. citeturn17view6turn17view7turn20search0 |
| **Notifica Android inoltrata al watch** | Sì | Sì come semplice notifica | Sì | **No** se il telefono viene spento prima della scadenza | Nessuna | **Non soddisfa il requisito**: un alert non equivale a un timer autonomo sul Balance. |
| Server Internet / cloud | No rispetto al vincolo | Possibile tramite Side Service | Sì | Possibile | Variabile | **Escluso dai vincoli**. Il Side Service è documentato per `fetch` verso server esterni. citeturn17view6 |

In altre parole, **la parte “timer sul watch” è costruibile; la parte realmente bloccante è “come consegnare il comando al watch mentre l’app watch non è in primo piano”**.

Stato delle conclusioni principali:

| Conclusione | Versione minima | Stato |
|---|---:|---|
| Original Balance: Zepp OS 4.0, API_LEVEL fino a 3.7 | modello specifico | **Documentato**. citeturn18view1 |
| BLE Central/GATT client sul watch con API `mst*` | API_LEVEL 3.0 | **Documentato**. citeturn22view0turn22view1turn22view2 |
| `mst*` non disponibile negli App Service | App Service, Zepp OS v3+ | **Documentato; ostacolo decisivo**. citeturn18view0 |
| Alarm persistente capace di svegliare un App Service | API_LEVEL 3.0 | **Documentato**. citeturn23view5 |
| `setTimeout` in App Service | — | **Esplicitamente non disponibile**. citeturn18view0 |
| `createSysTimer` utilizzabile sul Balance originale | richiede 4.0 | **No**, perché il modello è 3.7, salvo cambiamento futuro della compatibilità ufficiale. citeturn15search0turn18view1 |
| Vibrazione programmabile con sequenze `Action` | API_LEVEL 3.6 | **Documentata**, ma non è documentata la garanzia specifica «~10 s dopo terminazione del servizio». citeturn24view0 |
| Ricezione diretta PC→watch dal quadrante | — | **Non supportata con l’architettura `mst*` pubblica**. citeturn18view0 |
| Coesistenza simultanea Zepp-phone + watch Central verso PC | — | **Ipotesi da collaudare sul Balance originale**. |
| Side Service come ponte da un’app Android arbitraria, totalmente offline | — | **Non accertato / nessuna API pubblica di ingresso trovata**. citeturn17view6turn17view7 |

## Compatibilità effettiva del Balance originale

### Zepp OS 4 non significa API_LEVEL 4

Questo punto cambia in modo sostanziale il progetto. La documentazione Zepp spiega che API_LEVEL è una versione di compatibilità delle JS API associata al firmware; l’esempio ufficiale mostra persino un firmware con un proprio numero di versione che espone un API_LEVEL completamente diverso. È quindi API_LEVEL, non la stringa “Zepp OS 4”, che deve governare i feature gate della mini app. citeturn18view2

Per il **Balance originale**, la tabella ufficiale riporta:

- `API_LEVEL 3.7`;
- `Zepp OS 4.0`;
- display `480×480`;
- supporto SecondaryWidget;
- identificativi `8519936`, `8519937`, `8519939`.

La stessa tabella mette separatamente il **Balance 2** a API_LEVEL 4.2 / Zepp OS 5.0. Quindi non è corretto trasferire sul Balance originale funzionalità viste sul Balance 2. citeturn18view1

Questo implica per Lezionify un `minVersion` progettuale almeno **3.0** per BLE Central + alarm; se si vuole tentare la sequenza avanzata del vibratore, il target pratico diventa **3.6**. Prima di abilitare quella variante, il codice deve leggere `getSystemInfo().minAPI`. citeturn22view1turn23view5turn24view0turn24view1

L’API_LEVEL 3.7 del modello è sufficiente anche per `Vibrator.start(Array<Action>)`, introdotto a 3.6, ma **non** per `createSysTimer`, che parte da 4.0. Quest’ultimo viene descritto da Zepp come timer di sistema utilizzabile negli App Service e indipendente dallo stato dello schermo: sarebbe quasi esattamente ciò che servirebbe per controllare una durata haptica in background, ma sul Balance originale non può essere assunto disponibile. citeturn24view0turn15search0turn18view1

La versione algoritmo `18.10.91.06` non compare nelle fonti developer come discriminante per la disponibilità delle JS API; ai fini del prototipo il discriminante documentato è `minAPI`. Pertanto non userei la versione algoritmo per fare feature detection. citeturn18view2turn24view1

## Collegamento diretto Windows ↔ Balance

### Direzione corretta: Balance Central, Windows Peripheral

Zepp OS v3 ha introdotto esplicitamente la possibilità per il watch di agire da **Master/Central BLE** e di connettersi a dispositivi Peripheral, lavorando poi sui loro servizi e characteristic GATT. Sono esattamente le primitive necessarie per trattare il PC come dispositivo BLE esposto a Lezionify. citeturn22view0

Le API essenziali sul watch sono tutte da API_LEVEL 3.0:

```text
mstStartScan
    ↓
mstConnect
    ↓
mstBuildProfile
    ↓
mstPrepare / callback relativi al profilo
    ↓
mstWriteDescriptor     // iscrizione alle notifiche della characteristic PC
mstOnCharaNotification // ricezione comando dal PC
mstWriteCharacteristic // ACK dal watch verso il PC
```

`mstStartScan()` può filtrare direttamente per `service_uuid`; il risultato espone indirizzo del dispositivo, RSSI e service UUID. `mstConnect()` utilizza l’indirizzo BLE del Peripheral. `mstBuildProfile()` crea il profilo GATT e le API di read/write/descriptor e notification permettono la comunicazione bidirezionale. citeturn22view2turn22view1turn22view3turn22view5turn15search7

Sul PC Windows può ufficialmente comportarsi da **GATT Server BLE**. Microsoft documenta `GattServiceProvider`, `GattLocalCharacteristic`, custom UUID a 128 bit, characteristic leggibili/scrivibili/notificabili, subscription dei client e `NotifyValueAsync()` per spingere un valore ai client iscritti. Il server può inoltre ricevere una scrittura dal client attraverso l'evento `WriteRequested`. citeturn18view4turn23view0turn23view1turn23view2

Per Lezionify definirei un servizio molto piccolo:

```text
Lezionify Timer Service
│
├── Command characteristic
│   Properties: Notify
│   Windows → watch
│
└── ACK characteristic
    Properties: Write / WriteWithResponse
    watch → Windows
```

Dopo la sottoscrizione del Balance, il click su “Pausa 15 min” produce un `NotifyValueAsync(command)`. Il watch lo riceve tramite `mstOnCharaNotification`, crea l’alarm locale e **solo se la creazione dell’alarm ha avuto successo** scrive l’ACK con `mstWriteCharacteristic`. Windows intercetta tale scrittura con `GattLocalCharacteristic.WriteRequested`. Tutti i mattoni GATT di questo flusso sono documentati sui due lati. citeturn18view4turn23view1turn23view2turn15search7

### Il PC deve supportare davvero il ruolo Peripheral

Il fatto che un adattatore supporti Bluetooth o BLE non è sufficiente. Microsoft afferma esplicitamente che **il ruolo Peripheral è hardware-dependent** e mette a disposizione `BluetoothAdapter.IsPeripheralRoleSupported` proprio per verificarlo. La stessa classe espone `IsLowEnergySupported` e `IsCentralRoleSupported`. citeturn17view4turn17view5

La diagnostica minima del prototipo Windows dovrebbe quindi eseguire qualcosa di equivalente a:

```csharp
using Windows.Devices.Bluetooth;

BluetoothAdapter? adapter = await BluetoothAdapter.GetDefaultAsync();

Console.WriteLine($"Adapter: {adapter?.DeviceId}");
Console.WriteLine($"BLE:        {adapter?.IsLowEnergySupported}");
Console.WriteLine($"Peripheral: {adapter?.IsPeripheralRoleSupported}");
Console.WriteLine($"Central:    {adapter?.IsCentralRoleSupported}");
```

Per l'architettura raccomandata servono almeno:

```text
IsLowEnergySupported     == true
IsPeripheralRoleSupported == true
```

e la prova conclusiva non deve fermarsi ai flag: deve creare davvero un `GattServiceProvider`, aggiungere le characteristic e iniziare l’advertising. Microsoft documenta la creazione tramite `GattServiceProvider.CreateAsync()` e la pubblicazione del servizio GATT. citeturn17view4turn23view0

Le API in questione risalgono alla famiglia Windows 10 Creators Update / build `15063`; il tuo briefing lascia ancora da accertare build Windows e adattatore Bluetooth, quindi entrambi vanno inclusi nel “capability probe”. La documentazione Microsoft indica per `BluetoothAdapter` l’introduzione in Windows 10 `10.0.15063.0`. citeturn17view4

### Electron non è il posto giusto per esporre il server GATT

Electron documenta Web Bluetooth attraverso `navigator.bluetooth.requestDevice()` e il meccanismo `select-bluetooth-device`: è il modello in cui l’app accede a un dispositivo Bluetooth remoto. La documentazione Electron non offre un’API Web Bluetooth per pubblicare un GATT Server locale. Windows, invece, lo supporta tramite le API WinRT `Windows.Devices.Bluetooth.GenericAttributeProfile`. citeturn23view3turn18view4

La soluzione minima e pulita è quindi:

```text
Lezionify Electron
       │
       │ IPC locale
       ▼
lezionify-ble-helper.exe
C#/.NET Windows oppure C++/WinRT
       │
       │ Windows.Devices.Bluetooth
       ▼
GattServiceProvider
       │
       │ BLE
       ▼
Amazfit Balance
```

Non serve integrare subito un native Node addon nel processo Electron. Un helper minuscolo, avviato da Electron e comandato via stdin/stdout, named pipe o socket locale, separa completamente l’ABI Electron dalla parte WinRT. Per il percorso più conservativo su Windows, il helper può essere distribuito packaged/MSIX con la capability `bluetooth`, che Microsoft richiede nella documentazione del GATT server. citeturn18view4

### La direzione opposta non è una valida alternativa pubblica

L’idea **PC Central → watch Peripheral con servizio GATT custom sul Balance** sarebbe in realtà ideale: permetterebbe al PC di cercare direttamente il watch. Tuttavia, nell’API pubblica Zepp esaminata sono documentate le primitive `mst*` per rendere il watch Central; non emerge un equivalente pubblico per fare advertising di un servizio GATT custom, creare characteristic server e rispondere a un Central esterno. La guida Zepp descrive esplicitamente il potenziamento introdotto in Zepp OS v3 come possibilità del watch di agire da Master/Central. citeturn22view0turn22view1

In particolare, **`createConnect` e `send` non sono una scorciatoia per collegarsi a un PC**. La documentazione Zepp dice esplicitamente che il modulo BLE “normale” serve alla comunicazione tra **Device App e Side Service**; `createConnect()` crea quel canale e `send()` manda dati su quel canale. Anche l’architettura ufficiale mostra BLE fra Device App sul watch e Side Service dentro Zepp sul telefono. citeturn24view3turn17view6

Quindi:

> `mst*` = accesso Central/GATT generico a un Peripheral arbitrario.  
> `createConnect/send` = trasporto Device App ↔ Zepp Side Service.

Confondere i due produrrebbe un’architettura che sulla carta sembra eliminare il telefono ma in realtà non lo fa. citeturn24view3turn22view0

### Coesistenza con Zepp sul telefono

Zepp documenta che storicamente il telefono opera da Master e il watch da Peripheral, mentre da Zepp OS v3 il watch può anche assumere il ruolo Master verso altri dispositivi. Questo rende **plausibile** tenere il normale collegamento Zepp-phone e contemporaneamente un secondo collegamento watch→PC. citeturn22view0

Tuttavia non ho trovato una garanzia primaria specifica per **Balance originale + firmware 3.28.50.1** relativa a due connessioni contemporanee nei ruoli opposti, né limiti sul numero di link simultanei. Di conseguenza:

**Stato: ipotesi da collaudare.**

Non progettarei alcuna procedura di disassociazione, factory reset o sostituzione della connessione Zepp. Il test corretto è mantenere il Balance normalmente connesso al Redmi/Zepp, aprire la mini app Lezionify, collegarsi contemporaneamente al GATT server del PC e verificare che sincronizzazione e notifiche Zepp continuino a funzionare.

## Ricezione in background, timer e vibrazione

### Il vero showstopper è la ricezione con app chiusa

La guida App Service dice che, prima di Zepp OS v3, uscire dalla Device App distruggeva l’intera mini-app; App Service è stato introdotto proprio per poter eseguire codice senza UI anche dopo l’uscita della pagina. Un servizio può essere avviato in modalità continua con `@zos/app-service.start()` e, una volta avviato, resta in esecuzione dopo l’uscita dalla UI. citeturn17view0turn24view2

Ma la tabella delle limitazioni contiene la restrizione cruciale:

- `setTimeout` e le altre timer interface globali: **NO**;
- UI: **NO**;
- BLE: sì **eccetto le API il cui nome inizia con `mst`**;
- notification: sì;
- vari sensori a basso consumo: sì. citeturn18view0

Quindi non è possibile trasformare semplicemente questo schema:

```text
Device App:
mstConnect()
mstOnCharaNotification(...)
```

in:

```text
App Service:
mstConnect()                 // non disponibile
mstOnCharaNotification(...)  // non disponibile
```

e ottenere la ricezione sul quadrante. citeturn18view0turn22view1

Questo risponde distintamente ai tre livelli richiesti:

| Funzione | Con GATT diretto `mst*` |
|---|---|
| **Ricevere il comando dal PC** con Device App aperta | Sì, documentato. citeturn22view0turn22view1 |
| **Riceverlo con watch sul quadrante / Device App chiusa** | **No tramite App Service `mst*`**, restrizione documentata. citeturn18view0 |
| **Avviare e rendere autonomo il timer dopo che il comando è già arrivato** | Sì, tramite alarm persistente. citeturn23view5 |
| **Aprire automaticamente la UI del countdown dal background** | Non risulta supportato: App Service non ha UI e Zepp dice che il suo unico canale verso la vista utente è System Notification. citeturn18view0turn24view4 |

Un widget o SecondaryWidget non risolve questa limitazione: il fatto che il Balance supporti SecondaryWidget riguarda una superficie UI del modello, non estende il set di API consentite a un App Service. Il vincolo `mst*` rimane quello documentato per il contesto di background. citeturn18view1turn18view0

Esiste una possibilità pratica da **collaudare, non da considerare garantita**: aprire la mini app Lezionify sul watch una volta all’inizio della sessione e lasciare che lo schermo si spenga senza esplicitamente tornare al quadrante. Va verificato sperimentalmente se la Device App e il link `mst*` restano vivi nelle condizioni reali di screen-off. Anche qualora funzionasse, non soddisfarebbe il collaudo richiesto con il **quadrante visibile**, ma potrebbe ridurre l’interazione a una sola apertura per sessione.

### L’App Service persistente non è gratuito

Per un App Service continuo è necessario il permesso:

```text
device:os.bg_service
```

e Zepp richiede anche una richiesta di autorizzazione interattiva all’utente. Inoltre il sistema garantisce **una sola istanza di App Service continuamente in esecuzione**; se più servizi entrano in conflitto, viene mostrata una UI perché l’utente scelga quale far funzionare. citeturn17view0turn18view0turn24view2

Questo è importante anche dal punto di vista della batteria e dell’UX. Non conviene riservare un servizio persistente per Lezionify se la parte che interesserebbe mantenere viva — il BLE Central `mst*` — è comunque proibita lì. Un servizio persistente può avere senso per altre logiche, ma non rimuove l’ostacolo principale. citeturn18view0

La documentazione non fornisce consumi in mAh specifici per Balance per questa configurazione. Nel prototipo conviene quindi evitare scansioni continue: eseguire `mstStartScan` solo durante connessione/riconnessione e, se il link foreground risulta stabile, mantenere la connessione GATT e la subscription alla characteristic. `mstStartScan` permette esplicitamente una durata di scan e lo stop automatico. citeturn22view2

### Dopo la ricezione il timer può diventare autonomo

`@zos/alarm.set()` è il componente giusto per il timer vero e proprio. È disponibile da API_LEVEL 3.0, richiede:

```text
device:os.alarm
```

e accetta un `url` che può puntare a un App Service. Può essere impostato usando un timestamp UTC assoluto `time` oppure un `delay` in secondi. Con `store: true` l’alarm è persistente e la documentazione dichiara che può ancora essere eseguito dopo un reboot del dispositivo. Il ritorno è un alarm ID, con `0` a indicare fallimento. citeturn23view5

Questo consente la semantica desiderata:

```text
PC invia timer
       │
       ▼
Watch riceve
       │
       ├── valida commandId/deadline
       ├── alarm.set({ time: deadline, store: true, url: appService })
       │
       └── solo se alarmId != 0 → ACK al PC

                ... da questo momento ...

telefono può spegnersi
PC può sospendersi
BLE può cadere
Device App può chiudersi
       │
       ▼
deadline
       │
       ▼
App Service svegliato localmente
       │
       ▼
vibrazione
```

L’indipendenza dal PC/telefono **dopo l’ACK** è quindi supportata da una base API molto più solida della ricezione in background. L’uso di timestamp assoluto è preferibile a “15 minuti dal momento in cui ricevo”, perché permette di conservare esattamente la scadenza scelta sul PC anche in presenza di qualche secondo di latenza. `Time.getTime()` sul watch fornisce il timestamp UTC in millisecondi ed è utile per confrontare deadline e orologio locale. citeturn23view5turn15search12

Il requisito «se riprendo a studiare prima, il timer sul watch continua» è semplice: Lezionify **non invia alcun cancel**. L’alarm viene lasciato intatto. L’API `@zos/alarm.cancel()` esiste, ma in questa semantica non deve essere chiamata alla ripresa anticipata. citeturn15search9

### Non userei il timer di sistema Amazfit

Zepp espone un identificatore `SYSTEM_APP_COUNTDOWN` e API per verificare/lanciare applicazioni di sistema, quindi la Timer app nativa esiste ed è indirizzabile dal router. Tuttavia non emerge un’API pubblica documentata che permetta a una mini app di dire alla Timer app di sistema «crea un timer da 15 minuti e avvialo in background». citeturn15search17turn15search21

Di conseguenza l’architettura deve considerare il countdown **un timer Lezionify**, basato su deadline + `@zos/alarm`, non un controllo remoto del timer di sistema.

Questo ha anche un vantaggio: non occorre mantenere un “tick” per tutti i 15 minuti. Se la schermata Lezionify è visibile, il countdown grafico può essere calcolato da:

```text
remaining = deadline - currentWatchTime
```

Se la schermata non è visibile, l’alarm basta a garantire la scadenza; non serve aggiornare un contatore ogni secondo in background.

### La vibrazione di circa dieci secondi rimane da provare

Il `Vibrator` è disponibile da API_LEVEL 2.0. Da API_LEVEL 3.6 `start()` accetta anche un array di `Action`, ognuna con `type` e `duration`. `getType()` espone tra gli altri `CONTINUOUS` e `PAUSE`. Sono inoltre disponibili scene predefinite quali:

- `VIBRATOR_SCENE_DURATION_LONG`: 1000 ms;
- `VIBRATOR_SCENE_STRONG_REMINDER`: quattro vibrazioni in circa 1200 ms;
- `VIBRATOR_SCENE_CALL`: continua finché non viene chiamato `stop()`;
- `VIBRATOR_SCENE_TIMER`: vibrazione continua in stile timer/allarme, anch’essa da fermare manualmente. citeturn24view0

Questa API rende **plausibile** costruire una sequenza haptica lunga circa dieci secondi mediante l’array di `Action`. Ci sono però due dettagli che la documentazione esaminata non garantisce nel caso decisivo:

1. che una sequenza lunga continui integralmente dopo che un **single-execution App Service** ha terminato;
2. che la durata di ~10 s sia accettata senza limiti o troncamenti dal firmware specifico.

Questo è importante perché un single-execution App Service ha una durata massima documentata di soli **600 ms**, e `setTimeout` è espressamente vietato al suo interno. citeturn18view0turn24view0

Quindi non implementerei:

```js
vibrator.start({ mode: VIBRATOR_SCENE_TIMER })

setTimeout(() => vibrator.stop(), 10_000) // NON valido in App Service
```

Il test prioritario è invece verificare se una singola chiamata:

```text
Vibrator.start([
    CONTINUOUS con durata,
    eventualmente PAUSE
])
```

consegna l’intero pattern al sottosistema haptico e ritorna, lasciando che il motore completi autonomamente la sequenza. Le primitive esistono da API_LEVEL 3.6; **il comportamento di dieci secondi in un App Service one-shot è un’ipotesi da collaudare**. citeturn24view0turn18view0

Se questo test fallisce, il compromesso robusto è utilizzare una scena autolimitante documentata — per esempio `VIBRATOR_SCENE_STRONG_REMINDER`, circa 1,2 s — anziché una scena continua che rischia di non ricevere il `stop()`. citeturn24view0

Un secondo esperimento, meno elegante, consiste nel predisporre **al momento della ricezione del comando** due alarm: uno alla deadline che avvia `VIBRATOR_SCENE_TIMER` e uno a deadline+10 s che prova a chiamare `stop()`. La programmazione dei due alarm può essere fatta mentre la Device App è ancora attiva, senza ricorrere a `setTimeout`; ciò che resta non documentato è se la scena haptica sopravviva alla distruzione del primo App Service e se un nuovo `Vibrator` nel secondo servizio possa arrestarla. Lo classificherei quindi solo come **esperimento di fallback**, non come architettura da integrare.

### Non disturbare e modalità sonno

`getSystemMode()` permette alla mini app di leggere esplicitamente gli stati `DND`, `sleep`, `theater`, `powerSaving` e altri stati di sistema. citeturn16search1

La documentazione del `Vibrator` esaminata non specifica, però, se una vibrazione avviata direttamente da una mini app:

- viene soppressa in DND;
- viene ridotta;
- viene soppressa durante la modalità sonno;
- oppure bypassa tali modalità come potrebbe fare un allarme di sistema.

Pertanto l’effetto di DND e sleep sul reminder Lezionify è **non accertato** e deve essere misurato sul firmware `3.28.50.1`. citeturn16search0turn16search1

Per il prototipo farei quattro prove separate:

```text
DND OFF / Sleep OFF
DND ON  / Sleep OFF
DND OFF / Sleep ON
DND ON  / Sleep ON
```

registrando se l’App Service viene comunque svegliato e, separatamente, se il motore vibra. La distinzione è importante: «alarm callback eseguito» e «vibrazione percepibile» sono due proprietà diverse.

## Alternativa offline con telefono

### PC ↔ Android è tecnicamente la parte facile

Su Android moderno un’app può implementare un GATT server mediante le API Bluetooth della piattaforma e può fare advertising BLE. Da Android 12/API 31 le operazioni pertinenti utilizzano i permessi runtime `BLUETOOTH_ADVERTISE`, `BLUETOOTH_CONNECT` e, quando serve effettuare discovery, `BLUETOOTH_SCAN`. citeturn19search5

Per mantenere una connessione BLE mentre il telefono è bloccato, Android documenta due famiglie di meccanismi adatte:

- `CompanionDeviceService` / Companion Device Manager;
- un Foreground Service di tipo `connectedDevice`.

La guida Android aggiornata al 2026 indica espressamente queste opzioni per connessioni persistenti e per l’ascolto di notifiche BLE in background. citeturn19search1turn19search3

Quindi il tratto:

```text
Lezionify Windows
       │
     BLE
       ▼
app Android Lezionify Bridge
```

è ragionevolmente realizzabile **interamente offline**, anche a telefono bloccato. Non richiede Wi-Fi né Internet. La parte Android dovrebbe restare sotto un Foreground Service `connectedDevice` oppure una configurazione Companion Device appropriata. citeturn19search1

Sul Redmi va inoltre considerata l’aggressiva gestione del background. Xiaomi documenta per i propri dispositivi l’opzione **Background autostart**, e nelle proprie guide per app companion raccomanda esplicitamente “No restrictions”, auto-start e lock dell’app in background per evitare che il processo venga eliminato. Non ho trovato una pagina primaria specifica per il tuo esatto `2312DRAABG`/build che garantisca identici nomi di menu, quindi il percorso UI preciso va verificato sul tuo HyperOS. citeturn19search0turn19search4

### Android ↔ watch via GATT custom non risolve nulla

Se l’app Android diventa GATT Peripheral e il Balance usa nuovamente `mst*` da Central, si torna esattamente al problema precedente:

```text
Android GATT server
       │
       │ BLE
       ▼
Balance mst*
```

Il collegamento funzionerebbe mentre la Device App è in un contesto che può usare `mst*`, ma non è portabile dentro l’App Service che resta attivo sul quadrante. citeturn18view0turn22view0

Questa soluzione introduce quindi il telefono senza ottenere il vantaggio per cui sarebbe stato introdotto. La classificherei **non raccomandata**.

### Il Side Service è la strada concettualmente giusta, ma manca un anello pubblico

Il canale nativo Zepp è più interessante. La documentazione ufficiale descrive:

```text
watch Device App
      ⇅ BLE
Zepp Side Service nel telefono
```

e il progetto ufficiale ZML di Zepp implementa `request`, `call`, `onRequest` e `onCall` per questa comunicazione. Il Side Service gira dentro l’app Zepp, non nella nostra app Android. citeturn17view6turn17view7turn20search0

Inoltre, la tabella App Service permette il modulo `@zos/ble` **tranne le funzioni `mst*`**. Questo significa che il trasporto Zepp Device App↔Side Service è, almeno dal punto di vista del set di API consentito, compatibile con un App Service in background; è proprio il GATT Central generico a essere escluso. citeturn18view0turn24view3

Il problema diventa allora:

```text
PC ─BLE→ nostra app Android ─ ??? → Zepp Side Service ─BLE→ watch App Service
```

Nelle fonti pubbliche trovate, il Side Service espone come relazioni documentate:

```text
Device App ↔ Side Service       via BLE
Settings App ↔ Side Service     via Settings Storage
Side Service → server esterno   via Fetch
```

Non è documentata un’API Android pubblica con cui **un’altra applicazione installata sul telefono** possa fare direttamente una chiamata IPC al Side Service di una mini-app Zepp. citeturn17view6turn17view7

Questo è il collo di bottiglia del bridge telefonico.

Una possibile ricerca sperimentale sarebbe far esporre alla nostra app Android un piccolo endpoint HTTP su `localhost` e farlo interrogare dal Side Service con `fetch()`. Il Side Service dispone realmente di Fetch, ma **non ho trovato una garanzia Zepp primaria per l’uso di loopback verso un’app Android esterna, né una garanzia di long-poll/polling persistente a telefono bloccato**. Non è quindi corretto presentarlo come bridge supportato. citeturn17view6turn17view7

Lo stesso vale per un eventuale collegamento IP tramite Bluetooth PAN: potrebbe eliminare il Wi-Fi, ma trasformerebbe il problema in una rete locale over-Bluetooth con ulteriori requisiti di setup, senza risolvere automaticamente il lifecycle del Side Service. Non è una base sufficientemente documentata per Lezionify in questa fase.

### Perché una notifica inoltrata non basta

Una nostra app Android potrebbe generare una notifica e lasciare che Zepp la inoltri al watch. Questo può dare un feedback immediato del tipo «pausa iniziata», ma non trasferisce alla nostra mini app un alarm persistente controllato da Lezionify.

Se invece Android programmasse localmente la scadenza e inviasse un’altra notifica dopo 15 minuti, il timer sarebbe **del telefono**. Spegnendo il telefono dopo la ricezione iniziale, come richiede il vincolo, il Balance non avrebbe più nulla che gli garantisca l’avviso finale.

Quindi:

```text
notifica inoltrata ≠ timer autonomo sul watch
```

e non va conteggiata come soluzione equivalente.

### Valutazione complessiva del bridge telefonico

Il bridge può diventare interessante solo se si dimostra sperimentalmente questo percorso:

```text
PC
 │ Bluetooth
 ▼
nostra app Android
 │ meccanismo locale realmente offline
 ▼
Zepp Side Service
 │ BLE Zepp
 ▼
watch App Service
 │
 └── alarm.set(store:true)
```

Il primo, terzo e quarto tratto hanno basi documentate; **il passaggio nostra app Android → Side Service è quello non documentato**. Di conseguenza l’alternativa telefonica è oggi una linea di R&D, non una soluzione che consiglierei di integrare in Lezionify prima del test diretto. citeturn19search1turn17view6turn18view0turn23view5

## Architettura raccomandata e protocollo

### Architettura consigliata per il primo prototipo

La scelta con il minor numero di componenti e la maggiore quantità di API ufficiali è:

```text
┌──────────────────────────────────────────────┐
│ Lezionify - Electron / React / TypeScript    │
│                                              │
│ Break selected: 5 / 15 / 30 min              │
└───────────────────┬──────────────────────────┘
                    │ IPC
                    ▼
┌──────────────────────────────────────────────┐
│ Windows native BLE helper                    │
│ C#/.NET Windows o C++/WinRT                  │
│                                              │
│ BluetoothAdapter                             │
│ GattServiceProvider                          │
│ GattLocalCharacteristic                      │
│ NotifyValueAsync / WriteRequested            │
└───────────────────┬──────────────────────────┘
                    │
              BLE GATT offline
                    │
                    ▼
┌──────────────────────────────────────────────┐
│ Amazfit Balance originale                    │
│ Device App Lezionify                         │
│                                              │
│ mstStartScan / mstConnect                    │
│ mstBuildProfile                              │
│ mstOnCharaNotification                       │
│ mstWriteCharacteristic                       │
│                                              │
│ @zos/alarm.set(store:true)                   │
│          │                                   │
│          ▼                                   │
│ App Service alla deadline                    │
│          │                                   │
│          ▼                                   │
│ Vibrator                                     │
└──────────────────────────────────────────────┘
```

La limitazione dichiarata di questa architettura è: **la Device App deve trovarsi in uno stato in cui `mst*` è utilizzabile quando arriva il comando**. Non può essere presentata come «ricezione sul quadrante» finché un test non dimostri un comportamento non coperto dalla documentazione. citeturn22view0turn18view0turn23view5

### API e permessi minimi

| Componente | API | API_LEVEL / requisito | Permesso |
|---|---|---|---|
| Identificazione watch | `getSystemInfo()` | ≥2.1 | nessun permesso specifico indicato nella pagina. citeturn24view1 |
| BLE scan | `mstStartScan()` | ≥3.0 | nessun permission code specifico indicato dalla relativa pagina. citeturn22view2 |
| BLE connect | `mstConnect()` | ≥3.0 | idem. citeturn22view1 |
| GATT profile | `mstBuildProfile()` | ≥3.0 | idem. citeturn22view3 |
| Notifications GATT | `mstWriteDescriptor`, callback `mstOnCharaNotification` | ≥3.0 | idem. citeturn22view5turn22view1 |
| ACK | `mstWriteCharacteristic()` | ≥3.0 | idem. citeturn15search7 |
| Timer autonomo | `@zos/alarm.set()` | ≥3.0 | `device:os.alarm`. citeturn23view5 |
| App Service continuo, solo se necessario | `@zos/app-service.start()` | ≥3.0 | `device:os.bg_service`. citeturn24view2 |
| Notification Center | `@zos/notification.notify()` | ≥3.0 | `device:os.notification`. citeturn24view4 |
| Haptic base | `Vibrator` | ≥2.0 | nessun permission code specifico mostrato. citeturn24view0 |
| Haptic `Action[]` | `Vibrator.start(Array<Action>)` | **≥3.6** | idem. citeturn24view0 |
| System Timer callback | `createSysTimer()` | **≥4.0, quindi non targettabile sul Balance originale 3.7** | —. citeturn15search0turn18view1 |

Sul lato Windows:

```text
BluetoothAdapter.GetDefaultAsync()
BluetoothAdapter.IsLowEnergySupported
BluetoothAdapter.IsPeripheralRoleSupported

GattServiceProvider.CreateAsync()
GattServiceProvider.StartAdvertising(...)

GattServiceProvider.Service.CreateCharacteristicAsync(...)

GattLocalCharacteristic.SubscribedClientsChanged
GattLocalCharacteristic.NotifyValueAsync(...)
GattLocalCharacteristic.WriteRequested
```

sono le primitive centrali. Windows richiede la capability `bluetooth` nel modello applicativo documentato per il server GATT. citeturn17view4turn18view4turn23view0turn23view1

### Protocollo applicativo: non confermare prima dell’ACK

È importante separare tre eventi:

```text
1. PC ha tentato l'invio
2. watch ha ricevuto il pacchetto
3. watch ha creato con successo il timer persistente
```

Solo il terzo deve diventare:

> **Timer avviato sul watch**

Un payload minimale può essere:

```ts
type TimerCommand = {
  version: 1;
  commandId: string;
  issuedAtUtcMs: number;
  deadlineUtcMs: number;
  durationSec: 300 | 900 | 1800;
};
```

L’ACK dovrebbe contenere almeno:

```ts
type TimerAck = {
  version: 1;
  commandId: string;
  status:
    | "SCHEDULED"
    | "DUPLICATE"
    | "EXPIRED"
    | "INVALID"
    | "ALARM_ERROR";
  alarmId?: number;
  acceptedDeadlineUtcMs?: number;
  watchTimeUtcMs: number;
};
```

Il flusso corretto è:

```text
Lezionify genera commandId X
        │
        ▼
Notify(X)
        │
        ▼
Balance valida X
        │
        ▼
alarm.set(...)
        │
        ├── id == 0  → ACK(X, ALARM_ERROR)
        │
        └── id != 0  → salva stato
                        ACK(X, SCHEDULED)
        │
        ▼
solo ora Electron mostra
"Timer avviato sul watch"
```

L’uso del valore di ritorno dell’alarm come criterio di successo è coerente con l’API Zepp: `0` significa creazione fallita, mentre gli altri valori rappresentano l’ID del timer. citeturn23view5

### Duplicati e retry

Il PC deve ritentare **lo stesso `commandId`**, non generarne uno nuovo, se l’ACK non arriva entro un timeout breve.

Caso tipico:

```text
PC             Watch
 |               |
 |--- command X->|
 |               | alarm creato
 |<-- ACK X -----|  ← ACK perso
 |
 |--- command X->|
 |               | riconosce X come duplicate
 |<-- DUPLICATE--|
```

La seconda ricezione non deve creare un secondo alarm.

Per robustezza conviene memorizzare sul watch un piccolo insieme degli ID recenti insieme alla deadline e all’alarm ID. Non occorre conservare cronologia indefinita: basta coprire la finestra in cui Lezionify può effettuare retry o riconnettersi.

### Comandi in ritardo

Il watch deve usare la **deadline assoluta**, non ricostruire sempre `now + durationSec`.

Supponiamo che il PC invii:

```text
issuedAt = 10:00:00
duration = 5 min
deadline = 10:05:00
```

e il pacchetto arrivi a `10:00:04`. Il watch programma comunque `10:05:00`, non `10:05:04`.

Se arriva dopo la deadline:

```text
watchNow >= deadline
```

deve rispondere `EXPIRED` e **non vibrare immediatamente come se fosse un nuovo timer**.

È inoltre utile una tolleranza applicativa per impedire che un comando vecchio rimasto in una coda venga accettato. Per esempio Lezionify può considerare non valido un nuovo timer se `issuedAt` è troppo vecchio; il valore esatto della finestra è una policy di prodotto, non una limitazione Zepp.

### Stato mostrato sul PC

Suggerirei quattro stati distinti:

```text
In connessione al watch…
Invio pausa…
Inviato, in attesa di conferma…
Timer avviato sul watch ✓
```

e in assenza dell’ACK:

```text
Invio non confermato
```

mai:

```text
Timer avviato sul watch
```

soltanto perché `NotifyValueAsync()` su Windows è terminato. Una notifica GATT consegnata allo stack locale non equivale alla riuscita di `alarm.set()` sul Balance.

## Prototipo minimo e collaudi decisivi

Il prototipo dovrebbe essere costruito per **eliminare subito le incertezze architetturali**, non per replicare Lezionify.

### Gate di compatibilità del watch

Prima mini-app: una singola schermata diagnostica che stampa:

```text
Zepp OS:
Firmware:
API_LEVEL:
DND:
Sleep:
```

usando `getSystemInfo()` e `getSystemMode()`. Il gate per procedere con BLE+alarm è `minAPI >= 3.0`; per il test della sequenza haptica avanzata è `minAPI >= 3.6`. citeturn24view1turn16search1turn24view0

Per il tuo firmware la misura del prototipo deve diventare la fonte di verità, anziché presumere che `3.28.50.1` significhi automaticamente API_LEVEL 3.7. citeturn18view2

### Gate Windows

Scrivere un helper di poche decine di righe che:

1. ottiene il default `BluetoothAdapter`;
2. stampa `IsLowEnergySupported`;
3. stampa `IsPeripheralRoleSupported`;
4. crea un UUID custom;
5. chiama `GattServiceProvider.CreateAsync`;
6. crea una characteristic `Notify`;
7. crea una characteristic `Write`;
8. inizia l’advertising;
9. stampa ogni subscription e write ricevuta.

Questa prova determina contemporaneamente **Windows build, stack e adattatore**, anziché tentare di inferire la capacità dal nome commerciale del dongle. `IsPeripheralRoleSupported` è la verifica ufficialmente prevista da Microsoft. citeturn17view4turn17view5turn23view0

Se questo gate fallisce perché `Peripheral=false`, la soluzione più semplice è cambiare adattatore BLE con uno che esponga correttamente il ruolo Peripheral a Windows; invertire l’architettura e pretendere un GATT server custom dal Balance non dispone invece di una base API pubblica Zepp comparabile. citeturn17view5turn22view0

### Gate BLE diretto

Con telefono **ancora acceso e normalmente collegato via Zepp**:

```text
1. Aprire mini app Lezionify sul Balance.
2. mstStartScan(service_uuid).
3. Individuare il PC.
4. mstConnect().
5. Costruire/preparare il profilo.
6. Iscriversi alla command characteristic.
7. PC invia {commandId, deadline}.
8. Watch scrive ACK sulla ACK characteristic.
9. PC registra latenza end-to-end.
```

Le primitive di scan possono filtrare per UUID e riportano RSSI, il che rende semplice assicurarsi di agganciare soltanto il servizio Lezionify. citeturn22view2

Ripetere poi lo stesso test osservando se il normale collegamento Zepp continua a funzionare. Questo stabilisce empiricamente la coesistenza dei due link sul **Balance originale**.

### Gate che decide il destino dell’UX diretta

Questo è il test più importante e va fatto **prima di qualunque integrazione Electron**:

```text
A. Mini app Lezionify aperta:
   PC → comando → ACK.
   Deve funzionare.

B. Mini app ancora corrente, schermo del watch spento:
   PC → comando → ACK.
   Risultato da misurare.

C. Tornare esplicitamente al quadrante:
   PC → comando.
   Verificare se arriva ACK.
```

In base alla documentazione App Service, il risultato atteso per **C** è negativo se la ricezione dipende dalle `mst*`, perché quelle API non possono essere usate dal meccanismo background destinato a sopravvivere all’uscita della Device App. citeturn17view0turn18view0

Se sorprendentemente C funzionasse sul firmware reale, sarebbe un comportamento empirico molto interessante, ma andrebbe classificato **“dimostrato sul firmware 3.28.50.1, non garantito dall’API contract”** e sottoposto a prove di durata/reboot/power saving prima di basarci un prodotto.

### Gate per l’autonomia del timer

Una volta verificato il BLE foreground, inviare un timer breve, per esempio 60 secondi:

```text
1. PC invia commandId A, deadline T+60.
2. Watch chiama alarm.set({
       time: ...,
       store: true,
       url: appService
   }).
3. Watch invia ACK solo dopo alarmId != 0.
4. Tornare immediatamente al quadrante.
5. Disconnettere/spegnere il telefono.
6. Mettere il PC in sospensione.
7. Attendere T+60.
8. Verificare esecuzione App Service e vibrazione.
```

Questo test isola perfettamente la seconda metà del requisito: una volta creato, l’alarm persistente non ha bisogno della connessione con PC o telefono, e Zepp documenta `store:true` anche per persistenza oltre il reboot. citeturn23view5

### Gate haptico

Eseguire la scadenza con:

```text
screen off
watchface attivo
PC sospeso
telefono spento
```

e provare nell’ordine:

```text
Test haptico A:
VIBRATOR_SCENE_STRONG_REMINDER
→ baseline auto-terminante

Test haptico B:
Action[] con CONTINUOUS + durata
→ misurare durata effettiva

Test haptico C:
stessa sequenza con DND attivo

Test haptico D:
stessa sequenza con Sleep attivo

Test haptico E:
DND + Sleep entrambi attivi
```

La baseline A è documentata come scena di circa 1200 ms; B determina se l’obiettivo dei ~10 s può essere raggiunto senza `setTimeout`. citeturn24view0turn18view0

Un risultato valido per l’obiettivo sarebbe:

```text
alarm callback: sì
vibration start: sì
durata: ~10 s
stop automatico: sì
nessuna interazione: sì
```

Se invece il pattern viene troncato quando termina il single-execution App Service, la vibrazione da ~10 s deve rimanere classificata non disponibile con il metodo scelto; non va mascherato il problema con un `setTimeout`, perché Zepp lo dichiara non disponibile nel servizio. citeturn18view0

### Collaudo decisivo richiesto

Il test finale esatto richiesto è:

```text
telefono:             SPENTO
Internet:             ASSENTE
watch:                QUADRANTE
PC:                   acceso con Lezionify
        │
        │ comando pausa
        ▼
Balance riceve?
        │
        ├── ACK al PC
        │
        └── timer persistente creato
                │
PC sospeso      │
                ▼
             deadline
                │
                ▼
        vibrazione ~10 s
                │
                ▼
        stop automatico
```

**Con le API pubbliche dirette documentate oggi, mi aspetto che questo collaudo fallisca già al passaggio “Balance riceve?”**, perché sul quadrante occorrerebbe un contesto background e l’App Service non può usare `mst*`. Questo è l’ostacolo che impedisce di dichiarare fattibile l’obiettivo completo PC↔watch senza telefono. citeturn18view0turn22view0

Il **collaudo massimo realistico della soluzione diretta documentata** è invece:

```text
telefono:      SPENTO
Internet:      ASSENTE
watch:         mini app Lezionify APERTA
PC:            invia pausa
watch:         riceve e crea alarm
watch → PC:    ACK
watch:         ora torna al quadrante
PC:            sospensione
                ↓
             deadline
                ↓
             vibrazione
```

Se questo passa, si dimostrano tutte le proprietà tecniche fondamentali — comunicazione offline diretta, nessun telefono, alarm locale e autonomia dopo la ricezione — restando una sola concessione UX: **aprire/tenere attiva la mini app del Balance fino al momento in cui viene impartita la pausa**.

### Decisione progettuale finale

Alla luce delle API pubbliche disponibili, la raccomandazione è **non costruire ancora il bridge Android e non integrare subito il codice in Lezionify**. Il primo investimento dovrebbe essere un prototipo diretto PC↔Balance di dimensioni minime, perché può rispondere in poche prove ai quattro interrogativi che cambiano davvero il progetto:

| Gate | Risposta attuale | Conseguenza |
|---|---|---|
| Il tuo firmware espone API_LEVEL ≥3.6? | **Da misurare con `getSystemInfo()`**. citeturn24view1 | Decide pattern haptico avanzato. |
| L’adattatore Windows supporta GATT Peripheral? | **Da misurare con `IsPeripheralRoleSupported` e advertising reale**. citeturn17view4turn18view4 | Decide se PC può essere GATT server. |
| Il Balance riceve `mst*` con app chiusa/quadrante? | **La documentazione dice che App Service non può usare `mst*`; quindi non va previsto.** citeturn18view0 | È il blocco dell’UX completamente automatica. |
| Il pattern haptico di ~10 s sopravvive all’App Service one-shot? | **Non documentato; da misurare**. citeturn24view0turn18view0 | Decide se mantenere 10 s o usare reminder più corto. |

Se i primi due gate passano, la **soluzione diretta senza telefono è tecnicamente valida con il compromesso minimo di avere la mini app del Balance attiva al momento della ricezione**. Una volta arrivato l’ACK, il timer può essere reso locale e il PC/telefono possono diventare irrilevanti fino alla scadenza tramite l’alarm persistente. citeturn23view5

Se invece è assolutamente non negoziabile che il comando arrivi mentre il Balance mostra già il quadrante, **le API pubbliche Zepp OS esaminate non forniscono oggi un percorso diretto PC↔Balance che soddisfi quel requisito**. L’alternativa Side Service tramite telefono merita allora un prototipo separato, ma va considerata sperimentale finché non viene dimostrato un ingresso completamente offline da un’app Android esterna verso il Side Service; la documentazione ufficiale attuale dimostra il trasporto Zepp Side Service↔watch, non quell’anello di ingresso. citeturn17view6turn20search0

Il compromesso minimo oggi meglio sostenuto dalle fonti è quindi:

> **Telefono non necessario durante l’uso; collegamento BLE diretto Windows→Balance; mini app Lezionify sul Balance aperta al momento del comando; ACK soltanto dopo la creazione dell’alarm; da quel momento chiusura della mini app, perdita del BLE, sospensione del PC e spegnimento del telefono non devono più essere necessari al funzionamento del timer.** La vibrazione finale è supportata in generale, mentre la durata automatica di circa dieci secondi rimane l’ultimo requisito haptico da validare sul firmware reale. citeturn22view0turn23view5turn24view0