# Lezionify

App desktop local-first per archiviare lezioni registrate e trascrizioni. La prima milestone importa MP3 e, quando presente, il TXT omonimo; non effettua ancora chiamate AI.

## Avvio

```powershell
npm install
npm run dev
```

## Importazione iniziale

- **Seleziona file MP3** importa uno o piu' audio scelti manualmente.
- **Importa cartella** cerca gli MP3 direttamente nella cartella selezionata.
- Un file `RC 2026-0507-16-19-41.txt` viene associato automaticamente a `RC 2026-0507-16-19-41.mp3`.
- Gli audio vengono copiati nell'archivio interno dell'app. Un checksum SHA-256 evita duplicati.

I dati dell'utente non sono nel repository: Electron li conserva nella cartella dati dell'applicazione. Non inserire chiavi API, audio o trascrizioni reali nei file versionati.

## Documenti di progetto

- `IDEA_INIZIALE.md`: punto di partenza e ambito.
- `DECISIONI.md`: registro append-only delle scelte.
- `AGENTS.md`: procedura obbligatoria per modifiche future.
