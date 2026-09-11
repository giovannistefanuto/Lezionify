# Contribuire a Lezionify

Lezionify è un progetto personale in sviluppo, ma issue e pull request mirate sono benvenute.

## Prima di iniziare

1. Leggi `IDEA_INIZIALE.md`, `STRUTTURA_PROGETTO.md` e le decisioni più recenti in `DECISIONI.md`.
2. Apri un'issue per modifiche ampie a prodotto, dati, provider AI o architettura.
3. Non includere mai audio, trascrizioni universitarie reali, chiavi API, log personali o file della libreria locale.

## Setup

```powershell
npm ci
npm run dev
```

Prima di inviare una pull request esegui:

```powershell
npm run check
```

I test che contattano servizi esterni sono opzionali, non girano in CI e devono usare esclusivamente dati sintetici.

## Decisioni e dipendenze

Ogni scelta non banale deve essere registrata con `tools/append_decision.py`, seguendo `AGENTS.md`. Prima di aggiungere una dipendenza valuta se il bisogno può essere coperto dallo stack esistente.

## Stile dei commit

Usa commit piccoli e descrittivi, separando quando possibile refactoring, comportamento e documentazione. Non è richiesto un formato rigido, ma il messaggio deve spiegare il risultato ottenuto.
