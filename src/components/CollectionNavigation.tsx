import { useEffect, useState } from 'react'
import type { CollectionDefinition } from '../../shared/collections'

export function CollectionNavigation({ onOpen, selected, active }: { onOpen: (id?: string, archived?: boolean) => void; selected?: string; active?: boolean }) {
  const [open, setOpen] = useState(false)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [collections, setCollections] = useState<CollectionDefinition[]>([])
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = () => { void window.collections?.state().then(state => { if (!cancelled) { setCollections(state.collections); setError(false) } }).catch(() => { if (!cancelled) setError(true) }) }
    load()
    window.addEventListener('collections-changed', load)
    return () => { cancelled = true; window.removeEventListener('collections-changed', load) }
  }, [open])
  const render = (archived: boolean) => collections.filter(c => c.archived === archived).map(c => <button key={c.id} className={`course-button ${active && selected === c.id ? 'is-active' : ''}`} onClick={() => onOpen(c.id, archived)}><span>{c.name}</span></button>)
  return <div className="course-folder">
    <button className="folder-toggle" aria-label="Altro" aria-expanded={open} onClick={() => setOpen(value => !value)}><span aria-hidden="true">{open ? '📂' : '📁'}</span> Altro</button>
    {open && <div className="folder-children">
      <button className={`course-button ${active && !selected ? 'is-active' : ''}`} onClick={() => onOpen()}>Tutte le raccolte</button>
      {error && <p role="alert">Impossibile caricare le raccolte. Riapri Altro per riprovare.</p>}
      {render(false)}
      <button className="folder-toggle" aria-expanded={archivedOpen} onClick={() => setArchivedOpen(value => !value)}>Raccolte archiviate</button>
      {archivedOpen && <div className="folder-children"><button className="course-button" onClick={() => onOpen(undefined, true)}>Tutte le archiviate</button>{render(true)}</div>}
    </div>}
  </div>
}
