# Idee da valutare — 9 ottobre 2026

Classificazione iniziale delle idee; tutte e sette le attività sono implementate.
Verifiche: typecheck, lint, 418 test Vitest, 14 test Python, scenari React/Electron e build di produzione passati.
Setup Windows generale rigenerato e verificato in `dist/Lezionify-Setup-0.1.0.exe`.
Per aggiornare l’app installata, chiudere Lezionify e avviare il setup.

## Facilmente applicabili

- [x] **Colori per materia in «Tutte le lezioni».** Riquadro colorato intorno al simbolo della dispensa, della trascrizione o dell’audio. Usa il colore configurato del corso, con palette deterministica di ripiego; il codice della materia resta visibile.
- [x] **Lunghezza relativa della dispensa.** Accanto a «Info & Gestione» compaiono le parole e la percentuale rispetto alla dispensa italiana più lunga dello stesso corso, che vale 100%. Il confronto usa tutto il corso, anche se archiviato, e non dipende dai filtri o dalla lingua visualizzata. Senza corso assegnato resta il conteggio con l’indicazione di assegnare un corso. Codice, diagrammi, formule e sintassi Markdown sono esclusi; dati mancanti o non leggibili sono distinti da zero parole.
- [x] **Notifica di pulizia USB temporanea.** Il messaggio «Eliminati 2 file dal registratore USB per liberare spazio. Copie locali al sicuro in Lezionify!» compare come notifica flottante, resta visibile per un secondo e sparisce con una dissolvenza di un secondo. Gli errori successivi restano visibili.
- [x] **Lettura stabile durante la risposta Gemini.** La nuova domanda viene posizionata una sola volta; aggiornamenti del testo e completamento non fanno scorrere automaticamente la discussione o il pannello esterno. Si può leggere e scorrere manualmente durante la generazione.
- [x] **Indicazione testuale dei laboratori.** Rimosso l’azzurrino della riga; « - Laboratorio» compare in grassetto accanto al titolo e rimane visibile quando il titolo lungo viene troncato.

## Da pensarci

- [x] **«Discussione Contestuale» ridimensionabile.** Divisore trascinabile nella vista ordinaria e nel Focus, con frecce, Home e doppio clic per ripristinare la larghezza. Conserva il punto di lettura durante il resize. Nel Focus le slide cedono temporaneamente spazio alla discussione più larga e tornano quando viene ridotta; spiegazione e discussione mantengono minimi leggibili. Su finestre strette si può scorrere orizzontalmente.
- [x] **Log completi delle elaborazioni Gemini.** Aggiunti eventi per le fasi delle dispense, singole sezioni, note d’esame, informazioni del corso, traduzioni e salvataggi. Il filtro AI Gemini include anche pipeline archivio, logistica del corso e traduzioni, che prima erano escluse. Trascrizione e tagli audio erano già registrati. Il pannello ora aggiorna i log automaticamente ogni due secondi mentre è aperto. Si registrano fasi, contatori ed esiti, senza titoli generati, contenuto delle lezioni o chiavi. I nuovi eventi vengono prodotti dalle prossime elaborazioni, senza ricostruire quelli passati.
