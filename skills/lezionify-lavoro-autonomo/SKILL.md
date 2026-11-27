---
name: lezionify-lavoro-autonomo
description: Porta le richieste operative di bug, nuove funzioni e revisioni di Lezionify dai chiarimenti alla release Windows verificata. Usa per liste di modifiche da eseguire, anche informali; escludi esempi, backlog, sola analisi e LISTA_ORDINE.
---

# Lavoro autonomo Lezionify

Lavora dalla radice del repository. Questa skill applica la preferenza permanente
dell'utente registrata in AGENTS.md: una richiesta operativa di modifiche include
implementazione, collaudi e pubblicazione finale. Le istruzioni specifiche della
richiesta corrente prevalgono, per esempio «senza release» o «prima discutiamone».

## Riconosci il mandato

Accetta elenchi con caselle, punti, numeri o testo libero: il titolo Lezionify
e la sintassi esatta non sono necessari quando il progetto è chiaro.
Considera operative le richieste che chiedono di correggere, aggiungere o
rivedere concretamente il prodotto. Una lista citata come esempio, idee da
salvare, una domanda di fattibilità, una richiesta di sola recensione/analisi
o la creazione di questa stessa skill restano nel loro perimetro dichiarato.
`LISTA_ORDINE` segue il proprio flusso in AGENTS.md.

Interpreta la richiesta come: «Lavora solo su queste voci; chiarisci ciò che
serve, poi procedi autonomamente fino a test e nuova release». Non attribuire
all'utente un nuovo messaggio inventato e non limitarti a riscrivere il prompt.

## Chiarisci quanto basta

Completa l'avvio previsto da AGENTS.md, riusando la sincronizzazione già tentata
nella chat. Leggi codice, decisioni e documenti pertinenti prima di chiedere
informazioni recuperabili dal progetto.

Riporta brevemente le voci da affrontare e il risultato osservabile atteso per
ciascuna. Conserva vincoli e dettagli della lista originale. Per richieste come
«gestire meglio E, F, G», identifica il comportamento concreto da ottenere.
Chiedi solo le scelte che cambiano il risultato per l'utente e non sono già
deducibili: raggruppa le domande indipendenti e proponi una scelta ragionevole.
Attendi le risposte necessarie; nel frattempo avanza sulle parti indipendenti.
Scegli autonomamente i dettagli tecnici reversibili.

Quando ogni voce ha un esito verificabile e non restano scelte di prodotto
necessarie, stampa come messaggio di avanzamento a sé stante:

DA QUI FACCIO DA SOLO

Prosegui subito con il lavoro. Se tutto era già chiaro, salta le domande.
La frase segna l'avvio dell'esecuzione, non la chiusura del turno.

## Esegui e verifica l'intero elenco

Mantieni una checklist di lavoro con esito e verifica per ogni voce. Affronta
anche le dipendenze necessarie fra le voci; lascia il resto del backlog fuori
dal mandato. Una revisione esplorativa richiede prima fatti e una proposta:
se la scelta del comportamento rimane aperta, chiariscila prima di implementarla.

Consulta `docs/product/guida-skill-codex.md` e applica solo le skill pertinenti
disponibili, annunciandole prima dell'uso. Per un bug usa `diagnosing-bugs`;
per UI e flussi scegli il supporto di design necessario. Istruzioni e test
proporzionati alla modifica evitano una pipeline di skill fine a sé stessa.

Implementa, esegui i test pertinenti e correggi le regressioni. Per cambiamenti
visivi verifica l'interfaccia funzionante negli stati interessati. Conserva le
fonti originali e usa dati sintetici nei collaudi; le chiamate AI con dati
personali o costi richiedono l'autorizzazione prevista dal progetto.
Registra le decisioni tramite `tools/append_decision.py` e aggiorna i documenti
coinvolti. Segna una voce completata solo dopo implementazione e verifica:
ricerca, prototipo o test non eseguito non bastano.

Conserva il mandato anche attraverso aggiornamenti di stato e compattazioni.
Le correzioni dell'utente durante il lavoro aggiornano il perimetro; una
richiesta di fermarsi interrompe l'esecuzione. Mantieni gli aggiornamenti
di avanzamento senza chiedere conferme rituali fra implementazione e release.

## Concludi con la release

Quando tutte le voci sono verificate, leggi e applica
`skills/lezionify-release/SKILL.md` e `docs/publishing/aggiornamenti-windows.md`.
La richiesta operativa riconosciuta da questa skill autorizza già commit, push
e pubblicazione Windows: procedi senza chiedere una nuova approvazione finale.
Segui la procedura autorevole per versione crescente, note, gate, build unica,
backup, asset, sorgenti sul remoto e verifica della release pubblica.
Rispetta le esclusioni esplicite della richiesta, compreso «senza pubblicare».
Se cambiano solo istruzioni, documentazione o test senza effetti sui binari,
concludi con le verifiche appropriate e spiega che non serve una nuova release.
Android e installazione sui dispositivi personali richiedono un mandato specifico.

Se emerge un blocco concreto (requisito indispensabile, credenziali, permessi,
test falliti o conflitto), completa le parti indipendenti e conserva il lavoro.
Descrivi cosa manca e la minima azione necessaria per riprendere. Non pubblicare
una release parziale della lista né aggirare gate o permessi per rispettare
«fai da solo». Riprendi il mandato quando il blocco viene risolto.

Il lavoro è concluso quando ciascuna voce ha un esito verificato e, se prevista,
la release è pubblica, completa e verificata con sorgenti sul remoto. Rispondi
con versione e link, voci completate, verifiche e limiti materiali. Se bloccato,
indica lo stato effettivo delle voci e della release senza dichiarare completamento.
