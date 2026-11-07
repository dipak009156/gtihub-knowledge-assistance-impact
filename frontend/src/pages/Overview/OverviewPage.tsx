import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getHotspots, getOverview } from '../../api/client'
import type { Hotspot, Overview } from '../../api/types'
import { CodeLink } from '../../components/CodeLink'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBox } from '../../components/ErrorBox'
import { LoadingBox } from '../../components/LoadingBox'

export const OverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const repoId = Number(id)

  const [overview, setOverview] = useState<Overview | null>(null)
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Overview
        </h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <LoadingBox height={90} lines={1} />
          <LoadingBox height={90} lines={1} />
          <LoadingBox height={90} lines={1} />
          <LoadingBox height={90} lines={1} />
          <LoadingBox height={90} lines={1} />
        </div>
        <LoadingBox height={200} lines={3} />
      </div>
    )
  }

  if (error) {
    return <ErrorBox message={error} onRetry={loadData} />
  }

  if (!overview) {
    return (
      <EmptyState
        title="No overview data"
        description="We could not find statistics for this repository."
        actionLabel="Retry"
        onAction={loadData}
      />
    )
  }

  return (
    <div>
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
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Repository structure, symbol index, and impact metrics.
        </p>
      </div>

      {/* Metric Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Python Files
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)' }}>
            {overview.files ?? 0}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Functions
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>
            {overview.functions ?? 0}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Classes
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)' }}>
            {overview.classes ?? 0}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Call References
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)' }}>
            {overview.calls ?? 0}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Commits Analyzed
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)' }}>
            {overview.commits > 0 ? overview.commits : '0'}
          </div>
          {overview.commits === 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--warn)' }}>
              No history found
            </span>
          )}
        </div>
      </div>

      {/* Note about uncertain calls */}
      {overview.uncertain_calls > 0 && (
        <div
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span>ℹ️</span>
          <span>
            <strong>{overview.uncertain_calls}</strong> calls are marked uncertain
            (same-named functions in different files).
          </span>
        </div>
      )}

      {/* Quick Action Navigation Buttons */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Quick Actions
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <Link
            to={`/repos/${repoId}/code`}
            className="card"
            style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>💻</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Explore code</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Browse files and call callers/callees
              </div>
            </div>
          </Link>

          <Link
            to={`/repos/${repoId}/graph`}
            className="card"
            style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>🕸️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>See the graph</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Visual map of who calls whom
              </div>
            </div>
          </Link>

          <Link
            to={`/repos/${repoId}/impact`}
            className="card"
            style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Check an impact</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Calculate blast radius of changes
              </div>
            </div>
          </Link>

          <Link
            to={`/repos/${repoId}/chat`}
            className="card"
            style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>💬</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Ask a question</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Chat with code and citations
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Top 5 Hotspots */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Top 5 Hotspot Files
          </h2>
          <Link
            to={`/repos/${repoId}/hotspots`}
            style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}
          >
            View all hotspots →
          </Link>
        </div>

        {hotspots.length === 0 ? (
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No git history or hotspot files found for this repository.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                    textAlign: 'left',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                  }}
                >
                  <th style={{ padding: '0.75rem 1rem' }}>Rank</th>
                  <th style={{ padding: '0.75rem 1rem' }}>File Path</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Changes</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Connections</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {hotspots.map((h, i) => (
                  <tr
                    key={h.path}
                    style={{
                      borderBottom:
                        i === hotspots.length - 1 ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                      #{i + 1}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <CodeLink file={h.path} repoId={repoId} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                        {h.path}
                      </CodeLink>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{h.changes}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{h.connections}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            flex: 1,
                            maxWidth: '80px',
                            height: '6px',
                            background: 'var(--surface-hover)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.round(h.score * 100)}%`,
                              height: '100%',
                              background:
                                h.score >= 0.7
                                  ? 'var(--danger)'
                                  : h.score >= 0.4
                                    ? 'var(--warn)'
                                    : 'var(--caution)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {h.score.toFixed(2)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

