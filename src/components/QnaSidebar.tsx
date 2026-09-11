import React, { useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import type { QnaThread, QnaStatusUpdate } from '../../shared/archive'
import '../qna.css'

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
  onClose
}: QnaSidebarProps) {
  const [inputText, setInputText] = React.useState('')
  const [useFullContext, setUseFullContext] = React.useState(false)
  
  const endOfChatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endOfChatRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threads])

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

  const activeThread = threads.find(t => t.id === activeThreadId)
  if (!activeThread) return null

  const handleSend = () => {
    if (!inputText.trim() || isGenerating) return
    onSendMessage(activeThread.id, inputText, useFullContext)
    setInputText('')
  }

  return (
    <div className="qna-sidebar expanded">
      <div className="qna-sidebar-header">
        <button className="qna-back-btn" onClick={() => setActiveThreadId(null)}>←</button>
        <h3>Discussione Contestuale</h3>
        <button className="qna-delete-btn" onClick={() => onDeleteThread(activeThread.id)} title="Elimina Discussione">🗑️</button>
      </div>
      
      <div className="qna-anchor-context">
        <div className="qna-context-label">Ancorato a:</div>
        <div className="qna-context-quote">
          <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
          >
            {activeThread.quote}
          </ReactMarkdown>
        </div>
        {activeThread.contextHeading && <div className="qna-context-heading">In: {activeThread.contextHeading}</div>}
      </div>

      <div className="qna-messages-container">
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
        <div ref={endOfChatRef} />
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
            onChange={e => setInputText(e.target.value)}
            placeholder="Chiedi spiegazioni, fai esempi..."
            disabled={isGenerating}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
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
