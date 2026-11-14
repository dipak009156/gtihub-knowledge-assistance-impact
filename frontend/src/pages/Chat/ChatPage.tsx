import React, { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  MessageSquareCode,
  Send,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  Clock,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { chat } from '../../api/client'
import type { Source } from '../../api/types'
import { SourceChip } from '../../components/SourceChip'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  sources?: Source[]
  cached?: boolean
  error?: string
  loading?: boolean
}

const DEFAULT_SUGGESTIONS = [
  'Where is payment handled?',
  'What does checkout do?',
  'Where does the main workflow start?',
  'What classes manage shopping carts?',
]

export const ChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const repoId = Number(id)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async (questionText: string) => {
    const q = questionText.trim()
    if (!q || !repoId || waiting) return

    setRateLimitWarning(null)
    setInput('')

    const userMsgId = `user_${Date.now()}`
    const assistantMsgId = `assistant_${Date.now()}`

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: q,
    }

    const placeholderAssistant: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      text: '',
      loading: true,
    }

    setMessages((prev) => [...prev, userMsg, placeholderAssistant])
    setWaiting(true)
    setTimeout(scrollToBottom, 50)

    try {
      const res = await chat(repoId, q)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                text: res.answer,
                sources: res.sources || [],
                cached: res.cached,
                loading: false,
              }
            : msg
        )
      )
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string }
      if (apiErr.status === 429) {
        setRateLimitWarning('Too many questions. Wait a moment.')
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                error: apiErr.message || 'Could not get an answer.',
                loading: false,
              }
            : msg
        )
      )
    } finally {
      setWaiting(false)
      setTimeout(scrollToBottom, 50)
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '1.5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 56px)',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            marginBottom: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <MessageSquareCode size={20} style={{ color: 'var(--accent)' }} />
          <span>Verifiable Codebase Assistant</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Ask natural language questions about implementations. Every answer cites verified file lines.
        </p>
      </div>

      {rateLimitWarning && (
        <div
          className="badge badge-warning"
          style={{
            padding: '0.5rem 0.875rem',
            marginBottom: '0.75rem',
            fontSize: '0.8125rem',
            gap: '0.5rem',
          }}
        >
          <Clock size={14} />
          <span>{rateLimitWarning}</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        className="card"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          backgroundColor: 'var(--surface-card)',
          marginBottom: '1rem',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto 0',
              textAlign: 'center',
              padding: '2rem 1rem',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <MessageSquareCode size={24} />
            </div>
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '0.35rem',
              }}
            >
              Ask anything about this project
            </h2>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
                maxWidth: '480px',
                margin: '0 auto 1.5rem auto',
                lineHeight: 1.5,
              }}
            >
              Select one of the suggested inquiries below or type a custom question.
              All claims are cross-checked against exact code lines.
            </p>

            {/* Suggested Question Chips (Clean rounded corners, NO pill buttons) */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                justifyContent: 'center',
              }}
            >
              {DEFAULT_SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSend(q)}
                  disabled={waiting}
                  style={{
                    borderRadius: 'var(--radius)',
                    padding: '0.45rem 0.875rem',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: 'flex-end',
                    background: 'var(--accent)',
                    color: '#ffffff',
                    padding: '0.625rem 1rem',
                    borderRadius: 'var(--radius) var(--radius) 2px var(--radius)',
                    maxWidth: '80%',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  {msg.text}
                </div>
              )
            }

            // Assistant message
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: 'flex-start',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius)',
                  maxWidth: '88%',
                  width: '100%',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {/* Header & Cached Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-info" style={{ gap: '0.35rem' }}>
                      <Sparkles size={11} />
                      <span>Assistant</span>
                    </span>
                    {msg.cached && (
                      <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                        Saved answer
                      </span>
                    )}
                  </div>
                  {msg.text && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleCopy(msg.text, msg.id)}
                      title="Copy answer"
                      style={{ padding: '2px 6px' }}
                    >
                      {copiedId === msg.id ? <Check size={13} style={{ color: 'var(--ok)' }} /> : <Copy size={13} />}
                    </button>
                  )}
                </div>

                {/* Body or Loading Skeleton */}
                {msg.loading ? (
                  <div style={{ padding: '0.5rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      <span className="spinner" />
                      <span>Thinking and analyzing repository AST...</span>
                    </div>
                  </div>
                ) : msg.error ? (
                  <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={15} />
                    <span>{msg.error}</span>
                  </div>
                ) : (
                  <div>
                    {/* Render answer with plain text line breaks (NEVER dangerouslySetInnerHTML) */}
                    <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                      {msg.text}
                    </div>

                    {/* Citations section */}
                    {msg.sources && msg.sources.length > 0 ? (
                      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                          Sources & Citations:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {msg.sources.map((s, idx) => (
                            <SourceChip key={`${s.file}-${idx}`} source={s} repoId={repoId} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="badge badge-caution"
                        style={{ marginTop: '0.75rem', display: 'inline-flex', padding: '0.35rem 0.65rem' }}
                      >
                        <AlertCircle size={12} />
                        <span>No sources found, so this answer may be unreliable.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          className="input"
          placeholder="Ask a question about this repository..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={waiting}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!input.trim() || waiting}
          style={{ gap: '0.35rem', padding: '0 1.25rem' }}
        >
          <Send size={15} />
          <span>Send</span>
        </button>
      </form>
    </motion.div>
  )
}
export default ChatPage
