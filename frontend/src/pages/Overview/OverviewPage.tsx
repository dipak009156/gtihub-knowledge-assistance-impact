import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  FileCode2,
  Code2,
  Boxes,
  PhoneCall,
  GitCommit,
  Info,
  GitFork,
  Zap,
  MessageSquareCode,
  ArrowRight,
  Send,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { chat, getHotspots, getOverview } from '../../api/client'
import type { Hotspot, Overview, Source } from '../../api/types'
import { CodeLink } from '../../components/CodeLink'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBox } from '../../components/ErrorBox'
import { LoadingBox } from '../../components/LoadingBox'
import { SourceChip } from '../../components/SourceChip'

export const OverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const repoId = Number(id)

  const [overview, setOverview] = useState<Overview | null>(null)
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Quick AI Assistant state for single-page repository exploration
  const [chatQuestion, setChatQuestion] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatAnswer, setChatAnswer] = useState<{
    answer: string
    sources: Source[]
    grounded: boolean
  } | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)

  const handleAskQuestion = async (qText?: string) => {
    const q = (qText || chatQuestion).trim()
    if (!q || !repoId || chatLoading) return
    setChatLoading(true)
    setChatError(null)
    setChatQuestion(q)
    try {
      const res = await chat(repoId, q)
      setChatAnswer({
        answer: res.answer,
        sources: res.sources || [],
        grounded: res.grounded ?? true,
      })
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setChatError(apiErr.message || 'Could not reach AI assistant.')
    } finally {
      setChatLoading(false)
    }
  }

  const loadData = async () => {
    if (!repoId) return
    setLoading(true)
    setError(null)
    try {
      const [ovData, hsData] = await Promise.all([
        getOverview(repoId),
        getHotspots(repoId),
      ])
      setOverview(ovData)
      setHotspots(hsData?.slice(0, 5) || [])
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setError(
        apiErr.message || 'We could not reach the server. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [repoId])

  if (loading) {
    return (
      <div style={{ padding: '1.75rem 2rem', maxWidth: '1240px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
          Overview
        </h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <LoadingBox height={95} lines={1} />
          <LoadingBox height={95} lines={1} />
          <LoadingBox height={95} lines={1} />
          <LoadingBox height={95} lines={1} />
          <LoadingBox height={95} lines={1} />
        </div>
        <LoadingBox height={220} lines={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1.75rem 2rem', maxWidth: '1240px' }}>
        <ErrorBox message={error} onRetry={loadData} />
      </div>
    )
  }

  if (!overview) {
    return (
      <div style={{ padding: '1.75rem 2rem', maxWidth: '1240px' }}>
        <EmptyState
          title="No overview data"
          description="We could not find statistics for this repository."
          actionLabel="Retry"
          onAction={loadData}
        />
      </div>
    )
  }

  const statCards = [
    { label: 'Source Files', value: overview.files ?? 0, icon: FileCode2, highlight: false },
    { label: 'Functions', value: overview.functions ?? 0, icon: Code2, highlight: true },
    { label: 'Classes', value: overview.classes ?? 0, icon: Boxes, highlight: false },
    { label: 'Call References', value: overview.calls ?? 0, icon: PhoneCall, highlight: false },
    {
      label: 'Commits Analyzed',
      value: overview.commits > 0 ? overview.commits : '0',
      icon: GitCommit,
      highlight: false,
      emptyLabel: overview.commits === 0 ? 'No history found' : undefined,
    },
  ]

  const quickActions = [
    { title: 'Explore Code', desc: 'Browse file tree & syntax in Monaco editor', path: `/repos/${repoId}/code`, icon: FileCode2 },
    { title: 'Dependency Graph', desc: 'Interactive module & call relationship visualization', path: `/repos/${repoId}/graph`, icon: GitFork },
    { title: 'Impact Explorer', desc: 'Simulate changes and assess blast radius risk', path: `/repos/${repoId}/impact`, icon: Zap },
    { title: 'AI & ML Intelligence', desc: 'Predictive bug propensity, PR agent review, & test synthesis', path: `/repos/${repoId}/intelligence`, icon: Sparkles },
  ]

  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: '1240px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            marginBottom: '0.25rem',
          }}
        >
          {overview.repo.owner}/{overview.repo.name}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Repository structure, symbol index, and impact metrics.
        </p>
      </div>

      {/* Metric Stat Cards with Staggered Animation */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        {statCards.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              className="card card-hover"
              style={{ padding: '1.25rem', position: 'relative' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {stat.label}
                </span>
                <span style={{ color: stat.highlight ? 'var(--accent)' : 'var(--text-subtle)' }}>
                  <Icon size={16} />
                </span>
              </div>
              <div
                style={{
                  fontSize: '1.875rem',
                  fontWeight: 800,
                  color: stat.highlight ? 'var(--accent)' : 'var(--text)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                }}
              >
                {stat.value}
              </div>
              {stat.emptyLabel && (
                <div style={{ fontSize: '0.75rem', color: 'var(--warn)', marginTop: '0.35rem', fontWeight: 600 }}>
                  {stat.emptyLabel}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Uncertain Calls Notice */}
      {overview.uncertain_calls > 0 && (
        <div
          style={{
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            marginBottom: '2rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.75rem',
            borderRadius: 'var(--radius)',
            backgroundColor: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
          }}
        >
          <Info size={14} style={{ color: 'var(--accent)' }} />
          <span>
            <strong>{overview.uncertain_calls}</strong> calls are marked uncertain (multiple functions share identical identifier names).
          </span>
        </div>
      )}

      {/* Quick Action Navigation Grid */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.875rem' }}>
          Quick Actions
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          {quickActions.map((action) => {
            const ActionIcon = action.icon
            return (
              <Link
                key={action.title}
                to={action.path}
                className="card card-hover"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius)',
                    backgroundColor: 'var(--accent-subtle)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ActionIcon size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)' }}>
                    {action.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    {action.desc}
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-subtle)' }} />
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Interactive Codebase AI Assistant (Integrated Single-Page Chat) ── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--accent-subtle)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Ask AI Codebase Assistant
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Instant answers with AST symbol citations and verified source lines.
              </p>
            </div>
          </div>
          <Link
            to={`/repos/${repoId}/chat`}
            className="btn btn-ghost btn-sm"
            style={{ gap: '0.35rem', color: 'var(--accent)', fontSize: '0.8125rem' }}
          >
            <MessageSquareCode size={14} />
            <span>Open Dedicated Chat</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Quick Suggestion Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            'What does this project do?',
            'Where does the main work start?',
            'What is the most important class?',
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="badge badge-neutral"
              style={{ cursor: 'pointer', padding: '0.35rem 0.65rem', border: '1px solid var(--border)' }}
              onClick={() => handleAskQuestion(suggestion)}
              disabled={chatLoading}
            >
              <span>{suggestion}</span>
            </button>
          ))}
        </div>

        {/* Question Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAskQuestion()
          }}
          style={{ display: 'flex', gap: '0.5rem', marginBottom: chatAnswer || chatError || chatLoading ? '1.25rem' : 0 }}
        >
          <input
            type="text"
            className="input"
            placeholder="Ask anything about this repo (e.g. Where is strategy evaluated?)..."
            value={chatQuestion}
            onChange={(e) => setChatQuestion(e.target.value)}
            disabled={chatLoading}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={chatLoading || !chatQuestion.trim()}
            style={{ minWidth: '95px', justifyContent: 'center', gap: '0.4rem' }}
          >
            {chatLoading ? <Loader2 size={15} className="spinner" /> : <Send size={15} />}
            <span>{chatLoading ? 'Thinking' : 'Ask'}</span>
          </button>
        </form>

        {/* Chat Answer Box */}
        {chatError && (
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius)', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.8125rem', marginTop: '1rem' }}>
            {chatError}
          </div>
        )}

        {chatAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius)',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              marginTop: '1rem',
            }}
          >
            <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-line', marginBottom: '0.75rem' }}>
              {chatAnswer.answer}
            </div>

            {chatAnswer.sources && chatAnswer.sources.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Verified AST Citations:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {chatAnswer.sources.map((s, idx) => (
                    <SourceChip key={idx} source={s} repoId={repoId} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Top 5 Hotspot Files Preview */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
              Top 5 Hotspot Files
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Files with the highest co-change churn and dependency coupling.
            </p>
          </div>
          <Link to={`/repos/${repoId}/hotspots`} className="btn btn-ghost btn-sm" style={{ gap: '0.35rem' }}>
            <span>View All</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {hotspots.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hotspot files detected for this repository.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileCode2 size={13} style={{ color: 'var(--text-subtle)' }} />
                    <span>File Path</span>
                  </th>
                  <th>Changes</th>
                  <th>Connections</th>
                  <th>Impact Score</th>
                </tr>
              </thead>
              <tbody>
                {hotspots.map((h) => {
                  const score = typeof h.score === 'number' && !isNaN(h.score) ? h.score : 0
                  const isHigh = score > 0.7
                  return (
                    <tr key={h.path}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <FileCode2 size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          <CodeLink file={h.path} repoId={repoId}>
                            {h.path}
                          </CodeLink>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                        {h.changes}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                        {h.connections}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              flex: 1,
                              maxWidth: '120px',
                              height: '6px',
                              backgroundColor: 'var(--surface-subtle)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.round(score * 100)}%`,
                                height: '100%',
                                backgroundColor: isHigh ? 'var(--danger)' : 'var(--warn)',
                                borderRadius: '3px',
                              }}
                            />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600 }}>
                            {score.toFixed(2)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
export default OverviewPage
