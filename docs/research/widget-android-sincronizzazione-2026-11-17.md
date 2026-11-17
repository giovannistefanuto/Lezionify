# Widget Android e sincronizzazione delle statistiche

Ricerca del 17 novembre 2026. Questo documento propone un percorso: non attesta
implementazione, installazione sul telefono o prestazioni misurate. Nessun dato
personale e nessuna credenziale sono inclusi.

## Esperienza proposta

Un'app Android piccola serve ad abbinare il PC, scegliere i corsi e verificare
la sincronizzazione. Il widget mostra tempo studiato oggi, nella settimana e
nel mese, lezioni mancanti per corso e data/ora dei dati. Un grafico degli ultimi
sette giorni e' facoltativo. L'apertura dell'app e il pulsante Aggiorna richiedono
un nuovo scaricamento; l'interfaccia conserva nel frattempo l'ultimo riepilogo
valido. Nessuna funzione di lettura delle dispense o invocazione AI.

La visualizzazione pronta deriva dalla cache locale: il launcher ospita il
widget e non deve aspettare una GET per mostrare il contenuto gia' disponibile.
Non equivale a dati aggiornati in tempo reale. La documentazione non offre un
callback universale dell'AppWidgetProvider per ogni passaggio alla pagina home;
quindi non si deve progettare un aggiornamento garantito semplicemente quando
l'utente guarda il widget. Il timer XML dei widget ha un minimo di 30 minuti.
Sono possibili aggiornamenti dopo interazioni e richieste esplicite.
[Fonte Android](https://developer.android.com/develop/ui/views/appwidgets/advanced).

Per aggiornamenti autonomi si puo' usare WorkManager con intervallo minimo di
15 minuti. Doze, vincoli di rete e ottimizzazioni della batteria possono ritardare
l'esecuzione: non e' una scadenza garantita. Obiettivo proposto: cache sempre
leggibile, recupero periodico quando consentito e aggiornamento su richiesta.
Non promettere mezzo secondo per una nuova risposta di rete; misurarlo sul
telefono reale. [Fonte WorkManager](https://developer.android.com/reference/androidx/work/PeriodicWorkRequest).

## Quali dati inviare

Proposta di snapshot JSON versionato, con conteggi gia' calcolati dal desktop:
identita' casuale del flusso, revisione crescente, istante di generazione,
fuso e periodo di riferimento, secondi per giorno, riepiloghi e corsi con conteggi
totali/completati/residui. Niente titoli delle lezioni, percorsi, audio, note,
trascrizioni o cronologia degli eventi grezzi. Il payload dovrebbe restare
nell'ordine dei kilobyte; dimensione effettiva da misurare.

Usare le stesse regole del desktop per attivita' accreditate, corsi attivi,
rettifiche e settimane locali lunedi'-domenica. Chiarire se «mancanti» significa
non studiate fra quelle importate oppure lezioni attese dell'intero corso.
I totali «oggi» non possono essere semplicemente ripresentati dopo mezzanotte:
in assenza di nuovi dati mostrare il periodo originale e lo stato non aggiornato,
oppure ricalcolare da aggregati giornalieri sufficienti. Stesso controllo al
cambio settimana/mese e durante viaggi con cambio di fuso.

## Trasporto: alternative

| Opzione | Configurazione | Vantaggio | Limite |
| --- | --- | --- | --- |
| GitHub personale | Repository dati dedicato e credenziale del proprietario sul PC | Nessun server da amministrare | Setup GitHub, storico, limiti e possibili cache; inadatto a scritture frequenti |
| Relay HTTPS | Piccolo servizio e archivio oggetti per utente | Isolamento e sovrascrittura senza commit per aggiornamento | Servizio da configurare e mantenere; verificare costi e disponibilita' |
| Rete locale | PC acceso e raggiungibile dal telefono, autenticazione e firewall | Nessun dato su servizi esterni | Non funziona normalmente fuori casa e con PC spento |

Con GitHub ogni PC deve poter scrivere il proprio snapshot. L'ID casuale
seleziona i dati, ma non concede permessi di scrittura. La Contents API richiede
`Contents: write` per creare/aggiornare file e permette letture pubbliche senza
autenticazione; un repository privato richiede autorizzazione anche in lettura.
Il token del proprietario non deve essere distribuito nell'app agli altri utenti.
L'endpoint aggiorna file creando commit: la cronologia cresce. Le scritture
concorrenti richiedono gestione dei conflitti. Per questo GitHub e' una scelta
personale possibile, non un database multiutente anonimo pronto all'uso.
[Fonte Contents API](https://docs.github.com/en/rest/repos/contents).

I limiti REST documentati comprendono 60 richieste/ora per IP senza autenticazione
e normalmente 5.000/ora per utente autenticato, oltre a limiti secondari.
Non estendere questi numeri automaticamente al dominio raw. Mille utenti con
scritture frequenti sotto una sola identita' richiedono un disegno diverso.
Applicare debounce delle pubblicazioni, richieste condizionali dove supportate,
backoff e rispetto delle risposte di limite; nessuna promessa di latenza dal
semplice fatto che il file e' piccolo.
[Fonte limiti GitHub](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

Un file unico con tutti gli utenti aumenta trasferimento, conflitti e accoppiamento:
proposta preferita, un oggetto cifrato per flusso/utente, recuperato direttamente.
Nel relay, l'autorizzazione deve vincolare ogni credenziale al proprio oggetto;
un nome difficile da indovinare non sostituisce questo controllo. Queste sono
raccomandazioni architetturali, non funzionalita' verificate di un provider scelto.

## Protezione semplice

Un hash non e' cifratura e non permette di ricostruire le statistiche. Proposta:
chiave casuale di 256 bit per AES-GCM e ID casuale distinto; abbinamento tramite
QR mostrato dal desktop. Il QR contiene indirizzo/ID e segreto di decifratura,
mai una credenziale globale di scrittura. AES-GCM e' fra gli algoritmi
raccomandati da Android. Usare nonce unico per ogni messaggio della stessa chiave,
tag di autenticazione e intestazione/versione autenticata. Implementazione da
verificare con vettori comuni fra Node e Android.
[Fonte crittografia Android](https://developer.android.com/privacy-and-security/cryptography).

Conservare la chiave del telefono mediante Android Keystore, importandola o
proteggendola con una chiave locale secondo le API effettivamente scelte.
La protezione hardware dipende dal dispositivo; non dichiararla senza verifica.
La chiave deve poter essere usata in background senza richiedere biometria a
ogni aggiornamento. Abbinamento, revoca e recupero telefono perso vanno definiti.
[Fonte Keystore](https://developer.android.com/privacy-and-security/keystore).

In un repository pubblico restano visibili dimensioni, frequenza e versioni del
cifrato. Chi ottiene successivamente la vecchia chiave puo' leggere i vecchi
snapshot ancora disponibili: ruotarla non cancella il passato. GitHub documenta
che rimuovere dati dalla cronologia e dalle copie puo' richiedere interventi
ulteriori. Non caricare dati personali neppure temporaneamente nel repository
sorgente e non salvare QR, chiavi o token nei log.
[Fonte storico GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## Percorso proposto e decisioni aperte

L'utente ha scelto GitHub per la prima versione personale. Il percorso proposto
usa un repository dati separato, un file per flusso, cifratura obbligatoria prima
dell'upload e token di scrittura limitato a quel repository, conservato solo sul
PC. Il QR trasferisce endpoint e chiave. Pubblico cifrato semplifica la lettura dal telefono; privato
richiede anche una credenziale di sola lettura sul telefono. Nessun upload
automatico prima dell'attivazione esplicita nelle impostazioni.

Per distribuire a molti utenti con un abbinamento semplice, preferire un relay
HTTPS e oggetti indipendenti con credenziali per utente/dispositivo. Il formato
snapshot e il widget possono restare uguali cambiando il trasporto. Nessun
database SQL e' necessario per archiviare l'ultimo piccolo snapshot.

Prossimo sviluppo: definire snapshot e vettori AES-GCM condivisi; aggiungere
esportatore desktop con attivazione esplicita, configurazione locale, pubblicazione
accorpata e stato ultimo invio; creare app Android con abbinamento QR, cache,
GET e widget; infine verificare insieme il percorso PC-GitHub-telefono con dati
sintetici e solo dopo con le statistiche personali autorizzate.

## Riscontro nel progetto e sul telefono

Avvio implementazione: `shared/mobileStatistics.ts` prepara gli aggregati minimi,
con identificativo del flusso e revisione; `electron/main/mobileStatisticsCrypto.ts`
e `android-companion/crypto/MobileCrypto.java` implementano AES-256-GCM con
intestazione autenticata. Tre test unitari e una prova sintetica Node/Java
coprono conteggi, cambio mese, cifratura e manomissione. App e widget Android in `android-companion/`:
codice di abbinamento incollato manualmente (URL HTTPS raw.githubusercontent.com,
streamId e chiave), chiave protetta da Android Keystore, cache e GET limitata,
verifica versione/identita/revisione, widget e refresh periodico di 30 minuti.
APK debug compilato localmente e installato su Android 15; il percorso GitHub
con dati sintetici e il widget sulla Home sono stati collaudati. QR non disponibile.
Sono stati predisposti moduli desktop per generazione
del codice, salvataggio cifrato con adapter di protezione del sistema e Contents
API GitHub, verificati con risposte simulate. Il publisher richiede repository
pubblico separato, controlla identita/revisione e usa SHA per evitare scritture
in conflitto. Generazione e publisher sono collegati all'app desktop; e' stato
caricato un riepilogo sintetico cifrato, nessun dato personale.

Verifica locale del 17 novembre: ADB vede un dispositivo autorizzato con
Android 15 (API 35); sul PC sono presenti SDK 34/35/36 e build-tools 35/36.
L'APK debug e' installato sul telefono; la versione desktop e' in preparazione.

`shared/archive.ts` espone `StudyStatus`, `CourseStats` e `StudyAnalytics`;
`electron/main/archive.ts:getStudyAnalytics` applica rettifiche ed esclusione
dei corsi archiviati e restituisce `dailyHistory`. Riutilizzare questi dati,
senza introdurre sul telefono un secondo tracker. Per la prima proposta,
«mancanti» = lezioni importate non `completata`, incluse quelle `in-corso`;
non stima le lezioni future non importate. Settimana corrente da lunedi' e mese
di calendario nel fuso del desktop. Non moltiplicare le medie esistenti per
7 o 30: si riferiscono a finestre mobili, diverse dai periodi richiesti.

Proposta di invio: accorpare i cambiamenti e pubblicare al massimo ogni cinque
minuti durante l'uso, solo se lo snapshot e' cambiato, con aggiornamento
manuale disponibile. Non ricreare una commit a ogni tick del timer. PC spento
significa nessun nuovo dato; il telefono conserva l'ultimo snapshot e ne mostra
l'eta'. Definire al massimo un PC scrittore per flusso nella prima versione.

Lettura Android: repository dati pubblico con contenuto cifrato per evitare
credenziali GitHub sul telefono. Creato `giovannistefanuto/lezionify-statistiche`;
contiene un riepilogo sintetico cifrato, nessuna statistica personale.
Usare GET del singolo oggetto con timeout finito, limite dimensione, verifica
AES-GCM, schema e revisione prima della sostituzione atomica della cache.
Mantenere l'ultima copia valida in caso di errore; distinguere generazione sul
PC e ultimo controllo riuscito sul telefono. Un 304 non rende piu' recente la
generazione dei dati. Memorizzare solo aggregati giornalieri sufficienti per
i periodi esposti, evitando la pubblicazione dello storico intero per default.

La sincronizzazione iniziale Git e' stata completata dopo aver conservato le
modifiche preesistenti nel commit locale 738b776. I moduli sono integrati nel
runtime desktop; la configurazione personale e' ancora disattivata.

Restano da confermare la definizione proposta di lezioni mancanti e l'eventuale
necessita' futura di piu' PC.
Prima dell'installazione verificare SDK/JDK,
modello/versione Android, ADB e autorizzazione debug USB. Collaudi: confronto
con i totali desktop, offline, cambio giorno/settimana/mese, dati alterati,
chiave errata, revisione precedente, errore rete, riavvio, Doze e aggiornamento
manuale dal widget. Obiettivo di rapidita' da misurare distinguendo cache e rete.
