import { Fragment, useEffect, useId, useState } from 'react'
import type { PdfExportDocument as Document } from '../../shared/pdfExport'
import { MarkdownViewer } from './MarkdownViewer'
import { MermaidPrintContext } from './MermaidDiagram'
import './pdfExport.css'

function PdfNotesPage({ english }: { english: boolean }) {
  const patternId = `pdf-notes-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  // SVG user units are CSS px (no viewBox): 18.897638 px = 5 mm on paper.
  return <section className="pdf-export-notes" aria-label={english ? 'Notes page' : 'Pagina Note'}>
    <h2>{english ? 'Notes' : 'Note'}</h2>
    <svg className="pdf-notes-grid" aria-hidden="true" width="100%" height="230mm" xmlns="http://www.w3.org/2000/svg">
      <defs><pattern id={patternId} width="18.897638" height="18.897638" patternUnits="userSpaceOnUse">
        <path d="M18.897638 0H0V18.897638" fill="none" stroke="#dedede" strokeWidth="0.5" />
      </pattern></defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  </section>
}

export function PdfExportDocument({ token }: { token: string }) {
  const [document, setDocument] = useState<Document | null>(null)
  useEffect(() => {
    let canceled = false
    void window.archive.getPdfExportDocument(token).then(value => { if (!canceled) setDocument(value) })
      .catch(() => { if (!canceled) void window.archive.pdfExportReady(token, true) })
    return () => { canceled = true }
  }, [token])
  useEffect(() => {
    if (!document) return
    let canceled = false
    let timer: ReturnType<typeof setTimeout>
    const prepare = async () => {
      if (canceled) return
      globalThis.document.body.getBoundingClientRect()
      await globalThis.document.fonts.ready
      await Promise.all(Array.from(globalThis.document.images).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => resolve(), { once: true })
      })))
      if (globalThis.document.querySelector('.mermaid-diagram[data-render-state="loading"]')) {
        timer = setTimeout(() => void prepare().catch(() => { if (!canceled) void window.archive.pdfExportReady(token, true) }), 100)
        return
      }
      await globalThis.document.fonts.ready
      // Hidden/minimized windows can suspend animation frames. Printing performs
      // its own layout; a task boundary and layout flush suffice after assets settle.
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      globalThis.document.body.getBoundingClientRect()
      if (!canceled) await window.archive.pdfExportReady(token, false)
    }
    void prepare().catch(() => { if (!canceled) void window.archive.pdfExportReady(token, true) })
    return () => { canceled = true; clearTimeout(timer) }
  }, [document, token])
  if (!document) return <p>Preparazione PDF…</p>
  const missing = document.lectures.filter(lecture => !lecture.markdown).length
  const english = document.language === 'en'
  return <MermaidPrintContext.Provider value={true}><main className="pdf-export-document" lang={document.language}>
    {document.lectures.length > 1 && <section className="pdf-export-cover">
      <p>Lezionify · {english ? 'Lecture notes' : 'Dispense'} · {document.language.toUpperCase()}</p>
      <h1>{document.title}</h1>
      <p>{document.lectures.length} {english ? 'lectures in chronological order' : 'lezioni in ordine cronologico'}</p>
      {missing > 0 && <p>{english ? `${missing} lectures have no notes in this language; their place is marked below.` : `${missing} lezioni senza dispensa in questa lingua: la loro posizione è segnalata nel documento.`}</p>}
      <ol>{document.lectures.map(lecture => <li key={lecture.id}>{lecture.title} · {new Date(lecture.date).toLocaleDateString(english ? 'en-GB' : 'it-IT')}{!lecture.markdown && (english ? ' — notes unavailable' : ' — dispensa non disponibile')}</li>)}</ol>
    </section>}
    {document.lectures.map(lecture => <Fragment key={lecture.id}><article className="pdf-export-lecture">
      <header><p>{document.title} · {document.language.toUpperCase()}</p><h1>{lecture.title}</h1><p>{new Date(lecture.date).toLocaleDateString(english ? 'en-GB' : 'it-IT')}</p></header>
      {lecture.markdown ? <MarkdownViewer content={lecture.markdown} /> : <p className="pdf-export-missing">{english ? 'Notes unavailable in English. No content has been generated or translated during export.' : 'Dispensa non disponibile in italiano. Nessun contenuto è stato generato durante questa esportazione.'}</p>}
    </article><PdfNotesPage english={english} /></Fragment>)}
  </main></MermaidPrintContext.Provider>
}
