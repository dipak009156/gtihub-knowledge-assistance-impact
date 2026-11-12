import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getValidation, runValidation } from '../../api/client'
import type { Validation, ValidationRun } from '../../api/types'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBox } from '../../components/ErrorBox'
import { LoadingBox } from '../../components/LoadingBox'
import { usePolling } from '../../hooks/usePolling'

export const ValidationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const repoId = Number(id)

  const [validation, setValidation] = useState<Validation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startingRun, setStartingRun] = useState(false)

  const [selectedVariant, setSelectedVariant] = useState<'combined' | 'history' | 'graph'>('combined')

  // Paginate commit replay list to avoid rendering hundreds of cards at once
  const COMMITS_PER_PAGE = 20
  const [visibleCommits, setVisibleCommits] = useState(COMMITS_PER_PAGE)

  const fetchValidation = async () => {
    if (!repoId) return
    try {
      const data = await getValidation(repoId)
      setValidation(data)
      setError(null)
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setError(apiErr.message || 'Could not load validation results.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchValidation()
  }, [repoId])

  // Poll while status is running
  const isRunning = validation?.status === 'running'
  usePolling(fetchValidation, {
    interval: 3000,
    enabled: Boolean(repoId && isRunning),
  })

  const handleStartRun = async () => {
    if (!repoId || startingRun) return
    setStartingRun(true)
    setError(null)
    try {
      await runValidation(repoId)
      setValidation((prev) =>
        prev
          ? { ...prev, status: 'running' }
          : { status: 'running', runs: [], commits: [] }
      )
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setError(apiErr.message || 'Could not launch validation runner.')
    } finally {
      setStartingRun(false)
    }
  }

  // Find max values in each metric column to highlight best
  const bestScores = useMemo(() => {
    const runs = validation?.runs || []
    const getVal = (v: string, k: number, metric: 'precision' | 'recall') => {
      const r = runs.find((item) => item.variant === v && item.k === k)
      return r ? r[metric] : -1
    }

    const variants = ['combined', 'history', 'graph'] as const
    return {
      p5: Math.max(...variants.map((v) => getVal(v, 5, 'precision'))),
      r5: Math.max(...variants.map((v) => getVal(v, 5, 'recall'))),
      p10: Math.max(...variants.map((v) => getVal(v, 10, 'precision'))),
      r10: Math.max(...variants.map((v) => getVal(v, 10, 'recall'))),
    }
  }, [validation?.runs])

  const renderPercentage = (
    run: ValidationRun | undefined,
    metric: 'precision' | 'recall',
    bestVal: number
  ) => {
    if (!run) return <td style={{ padding: '0.75rem 1rem' }}>-</td>
    const val = run[metric]
    const isBest = val > 0 && Math.abs(val - bestVal) < 0.001
    return (
      <td
        style={{
          padding: '0.75rem 1rem',
          fontWeight: isBest ? 700 : 500,
          color: isBest ? 'var(--ok)' : 'var(--text)',
          background: isBest ? 'var(--ok-bg)' : 'transparent',
        }}
      >
        {Math.round(val * 100)}% {isBest && '★'}
      </td>
    )
  }

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Validation & Empirical Proof
        </h1>
        <LoadingBox height={200} lines={4} />
      </div>
    )
  }

  if (error) {
    return <ErrorBox message={error} onRetry={fetchValidation} />
  }

  const status = validation?.status || 'none'
  const commitsTested = validation?.runs?.[0]?.commits_tested || 0

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              marginBottom: '0.25rem',
            }}
          >
            Validation & Empirical Proof
          </h1>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.95rem',
              maxWidth: '680px',
              lineHeight: 1.5,
            }}
          >
            We pretend to go back in time. For each old change we guess which
            other files changed too, using only older information, then we check
            our guess.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleStartRun}
          disabled={isRunning || startingRun}
        >
          {isRunning || startingRun
            ? 'Running evaluation...'
            : status === 'done'
              ? 'Re-run validation 🔄'
              : 'Run validation 🛡️'}
        </button>
      </div>

      {/* Running State Banner */}
      {isRunning && (
        <div
          className="card"
          style={{
            padding: '1.5rem',
            marginBottom: '2rem',
            background: 'var(--accent-light)',
            border: '1px solid var(--accent-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '1.75rem', animation: 'pulse 1.2s infinite' }}>
            ⚙️
          </span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--accent)' }}>
              Validation replay in progress...
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
              Replaying past commits chronologically, assessing precision and
              recall for Graph, History, and Combined heuristics.
            </div>
          </div>
        </div>
      )}

      {/* Not run yet */}
      {status === 'none' && (
        <EmptyState
          icon="🛡️"
          title="Not run yet"
          description="Run the empirical validator to benchmark prediction accuracy against git history."
          actionLabel="Run Validation Now"
          onAction={handleStartRun}
        />
      )}

      {/* Done State */}
      {status === 'done' && (
        <div>
          {/* Commits tested counter */}
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: '1rem',
            }}
          >
            Tested on <strong>{commitsTested} historical commits</strong> across
            3 algorithmic variants:
          </div>

          {/* Results Comparison Table */}
          <div
            className="card"
            style={{
              padding: '0',
              overflow: 'hidden',
              marginBottom: '1.5rem',
            }}
          >
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
                  <th style={{ padding: '0.75rem 1rem' }}>Variant</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Precision@5</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Recall@5</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Precision@10</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Recall@10</th>
                </tr>
              </thead>
              <tbody>
                {(['combined', 'history', 'graph'] as const).map((v) => {
                  const runs = validation?.runs || []
                  const r5 = runs.find(
                    (r) => r.variant === v && r.k === 5
                  )
                  const r10 = runs.find(
                    (r) => r.variant === v && r.k === 10
                  )
                  const title =
                    v === 'combined'
                      ? 'Combined (Graph + History)'
                      : v === 'history'
                        ? 'History only'
                        : 'Graph only'

                  return (
                    <tr
                      key={v}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        fontWeight: v === 'combined' ? 700 : 500,
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem' }}>{title}</td>
                      {renderPercentage(r5, 'precision', bestScores.p5)}
                      {renderPercentage(r5, 'recall', bestScores.r5)}
                      {renderPercentage(r10, 'precision', bestScores.p10)}
                      {renderPercentage(r10, 'recall', bestScores.r10)}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Precision & Recall Definition Guide */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '2.5rem',
            }}
          >
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)', marginBottom: '0.25rem' }}>
                Precision:
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Of what we guessed, how much was right. High precision means very few
                false alarms.
              </p>
            </div>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)', marginBottom: '0.25rem' }}>
                Recall:
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Of what really changed, how much did we find. High recall means few
                missed dependencies.
              </p>
            </div>
          </div>

          {/* Per-commit Replay List */}
          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Historical Commit Replays
              </h2>

              {/* Variant selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Prediction model:
                </span>
                <select
                  value={selectedVariant}
                  onChange={(e) => {
                    setSelectedVariant(
                      e.target.value as 'combined' | 'history' | 'graph'
                    )
                    setVisibleCommits(COMMITS_PER_PAGE)
                  }}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-card)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="combined">Combined</option>
                  <option value="history">History only</option>
                  <option value="graph">Graph only</option>
                </select>
              </div>
            </div>

            {(!validation?.commits || validation.commits.length === 0) ? (
              <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Needs at least 500 commits. Try another project.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(validation?.commits || []).slice(0, visibleCommits).map((c) => {
                  const predictedList = c.predicted[selectedVariant] || []
                  const actualSet = new Set(c.actual)

                  return (
                    <div key={c.sha} className="card" style={{ padding: '1.25rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            background: 'var(--surface-hover)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                          }}
                        >
                          {c.sha.slice(0, 7)}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          {c.message}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                          gap: '1rem',
                        }}
                      >
                        {/* Predicted Column */}
                        <div
                          style={{
                            background: 'var(--surface)',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              textTransform: 'uppercase',
                              marginBottom: '0.5rem',
                            }}
                          >
                            We Predicted:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {predictedList.map((file) => {
                              const hit = actualSet.has(file)
                              return (
                                <div
                                  key={file}
                                  style={{
                                    fontSize: '0.85rem',
                                    padding: '0.2rem 0.4rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: hit ? 'var(--ok-bg)' : 'transparent',
                                    color: hit ? 'var(--ok)' : 'var(--text)',
                                    fontWeight: hit ? 600 : 400,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                  }}
                                >
                                  <span>{hit ? '✓' : '•'}</span>
                                  <span>{file}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* What Really Changed Column */}
                        <div
                          style={{
                            background: 'var(--surface)',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              textTransform: 'uppercase',
                              marginBottom: '0.5rem',
                            }}
                          >
                            What Really Changed:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {c.actual.map((file) => (
                              <div
                                key={file}
                                style={{
                                  fontSize: '0.85rem',
                                  padding: '0.2rem 0.4rem',
                                  color: 'var(--text)',
                                }}
                              >
                                {file}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {/* Load more button — avoids rendering hundreds of cards at once */}
                {visibleCommits < (validation?.commits?.length ?? 0) && (
                  <button
                    className="btn btn-secondary"
                    style={{ alignSelf: 'center', marginTop: '0.5rem' }}
                    onClick={() => setVisibleCommits((n) => n + COMMITS_PER_PAGE)}
                  >
                    Load more commits ({visibleCommits} / {validation?.commits?.length ?? 0})
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
