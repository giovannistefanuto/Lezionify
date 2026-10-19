import { createContext, memo, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react'
import { mermaidPrintAlternative, mermaidPrintScale, needsMermaidPrintAlternative } from '../utils/mermaidPrint'

// Only the Focus reading workspace enables folding; exports stay fully expanded.
interface MermaidCollapseControls {
  scope: string
  hidden: Record<string, boolean>
  register: (id: string) => () => void
  toggle: (id: string) => void
}

export const MermaidCollapseContext = createContext<boolean | MermaidCollapseControls>(false)
export const MermaidPrintContext = createContext(false)

/** One group per explanation: other panes and PDF export keep their own display. */
export function useMermaidCollapseGroup(scope: string) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const register = useCallback((id: string) => {
    setHidden(previous => ({ ...previous, [id]: false }))
    return () => setHidden(previous => {
      const next = { ...previous }
      delete next[id]
      return next
    })
  }, [])
  const toggle = useCallback((id: string) => setHidden(previous => ({ ...previous, [id]: !previous[id] })), [])
  const controls = useMemo(() => ({ scope, hidden, register, toggle }), [scope, hidden, register, toggle])
  const allHidden = Object.keys(hidden).length > 0 && Object.values(hidden).every(Boolean)
  const toggleAll = () => setHidden(previous => Object.fromEntries(Object.keys(previous).map(id => [id, !allHidden])))
  return { controls, allHidden, hasDiagrams: Object.keys(hidden).length > 0, toggleAll }
}

const MAX_SOURCE_LENGTH = 50_000
const ALLOWED_DIAGRAM =
  /^(?:graph\s+(?:TB|TD|BT|RL|LR)|flowchart\s+(?:TB|TD|BT|RL|LR)|sequenceDiagram|stateDiagram(?:-v2)?|classDiagram|erDiagram|mindmap)\b/
const FORBIDDEN_DIRECTIVE =
  /(?:^|\n)\s*(?:click|linkStyle)\b|%%\{|(?:^|\n)\s*---\s*(?:\n|$)/i
const SAFE_COLOR = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i
const STYLE_DIRECTIVE = /^style\s+([a-z][\w-]*)\s+(.+)$/i
const CLASS_DEF_DIRECTIVE = /^classDef\s+([a-z][\w-]*)\s+(.+)$/i

function hasSafeStaticDeclarations(value: string): boolean {
  const declarations = value.split(',')
  if (declarations.length === 0 || declarations.length > 3) return false

  const seen = new Set<string>()
  for (const declaration of declarations) {
    const pair = /^([a-z-]+)\s*:\s*(.+)$/i.exec(declaration.trim())
    if (!pair) return false

    const property = pair[1].toLowerCase()
    const value = pair[2].trim()
    if (seen.has(property)) return false
    seen.add(property)

    if (property === 'fill' || property === 'stroke') {
      if (!SAFE_COLOR.test(value)) return false
    } else if (property === 'stroke-width') {
      if (!/^\d+(?:\.\d+)?px$/i.test(value)) return false
      const width = Number.parseFloat(value)
      if (width > 12) return false
    } else {
      return false
    }
  }

  return true
}

function isSafeStyleDirective(line: string): boolean {
  const match = STYLE_DIRECTIVE.exec(line.trim())
  return Boolean(match && hasSafeStaticDeclarations(match[2]))
}

function isSafeClassDefDirective(line: string): boolean {
  const match = CLASS_DEF_DIRECTIVE.exec(line.trim())
  return Boolean(match && hasSafeStaticDeclarations(match[2].replace(/;$/, '')))
}

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
  const supportsStaticStyles = /^(?:graph|flowchart)\s+/i.test(firstDefinition)
  for (const line of normalized.split(/\r?\n/)) {
    if (
      (/^\s*style\b/i.test(line) &&
        (!supportsStaticStyles || !isSafeStyleDirective(line))) ||
      (/^\s*classDef\b/i.test(line) &&
        (!supportsStaticStyles || !isSafeClassDefDirective(line)))
    ) {
      throw new Error('Il diagramma contiene una direttiva non consentita.')
    }
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

const MermaidCanvas = memo(function MermaidCanvas({ svg }: { svg: string }) {
  return <div className="mermaid-diagram-canvas" dangerouslySetInnerHTML={{ __html: svg }} />
})

export function MermaidDiagram({ source }: MermaidDiagramProps) {
  const printing = useContext(MermaidPrintContext)
  const collapseContext = useContext(MermaidCollapseContext)
  const collapsible = Boolean(collapseContext)
  const group = typeof collapseContext === 'object' ? collapseContext : null
  const [locallyCollapsed, setCollapsed] = useState(false)
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const collapsed = group ? (group.hidden[reactId] ?? false) : locallyCollapsed
  const register = group?.register
  const scope = group?.scope
  useEffect(() => register?.(reactId), [register, reactId, scope, source])
  const isDark = useDarkTheme()
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const [showSource, setShowSource] = useState(false)

  useEffect(() => {
    setCollapsed(false)
    setShowSource(false)
  }, [source])

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
            ...(printing ? {
              themeVariables: { fontSize: '14px' },
              flowchart: { nodeSpacing: 24, rankSpacing: 28, padding: 8, diagramPadding: 6, wrappingWidth: 180 },
              sequence: { actorFontSize: 14, messageFontSize: 14, noteFontSize: 14,
                actorMargin: 24, width: 120, height: 40, messageMargin: 28,
                diagramMarginX: 6, diagramMarginY: 6, wrap: true, wrapPadding: 8 }
            } : {}),
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
          if (printing) {
            const dimensions = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement.getAttribute('viewBox')?.trim().split(/\s+/).map(Number)
            const originalSize = dimensions(result.svg)
            const alternative = originalSize && needsMermaidPrintAlternative(originalSize[2], originalSize[3]) ? mermaidPrintAlternative(definition) : null
            if (alternative) {
              try {
                const candidate = await mermaid.render(`lezionify-mermaid-${reactId}-print`, alternative)
                const candidateSize = dimensions(candidate.svg)
                // Require a material improvement; keep the original when neither layout fits.
                if (isSafeMermaidSvg(candidate.svg) && candidateSize && originalSize &&
                  mermaidPrintScale(candidateSize[2], candidateSize[3]) > mermaidPrintScale(originalSize[2], originalSize[3]) + 0.05) return candidate.svg
              } catch {
                // A valid original remains available if the optional layout fails.
              }
            }
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
  }, [isDark, printing, reactId, source])

  return (
    <figure className="mermaid-diagram" aria-label="Diagramma Mermaid" data-render-state={svg ? 'ready' : error ? 'error' : 'loading'}>
      <div className="mermaid-diagram-header">
        <figcaption>Schema</figcaption>
        {collapsible && <button
          type="button"
          className="mermaid-collapse-toggle"
          aria-expanded={!collapsed}
          aria-controls={`mermaid-content-${reactId}`}
          onClick={() => group ? group.toggle(reactId) : setCollapsed(value => !value)}
        >
          {collapsed ? 'Mostra schema' : 'Nascondi schema'}
        </button>}
        <button
          type="button"
          className="mermaid-source-toggle"
          onClick={() => setShowSource((visible) => !visible)}
          aria-expanded={showSource}
          hidden={collapsible && collapsed}
        >
          {showSource ? 'Nascondi codice' : 'Mostra codice'}
        </button>
      </div>

      <div id={`mermaid-content-${reactId}`} hidden={collapsible && collapsed}>
      {svg ? (
        <MermaidCanvas svg={svg} />
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

      {(showSource || (error && new URLSearchParams(window.location.search).has('pdfExport'))) && <pre className="mermaid-source-code">{source}</pre>}
      </div>
    </figure>
  )
}
