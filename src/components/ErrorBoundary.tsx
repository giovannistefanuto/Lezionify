import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '32px',
            margin: '20px',
            background: 'var(--bg-card, #ffffff)',
            color: 'var(--text-main, #18211f)',
            borderRadius: '12px',
            border: '1px solid #e8c4c4',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
          }}
        >
          <h2 style={{ color: '#c93b3b', marginTop: 0 }}>
            ⚠️ {this.props.fallbackTitle || 'Si è verificato un errore imprevisto'}
          </h2>
          <p style={{ color: 'var(--text-muted, #697a73)' }}>
            L'interfaccia ha intercettato un errore per prevenire la schermata nera dell'applicazione.
          </p>
          {this.state.error && (
            <pre
              style={{
                background: '#fef2f2',
                color: '#991b1b',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                overflowX: 'auto',
                border: '1px solid #fee2e2'
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            <button
              className="primary-button small"
              onClick={this.handleReset}
            >
              🔄 Riprova a caricare
            </button>
            <button
              className="secondary-button small"
              onClick={() => window.location.reload()}
            >
              Ricarica applicazione
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
