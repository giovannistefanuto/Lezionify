# Lezionify — Attività e stato di implementazione

Lista raccolta e implementata l'8 ottobre 2026.
Le tre attività seguenti sono completate; le verifiche sono registrate in DECISIONI.md.

Per le richieste successive, comprese quelle del 22 ottobre e i tredici rilievi
del report UX/UI, usare [Idee future e Coda LISTA_ORDINE](idee-future-2026-10-13.md#coda-lista_ordine):
è l'unica coda operativa. Il riordino D-0390 contava 34 attività aperte;
D-0392 ne conclude 18, lasciandone 16 aperte. La successiva aggiunta delle dieci
attività RAG 89–98 porta la coda a 26 aperte, conservando l'ordine precedente;
[base implementata e limiti](rag-implementazione-2026-10-22.md).
Il completamento RAG del 23 ottobre (D-0400–D-0403) chiude 89 e 93–98:
restano 19 aperte, comprese le validazioni 90–92. [Uso e verifiche](rag-completamento-2026-10-23.md).
Questo elenco conserva gli esiti
storici dell'8 ottobre; [uso e verifiche del 22 ottobre](interventi-2026-10-22.md).

## 1. Ordinamento in «Tutte le lezioni»

- [x] Mostrare prima le lezioni **In corso**.
- [x] Mostrare subito dopo le lezioni **Da studiare** (gialle).
- [x] Spostare in fondo le lezioni **Completate**.

## 2. Corsi archiviati nelle statistiche

- [x] Escludere i corsi archiviati dalla sezione **Statistiche**.

I dati dei corsi archiviati devono restare conservati nell'archivio locale.

## 3. Tempo medio di studio per lezione, per corso

- [x] Aggiungere per ogni corso la statistica: **«Quanto tempo impiego in totale,
  in media, per studiare una lezione?»**

Il tempo di una lezione comprende le diverse sessioni dedicate al suo studio.
La media considera solo le lezioni completate con tempo registrato maggiore di zero.
Somma tutte le sessioni associate a ciascuna lezione e divide per il numero di
lezioni incluse; mostra anche la dimensione del campione. Le lezioni senza tempo
registrato sono escluse e, in assenza di un campione, viene mostrato
«Dati insufficienti». Il tempo manuale generico del corso resta nei totali ma
non entra nella media per lezione.

I corsi archiviati sono esclusi anche dai totali, dai grafici, dalle medie
giornaliere, dalla ripartizione e dallo streak. Il ripristino li include nuovamente
senza cancellare le sessioni. In «Tutte le lezioni» l'ordine cronologico già
presente resta invariato all'interno di ciascuno stato; le viste di un singolo
corso conservano l'ordinamento precedente.
