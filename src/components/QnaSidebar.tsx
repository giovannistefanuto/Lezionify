import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import type { QnaThread, QnaStatusUpdate } from '../../shared/archive'
import '../qna.css'
import { QnaImagePreview } from './QnaImagePreview'

interface QnaSidebarProps {
  threads: QnaThread[]
  activeThreadId: string | null
  setActiveThreadId: (id: string | null) => void
  isGenerating: boolean
  qnaStatus?: QnaStatusUpdate | null
  error: string | null
  onSendMessage: (threadId: string, text: string, useFullContext: boolean) => void
  onDeleteThread: (threadId: string) => void
  onClose: () => void
  onRemoveImage?: (threadId: string, id: string) => void
  onCompositionChange?: (active: boolean) => void
}

function AnchorContext({ thread }: { thread: QnaThread }) {
  const [expanded, setExpanded] = React.useState(false)
  const [overflows, setOverflows] = React.useState(false)
  const quoteRef = useRef<HTMLDivElement>(null)
  const quoteId = React.useId()

  useEffect(() => {
    const quote = quoteRef.current
    if (!quote) return
    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(quote).lineHeight)
      setOverflows(quote.scrollHeight > lineHeight * 3 + 1)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(quote)
    return () => observer.disconnect()
  }, [thread.quote])

  return (
    <div className="qna-anchor-context">
      <div className="qna-context-label">Ancorato a:</div>
      <div ref={quoteRef} id={quoteId} className={`qna-context-quote ${expanded ? 'is-expanded' : 'is-collapsed'}`}>
        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
          {thread.quote}
        </ReactMarkdown>
      </div>
      {(overflows || expanded) && (
        <button className="qna-anchor-toggle" aria-expanded={expanded} aria-controls={quoteId} onClick={() => setExpanded(value => !value)}>
          {expanded ? 'Riduci' : '… Mostra tutto'}
        </button>
      )}
      {thread.contextHeading && <div className="qna-context-heading">In: {thread.contextHeading}</div>}
    </div>
  )
}

export function QnaSidebar({
  threads,
  activeThreadId,
  setActiveThreadId,
  isGenerating,
  qnaStatus,
  error,
  onSendMessage,
  onDeleteThread,
  onClose,
  onRemoveImage,
  onCompositionChange
}: QnaSidebarProps) {
  const [inputText, setInputText] = React.useState('')
  const [useFullContext, setUseFullContext] = React.useState(false)
  
  const messagesRef = useRef<HTMLDivElement>(null)
  const anchor = useRef<{ index: number; fraction: number; width: number } | null>(null)
  const activeThread = threads.find(t => t.id === activeThreadId)
  useEffect(() => {
    setInputText('')
    onCompositionChange?.(false)
    return () => onCompositionChange?.(false)
  }, [activeThreadId, onCompositionChange])
  const userCount = activeThread?.messages.filter(message => message.role === 'user').length ?? 0
  const rememberPosition = useCallback(() => {
    const container = messagesRef.current
    if (!container) return
    const top = container.getBoundingClientRect().top
    const messages = Array.from(container.querySelectorAll<HTMLElement>('.qna-message'))
    const index = messages.findIndex(message => message.getBoundingClientRect().bottom > top)
    if (index < 0) { anchor.current = null; return }
    const bounds = messages[index].getBoundingClientRect()
    anchor.current = { index, fraction: (top - bounds.top) / Math.max(1, bounds.height), width: container.clientWidth }
  }, [])

  useLayoutEffect(() => {
    const container = messagesRef.current
    if (!container) return
    // Move to the latest question once, then leave streaming and completion alone.
    const questions = container.querySelectorAll<HTMLElement>('.qna-message.user')
    const question = questions[questions.length - 1]
    if (question) container.scrollTop += question.getBoundingClientRect().top - container.getBoundingClientRect().top - 16
    else container.scrollTop = 0
    rememberPosition()
  }, [activeThreadId, userCount, rememberPosition])

  useLayoutEffect(() => { rememberPosition() }, [activeThread?.messages, rememberPosition])
  useEffect(() => {
    const container = messagesRef.current
    if (!container) return
    let previousWidth = container.clientWidth
    const observer = new ResizeObserver(() => {
      if (previousWidth === container.clientWidth) return
      previousWidth = container.clientWidth
      const saved = anchor.current
      const message = saved && container.querySelectorAll<HTMLElement>('.qna-message')[saved.index]
      if (message && saved) {
        const bounds = message.getBoundingClientRect()
        container.scrollTop += bounds.top - container.getBoundingClientRect().top + saved.fraction * bounds.height
      }
      rememberPosition()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [activeThreadId, rememberPosition])

  if (!activeThreadId) {
    if (threads.length === 0) return null
    return (
      <div className="qna-sidebar collapsed">
        <div className="qna-sidebar-header">
          <h3>Domande a margine ({threads.length})</h3>
          <button className="qna-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="qna-thread-list">
          {threads.map(t => (
            <div key={t.id} className="qna-thread-summary" onClick={() => setActiveThreadId(t.id)}>
              <span className="qna-quote-preview">"{t.quote.substring(0, 50)}{t.quote.length > 50 ? '...' : ''}"</span>
              <span className="qna-msg-count">{t.messages.length} msg</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!activeThread) return null

  const handleSend = () => {
    if (!inputText.trim() || isGenerating) return
    onSendMessage(activeThread.id, inputText, useFullContext)
    setInputText('')
    onCompositionChange?.(false)
  }

  return (
    <div className="qna-sidebar expanded">
      <div className="qna-sidebar-header">
        <button className="qna-back-btn" onClick={() => setActiveThreadId(null)}>←</button>
        <h3>Discussione Contestuale</h3>
        <button className="qna-delete-btn" onClick={() => onDeleteThread(activeThread.id)} title="Elimina Discussione">🗑️</button>
      </div>
      
      <AnchorContext key={activeThread.id} thread={activeThread} />
      {Boolean(activeThread.attachmentIds?.length) && <section className="qna-active-images" aria-label="Slide che saranno inviate a Gemini">
        <p>Queste slide saranno inviate a Gemini con ogni nuova domanda finché restano attive.</p>
        {activeThread.attachmentIds!.map(id => <div key={id}><QnaImagePreview id={id} /><button type="button" disabled={isGenerating} onClick={() => onRemoveImage?.(activeThread.id, id)}>Rimuovi dagli invii successivi</button></div>)}
      </section>}

      <div ref={messagesRef} className="qna-messages-container" onScroll={() => {
        // A width change can clamp scrollTop before ResizeObserver runs. Keep
        // the old anchor until that observer has restored the reading point.
        if (!anchor.current || anchor.current.width === messagesRef.current?.clientWidth) rememberPosition()
      }}>
        {activeThread.messages.length === 0 && (
          <div className="qna-empty-state">
            Cosa vuoi chiedere a Gemini riguardo a questo testo?
          </div>
        )}
        {activeThread.messages.map((m, idx) => {
          // Converte i delimitatori standard LaTeX usati da Gemini in dollari (supportati da remark-math)
          const sanitizedText = m.text
            .replace(/\\\((.*?)\\\)/g, '$$$1$$')
            .replace(/\\\[(.*?)\\\]/gs, '$$$$$1$$$$')

          return (
            <div key={idx} className={`qna-message ${m.role}`}>
              <div className="qna-message-role">{m.role === 'user' ? 'Tu' : 'Gemini'}</div>
              {Boolean(m.attachmentIds?.length) && <small>{m.attachmentIds!.length} slide allegate a questa domanda</small>}
              <div className="qna-message-content">
                {m.role === 'ai' && !m.text && isGenerating && idx === activeThread.messages.length - 1 ? (
                  <div className="qna-typing-log" role="status" aria-live="polite">
                    <div className="qna-typing-spinner">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                    <div className="qna-status-badge">
                      <span className="qna-status-icon">
                        {qnaStatus?.phase === 'rotating_key' ? '🔄' : qnaStatus?.phase === 'streaming' ? '⚡' : '🤖'}
                      </span>
                      <span className="qna-status-message">
                        {qnaStatus?.message || 'Inizializzazione richiesta con Google Gemini...'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <ReactMarkdown
                      remarkPlugins={[remarkMath, remarkGfm]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {sanitizedText}
                    </ReactMarkdown>
                    {isGenerating && idx === activeThread.messages.length - 1 && qnaStatus && qnaStatus.phase === 'streaming' && (
                      <div className="qna-streaming-badge">
                        <span className="streaming-pulse" />
                        <span>{qnaStatus.message}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
        {error && <div className="qna-error">{error}</div>}
      </div>

      <div className="qna-input-container">
        <label className="qna-context-toggle">
          <input 
            type="checkbox" 
            checked={useFullContext} 
            onChange={e => setUseFullContext(e.target.checked)} 
            disabled={isGenerating}
          />
          📚 Includi intera lezione come contesto
        </label>
        <div className="qna-input-row">
          <textarea 
            value={inputText}
            onFocus={() => onCompositionChange?.(true)}
            onChange={e => { setInputText(e.target.value); onCompositionChange?.(true) }}
            placeholder="Chiedi spiegazioni, fai esempi..."
            disabled={isGenerating}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button className="qna-send-btn" onClick={handleSend} disabled={!inputText.trim() || isGenerating}>
            Invia
          </button>
        </div>
      </div>
    </div>
  )
}
