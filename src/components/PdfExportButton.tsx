import { useRef, useState } from 'react'
import type { PdfExportRequest } from '../../shared/pdfExport'
import { PdfExportDialog } from './PdfExportDialog'
export function PdfExportButton({
  request
}: {
  request: PdfExportRequest
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  return (
    <span className="pdf-export-action">
      <button
        ref={button}
        className="secondary-button small"
        title="Esporta dispense in PDF"
        onClick={() => setOpen(true)}
      >
        Esporta
      </button>
      {open && (
        <PdfExportDialog
          initialLanguage={request.language}
          onClose={() => {
            setOpen(false)
            button.current?.focus()
          }}
        />
      )}
    </span>
  )
}
