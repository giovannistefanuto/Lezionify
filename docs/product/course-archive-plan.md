# Archiviazione reversibile dei corsi

## Obiettivo e comportamento

- Tasto destro su un corso: `Archivia corso`; su un corso archiviato: `Ripristina corso`.
- `Altri Corsi` diventa `Corsi attivi`. I raggruppamenti esistenti dei nomi restano disponibili sotto questa sezione.
- `Corsi archiviati` raccoglie tutti i corsi archiviati, indipendentemente dal prefisso del nome. Entrambe le sezioni si aprono e chiudono con un clic e conservano lo stato durante l'uso.
- Tutte le lezioni, conteggio generale, ricerca generale e filtri di studio includono solo corsi attivi, comprese le lezioni senza corso.
- Selezionando esplicitamente un corso archiviato si consultano tutte le sue lezioni e si puo cercare al suo interno. Premendo un filtro di studio si torna ai corsi attivi.
- Archiviare il corso selezionato torna a Tutte le lezioni; un eventuale pannello della sua lezione viene chiuso. Ripristinare lo riporta nella sezione attiva.

## Dati e compatibilita

Persistenza come elenco opzionale `archivedCourseCodes` nelle impostazioni locali, con default vuoto per le librerie esistenti. Il codice del corso e l'identita condivisa da lezioni e definizioni; un elenco separato supporta anche corsi importati privi di scheda CFU/orari senza inventare metadati.

Nessuno spostamento fisico dei file: sezioni logiche della sidebar. Audio, trascrizioni, dispense, Q&A, stati e sessioni di studio restano intatti. Lo storico statistico e la politica della pipeline AI restano quelli esistenti: questa modifica riguarda organizzazione e consultazione, senza avviare chiamate AI.

Rinomina: trasferire il codice archiviato, incluso il rollback esistente. Eliminazione della scheda con lezioni conservate: mantenere il marcatore per non rendere attive le lezioni involontariamente; eliminazione con disassociazione: rimuoverlo.

## Implementazione

1. Contratto condiviso e validazione runtime dell'elenco e degli argomenti IPC.
2. Lettura dedicata senza credenziali e scrittura serializzata del solo stato; integrare rinomina ed eliminazione.
3. Hook lezioni: caricare stato e libreria insieme, derivare conteggi attivi, applicare il confine attivo/archiviato prima di ricerca e stato. Applicare le modifiche UI solo dopo persistenza riuscita; proteggere da refresh tardivi.
4. Sidebar: sezioni espandibili, menu contestuale anche da tastiera, chiusura con Escape/clic esterno/scroll, azioni disabilitate durante il salvataggio. Le lezioni senza corso non hanno azioni di archiviazione.
5. Collegamento App e indicazione esplicita nella vista del corso archiviato.
6. Regressioni backend e React/Electron su persistenza, ripristino, rinomina, errori, filtri, ricerca, menu e apertura/chiusura delle sezioni. Quality gate completo.

## Criteri di accettazione

Archiviando uno di quattro corsi, rimangono tre corsi attivi e uno archiviato. Le lezioni del quarto non compaiono in nessuna lista generale o risultato di ricerca generale, anche dopo riavvio. Selezionandolo nell'archivio si ritrovano tutte le sue lezioni e gli stati originali. Ripristinandolo, ricompaiono nelle liste attive. Un errore di persistenza non sposta il corso. Una rinomina non perde l'archiviazione. Clic sulle cartelle apre/chiude solo i rispettivi contenuti.

## Consuntivo

Implementazione completata il 1 ottobre 2026 senza nuove dipendenze.

- `npm run check` superato: typecheck, lint, 265 test Vitest, 14 test Python, 30 scenari React/Electron e build di produzione.
- Nove nuove regressioni backend: compatibilita legacy, persistenza dopo riapertura, ripristino, fonti e library.json invariati byte per byte, corsi senza scheda, validazione, concorrenza, modifica/rinomina, rollback e cancellazione della sola scheda.
- Tre nuovi scenari React/Electron: confine delle liste e ricerca, errori/concorrenza/refresh tardivi, menu contestuale e sezioni espandibili. Coperti tutti i filtri di studio, ricerca sia provvisoria sia full-text, Escape, clic esterno e Shift+F10.
- Smoke test del renderer di produzione in Electron nascosto con profilo e dati sintetici: selezione corso, apertura della lezione, archiviazione, chiusura del drawer e ritorno alla lista attiva, consultazione separata del corso archiviato e indicazione nel titolo. Screenshot locali in `local-artifacts/course-archive-preview/`; controllato il menu e il layout nei temi chiaro/scuro.
- Il lint esclude ora `local-artifacts/**`, coerentemente con gli artefatti locali non versionati. Prima del fix includeva script CJS di verifiche installer precedenti, impedendo il quality gate.
- `git diff --check` superato sui file modificati; preservate le modifiche preesistenti nel checkout.

Nessuna modifica alla libreria reale dell'utente e nessuna chiamata AI. La build locale in `out/` contiene la funzionalita.

## Installer aggiornato

Su richiesta successiva, il 1 ottobre 2026 e stato rigenerato `dist/Lezionify-Setup-0.1.0.exe` tramite `npm run package:win -- --publish never`, mantenendo una copia locale del setup precedente.

- Setup NSIS Windows x64: 167916482 byte.
- SHA256: `735519d618a3edc9cdaaedf4336709ed3e8a44cc3d9b1c396eb8d1fa397b7fe6`.
- 141 file della build corrispondono byte per byte ad `app.asar`; hash SHA512 e dimensione nel manifesto `latest.yml` verificati, FFmpeg presente e artefatti locali esclusi.
- Avvio del contenuto pacchettizzato nel runtime Electron con profilo temporaneo, finestra nascosta, rete e scansione USB reale disabilitate: renderer, sezioni attivi/archiviati e IPC di archiviazione, persistenza e ripristino verificati senza errori.
- Setup non firmato digitalmente. Nessuna installazione sul profilo reale, pubblicazione o chiamata AI.
