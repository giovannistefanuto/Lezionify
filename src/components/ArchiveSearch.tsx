import type { RefObject } from 'react'

export function ArchiveSearch({ query, onChange, order, onOrderChange, inputRef }: {
  query: string; onChange: (value: string) => void
  order: 'relevance' | 'date'; onOrderChange: (value: 'relevance' | 'date') => void
  inputRef: RefObject<HTMLInputElement | null>
}) {
  return <section className="archive-search" aria-label="Ricerca nell’archivio">
    <label htmlFor="archive-search-input">Cerca lezioni</label>
    <div className="archive-search-controls">
      <input id="archive-search-input" ref={inputRef} type="search" className="search-input"
        placeholder="Titolo o parola nel testo…" value={query} onChange={event => onChange(event.target.value)} />
      {query && <button type="button" className="secondary-button" onClick={() => { onChange(''); inputRef.current?.focus() }}>Cancella</button>}
      {query.trim() && <label className="search-order">Ordina risultati
        <select aria-label="Ordine risultati ricerca" value={order} onChange={event => onOrderChange(event.target.value as 'relevance' | 'date')}>
          <option value="relevance">Pertinenza</option><option value="date">Data più recente</option>
        </select>
      </label>}
    </div>
  </section>
}
