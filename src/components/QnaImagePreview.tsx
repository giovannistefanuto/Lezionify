import { useEffect, useState } from 'react'
import type { QnaImage } from '../../shared/qnaImages'

export function QnaImagePreview({ id }: { id: string }) {
  const [value, setValue] = useState<{ image: QnaImage; data: string } | null>(null)
  const [missing, setMissing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener('qna-images-changed', refresh)
    return () => window.removeEventListener('qna-images-changed', refresh)
  }, [])
  useEffect(() => {
    let cancelled = false
    setValue(null); setMissing(false)
    void window.archive.readQnaImage(id).then(value => { if (!cancelled) setValue(value) }).catch(() => { if (!cancelled) setMissing(true) })
    return () => { cancelled = true }
  }, [id, revision])
  if (missing) return <span role="status">Slide cancellata o non disponibile. Rimuovila dagli allegati attivi o aggiungila nuovamente.</span>
  if (!value) return <span>Caricamento slide…</span>
  return <figure className="qna-image-preview"><img style={expanded ? { maxHeight: 'none', width: '100%' } : undefined} src={`data:image/png;base64,${value.data}`} alt={`Slide allegata, pagina ${value.image.page}`} /><figcaption>Pagina {value.image.page} · {value.image.day} <button type="button" onClick={() => setExpanded(value => !value)}>{expanded ? 'Riduci anteprima' : 'Ingrandisci anteprima'}</button></figcaption></figure>
}
