---
name: lezionify-release
description: Prepara, verifica e pubblica release Windows e installer di Lezionify; riprende upload interrotti preservando asset e dati personali. Usala per nuove release, rigenerazione del setup o completamento di una bozza GitHub.
---

# Release Lezionify

Lavora dalla radice del checkout. La fonte della copia installata è
`skills/lezionify-release/` nel repository. Leggi `AGENTS.md` e
`docs/publishing/aggiornamenti-windows.md` per regole e limiti correnti.
Per i fallimenti già incontrati consulta [incidenti-0.2.2](references/incidenti-0.2.2.md).

## 1. Stato e autorizzazione

Distingui setup locale, bozza e pubblicazione: chiedere solo un installer non
autorizza una Release pubblica. La richiesta esplicita di pubblicazione autorizza
a completarla senza riconferme rituali. La skill non amplia permessi di sistema.
Applica il pull di AGENTS una sola volta per chat; a checkout sporco preserva il
lavoro, segnala il pull pendente e avanza sulle parti indipendenti.

Controlla ramo, upstream, remoto, versione/lockfile, `electron-builder.yml`,
workflow `release.yml`, script npm e release GitHub esistenti. Scegli una versione
crescente non distribuita. Una bozza si riprende sullo stesso commit e con gli
stessi asset verificati. Verifica subito Node, npm, Python, Git e accesso GitHub.
Preferisci il connettore quando supporta davvero release e binari; altrimenti
usa `gh`, se disponibile, o l'helper della skill. `gh` qui non era installato.

**Esito:** versione, destinazione, capacità e azione autorizzata definite.

## 2. Dati personali e backup

L'installer generale contiene solo l'app. Audio, testi, schede e chiavi rimangono
fuori da Git e asset. «Dentro l'app solo per me» significa importazione additiva
nell'archivio personale: verifica assenza di scritture concorrenti, backup degli
indici, ID senza collisioni, hash e lettura tramite servizio reale. Conserva le
fonti originali; nessuna chiamata AI implicita. Evita di sovrascrivere la libreria
personale con un intero profilo di collaudo.

Prima del packaging copia setup precedente, blockmap e manifesto in una nuova
directory sotto `local-artifacts/installer-backups/`; verifica gli hash e salva
`backup.json` con `files: [{name, sha256}, ...]`. Passa questa directory esplicita
a `tools/verify_installer.cjs`: il suo default è un backup storico.

**Esito:** backup integri e materiali privati separati dalla distribuzione.

## 3. Collaudi, versione e note definitive

Pianifica prima i collaudi specifici, compresi download o prove reali aggiuntive.
Il collaudo di upgrade richiede un Windows temporaneo: se manca, dichiaralo e
applica i limiti della procedura del progetto. Su questo host il gate usa
FFmpeg/Electron, junction e loopback: eseguilo con i permessi necessari tramite
gli strumenti previsti. Riporta eventuali rifiuti automatici, senza aggirarli.
`npm test` usa già due worker: preserva l'assetto salvo nuova evidenza. Isola i
timeout prima di ripetere la suite; mantieni asserzioni e controlli.

Incrementa con `npm version <versione> --no-git-tag-version`. Scrivi
`docs/releases/<versione>.md` (Novità, Dati e riavvio, Limiti noti) e aggiorna
`releaseInfo.releaseNotesFile`. Completa le note prima del pacchetto finale.
Poi esegui `npm run release:validate` e **`npm run check`**. Leggi riepilogo e
codice finale. Conserva l'audit inventario test nel gate. Una regressione del
gate blocca la release; un limite esterno aggiuntivo va classificato e dichiarato,
senza cambiare a posteriori i criteri per poter pubblicare. I numeri dei test
si ricavano dai risultati attuali, non dalle release precedenti.

**Esito:** gate verde sull'implementazione finale e note/versioni coerenti.

## 4. Build e verifica degli asset

Esegui `npm run package:win -- --publish never` e attendi l'uscita. Scansione
dipendenze e NSIS possono richiedere minuti: verifica log e attività prima di
diagnosticare un blocco. Quindi esegui e controlla ciascun risultato:

```powershell
npm run release:validate -- --artifacts
node tools/verify_nsis_payload.cjs
node tools/verify_installer.cjs <directory-backup> --app-update
```

Controlla nuove funzioni e assenza dei materiali privati nel pacchetto.
`Get-AuthenticodeSignature` determina la firma effettiva: il messaggio builder
«signing with signtool» non ne prova la presenza. Conserva hash SHA256, dimensioni
e provenienza della build in rapporti locali ignorati.

Per modifiche al runtime RAG o dipendenze native esegui anche
`node tools/check_packaged_rag.mjs` e le modalità pertinenti `--corrupt-model`
e `--download-model`. I rapporti devono riferirsi all'ASAR corrente.
`verify_installer.cjs --rag` richiede tutti i rapporti, compreso download riuscito:
con un download fallito usa la verifica generale e dichiara quel limite, senza
riciclare rapporti. Non attribuire alla rete un generico errore senza prove.

Se un limite emerge dopo il packaging, completa le note prima di distribuire.
Solo per documentazione esterna, con app confezionata verificata e invariata,
puoi rigenerare NSIS con `npm exec electron-builder -- --win --prepackaged
dist/win-unpacked --publish never`. Ricontrolla payload e asset finali. Se cambia
codice, dipendenze o risorse, ricostruisci e collauda le parti interessate. Binari
diversi da quelli già pubblicati richiedono sempre una nuova versione.

Alternativa CI: `Prepare Windows release` crea una **bozza**, dopo gate e build.
Scarica e verifica gli asset di quella build; mantieni separati asset CI e locali.

**Esito:** setup, blockmap, manifesto e note della stessa build finale verificati.

## 5. Sorgenti e bozza

Registra decisioni con `tools/append_decision.py`. Rivedi diff e file nuovi,
controllando dati e credenziali. Dopo rigenerazione del setup AGENTS autorizza e
richiede commit/push di tutte le modifiche pubblicabili; gli artefatti ignorati
restano esclusi. Verifica HEAD sul ramo remoto. Conserva il lavoro in caso di
errore; nessun force push. Il commit della release deve corrispondere alla build.

L'helper legge versione dal package, usa credenziali solo in memoria e non
richiede `gh`. Accetta `GH_TOKEN`, `GITHUB_TOKEN` o Git Credential Manager.
Non stampare mai l'output di `git credential fill`.

```powershell
python skills/lezionify-release/scripts/github_release.py status --root . --repo giovannistefanuto/Lezionify
python skills/lezionify-release/scripts/github_release.py prepare --root . --repo giovannistefanuto/Lezionify
```

L'helper verifica asset locali e commit pubblicato, crea la bozza sullo SHA esatto
e carica solo setup, blockmap e `latest.yml`. Un upload lento va seguito fino
all'esito. Dopo interruzione conserva i binari e usa `resume`: verifica gli asset
presenti e carica i mancanti. Digest errato o stato incompleto richiedono diagnosi
della bozza; l'helper si ferma invece di sostituire asset. Evita upload concorrenti.

**Esito:** bozza completa con note, SHA sorgente, stato uploaded, nomi, dimensioni
e SHA256 degli asset uguali ai file locali.

## 6. Pubblicazione e conferma

Con pubblicazione già autorizzata, procedi senza una nuova conferma:

```powershell
python skills/lezionify-release/scripts/github_release.py publish --root . --repo giovannistefanuto/Lezionify
python skills/lezionify-release/scripts/github_release.py verify --root . --repo giovannistefanuto/Lezionify
```

`verify` controlla release stabile latest e digest API; scarica il manifesto
senza credenziali e lo confronta byte per byte. Una release pubblicata si può
verificare di nuovo; i suoi asset restano immutati. Se qualcosa fallisce distingui
bozza, pubblicazione riuscita e verifica incompleta prima di intervenire.
Nessun retry mutante automatico o rigenerazione alla cieca.

Aggiorna registro e documento di pubblicazione con URL, commit, hash e limiti;
pubblica anche l'aggiornamento documentale, verificando il commit remoto.
Concludi con link, versione, posizione dei materiali personali e limiti materiali.
«Release disponibile» è distinto da «aggiornamento installato sul PC»; questa
skill non avvia l'installer personale automaticamente.

**Esito finale:** release pubblica completa e verificata, sorgenti sul remoto,
archivio personale integro e documenti aggiornati. Se manca una condizione,
riporta lo stato effettivo e l'azione necessaria per completarla.
