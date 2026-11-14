import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  RotateCcw,
  Loader2,
  Check,
  Star,
  GitCommit,
  Layers,
  TrendingUp,
  Target,
} from 'lucide-react'
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
    if (!run) return <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-subtle)' }}>-</td>
    const val = run[metric]
    const isBest = val > 0 && Math.abs(val - bestVal) < 0.001
    return (
      <td
        style={{
          padding: '0.75rem 1rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.875rem',
          fontWeight: isBest ? 700 : 500,
          color: isBest ? 'var(--ok)' : 'var(--text)',
          background: isBest ? 'var(--ok-bg)' : 'transparent',
          transition: 'background-color 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>{Math.round(val * 100)}%</span>
          {isBest && (
            <span
              title="Best performing heuristic"
              style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--ok)' }}
            >
              <Star size={12} style={{ fill: 'var(--ok)', color: 'var(--ok)' }} />
            </span>
          )}
        </div>
      </td>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1080px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          Validation & Empirical Proof
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Loading empirical validation benchmarks...
        </p>
        <LoadingBox height={240} lines={5} />
      </div>
    )
  }

  if (error) {
    return <ErrorBox message={error} onRetry={fetchValidation} />
  }

  const status = validation?.status || 'none'
  const commitsTested = validation?.runs?.[0]?.commits_tested || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ padding: '2rem', maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      {/* Header section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ padding: '0.35rem', borderRadius: 'var(--radius)', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'inline-flex' }}>
              <ShieldCheck size={18} />
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Validation & Empirical Proof
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '640px', lineHeight: 1.5 }}>
            We pretend to go back in time. For each old change we guess which
            other files changed too, using only older information, then we check
            our guess.
          </p>
        </div>

        <button
          className={`btn ${status === 'done' ? 'btn-secondary' : 'btn-primary'}`}
          onClick={handleStartRun}
          disabled={isRunning || startingRun}
          style={{ alignSelf: 'flex-start' }}
        >
          {isRunning || startingRun ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Running evaluation...</span>
            </>
          ) : status === 'done' ? (
            <>
              <RotateCcw size={14} />
              <span>Re-run validation</span>
            </>
          ) : (
            <>
              <ShieldCheck size={15} />
              <span>Run validation</span>
            </>
          )}
        </button>
      </div>

      {/* Running State Banner */}
      {isRunning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card"
          style={{
            background: 'var(--surface-secondary)',
            borderColor: 'var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <div style={{ padding: '0.5rem', borderRadius: 'var(--radius)', background: 'var(--accent-soft)', color: 'var(--accent)', flexShrink: 0 }}>
            <Loader2 size={20} className="animate-spin" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)' }}>
              Validation replay in progress...
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.5 }}>
              Replaying past commits chronologically, assessing precision and recall for
              Graph, History, and Combined heuristics without peeking at future commits.
            </p>
          </div>
        </motion.div>
      )}

      {/* Not run yet state */}
      {status === 'none' && (
        <EmptyState
          icon={<ShieldCheck size={36} style={{ color: 'var(--text-muted)' }} />}
          title="Not run yet"
          description="Run the empirical validator to benchmark prediction accuracy against git history."
          actionLabel="Run Validation Now"
          onAction={handleStartRun}
        />
      )}

      {/* Done State */}
      {status === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Summary Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: 'var(--radius)', background: 'var(--surface-secondary)', color: 'var(--text)' }}>
                <GitCommit size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Commits Tested</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginTop: '0.125rem' }}>
                  {commitsTested}
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: 'var(--radius)', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <Target size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Best Precision@5</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.125rem' }}>
                  {bestScores.p5 > 0 ? `${Math.round(bestScores.p5 * 100)}%` : '-'}
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: 'var(--radius)', background: 'var(--ok-bg)', color: 'var(--ok)' }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Best Recall@5</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ok)', marginTop: '0.125rem' }}>
                  {bestScores.r5 > 0 ? `${Math.round(bestScores.r5 * 100)}%` : '-'}
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: 'var(--radius)', background: 'var(--surface-secondary)', color: 'var(--text)' }}>
                <Layers size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Heuristics</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginTop: '0.125rem' }}>
                  3 Models
                </div>
              </div>
            </div>
          </div>

          {/* Results Comparison Table */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
                Benchmark Results Comparison
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tested on <strong>{commitsTested} historical commits</strong> across 3 algorithmic variants
              </span>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Precision@5</th>
                    <th>Recall@5</th>
                    <th>Precision@10</th>
                    <th>Recall@10</th>
                  </tr>
                </thead>
                <tbody>
                  {(['combined', 'history', 'graph'] as const).map((v) => {
                    const runs = validation?.runs || []
                    const r5 = runs.find((r) => r.variant === v && r.k === 5)
                    const r10 = runs.find((r) => r.variant === v && r.k === 10)
                    const title =
                      v === 'combined'
                        ? 'Combined (Graph + History)'
                        : v === 'history'
                          ? 'History only'
                          : 'Graph only'

                    const isCombined = v === 'combined'

                    return (
                      <tr
                        key={v}
                        style={{
                          background: isCombined ? 'var(--surface-secondary)' : 'transparent',
                        }}
                      >
                        <td style={{ fontWeight: isCombined ? 700 : 500, color: 'var(--text)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{title}</span>
                            {isCombined && (
                              <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                                Default
                              </span>
                            )}
                          </div>
                        </td>
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
          </div>

          {/* Precision & Recall Definition Guide */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ borderLeft: '3px solid var(--accent)', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.25rem' }}>
                <Target size={16} />
                <span>Precision:</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Of what we guessed, how much was right. High precision means very few
                false alarms and high confidence in recommended blast-radius targets.
              </p>
            </div>
            <div className="card" style={{ borderLeft: '3px solid var(--ok)', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--ok)', marginBottom: '0.25rem' }}>
                <TrendingUp size={16} />
                <span>Recall:</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Of what really changed, how much did we find. High recall means few
                missed dependencies, ensuring comprehensive test and impact coverage.
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
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>
                  Historical Commit Replays
                </h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Inspect retrospective predictions against historical ground truth
                </p>
              </div>

              {/* Variant selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label htmlFor="variant-select" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Prediction model:
                </label>
                <select
                  id="variant-select"
                  value={selectedVariant}
                  onChange={(e) => {
                    setSelectedVariant(
                      e.target.value as 'combined' | 'history' | 'graph'
                    )
                    setVisibleCommits(COMMITS_PER_PAGE)
                  }}
                  className="input"
                  style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8125rem' }}
                >
                  <option value="combined">Combined</option>
                  <option value="history">History only</option>
                  <option value="graph">Graph only</option>
                </select>
              </div>
            </div>

            {(!validation?.commits || validation.commits.length === 0) ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', borderStyle: 'dashed' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Needs at least 500 commits. Try another project.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(validation?.commits || []).slice(0, visibleCommits).map((c) => {
                  const predictedList = c.predicted[selectedVariant] || []
                  const actualSet = new Set(c.actual)

                  return (
                    <div
                      key={c.sha}
                      className="card"
                      style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.75rem', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                          {c.sha.slice(0, 7)}
                        </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>
                          {c.message}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                        {/* Predicted Column */}
                        <div style={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface-secondary)', padding: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <span>We Predicted:</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>
                              {predictedList.filter((f) => actualSet.has(f)).length} / {predictedList.length} hits
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {predictedList.length === 0 ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>No files predicted</span>
                            ) : (
                              predictedList.map((file) => {
                                const hit = actualSet.has(file)
                                return (
                                  <div
                                    key={file}
                                    style={{
                                      fontSize: '0.75rem',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: 'var(--radius-sm)',
                                      fontFamily: 'var(--font-mono)',
                                      background: hit ? 'var(--ok-bg)' : 'transparent',
                                      color: hit ? 'var(--ok)' : 'var(--text)',
                                      fontWeight: hit ? 600 : 400,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.4rem',
                                    }}
                                  >
                                    {hit ? (
                                      <Check size={12} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                                    ) : (
                                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-subtle)', flexShrink: 0 }} />
                                    )}
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file}</span>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>

                        {/* What Really Changed Column */}
                        <div style={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface-secondary)', padding: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <span>What Really Changed:</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{c.actual.length} files</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {c.actual.map((file) => (
                              <div
                                key={file}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.25rem 0.5rem',
                                  fontFamily: 'var(--font-mono)',
                                  color: 'var(--text)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
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

                {/* Load more button */}
                {visibleCommits < (validation?.commits?.length ?? 0) && (
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setVisibleCommits((n) => n + COMMITS_PER_PAGE)}
                    >
                      <span>Load more commits</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                        ({visibleCommits} / {validation?.commits?.length ?? 0})
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </motion.div>
  )
}
export default ValidationPage
