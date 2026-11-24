const groups = [
  { title: 'Navigazione', items: [
    ['Ctrl+K', 'Apri l’Archivio e cerca lezioni'],
    ['Ctrl+Alt+S', 'Apri o chiudi Sessione, fuori dal blocco Full Focus'],
    ['Ctrl+Shift+L', 'Apri o chiudi i log di sistema'],
    ['Esc', 'Chiudi il menu o la finestra attiva; in Full Focus apre i controlli di uscita'],
    ['Tab / Shift+Tab', 'Passa al controllo successivo o precedente']
  ] },
  { title: 'Lezioni e studio', items: [
    ['Ctrl+L', 'Passa tra italiano e inglese, se entrambi disponibili nella lezione aperta'],
    ['Ctrl+T', 'Apri il dizionario per la parola selezionata o per inserirne una'],
    ['Ctrl++ / Ctrl+−', 'Aumenta o riduci lo zoom del pannello di testo o PDF attivo'],
    ['Ctrl+rotella', 'Regola lo zoom nel pannello sotto il puntatore'],
    ['F2', 'Rinomina la lezione selezionata nell’elenco'],
    ['Shift+F10', 'Apri le azioni della lezione o del corso attivo'],
    ['Invio / Spazio', 'Gira la flashcard attiva'],
    ['← / →', 'Passa alla flashcard precedente o successiva'],
    ['Invio / Shift+Invio', 'Nel Q&A: invia la domanda / vai a capo'],
    ['← / → · Home', 'Sul divisore dei pannelli: sposta / ripristina la divisione']
  ] },
  { title: 'Memo', items: [
    ['Ctrl+M / Ctrl+P', 'Apri o chiudi Memo, fuori da Sessione'],
    ['Alt+lettera', 'Seleziona il gruppo Memo con la lettera assegnata nelle sue opzioni'],
    ['Ctrl+B', 'Nell’editor Memo: applica o rimuovi il grassetto'],
    ['F2 / Invio', 'Modifica l’attività Memo selezionata'],
    ['Invio / Esc', 'Nell’attività Memo: conferma / annulla la modifica']
  ] }
]

export function KeyboardShortcuts() {
  return <section className="keyboard-shortcuts" aria-labelledby="keyboard-shortcuts-title">
    <h4 id="keyboard-shortcuts-title">Scorciatoie da tastiera</h4>
    <p>Su macOS usa ⌘ al posto di Ctrl, salvo Ctrl+Alt+S e Ctrl+rotella. Le combinazioni dipendono dalla schermata attiva.</p>
    {groups.map(group => <details key={group.title} open={group.title === 'Navigazione'}>
      <summary>{group.title}</summary>
      <dl>{group.items.map(([keys, action]) => <div key={keys}><dt><kbd>{keys}</kbd></dt><dd>{action}</dd></div>)}</dl>
    </details>)}
  </section>
}
