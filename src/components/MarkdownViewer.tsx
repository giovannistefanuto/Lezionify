import React, { isValidElement, useRef, useEffect, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'

import type { LectureHighlight } from '../../shared/archive'
import { MermaidDiagram } from './MermaidDiagram'
import { normalizeDisplayMath } from '../utils/markdownMath'

export interface MarkdownViewerProps {
  content: string
  allowImages?: boolean
  highlights?: LectureHighlight[]
  isHighlightMode?: boolean
  onAddHighlight?: (startOffset: number, endOffset: number, text: string) => void
  onRemoveHighlightAtOffset?: (offset: number) => boolean
}

type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution' | 'critical' | 'key-concept'

const ALERT_CONFIG: Record<AlertType, { label: string; icon: string }> = {
  note: { label: 'Nota', icon: 'ℹ️' },
  tip: { label: 'Suggerimento', icon: '💡' },
  important: { label: 'Importante', icon: '📌' },
  warning: { label: 'Attenzione', icon: '⚠️' },
  caution: { label: 'Avvertenza', icon: '🛑' },
  critical: { label: 'Critico', icon: '🚨' },
  'key-concept': { label: 'Concetto chiave', icon: '📌' }
}

const ALERT_MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|CRITICAL|CONCETTO\s+CHIAVE|KEY\s+CONCEPT)\](?:\r?\n|\s+)?/i

function AlertBlockquote({ children }: { children?: React.ReactNode }) {
  // ReactMarkdown inserts whitespace text nodes between block elements.
  const childArray = React.Children.toArray(children).filter(child => typeof child !== 'string' || child.trim())
  if (childArray.length === 0) {
    return <blockquote>{children}</blockquote>
  }

  const firstChild = childArray[0]
  if (!isValidElement<{ children?: React.ReactNode }>(firstChild)) {
    return <blockquote>{children}</blockquote>
  }

  const pChildren = React.Children.toArray(firstChild.props.children)
  if (pChildren.length === 0) {
    return <blockquote>{children}</blockquote>
  }

  const firstText = pChildren[0]
  if (typeof firstText !== 'string') {
    return <blockquote>{children}</blockquote>
  }

  const match = firstText.match(ALERT_MARKER)
  if (!match) {
    return <blockquote>{children}</blockquote>
  }

  const alertType: AlertType = /^(CONCETTO|KEY)/i.test(match[1]) ? 'key-concept' : match[1].toLowerCase() as AlertType
  const alertInfo = ALERT_CONFIG[alertType] || ALERT_CONFIG.note

  const remainingFirstText = firstText.slice(match[0].length)
  const remainingPChildren = [
    ...(remainingFirstText ? [remainingFirstText] : []),
    ...pChildren.slice(1)
  ]

  let newChildren: React.ReactNode[]
  if (remainingPChildren.length > 0) {
    const updatedFirstChild = React.cloneElement(firstChild, {
      ...firstChild.props,
      children: remainingPChildren
    })
    newChildren = [updatedFirstChild, ...childArray.slice(1)]
  } else {
    newChildren = childArray.slice(1)
  }

  return (
    <div className={`markdown-alert markdown-alert-${alertType === 'key-concept' ? 'important' : alertType}`}>
      <div className="markdown-alert-header">
        <span className="markdown-alert-icon">{alertInfo.icon}</span>
        <span className="markdown-alert-title">{/^KEY/i.test(match[1]) ? 'Key concept' : alertInfo.label}</span>
      </div>
      <div className="markdown-alert-body">{newChildren}</div>
    </div>
  )
}

const REMARK_PLUGINS = [remarkMath, remarkGfm]
const REHYPE_PLUGINS = [rehypeKatex]
const MarkdownCode: NonNullable<Components['code']> = ({
  children,
  className,
  node: _node,
  ...props
}) => {
  if (/\blanguage-mermaid\b/.test(className ?? '')) {
    return (
      <MermaidDiagram source={String(children).replace(/\r?\n$/, '')} />
    )
  }
  return (
    <code className={className} {...props}>
      {children}
    </code>
  )
}

const MarkdownPre: NonNullable<Components['pre']> = ({
  children,
  node: _node,
  ...props
}) => {
  const child = React.Children.count(children) === 1
    ? React.Children.toArray(children)[0]
    : null
  if (React.isValidElement<{ className?: string }>(child) &&
    (child.type === MermaidDiagram || /\blanguage-mermaid\b/.test(child.props.className ?? ''))) return child
  return <pre {...props}>{children}</pre>
}

const MARKDOWN_COMPONENTS: Components = {
  blockquote: AlertBlockquote,
  p: ({ children }) => {
    const first = React.Children.toArray(children)[0]
    return typeof first === 'string' && ALERT_MARKER.test(first)
      ? <AlertBlockquote><p>{children}</p></AlertBlockquote>
      : <p>{children}</p>
  },
  code: MarkdownCode,
  pre: MarkdownPre
}

const viewerHighlightRanges = new Map<symbol, Range[]>()

function updateSharedHighlightRegistry(): void {
  if (typeof CSS === 'undefined' || !('highlights' in CSS)) return
  const ranges = Array.from(viewerHighlightRanges.values()).flat()
  if (ranges.length === 0) {
    ;(CSS as any).highlights.delete('lezionify-highlight-yellow')
    return
  }
  const highlight = new (window as any).Highlight(...ranges)
  ;(CSS as any).highlights.set('lezionify-highlight-yellow', highlight)
}

import { ErrorBoundary } from './ErrorBoundary'

function getOffsetsFromSelection(
  container: HTMLElement,
  range: Range
): { start: number; end: number; text: string } | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement?.closest('.katex-mathml')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    }
  })

  let currentOffset = 0
  let start: number | null = null
  let end: number | null = null

  let node: Node | null
  while ((node = walker.nextNode())) {
    const len = node.nodeValue?.length || 0

    if (node === range.startContainer) {
      start = currentOffset + range.startOffset
    }
    if (node === range.endContainer) {
      end = currentOffset + range.endOffset
      break
    }

    currentOffset += len
  }

  if (start !== null && end !== null && start < end) {
    return { start, end, text: range.toString() }
  }
  return null
}

function createRangeFromOffsets(
  container: HTMLElement,
  start: number,
  end: number
): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement?.closest('.katex-mathml')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    }
  })

  let currentOffset = 0
  let startContainer: Node | null = null
  let startOffsetInNode = 0
  let endContainer: Node | null = null
  let endOffsetInNode = 0

  let node: Node | null
  while ((node = walker.nextNode())) {
    const len = node.nodeValue?.length || 0

    if (!startContainer && currentOffset + len >= start) {
      startContainer = node
      startOffsetInNode = Math.max(0, start - currentOffset)
    }

    if (!endContainer && currentOffset + len >= end) {
      endContainer = node
      endOffsetInNode = Math.min(len, end - currentOffset)
      break
    }

    currentOffset += len
  }

  if (startContainer && endContainer) {
    try {
      const range = document.createRange()
      range.setStart(startContainer, startOffsetInNode)
      range.setEnd(endContainer, endOffsetInNode)
      return range
    } catch {
      return null
    }
  }
  return null
}

function getOffsetFromClick(
  container: HTMLElement,
  targetNode: Node,
  clickOffset: number
): number | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement?.closest('.katex-mathml')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    }
  })

  let currentOffset = 0
  let node: Node | null
  while ((node = walker.nextNode())) {
    const len = node.nodeValue?.length || 0
    if (node === targetNode) {
      return currentOffset + clickOffset
    }
    currentOffset += len
  }
  return null
}

function RawMarkdownViewer({
  content,
  allowImages,
  highlights,
  isHighlightMode,
  onAddHighlight,
  onRemoveHighlightAtOffset
}: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const highlightOwnerRef = useRef(Symbol('markdown-viewer-highlight'))
  const renderedContent = useMemo(() => normalizeDisplayMath(content), [content])

  // Sincronizzazione con la CSS Custom Highlight API
  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof CSS === 'undefined' || !('highlights' in CSS)) return
    const highlightOwner = highlightOwnerRef.current

    const ranges: Range[] = []
    for (const h of highlights || []) {
      const r = createRangeFromOffsets(container, h.startOffset, h.endOffset)
      if (r) ranges.push(r)
    }

    try {
      viewerHighlightRanges.set(highlightOwner, ranges)
      updateSharedHighlightRegistry()
    } catch (err) {
      console.warn('Errore impostazione Highlight API:', err)
    }

    return () => {
      viewerHighlightRanges.delete(highlightOwner)
      updateSharedHighlightRegistry()
    }
  }, [highlights, content])

  // Gestione selezione testo o click per evidenziare/rimuovere
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isHighlightMode || !containerRef.current) return

      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const selectedText = range.toString()

      // Se c'è una selezione di testo concreta
      if (!range.collapsed && selectedText.trim().length > 0) {
        const offsets = getOffsetsFromSelection(containerRef.current, range)
        if (offsets) {
          onAddHighlight?.(offsets.start, offsets.end, offsets.text)
          selection.removeAllRanges()
        }
      } else if (range.collapsed) {
        // Se è un click singolo su una parola evidenziata: permette la rimozione
        const doc = document as any
        let clickNode: Node | null = null
        let clickOffset = 0

        if (doc.caretRangeFromPoint) {
          const caretRange = doc.caretRangeFromPoint(e.clientX, e.clientY)
          if (caretRange) {
            clickNode = caretRange.startContainer
            clickOffset = caretRange.startOffset
          }
        } else if (doc.caretPositionFromPoint) {
          const pos = doc.caretPositionFromPoint(e.clientX, e.clientY)
          if (pos) {
            clickNode = pos.offsetNode
            clickOffset = pos.offset
          }
        }

        if (clickNode && containerRef.current) {
          const offset = getOffsetFromClick(containerRef.current, clickNode, clickOffset)
          if (offset !== null) {
            onRemoveHighlightAtOffset?.(offset)
          }
        }
      }
    },
    [isHighlightMode, onAddHighlight, onRemoveHighlightAtOffset]
  )

  return (
    <div
      ref={containerRef}
      className={`markdown-body ${isHighlightMode ? 'is-highlight-mode' : ''}`}
      onMouseUp={handleMouseUp}
    >
      <ReactMarkdown
        disallowedElements={allowImages === false ? ['img'] : undefined}
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={MARKDOWN_COMPONENTS}
      >
        {renderedContent}
      </ReactMarkdown>
    </div>
  )
}

export function areMarkdownViewerPropsEqual(
  prev: MarkdownViewerProps,
  next: MarkdownViewerProps
): boolean {
  return (
    prev.content === next.content &&
    prev.allowImages === next.allowImages &&
    prev.highlights === next.highlights &&
    prev.isHighlightMode === next.isHighlightMode &&
    prev.onAddHighlight === next.onAddHighlight &&
    prev.onRemoveHighlightAtOffset === next.onRemoveHighlightAtOffset
  )
}

const MemoizedMarkdownViewer = React.memo(
  RawMarkdownViewer,
  areMarkdownViewerPropsEqual
)

export function MarkdownViewer(props: MarkdownViewerProps) {
  return (
    <ErrorBoundary fallbackTitle="Errore nel rendering della dispensa">
      <MemoizedMarkdownViewer {...props} />
    </ErrorBoundary>
  )
}
