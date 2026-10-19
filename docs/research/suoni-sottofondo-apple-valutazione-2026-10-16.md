# Suoni di sottofondo Apple: valutazione per Lezionify

Data: 2026-10-16. Ambito: posizione 18 di LISTA_ORDINE, richiesta di suoni offline uguali a quelli Apple e interfaccia simile. Ricerca documentale; nessun audio scaricato, estratto o incluso nel progetto, nessuna funzionalità implementata. Le alternative qui descritte non sono state adottate.

## Esito utilizzabile per la scelta

Le fonti consultate documentano una funzione integrata nei dispositivi Apple, con download gestito dal sistema. Non è stato individuato un catalogo ufficiale di file audio con una licenza che consenta di incorporarli, redistribuirli o scaricarli da Lezionify su Windows. L'assenza di un grant trovato non dimostra che una licenza negoziata sia impossibile; significa che questa ricerca non fornisce il permesso necessario per adottare gli originali. Download sul dispositivo Apple e disponibilità eventuale di un URL pubblico non equivalgono a concessione di riuso in un'app terza. Vedi [supporto Apple](https://support.apple.com/it-it/109346), [licenza macOS Tahoe](https://www.apple.com/legal/sla/docs/macOSTahoe.pdf) e [licenza iOS/iPadOS 26](https://www.apple.com/legal/sla/docs/iOS26_iPadOS26.pdf).

## Funzione e interazione documentate

Apple permette avvio/arresto, scelta con anteprima, volume e gestione della riproduzione insieme ad altri contenuti. Dalle versioni 26/Tahoe sono documentati equalizzatore, timer di arresto e automazioni con Comandi Rapidi. Queste sono caratteristiche funzionali di riferimento per una UI Lezionify; non richiedono di copiare schermate, loghi o asset grafici Apple. [Supporto Apple italiano](https://support.apple.com/it-it/109346), [novità ufficiali iPadOS 26, p. 12](https://www.apple.com/os/pdf/All_New_Features_iPadOS_26_Sept_2025.pdf).

Su Mac il pannello Accessibilità > Audio > Suoni di sottofondo contiene scelta suono e volume. Il pulsante download ottiene la versione ad alta qualità e richiede internet; eliminandola resta disponibile un campione. **Inferenza tecnica:** è un modello di disponibilità locale dopo acquisizione, utile come riferimento per il requisito offline. Non è stata eseguita una prova fisica senza rete su Mac/iPhone/iPad e non è documentato qui un diritto di esportare quei file. [Manuale Apple Mac](https://support.apple.com/it-it/guide/mac-help/mchl3061cdc6/mac).

Il manuale ufficiale di iPod touch dichiara esplicitamente che scegliendo il suono il file audio viene scaricato sul dispositivo; è una fonte storica, non una prova dell'esatto comportamento di ogni versione attuale di iPhone. Anche il manuale Vision Pro documenta un file scaricato. [iPod touch](https://support.apple.com/it-it/guide/ipod-touch/iphb2cfa052c/ios), [Vision Pro](https://support.apple.com/it-it/guide/apple-vision-pro/tancdbf42b14/visionos).

## Catalogo: cosa è confermato e cosa resta da verificare

Apple nomina esplicitamente rumori balanced/bright/dark e paesaggi oceano e pioggia nella pagina Accessibilità; una pagina ufficiale Education elenca rumore rosa, bianco, marrone, oceano, pioggia e ruscello. Sono esempi documentati, non una garanzia di identità tra ogni traduzione dei nomi e le proprietà spettrali dei rispettivi file. [Apple Accessibilità](https://www.apple.com/accessibility/features/), [Apple Education](https://support.apple.com/it-it/121825).

Le pagine di supporto consultate non offrono nel testo un inventario completo e versionato di tutti i suoni attuali. La pagina generica del manuale iPhone può rimandare a una versione successiva; per evitare ambiguità è stato consultato anche il [manuale iOS 26](https://support.apple.com/en-au/guide/iphone/iphb2cfa052c/26/ios/26). L'immagine ufficiale del catalogo collegata dall'articolo italiano non è stata recuperata dal browser di ricerca. Non vengono quindi promessi numero completo, nomi degli eventuali nuovi suoni, durata, formato, dimensioni o uguaglianza acustica tra piattaforme. Un confronto esatto richiederebbe la versione e l'elenco del dispositivo Apple di riferimento, poi un ascolto consentito degli originali e dei candidati.

## Vincoli degli originali

Sono stati controllati sia i documenti 26/Tahoe, utili per le funzionalità introdotte allora, sia i PDF ufficiali pubblicati ai percorsi macOS 27 e iOS/iPadOS 27 alla data della ricerca. La licenza pertinente all'utente dipende dal prodotto/versione e dalle condizioni che lo accompagnano: Apple stessa avverte che il documento online può differire da quello fornito all'acquisto. [Indice licenze Apple](https://www.apple.com/legal/sla/).

- Anche nel documento macOS al percorso 27, §1 include contenuti e dati e riserva i diritti; §2J limita uso su hardware non Apple e redistribuzione, mentre §4 disciplina il trasferimento completo con l'hardware e i componenti del bundle. Non è stato individuato un grant specifico per i suoni in Windows. [PDF macOS 27](https://www.apple.com/legal/sla/docs/macOS27.pdf).
- Il documento iOS/iPadOS 27 conserva in §2(e) la titolarità dei contenuti e in §3 il limite alla redistribuzione, con trasferimento collegato al dispositivo. Anche qui non è stato individuato un grant pubblico specifico per gli audio di sottofondo. [PDF iOS/iPadOS 27](https://www.apple.com/legal/sla/docs/iOS27_iPadOS27.pdf).
- La licenza macOS Tahoe comprende contenuti e dati nella definizione del software, riserva i diritti non concessi e limita uso e redistribuzione (§1, §2J e §3). Non è stata trovata un'eccezione specifica per distribuire Suoni di sottofondo in un'app Windows. [Licenza ufficiale macOS Tahoe](https://www.apple.com/legal/sla/docs/macOSTahoe.pdf).
- La licenza iOS/iPadOS 26 disciplina software, contenuti e aggiornamenti; §3 vieta ordinariamente redistribuzione e sublicenza, con un trasferimento completo collegato al dispositivo. Non è stato individuato un grant specifico per questi audio. [Licenza ufficiale iOS/iPadOS 26](https://www.apple.com/legal/sla/docs/iOS26_iPadOS26.pdf).
- L'API Apple trovata per `allowsAccessibilityBackgroundSounds` permette di regolare la disponibilità della funzione durante una sessione di valutazione; non documenta un archivio audio esportabile o un SDK Windows. [Apple Developer](https://developer.apple.com/documentation/automaticassessmentconfiguration/aeassessmentconfiguration/allowsaccessibilitybackgroundsounds).

Questa è una lettura tecnica per scegliere il materiale del progetto, non un parere legale su tutte le eccezioni applicabili. L'uso personale dichiarato dall'utente non costituisce, da solo, una concessione documentata per copiare asset Apple nell'app.

## Opzioni da concordare prima dell'implementazione

| Opzione | Cosa consente tecnicamente | Condizione e limite |
| --- | --- | --- |
| Originali Apple | Catalogo realmente identico se ottenuto e usato con autorizzazione adeguata | Occorre un grant applicabile; questa ricerca non lo ha trovato. Nessun download automatico Apple da implementare su queste evidenze. |
| Importazione locale | L'utente seleziona file propri o legittimamente riutilizzabili; Lezionify li conserva/riproduce offline | Non rende lecita l'estrazione da Apple. Nessun estrattore, registratore o aggiramento proposto. Verificare provenienza e diritti dei file concreti. |
| Suoni equivalenti con licenza idonea | Stesse categorie ambientali, loop e controlli simili, con audio diverso | Richiede accettazione esplicita dell'utente, selezione e ascolto dei candidati, verifica di ogni licenza e attribuzione. Non chiamarli originali Apple. |
| Produzione autonoma | Registrazioni originali o rumori generati localmente, anche senza download | Nessuna promessa di identità Apple; qualità, continuità del loop e gradimento da verificare prima dell'adozione. |

Per la terza opzione esistono fonti con concessioni verificabili: Freesound assegna licenze per singolo suono e avverte che i contenuti sono caricati dagli utenti. CC0 permette copia/modifica/distribuzione anche commerciale, con limiti relativi ad altri diritti; CC BY 4.0 permette riuso e adattamento con attribuzione, collegamento alla licenza e indicazione delle modifiche. Le registrazioni vanno comunque valutate singolarmente. Non sono stati scelti né scaricati asset. [Freesound FAQ](https://freesound.org/help/faq/), [Freesound termini](https://freesound.org/help/tos_web/), [CC0](https://creativecommons.org/publicdomain/zero/1.0/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Prossimo passo

Concordare se l'identità con gli originali Apple è un requisito imprescindibile oppure se l'utente accetta equivalenti dichiarati con interfaccia ispirata ai controlli funzionali Apple. Solo dopo questa scelta definire catalogo, acquisizione locale, licenze e criterio di ascolto. La ricerca non completa la voce: implementazione e collaudo restano necessari e la casella deve restare aperta.
