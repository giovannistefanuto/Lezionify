import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'

const exportToken = new URLSearchParams(window.location.search).get('pdfExport')
if (exportToken) {
  void import('./components/PdfExportDocument').then(({ PdfExportDocument }) => {
    createRoot(document.getElementById('root')!).render(<PdfExportDocument token={exportToken} />)
  }).catch(() => { void window.archive.pdfExportReady(exportToken, true) })
} else createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
