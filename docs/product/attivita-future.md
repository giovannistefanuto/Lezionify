# Lezionify — Attività e stato di implementazione

Lista raccolta e implementata l'8 ottobre 2026.
Le tre attività seguenti sono completate; le verifiche sono registrate in DECISIONI.md.

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
