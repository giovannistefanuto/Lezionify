# Allineamento dei sorgenti GitHub — 25 ottobre 2026

Richiesta diretta dell'autore: allineare GitHub al checkout locale. Base locale
e remota verificata prima della pubblicazione: `3e6cd69` del 20 ottobre.

## Perimetro

Lo snapshot comprende 85 file già tracciati modificati e 80 nuovi file di
codice, test e documentazione, oltre agli aggiornamenti documentali della
pubblicazione. Include gli interventi D-0379–D-0407: RAG strutturato e
semantico locale, indice riprendibile e controlli fallibili delle affermazioni,
Memo, Focus, Q&A, traduttore, musica, preferenze e collaudi.

Le fonti personali, `.env`, audio, trascrizioni, profili, risultati grezzi,
`local-artifacts/`, build e installer restano locali e ignorati. La scansione
dei candidati non rileva formati di credenziali o chiavi private; i riscontri
su email sono fixture e metadati delle dipendenze. Nessuna nuova chiamata AI
o pubblicazione di lezioni è necessaria per l'allineamento.

## Verifiche

Il gate RAG pubblico offline `npm run test:rag-retrieval` è passato senza
modello o API. Sullo split di verifica lessicale: 25 casi, recall@8 0,9,
precision@8 0,642, MRR 0,875. Tre dei cinque casi negativi conservano candidati
affini: questo controllo non certifica la correttezza delle risposte generate.

Il primo `npm run check` nel sandbox si è fermato su errori EPERM durante
le rinomine della cache Vitest, prima di eseguire i test. Il controllo viene
rieseguito nel normale ambiente Windows, senza modificare i test, ed è passato:

- typecheck e lint;
- 739 test Vitest in 56 file, 24 test Python e 41 test Node;
- scenari React/Electron e ripristino della lettura dopo riavvio;
- build di produzione;
- esportazioni PDF reali IT/EN, selezione delle lezioni, pagine Note, Mermaid,
  formule, annullamento e conservazione delle fonti.

Il log completo resta in `local-artifacts/github-sync-check-2026-10-25.log`,
escluso dal repository. Anche `git diff --check` è passato.

## Limiti

Questo aggiornamento pubblica i sorgenti e la loro documentazione; non crea
una release binaria. Restano i limiti qualitativi RAG delle voci 90–92,
quelli Spotify e di accessibilità già documentati e il lavoro dedicato sulle
dipendenze indicato nel report del 19 ottobre. Nessuna dipendenza viene
aggiornata per questa pubblicazione. La CI remota va distinta dai collaudi
locali e verificata sul commit effettivamente pubblicato.
