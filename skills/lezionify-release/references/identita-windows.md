# Windows trova Electron invece di Lezionify

Diagnosi del 19 novembre 2026: l'EXE installato 0.3.1 ha ProductName e
FileDescription Lezionify e l'icona personalizzata. Start restituisce invece
`Electron / com.lezionify.app`. In Programs esistono due collegamenti con
lo stesso AppUserModelID: Lezionify verso l'installazione NSIS ed Electron
verso `node_modules/electron/dist/electron.exe` del checkout.

Il main assegnava l'identita di produzione anche allo sviluppo. Electron 44.3.0
registra automaticamente un collegamento all'inizializzazione delle notifiche:
[EnsureShortcut e RegisterActivator](https://github.com/electron/electron/blob/v44.3.0/shell/browser/notifications/win/windows_toast_activator.cc).
I collaudi o l'uso in sviluppo possono quindi contaminare Start indipendentemente
dall'aggiornamento. Non e' dimostrato che NSIS cancelli l'app: qui EXE e
collegamenti Lezionify sono presenti e corretti.

Da 0.3.2 il main configura prima di finestre/notifiche `com.lezionify.app`
solo per app confezionata, `com.lezionify.app.development` per sviluppo.
L'icona BrowserWindow viene emessa in `out/main/app-icon.png`: il precedente
percorso `resources/icon.png` non era incluso nell'ASAR. Conservare l'identita
NSIS esistente per compatibilita con gli aggiornamenti.

## Verifica e recupero

1. Eseguire `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/verify_windows_identity.ps1 -Mode Package`.
   Il bypass vale per il singolo processo che esegue lo script locale verificato;
   non modifica la policy di sistema. Il gate controlla nome, descrizione,
   versione e icona diversa dal runtime Electron; verifica inoltre l'icona ASAR.
2. Sul profilo Windows reale eseguire lo stesso script con `-Mode AuditShell`.
   Il sandbox puo' reindirizzare APPDATA/LOCALAPPDATA: non usarlo per diagnosticare
   collegamenti e installazioni dell'utente. Verificare anche la ricerca dopo
   l'ultimo collaudo di sviluppo: PASS richiede Lezionify per l'identita NSIS.
3. Una collisione gia presente richiede recupero locale oltre alla correzione
   del codice. `-Mode RepairShell` salva e verifica una copia del solo
   `Electron.lnk`, poi lo rimuove solo se AppUserModelID e destinazione
   corrispondono esattamente alla collisione del checkout corrente. Non tocca
   archivio, impostazioni, eseguibili, collegamenti Lezionify o altri Electron.
4. Se il target e' diverso, la verifica si ferma: controllare quel checkout
   prima di intervenire. Se manca il collegamento NSIS, reinstallare il setup
   ufficiale sopra la stessa destinazione, con app chiusa e dati conservati.
   Collegamenti fissati alla barra che puntano allo sviluppo vanno sostituiti
   con quello dell'app installata. Attendere l'indicizzazione prima di attribuire
   una cache persistente a nuovi binari; evitare cancellazioni globali di cache.

Una nuova release corregge il main e l'icona confezionata, ma non modifica
automaticamente altri checkout di sviluppo gia presenti sul PC.
