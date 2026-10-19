# Checklist di pubblicazione

Aggiornamento sorgenti del 19 ottobre 2026: [perimetro, verifiche e audit](../quality/pubblicazione-github-2026-10-19.md).
La pubblicazione del codice non equivale a una release dell’app né a un audit privo di segnalazioni.

## Controlli prima del push

- [x] Sostituire i tre segnaposto del README con schermate Electron e dati sintetici.
- [x] Creare il repository GitHub e inserire l'URL reale nel README.
- [x] Aggiungere `repository`, `homepage` e issue tracker a `package.json`.
- [ ] Controllare `git status --short` e aggiungere intenzionalmente i file, evitando `git add .` alla cieca.
- [x] Eseguire `npm run check` e `npm audit`, riportando separatamente gli esiti: quality gate positivo, audit con 19 segnalazioni.
- [x] Verificare che `.library-data/`, `local-artifacts/` e `benchmark_outputs/` siano ignorate.
- [x] Cercare chiavi, email, percorsi locali e contenuti universitari reali nei file candidati, mantenendo locali trascrizioni e script personali.
- [ ] Aprire il README direttamente su GitHub e controllare immagini, Mermaid e link.
- [ ] Attivare Private Vulnerability Reporting e Dependabot alerts nelle impostazioni del repository.

## Profilo GitHub

Descrizione suggerita:

> Desktop app local-first che trasforma registrazioni universitarie in trascrizioni, dispense Markdown e strumenti di studio assistiti dall'AI.

Topic suggeriti:

`electron`, `react`, `typescript`, `local-first`, `education`, `transcription`, `gemini`, `desktop-app`, `study-tools`

Usa `docs/assets/brand/lezionify-logo.png` come base per la social preview del repository. Una preview orizzontale 1280×640 con nome e payoff sarà più leggibile del logo quadrato da solo.

## Dopo il push

- [ ] Attendere il primo esito verde della workflow CI.
- [ ] Proteggere `main` richiedendo il quality check per le pull request, se il repository verrà sviluppato pubblicamente.
- [ ] Creare una release soltanto dopo aver provato installer o portable su una macchina Windows pulita.
- [ ] Collegare repository e demo dal profilo GitHub e dal post LinkedIn.
