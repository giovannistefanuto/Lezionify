# Repository del progetto e portfolio — proposta

## Obiettivo

Presentare Lezionify come progetto personale completo: problema concreto, idee dell'autore, applicazione funzionante, scelte documentate e uso dichiarato dell'AI nello sviluppo. La riorganizzazione del repository pubblico è una fase successiva alla sistemazione delle lezioni.

## Situazione attuale

- `Lezionify` contiene il codice desktop, i test, la documentazione e il registro delle decisioni.
- `lezionify-appunti` contiene i testi pubblicati dalla libreria locale, organizzati per corso e data.
- Il README del codice collega gli appunti; il README degli appunti presenta il progetto e collega il codice.

Questa relazione consente già di mostrare sia il prodotto sia un risultato concreto.

## Ipotesi di repository unico

Se si decide di usare una sola repository, la struttura proposta è:

```text
README.md              presentazione del progetto e collegamento alle lezioni
electron/, src/, shared/  codice dell'app desktop
tests/, tools/         verifiche e strumenti riproducibili
docs/                  prodotto, architettura, decisioni, demo e qualità
lezioni/               indice e lezioni pubbliche per corso/data, ITA e EN
```

Prima di migrare va aggiunto un prefisso configurabile `lezioni/` alla sincronizzazione: attualmente essa gestisce il README nella radice della destinazione. Puntarla direttamente al repository del codice sovrascriverebbe il README del progetto. Servono test che provino che codice, documentazione e file estranei alla pubblicazione siano preservati, poi una migrazione Git ordinaria con cronologia conservata.

## Cosa includere

Codice sorgente pertinente, configurazioni riproducibili senza credenziali, lockfile, test sintetici, documentazione, decisioni tecniche, screenshot anonimi e una breve demo. Una release Windows può distribuire il programma compilato senza commettere gli installer nel sorgente.

Non equivale a caricare tutti i file locali: libreria personale, audio originali, log, token anche cifrati, password, configurazioni personali, output temporanei, dipendenze installate e build restano fuori. Trascrizioni e dispense si includono solo nel perimetro di pubblicazione scelto dall'autore. Prima di ampliare il materiale pubblico, controllare i file candidati e la cronologia, non soltanto il `.gitignore`.

`APP_TELEFONIA/` è un progetto indipendente: per un portfolio comprensibile conviene valutarne una repository propria. Gli script sperimentali e i documenti locali non ancora versionati vanno valutati singolarmente per pertinenza e dati contenuti.

## Presentazione per il portfolio

Il README dovrebbe raccontare il problema e il flusso con una demo breve, evidenziare le scelte local-first e la conservazione delle fonti, indicare come avviare l'app e come consultare gli appunti, mostrare test e limiti reali. Il ruolo dell'AI va dichiarato in modo concreto: supporto alla realizzazione, con idee, scelte e verifica curate dall'autore.

## Passi successivi

1. Inventario dei file locali candidati, verifica delle esclusioni e ricerca di segreti senza stamparli.
2. Scelta della destinazione unica e del percorso delle lezioni, con protezione del README del codice.
3. Implementazione del prefisso e collaudo offline della migrazione.
4. Revisione dei contenuti pubblici, screenshot e demo.
5. Migrazione e pubblicazione concordate con l'autore.

Questa proposta non cambia la destinazione configurata e non pubblica il codice o gli altri file locali.
