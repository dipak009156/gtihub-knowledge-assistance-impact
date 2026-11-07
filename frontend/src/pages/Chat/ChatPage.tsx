import React, { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
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

  const handleRetry = (failedQuestion: string) => {
    handleSend(failedQuestion)
  }

  return (
    <div
      style={{
        maxWidth: '850px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 4.5rem)',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            marginBottom: '0.25rem',
          }}
        >
          Verifiable Codebase Assistant
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Ask natural language questions about implementations. Every answer cites
          verified file lines.
        </p>
      </div>

      {rateLimitWarning && (
        <div
          style={{
            background: 'var(--warn-bg)',
            color: 'var(--warn)',
            border: '1px solid var(--warn-border)',
            padding: '0.6rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
          }}
        >
          ⏳ {rateLimitWarning}
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
          background: 'var(--surface-card)',
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
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💬</div>
            <h2
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '0.5rem',
              }}
            >
              Ask anything about this project
            </h2>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                maxWidth: '480px',
                margin: '0 auto 1.5rem auto',
              }}
            >
              Select one of the suggested inquiries below or type a custom question.
              All claims are cross-checked against exact code lines.
            </p>

            {/* Suggested Question Chips */}
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
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSend(q)}
                  disabled={waiting}
                  style={{
                    borderRadius: 'var(--radius-full)',
                    padding: '0.45rem 1rem',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            if (msg.role === 'user') {
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: 'flex-end',
                    background: 'var(--accent)',
                    color: '#ffffff',
                    padding: '0.75rem 1.25rem',
                    borderRadius: 'var(--radius) var(--radius) 2px var(--radius)',
                    maxWidth: '80%',
                    fontSize: '0.95rem',
                    lineHeight: 1.4,
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
                  borderRadius: 'var(--radius) var(--radius) var(--radius) 2px',
                  padding: '1rem 1.25rem',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                {msg.loading ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ display: 'inline-block', animation: 'pulse 1.2s infinite' }}>
                      💭 Thinking and searching repository notes...
                    </span>
                  </div>
                ) : msg.error ? (
                  <div>
                    <div style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      {msg.error}
                    </div>
                    {/* Retry button using preceding user message */}
                    {index > 0 && messages[index - 1].role === 'user' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRetry(messages[index - 1].text)}
                        disabled={waiting}
                      >
                        Retry question
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Plain text answer with line breaks (NEVER HTML) */}
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        color: 'var(--text)',
                        marginBottom: '0.75rem',
                      }}
                    >
                      {msg.text}
                    </div>

                    {/* Cached answer badge */}
                    {msg.cached && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            background: 'var(--accent-light)',
                            color: 'var(--accent)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600,
                          }}
                        >
                          ⚡ Saved answer (cache)
                        </span>
                      </div>
                    )}

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 ? (
                      <div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            marginBottom: '0.4rem',
                          }}
                        >
                          Citations & Provenance:
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.4rem',
                          }}
                        >
                          {msg.sources.map((s, i) => (
                            <SourceChip key={i} source={s} repoId={repoId} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--warn)',
                          fontStyle: 'italic',
                        }}
                      >
                        No sources found, so this answer may be unreliable.
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

      {/* Suggested question shortcuts above input if in conversation */}
      {messages.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            marginBottom: '0.25rem',
          }}
        >
          {DEFAULT_SUGGESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              disabled={waiting}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend(input)
        }}
        style={{
          display: 'flex',
          gap: '0.75rem',
        }}
      >
        <input
          type="text"
          className="input-text"
          placeholder="Ask a question about this code (e.g. Where is payment handled?)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={waiting}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={waiting || !input.trim()}
          style={{ minWidth: '90px' }}
        >
          {waiting ? '...' : 'Send →'}
        </button>
      </form>
    </div>
  )
}

