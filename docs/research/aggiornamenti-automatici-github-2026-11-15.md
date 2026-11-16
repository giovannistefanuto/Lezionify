# Aggiornamenti automatici da GitHub — ricerca e proposta

Data: 15 novembre 2026. Stato: progettazione documentale; funzione non implementata, nessuna dipendenza aggiunta, nessun installer generato o installato e nessuna Release pubblicata.

Aggiornamento successivo: il 16 novembre la proposta è stata implementata nella
versione 0.2.0 e il setup rigenerato (D-0528–D-0530). Stato operativo, verifiche
e limiti sono nella [procedura Windows](../publishing/aggiornamenti-windows.md).
Il resto di questa ricerca conserva la fotografia iniziale.

## Raccomandazione

Per Lezionify Windows conviene mantenere l'installer NSIS esistente e integrare **electron-updater**, con **GitHub Releases** come distribuzione. A ogni avvio il processo principale controlla in background i metadati della release stabile; soltanto se la versione pubblicata è maggiore mostra novità e consenso. Dopo il consenso scarica, verifica e prepara l'aggiornamento; quando il lavoro locale è al sicuro, chiude l'app, esegue l'installer silenziosamente e la riapre. Sono i meccanismi previsti dall'ecosistema già usato dal progetto, evitando di costruire un sostitutore di eseguibili proprietario. Il supporto Windows NSIS è dichiarato dalla [guida ufficiale stabile electron-builder v26](https://www.electron.build/v26/docs/features/auto-update/).

Il risultato desiderato è realistico: niente ricerca del setup nel browser e niente sequenza Avanti/Installa/Fine. Resta necessario un breve riavvio. **Non si può garantire l'assenza della finestra UAC di Windows** se l'installazione richiede privilegi amministrativi.

## Situazione verificata nel repository

Fonti locali: [package.json](../../package.json), [electron-builder.yml](../../electron-builder.yml), [main Electron](../../electron/main/index.ts), [archivio](../../electron/main/archive.ts), [CI](../../.github/workflows/ci.yml).

- App Electron con React; `electron-builder` dichiarato `^26.15.3`, Electron `^44.3.0`.
- Versione dichiarata `0.1.0`; diverse rigenerazioni documentate in DECISIONI mantengono questo numero. Per gli aggiornamenti occorreranno numeri diversi per ogni release distribuita.
- Target NSIS Windows x64, `appId: com.lezionify.app`, installer `Lezionify-Setup-${version}.exe`; esiste anche un target portable separato.
- Installer con `oneClick: false` e scelta della cartella. Ciò riguarda l'installazione interattiva; l'updater può invocare lo stesso tipo di setup in modalità silenziosa.
- Nessuna dipendenza `electron-updater`, configurazione `publish` o gestione dell'auto-update individuata. Il workflow attuale verifica qualità, non pubblica gli aggiornamenti.
- Archivio predefinito sotto `app.getPath('userData')/library`, con supporto a una radice scelta; dati separati dai file del programma. Lo spegnimento deve coordinare servizi e salvataggi esistenti.
- `private: true` in package.json impedisce la pubblicazione npm accidentale: non dimostra che la repository GitHub sia privata. Visibilità effettiva e stato delle Releases vanno accertati prima dell'integrazione.

## Alternative

| Soluzione | Compatibilità con Lezionify | Valutazione |
| --- | --- | --- |
| `electron-updater` + NSIS | Mantiene il pacchetto Windows attuale; eventi di avanzamento e provider GitHub | Raccomandata |
| `autoUpdater` incorporato in Electron | La documentazione attuale descrive Squirrel.Windows e MSIX su Windows; non il nostro NSIS | Richiederebbe cambiare distribuzione |
| MSIX / Store / App Installer | Percorso possibile con packaging e identità Windows differenti | Valutazione futura se si vuole distribuire tramite Windows |
| Updater scritto da zero | Richiede helper, gestione file bloccati, elevazione, verifica e recupero | Complessità senza un bisogno attuale |

L'API incorporata scarica automaticamente quando trova un aggiornamento e ha semantiche proprie; non va confusa con l'oggetto omonimo esportato da electron-updater. Fonte: [Electron autoUpdater](https://www.electronjs.org/docs/latest/api/auto-updater).

## Flusso utente proposto

1. L'app si apre subito; dopo la prima interfaccia pronta parte una verifica. Una verifica per processo avviato, non a ogni attivazione della finestra. Nessun audio, testo o chiave AI viene inviato: solo traffico tecnico HTTPS verso GitHub, che riceve comunque IP e normali metadati di rete.
2. Se uguale o più vecchia, nessun popup. Se offline o GitHub non risponde, l'app continua; lo stato nelle impostazioni distingue «verifica non riuscita» da «aggiornata».
3. Se più recente: «È disponibile Lezionify 0.2.1; versione installata 0.2.0», novità, eventuale avvertenza sui dati, dimensione del pacchetto. Azioni: **Aggiorna** e **Più tardi**. La dimensione completa non deve essere presentata come quantità esatta del download differenziale.
4. Dopo Aggiorna, download in background con avanzamento e annullamento quando supportato. L'utente continua a studiare; non si chiude l'app durante trascrizioni, registrazioni, importazioni o salvataggi.
5. Se non ci sono lavori attivi, il consenso iniziale può includere chiaramente «scarica e riavvia». Se nel frattempo l'utente ha iniziato un lavoro, si passa a «pronto da installare» con comando **Riavvia e aggiorna**. Nessun termine forzato dei processi di lavoro.
6. Prima del riavvio si completa una barriera esplicita: bloccare nuovi lavori, salvare bozze e sessioni, completare/pausare in modo recuperabile i lavori, attendere le scritture e chiudere i servizi. Se non riesce, rinviare l'installazione.
7. Dopo il riavvio, mostrare una sola volta versione e riepilogo delle novità effettivamente installate. Nelle impostazioni: versione corrente, ultima verifica, «Controlla aggiornamenti» e link alle release.

Configurazione proposta: `autoDownload = false`, `autoInstallOnAppQuit = false`, prerelease e downgrade disabilitati per il canale stabile; `checkForUpdates()` per verificare, `downloadUpdate()` dopo consenso, `quitAndInstall(true, true)` solo dopo pacchetto verificato e barriera completata. Il secondo `true` richiede il riavvio anche con installazione silenziosa. Non usare il percorso rapido `checkForUpdatesAndNotify()` per realizzare questa interfaccia personalizzata. I default e gli eventi sono nel [sorgente AppUpdater](https://github.com/electron-userland/electron-builder/blob/v26.0.12/packages/electron-updater/src/AppUpdater.ts); chiusura e parametri di installazione nel [sorgente BaseUpdater](https://github.com/electron-userland/electron-builder/blob/v26.0.12/packages/electron-updater/src/BaseUpdater.ts).

## Controllo rapido e versioni

Controllare una release significa leggere metadati piccoli, non clonare GitHub né confrontare ogni file. Si confronta la versione incorporata nell'app con quella del manifest di aggiornamento mediante SemVer. La regola è **remota > locale**, non «diversa»: un client più recente non deve retrocedere. `0.1.0+build2` non supera `0.1.0+build1`, perché i metadati dopo `+` non partecipano alla precedenza. Ogni pubblicazione deve avere una versione nuova, per esempio `0.2.0`, `0.2.1`, `0.3.0`. Fonte: [specifica SemVer](https://semver.org/).

Obiettivo progettuale: nessun rallentamento visibile dell'avvio, nessun download del setup in assenza di consenso, timeout complessivo ragionevole e nessun ciclo di retry aggressivo. «Rapido» non può essere una garanzia di millisecondi: dipende da DNS, rete, proxy e GitHub.

Il provider GitHub ufficiale esaminato utilizza feed Atom, selezione della latest release e file `latest.yml`; non equivale a una sola GET del numero di versione. Recupera anche le note dal feed quando non già incluse nei metadati. Fonte: [GitHubProvider](https://github.com/electron-userland/electron-builder/blob/v26.0.12/packages/electron-updater/src/providers/GitHubProvider.ts). Preferire inizialmente questo percorso standard, misurando tempi e richieste nella build scelta, senza creare un doppio controllo REST prima dell'updater.

Se in futuro serve un proprio endpoint di versione, utilizzare cache e richieste condizionali `ETag`/`If-None-Match`, senza promettere che electron-updater le gestisca già come desiderato. GitHub documenta `304 Not Modified` e backoff; la gratuità rispetto al rate limit è riferita alle richieste condizionali autenticate. Fonte: [best practice REST](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api). L'API REST pubblica non autenticata ha un limite primario di 60 richieste/ora per IP, condiviso potenzialmente da più utenti; tale numero non è una quota universale di tutti i download GitHub. Fonte: [rate limit GitHub](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

## Come scompare il wizard dell'installer

Il programma avviato non sostituisce direttamente il proprio eseguibile aperto. L'updater prepara un setup locale e lo lancia con i parametri previsti, poi esce; il setup aggiorna i file e riapre l'app. Nell'implementazione NSIS esaminata compaiono `/S` per silent e `--force-run` per riavvio. È previsto anche `elevate.exe` quando servono diritti amministrativi. Fonte: [NsisUpdater](https://github.com/electron-userland/electron-builder/blob/v26.0.12/packages/electron-updater/src/NsisUpdater.ts).

Per la distribuzione futura si propone installazione **per utente** in una cartella scrivibile dall'utente, così l'aggiornamento ordinario può evitare elevazione. Per installazioni già in Program Files o in percorsi protetti può restare UAC: non va aggirato o nascosto. Occorre inventariare l'installazione effettiva prima di cambiare modalità, mantenendo identità, percorso e disinstallazione coerenti. La scelta `oneClick: true` non è necessaria per aggiornare silenziosamente e non viene proposta automaticamente.

Portable: prima versione dell'auto-update limitata alle installazioni NSIS. Per la portable mostrare controllo/novità e link al download, finché non esiste un percorso separato collaudato; non sostituirla automaticamente con una installazione NSIS.

## Pubblicazione e note delle novità

**Un push del sorgente non è un aggiornamento distribuibile.** Occorre una GitHub Release con tag corrispondente alla versione e gli asset del pacchetto. GitHub permette note descrittive, binari allegati, bozze e prerelease. Fonte: [gestione Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository). Il manifest contiene informazioni sul file aggiornabile, tra cui versione e hash; il percorso degli aggiornamenti non va legato al numero dell'ultimo commit. Fonte: [manifest e UpdateInfo di electron-builder v26](https://www.electron.build/v26/docs/features/auto-update/).

Flusso proposto per chi pubblica:

1. Aggiornare la versione di package e lock; scrivere un file di note revisionabile, per esempio `docs/releases/0.2.1.md`. È un percorso futuro, non creato da questa ricerca.
2. Note obbligatorie con titolo, nuove funzioni, correzioni e problemi noti; esplicitare riavvio, modifiche ai dati o requisiti aggiuntivi se presenti. Non esporre dati personali o dettagli del registro interno non adatti agli utenti.
3. Eseguire build e gate esistenti, firmare se configurato, verificare l'installer e creare una Release in bozza con setup, `.blockmap` e `latest.yml` prodotti dalla stessa build. Configurare `publish` per generare il feed dell'app.
4. Validare presenza degli asset, versione coerente tra tag/app/manifest, note non vuote e download reale; pubblicare solo il set completo. Prima della distribuzione generale, prova in repository/canale di test separato.
5. Usare le stesse note nel testo della Release e nei metadati se previsti, per evitare descrizioni divergenti. Non ricostruire le novità automaticamente da DECISIONI a ogni avvio.

Se l'utente salta più versioni, mostrare il riepilogo cumulativo delle modifiche intermedie. Il provider offre `fullChangelog`, ma il feed può non coprire una storia arbitrariamente lunga: mostrare anche un link allo storico completo e indicare quando il riepilogo è parziale. Non inserire HTML remoto eseguibile nella UI: note renderizzate come testo o Markdown con policy sicura e link esterni controllati.

## Integrità, firma, dati e recupero

Prevedere verifica hash del payload e firma Authenticode del produttore riconosciuto. Un hash preso dallo stesso feed compromesso non autentica da solo il produttore. Il sorgente NSIS esaminato verifica il certificato quando `publisherName` è configurato; senza tale configurazione non bisogna dare per acquisita una verifica del produttore. Certificato e segreti di pubblicazione devono restare nell'ambiente di build, non nel client.

La firma non garantisce automaticamente che SmartScreen non mostri avvisi. Politica di firma, nome publisher e rinnovo del certificato sono requisiti da definire prima della distribuzione pubblica; la ricerca non ha acquistato certificati né verificato la firma degli installer esistenti.

Installazione e dati devono restare separati; mantenere `appId`, identità dell'app e percorso `userData`. Verificare espressamente libreria personalizzata, audio originali, trascrizioni, impostazioni e chiavi protette dopo l'upgrade. Se una release cambia il formato dati: backup, migrazione versionata e riprendibile, rifiuto della scrittura con formati non supportati. Non promettere rollback automatico dell'archivio o del programma: il ritorno a una versione precedente è un progetto separato e può essere incompatibile con una migrazione già eseguita.

Lo scaricamento differenziale NSIS può ridurre il traffico usando blockmap e cache precedente; resta previsto il download completo in diversi casi. Per Lezionify, con setup vicino a 300 MB, è utile ma va misurato su due release reali: non è una garanzia di aggiornamenti minuscoli. Non eliminare subito gli asset precedenti necessari ai client ancora installati.

Per repository privati non incorporare un PAT condiviso nell'app. Preferire una repository pubblica dedicata ai soli binari e alle note, mantenendo privato il sorgente se necessario. Se anche i binari devono essere privati, occorre progettare autenticazione dell'utente o un servizio di distribuzione autorizzato, con un costo operativo diverso. Il `GITHUB_TOKEN` del processo CI serve a pubblicare; non è una credenziale da distribuire. Le risorse pubbliche della REST API sono accessibili senza autenticazione, come chiarisce la [documentazione Releases](https://docs.github.com/en/rest/releases/releases).

## Confine dei moduli proposti

- `electron/main/appUpdater.ts`: solo main; configurazione fissa della sorgente, controllo, download, verifica, stati e installazione. Non accetta URL o percorsi eseguibili arbitrari dal renderer.
- `shared/appUpdate.ts`: stato tipizzato e comandi limitati verifica/scarica/rinvia/installa.
- Preload: bridge IPC minimo; autorizzazione del mittente alle richieste sensibili.
- UI: avviso con versione/novità e sezione Aggiornamenti; gestione accessibile degli stati ed errori comprensibili.
- Coordinatore di arresto: contratto esplicito tra updater, salvataggi, pipeline, RIPETERE, worker e tracker di studio, riutilizzabile anche nell'uscita ordinaria.
- Build/release: versione, note, asset, firma e pubblicazione controllata. Registrare qualsiasi nuova dipendenza e configurazione in DECISIONI quando saranno adottate.

Stati minimi: inattivo → verifica → aggiornato/disponibile/errore; disponibile → download → pronto → preparazione uscita → installazione. Preservare «pronto» anche se arriva una nuova verifica; serializzare richieste doppie e non installare pacchetti di cui la verifica non è conclusa. Persistenza locale minima: ultima verifica, versione rinviata, consenso al riavvio legato alla release, ultimo changelog mostrato; nessuna chiave GitHub nel profilo updater.

## Migrazione e criteri prima del rilascio

L'app attuale non contiene un updater: servirà **una prima installazione manuale** della versione che lo introduce. Non può scoprire e installare da sola una funzione che non possiede. Dopo quel passaggio gli aggiornamenti successivi possono seguire il nuovo flusso.

Prima dell'implementazione: accertare visibilità della sorgente di distribuzione, installazione effettiva per utente/macchina, politica di firma, versione compatibile di electron-updater e modalità di migrazione dei dati. Non sono domande necessarie per completare questa ricerca; sono prerequisiti della messa in produzione.

Collaudi richiesti in ambiente isolato Windows con almeno due versioni installabili:

- Uguale, maggiore, minore, prerelease esclusa, versione non valida e salto di più release.
- Nessun setup richiesto prima del consenso; rifiuto, rinvio, annullamento e doppio clic.
- Offline, timeout, rate limit, Release senza asset o note, download interrotto e spazio insufficiente.
- Hash errato, certificato inatteso, asset incompatibile: nessuna installazione.
- Aggiornamento silenzioso con utente standard, installazione amministrativa e rifiuto UAC; riapertura con nuova versione.
- Download differenziale e fallback completo misurati, senza promesse di ripresa byte per byte non verificate.
- Lavoro AI/importazione/RIPETERE e scrittura attiva durante il consenso; nessuna perdita e installazione rinviata se non esiste arresto sicuro.
- Confronto pre/post di archivio, sessioni e configurazione; riavvio con libreria personalizzata e percorsi con spazi.
- Portable e build di sviluppo non entrano nel percorso NSIS; test automatici e diagnostici non contattano il feed pubblico.

## Limiti della ricerca

Sono stati esaminati codice locale e fonti ufficiali online; non è stata eseguita una prova end-to-end né un aggiornamento tra due versioni installate. La proposta resta sulla famiglia builder v26/updater v6, da selezionare e collaudare esattamente; la guida stabile v26 è collegata sopra. Le pagine electron-builder correnti possono descrivere la futura v27 e includere evoluzioni successive (per esempio nuove API e manifesti firmati): non sono un contratto della dipendenza attuale. Per spiegare il comportamento di base sono stati letti anche sorgenti ufficiali del tag `v26.0.12`, che **non coincide** con il builder dichiarato nel progetto. Selezione della versione updater, compatibilità esatta con lock/build, policy di firma e comportamento reale Windows restano da validare nel pilota; nessuna API recente va copiata alla cieca.
