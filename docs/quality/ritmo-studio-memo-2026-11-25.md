# Ritmo, tempo della lezione e Memo Android — 25 novembre 2026

Decisioni: D-0612 (implementazione) e D-0613 (collaudi e arresto prima della release).

Perimetro esclusivo: le tre richieste dell’utente, chiarite prima dell’implementazione. Preparazione e pubblicazione delle release non avviate; numeri di versione ancora invariati. Nessuna installazione personale e nessun invio di Memo reale.

## Comportamento adottato

- **Ritmo consigliato:** `(lezioni importate non completate + lezioni future previste) / giorni all’esame`. Valore in lez/giorno, arrotondato solo in visualizzazione a quattro decimali, separatore italiano. Esempio: `2 / 86 = 0,0233 lez/giorno`. Un rapporto positivo inferiore a 0,0001 appare come `< 0,0001`, mai come zero. Conteggio e formattazione condivisi da countdown e scheda corso.
- **Lezioni future:** slot dell’orario dal giorno successivo a oggi, nel periodo inizio/fine corso e prima del giorno dell’esame. Inclusi appuntamenti datati di laboratorio; stessa data e ora iniziale contano una sola volta. Senza calendario valido non si inventano lezioni dai CFU. È una previsione da orario: festività o annullamenti non registrati non sono deducibili. Le lezioni già in archivio rimangono il conteggio reale; il progresso completate/totali non viene gonfiato dalla previsione.
- **Info e Gestione:** box principale «Tempo di studio» oppure «Completata in», con ore/minuti accreditati alla singola lezione su tutte le date. Lettura dall’API esistente che applica le rettifiche, nessun nuovo cronometro e nessun credito aggiunto dalla consultazione. Zero registrato e errore di lettura sono distinti. Gli orari audio sono compatti tra gli altri metadati; contrasto dei metadati coerente con il tema.
- **Memo Android:** nuovo widget `Lezionify Memo`, distinto da quello delle statistiche. Gruppi navigabili, attività aperte e completate, note integrali, data dell’ultima copia e sola lettura. Selezione indipendente per ogni widget, fallback a Senza tag quando un gruppo scompare. Liste scorrevoli, pagine da 25 elementi per contenere i RemoteViews, note lunghe divise senza perdere caratteri Unicode. Il titolo apre la consultazione completa nell’app.

## Sincronizzazione e compatibilità

L’opzione «Sincronizza anche Memo» nelle impostazioni desktop è inizialmente disattivata, anche per collegamenti già esistenti. L’attivazione aggiunge al riepilogo cifrato gruppi, nomi, note e testo/stato delle attività; il telefono usa lo stesso abbinamento. Nessun token GitHub sul telefono. Senza attivazione lo scratchpad non viene letto dal servizio di sincronizzazione.

Il campo `memo` è opzionale nello snapshot v1: i companion precedenti continuano a leggere le statistiche e quello nuovo accetta le vecchie cache. La cache Android privata rimane consultabile offline. Cifratura AES-GCM e controlli di identità/revisione esistenti restano attivi. Disattivando Memo si elimina l’eventuale snapshot in attesa e si riserva la sua revisione, perché una richiesta fallita potrebbe essere arrivata al server. Si forza un nuovo invio senza Memo; nessuna ripresa successiva può reintrodurre il contenuto disattivato. La cronologia cifrata GitHub non viene cancellata.

Il riepilogo completo ha un limite esplicito di 240.000 byte UTF-8 prima della cifratura. Se superato, l’invio fallisce con messaggio visibile: nessuna nota viene tagliata, nessun dato locale cancellato, ultima copia sul telefono conservata. Disattivare Memo consente di riprendere le sole statistiche. Limiti coordinati: configurazione protetta 600.000 byte per lo snapshot pendente e relativi escape; risposta Contents GitHub 500.000 byte per il doppio base64; envelope cifrato 350.000 byte come il download Android. Un test vicino al limite riproduce e risolve il rifiuto della rilettura del vecchio envelope.

Su Android 12+ il widget usa `RemoteCollectionItems`; Android 8–11 ha il servizio di raccolta protetto da `BIND_REMOTEVIEWS`. Riferimento: [raccolte nei widget Android](https://developer.android.com/develop/ui/views/appwidgets/collections). Il widget esistente conserva layout e conteggi; il solo aggiornamento riuscito invalida anche la vista Memo. Gli aggiornamenti periodici restano 5 minuti sul PC in uso e 30 minuti sul telefono, soggetti ai limiti Android, oltre al comando manuale.

## Verifiche

- Riproduzione iniziale rossa con `npx vitest run tests/unit/examPace.test.ts`: atteso `0,0233 lez/giorno`, ricevuto `2 lezioni in 86 giorni`.
- Suite unitari del checkout corrente: **999 test in 92 file passati**. Comando `npx vitest run --maxWorkers=2 --exclude 'local-artifacts/**'`. L’esclusione riguarda soltanto vecchi worktree locali ignorati, che il discovery predefinito include erroneamente. Nessun test del repository escluso.
- Test mirati: precisione, calendario futuro/limiti/deduplicazione, plurali e assenza di tempo, consenso Memo, fingerprint, ripresa, revoca con risposta persa, limite senza troncamenti, envelope vicino al limite, cifratura e compatibilità.
- Suite completa React/Electron con riavvio: **passata**, `npm run test:hooks` con `LEZIONIFY_HOOK_TIMEOUT_MS=300000`. Verifica anche entrambi i ritmi con una lezione residua e una futura in 86 giorni e i due stati del box nel drawer reale.
- Typecheck, lint, inventario dei test, build desktop e periodi Java Android: **passati**.
- APK originale di sviluppo compilato e firma locale verificata con `android-companion/build-local.ps1`, SDK 35. Nessuna distribuzione dell’APK di prova.
- `tools/test_android_memo.ps1` costruisce una fixture strumentata separata e rifiuta seriali diversi da `emulator-*`. Test su API 36.1, temi chiaro/scuro: snapshot precedente, compatibilità statistiche, stati delle attività, note e ritorni a capo, selezione persistente/indipendente, gruppo rimosso, note Unicode lunghe, cambio pagina tramite PendingIntent, cache offline e rendering reale di entrambi i widget.
- Screenshot sintetici locali in `local-artifacts/memo-study-ui/` e `local-artifacts/android-memo-test/`, non versionati. La fixture contiene esclusivamente dati sintetici e classi di test, assenti dall’APK originale.

Una ripetizione Electron durante build e unitari concorrenti ha raggiunto il timeout globale di 180 secondi; un altro avvio ha incontrato un click nullo nel test. La successiva suite completa è passata senza cambiare codice applicativo o asserzioni, usando il timeout configurabile di 300 secondi e senza carichi concorrenti. Anche lo scenario mirato Info è passato. La diagnostica temporanea del launcher è stata rimossa; nessuna verifica disattivata. I fallimenti iniziali Vitest nel sandbox erano dovuti a junction, FFmpeg e loopback impediti: la suite corrente ripetuta con i permessi necessari è verde.

## Punto di arresto

Implementazione delle tre richieste completata. Il prossimo passo autorizzabile è il processo di release con versioni crescenti Windows e Android, gate completo previsto dalla procedura, packaging e distribuzione. L’installer Windows non è stato rigenerato; nessun commit/push automatico è stato attivato. Sul telefono personale la nuova funzione sarà disponibile solo dopo l’aggiornamento del companion. Nessun nuovo provider AI, dipendenza o modifica ad altre voci della coda.

## Successiva richiesta: compilazione Android per installazione differita

L’utente autorizza successivamente la preparazione del solo APK Android per
installarlo rapidamente quando sarà disponibile il telefono. Android passa a
0.2.0, codice 4; Windows resta invariato. La versione usata dalla build locale
e dalla fixture proviene ora da Gradle. Note in `docs/releases/android-0.2.0.md`.

APK originale, privo di classi strumentate: 50.447 byte, SHA256
`2264377db64ab4efce3cb194048429e57d3bf658d5b2d00a7aad535d0733a573`.
Verificati firma APK v2/v3, pacchetto, versione interna, SDK minimo 26/target 35,
sola permission INTERNET e stesso certificato della 0.1.2. Artefatti:
`local-artifacts/android-install-ready/0.2.0/Lezionify-Android-0.2.0.apk`,
`verified.json` con impronte dei sorgenti e `INSTALLAZIONE.txt`.
Preparazione locale soltanto: nessun upload, pubblicazione, installazione
personale o installer Windows. Per Memo resta necessario anche aggiornare
il desktop e attivare l’opzione di sincronizzazione.

Upgrade reale in emulatore passato con gli APK originali 0.1.2 → 0.2.0 e
`adb install -r`: avvio riuscito, codice 4, cache sintetica del corso con sette
lezioni conservata e nuovo ingresso Memo visibile. La fixture debuggabile è
servita soltanto per inizializzare la cache sintetica prima dei due APK
originali. Nessun abbinamento personale usato; verifica dell’abbinamento reale
rinviata all’installazione sul telefono. Emulatore chiuso senza salvare lo stato.
