import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Clock, Loader2, CheckCircle2, AlertCircle, RotateCcw, Search, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { addRepo, getRepo } from '../../api/client'
import type { Repo } from '../../api/types'
import { BrandIcon } from '../../components/BrandIcon'
import { DevMockPanel } from '../../components/DevMockPanel'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBox } from '../../components/ErrorBox'
import { LoadingBox } from '../../components/LoadingBox'
import { ThemeToggle } from '../../components/ThemeToggle'
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
          icon={Search}
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
  const stepIndex = status === 'ready' ? 3 : status === 'cloning' ? 2 : 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '0.875rem 2rem',
        }}
      >
        <Link
          to="/"
          style={{
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            textDecoration: 'none',
          }}
        >
          <BrandIcon size={24} />
          <span>GitHub Knowledge Assistance</span>
        </Link>
        <ThemeToggle />
      </header>

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          flex: 1,
          maxWidth: '680px',
          margin: '0 auto',
          padding: '4rem 1.5rem',
          width: '100%',
        }}
      >
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
          <h1
            style={{
              fontSize: '1.625rem',
              fontWeight: 700,
              marginBottom: '0.35rem',
              color: 'var(--text)',
              letterSpacing: '-0.02em',
            }}
          >
            {repo?.owner}/{repo?.name}
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              marginBottom: '2.5rem',
              wordBreak: 'break-all',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {repo?.url}
          </p>

          {/* 3-Step Ingestion Stepper */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              marginBottom: '2.5rem',
            }}
          >
            {/* Step 1: Queued */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius)',
                  background: stepIndex >= 1 ? 'var(--accent)' : 'var(--surface-subtle)',
                  color: stepIndex >= 1 ? '#ffffff' : 'var(--text-subtle)',
                  border: `1px solid ${stepIndex >= 1 ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                <Clock size={18} />
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: stepIndex >= 1 ? 'var(--text)' : 'var(--text-muted)' }}>
                Queued
              </span>
            </div>

            {/* Connecting line 1 */}
            <div
              style={{
                flex: 1,
                height: '2px',
                background: stepIndex >= 2 ? 'var(--accent)' : 'var(--border)',
                margin: '0 0.5rem -1rem 0.5rem',
                transition: 'background 0.3s ease',
              }}
            />

            {/* Step 2: Analyzing */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius)',
                  background: stepIndex >= 2 ? 'var(--accent)' : 'var(--surface-subtle)',
                  color: stepIndex >= 2 ? '#ffffff' : 'var(--text-subtle)',
                  border: `1px solid ${stepIndex >= 2 ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                <Loader2 size={18} className={stepIndex === 2 ? 'animate-spin' : ''} />
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: stepIndex >= 2 ? 'var(--text)' : 'var(--text-muted)' }}>
                Analyzing
              </span>
            </div>

            {/* Connecting line 2 */}
            <div
              style={{
                flex: 1,
                height: '2px',
                background: stepIndex >= 3 ? 'var(--accent)' : 'var(--border)',
                margin: '0 0.5rem -1rem 0.5rem',
                transition: 'background 0.3s ease',
              }}
            />

            {/* Step 3: Ready */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius)',
                  background: stepIndex >= 3 ? 'var(--ok)' : 'var(--surface-subtle)',
                  color: stepIndex >= 3 ? '#ffffff' : 'var(--text-subtle)',
                  border: `1px solid ${stepIndex >= 3 ? 'var(--ok)' : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={18} />
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: stepIndex >= 3 ? 'var(--text)' : 'var(--text-muted)' }}>
                Ready
              </span>
            </div>
          </div>

          {/* Status Message Box */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius)',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              marginBottom: '1.5rem',
            }}
          >
            {status === 'queued' && (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Waiting in queue to start ingestion and syntax parsing...
              </p>
            )}

            {status === 'cloning' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <span className="spinner" />
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500 }}>
                  Cloning repository, parsing AST definitions, and constructing call graphs...
                </p>
              </div>
            )}

            {status === 'ready' && (
              <div style={{ color: 'var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} />
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  Analysis complete! Redirecting to dashboard...
                </span>
              </div>
            )}

            {status === 'error' && (
              <div style={{ color: 'var(--danger)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <AlertCircle size={18} />
                  <span style={{ fontWeight: 600 }}>Analysis failed to complete</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  We could not parse this repository. Please confirm the project is public and contains valid Python files.
                </p>
              </div>
            )}
          </div>

          {pollWarning && (
            <div style={{ marginBottom: '1.5rem' }}>
              <ErrorBox message={pollWarning} />
            </div>
          )}

          {timedOut && (
            <div style={{ marginBottom: '1.5rem' }}>
              <ErrorBox message="Analysis took longer than 10 minutes. The repository may be unusually large." />
            </div>
          )}

          {/* Action Button */}
          {status === 'ready' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/repos/${repo?.id}`)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <span>Open Repository Workspace</span>
              <ExternalLink size={15} />
            </button>
          )}

          {status === 'error' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRetry}
              disabled={retrying}
              style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
            >
              <RotateCcw size={15} />
              <span>{retrying ? 'Retrying analysis...' : 'Retry Ingestion'}</span>
            </button>
          )}
        </div>
      </motion.main>

      <DevMockPanel />
    </div>
  )
}
export default ProgressPage
