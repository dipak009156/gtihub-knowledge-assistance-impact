import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addRepo, getRepo } from '../../api/client'
import type { Repo } from '../../api/types'
import { DevMockPanel } from '../../components/DevMockPanel'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBox } from '../../components/ErrorBox'
import { LoadingBox } from '../../components/LoadingBox'
import { usePolling } from '../../hooks/usePolling'

export const ProgressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const repoId = Number(id)
  const navigate = useNavigate()

  const [repo, setRepo] = useState<Repo | null>(null)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [is404, setIs404] = useState(false)
  const [pollWarning, setPollWarning] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const fetchRepoStatus = async () => {
    if (!repoId || isNaN(repoId)) {
      setIs404(true)
      setLoadingInitial(false)
      return
    }

    try {
      const data = await getRepo(repoId)
      setRepo(data)
      setPollWarning(null)
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string }
      if (apiErr.status === 404) {
        setIs404(true)
      } else {
        setPollWarning('Trouble reaching server; still trying...')
      }
    } finally {
      setLoadingInitial(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchRepoStatus()
  }, [repoId])

  // Polling hook (polls every 2s, stops on ready or error, stops after 10m)
  const isComplete = repo?.status === 'ready' || repo?.status === 'error'
  const { timedOut } = usePolling(fetchRepoStatus, {
    interval: 2000,
    enabled: Boolean(repoId && !is404 && !isComplete),
    maxDuration: 10 * 60 * 1000,
  })

  // When ready, redirect after 1.2s or allow manual click
  useEffect(() => {
    if (repo?.status === 'ready') {
      const timer = setTimeout(() => {
        navigate(`/repos/${repo.id}`)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [repo?.status, repo?.id, navigate])

  const handleRetry = async () => {
    if (!repo) return
    setRetrying(true)
    setPollWarning(null)
    try {
      const fresh = await addRepo(repo.url)
      setRepo(fresh)
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setPollWarning(apiErr.message || 'Retry failed. Please check connection.')
    } finally {
      setRetrying(false)
    }
  }

  if (is404) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1rem' }}>
        <EmptyState
          icon="🔍"
          title="We cannot find that project"
          description="The repository you are trying to view does not exist."
          actionLabel="Go to Home"
          onAction={() => navigate('/')}
        />
        <DevMockPanel />
      </div>
    )
  }

  if (loadingInitial) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1rem' }}>
        <LoadingBox height={200} lines={3} />
        <DevMockPanel />
      </div>
    )
  }

  const status = repo?.status || 'queued'
  const stepIndex =
    status === 'ready' ? 3 : status === 'cloning' ? 2 : 1

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '1rem 2rem',
        }}
      >
        <Link
          to="/"
          style={{
            fontWeight: 800,
            fontSize: '1.1rem',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>🔮</span>
          <span>GKA Impact</span>
        </Link>
      </header>

      <main
        style={{
          flex: 1,
          maxWidth: '650px',
          margin: '0 auto',
          padding: '3rem 1.5rem',
          width: '100%',
        }}
      >
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              color: 'var(--text)',
            }}
          >
            {repo?.owner}/{repo?.name}
          </h1>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              marginBottom: '2.5rem',
              wordBreak: 'break-all',
            }}
          >
            {repo?.url}
          </p>

          {/* Stepper */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              marginBottom: '2.5rem',
            }}
          >
            {/* Step 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background:
                    stepIndex >= 1
                      ? 'var(--accent)'
                      : 'var(--surface-hover)',
                  color: stepIndex >= 1 ? '#fff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                1
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Queued</span>
            </div>

            {/* Connecting line 1 */}
            <div
              style={{
                flex: 1,
                height: '3px',
                background:
                  stepIndex >= 2 ? 'var(--accent)' : 'var(--border)',
                margin: '0 0.5rem -1rem 0.5rem',
              }}
            />

            {/* Step 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background:
                    stepIndex >= 2
                      ? 'var(--accent)'
                      : 'var(--surface-hover)',
                  color: stepIndex >= 2 ? '#fff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                2
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Analyzing</span>
            </div>

            {/* Connecting line 2 */}
            <div
              style={{
                flex: 1,
                height: '3px',
                background:
                  stepIndex >= 3 ? 'var(--ok)' : 'var(--border)',
                margin: '0 0.5rem -1rem 0.5rem',
              }}
            />

            {/* Step 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background:
                    stepIndex >= 3
                      ? 'var(--ok)'
                      : 'var(--surface-hover)',
                  color: stepIndex >= 3 ? '#fff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {stepIndex >= 3 ? '✓' : '3'}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Ready</span>
            </div>
          </div>

          {/* Dynamic feedback per state */}
          {status === 'queued' && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite' }}>
                ⏳ Project is waiting in the ingestion queue...
              </span>
            </div>
          )}

          {status === 'cloning' && (
            <div style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 500 }}>
              <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite' }}>
                📥 Cloning code, extracting AST symbols, and reading git history...
              </span>
            </div>
          )}

          {status === 'ready' && (
            <div>
              <div
                style={{
                  color: 'var(--ok)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                }}
              >
                ✓ Project ready! Redirecting to Overview...
              </div>
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/repos/${repo?.id}`)}
              >
                Open Project Now →
              </button>
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'left', marginTop: '1rem' }}>
              <div
                style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius)',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                  Ingestion Failed
                </div>
                <div>
                  {repo?.error_message ||
                    'An error occurred while downloading or analyzing this repository.'}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleRetry}
                  disabled={retrying}
                >
                  {retrying ? 'Retrying...' : 'Retry Ingestion'}
                </button>
              </div>
            </div>
          )}

          {timedOut && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem',
                background: 'var(--warn-bg)',
                color: 'var(--warn)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
              }}
            >
              ⚠️ Ingestion is taking longer than usual (over 10 minutes). The
              project may be very large.
            </div>
          )}

          {pollWarning && (
            <div style={{ marginTop: '1rem' }}>
              <ErrorBox message={pollWarning} onRetry={fetchRepoStatus} />
            </div>
          )}
        </div>
      </main>

      <DevMockPanel />
    </div>
  )
}

