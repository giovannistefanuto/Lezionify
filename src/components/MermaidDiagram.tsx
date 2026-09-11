import { useEffect, useId, useState } from 'react'

const MAX_SOURCE_LENGTH = 50_000
const ALLOWED_DIAGRAM =
  /^(?:graph\s+(?:TB|TD|BT|RL|LR)|flowchart\s+(?:TB|TD|BT|RL|LR)|sequenceDiagram|stateDiagram(?:-v2)?|classDiagram|erDiagram|mindmap)\b/
const FORBIDDEN_DIRECTIVE =
  /(?:^|\n)\s*(?:click|classDef|style|linkStyle)\b|%%\{|(?:^|\n)\s*---\s*(?:\n|$)/i

let renderQueue: Promise<void> = Promise.resolve()

function enqueueRender<T>(task: () => Promise<T>): Promise<T> {
  const result = renderQueue.then(task, task)
  renderQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

function isDarkTheme(): boolean {
  const root = document.documentElement
  return (
    root.getAttribute('data-theme') === 'dark' ||
    root.classList.contains('dark-theme')
  )
}

function useDarkTheme(): boolean {
  const [isDark, setIsDark] = useState(isDarkTheme)

  useEffect(() => {
    const update = () => setIsDark(isDarkTheme())
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    })
    return () => observer.disconnect()
  }, [])

  return isDark
}

export function validateMermaidSource(source: string): string {
  const normalized = source.trim()
  if (!normalized) throw new Error('Il diagramma è vuoto.')
  if (normalized.length > MAX_SOURCE_LENGTH) {
    throw new Error('Il diagramma supera il limite di dimensione.')
  }
  const firstDefinition = normalized
    .split(/\r?\n/)
    .find((line) => line.trim() && !line.trim().startsWith('%%'))
    ?.trim()
  if (!firstDefinition || !ALLOWED_DIAGRAM.test(firstDefinition)) {
    throw new Error('Questo tipo di diagramma non è supportato.')
  }
  if (FORBIDDEN_DIRECTIVE.test(normalized)) {
    throw new Error('Il diagramma contiene una direttiva non consentita.')
  }
  return normalized
}

export function isSafeMermaidSvg(svg: string): boolean {
  return (
    svg.startsWith('<svg') &&
    !/<script\b|\bon\w+\s*=|javascript:|<foreignObject\b/i.test(svg)
  )
}

interface MermaidDiagramProps {
  source: string
}

export function MermaidDiagram({ source }: MermaidDiagramProps) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const isDark = useDarkTheme()
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const [showSource, setShowSource] = useState(false)

  useEffect(() => {
    let cancelled = false
    setSvg('')
    setError('')

    const render = async () => {
      try {
        const definition = validateMermaidSource(source)
        const renderedSvg = await enqueueRender(async () => {
          const { default: mermaid } = await import('mermaid')
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            suppressErrorRendering: true,
            maxTextSize: MAX_SOURCE_LENGTH,
            maxEdges: 300,
            htmlLabels: false,
            theme: isDark ? 'dark' : 'default',
            secure: [
              'secure',
              'securityLevel',
              'startOnLoad',
              'maxTextSize',
              'suppressErrorRendering',
              'maxEdges',
              'theme',
              'themeCSS',
              'themeVariables',
              'fontFamily',
              'altFontFamily'
            ]
          })
          await mermaid.parse(definition)
          const result = await mermaid.render(
            `lezionify-mermaid-${reactId}`,
            definition
          )
          if (!isSafeMermaidSvg(result.svg)) {
            throw new Error('Il renderer ha prodotto un risultato non sicuro.')
          }
          return result.svg
        })
        if (!cancelled) setSvg(renderedSvg)
      } catch (renderError) {
        if (!cancelled) {
          setError(
            renderError instanceof Error
              ? renderError.message
              : 'Impossibile renderizzare il diagramma.'
          )
        }
      }
    }

    void render()
    return () => {
      cancelled = true
    }
  }, [isDark, reactId, source])

  return (
    <figure className="mermaid-diagram" aria-label="Diagramma Mermaid">
      <div className="mermaid-diagram-header">
        <figcaption>Schema</figcaption>
        <button
          type="button"
          className="mermaid-source-toggle"
          onClick={() => setShowSource((visible) => !visible)}
          aria-expanded={showSource}
        >
          {showSource ? 'Nascondi codice' : 'Mostra codice'}
        </button>
      </div>

      {svg ? (
        <div
          className="mermaid-diagram-canvas"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : error ? (
        <div className="mermaid-diagram-error" role="status">
          <strong>Diagramma non disponibile</strong>
          <span>{error}</span>
        </div>
      ) : (
        <div className="mermaid-diagram-loading" role="status">
          Rendering dello schema…
        </div>
      )}

      {showSource && <pre className="mermaid-source-code">{source}</pre>}
    </figure>
  )
}
