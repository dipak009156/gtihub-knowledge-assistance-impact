import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addRepo, getDemoRepos, getRepo } from '../../api/client'
import type { DemoRepo, Repo } from '../../api/types'
import { DevMockPanel } from '../../components/DevMockPanel'
import { ErrorBox } from '../../components/ErrorBox'
import { LoadingBox } from '../../components/LoadingBox'
import { StatusBadge } from '../../components/StatusBadge'
import { validateGitHubUrl } from '../../lib/github'

const RECENT_REPOS_KEY = 'gka_recent_repo_ids'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()

  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const [demos, setDemos] = useState<DemoRepo[]>([])
  const [loadingDemos, setLoadingDemos] = useState(true)
  const [demoError, setDemoError] = useState<string | null>(null)

  const [recentRepos, setRecentRepos] = useState<Repo[]>([])
  const [loadingRecent, setLoadingRecent] = useState(false)

  // Load demo projects
  const fetchDemos = async () => {
    setLoadingDemos(true)
    setDemoError(null)
    try {
      const data = await getDemoRepos()
      setDemos(data || [])
    } catch {
      setDemoError('Could not load demo projects. Please try again.')
    } finally {
      setLoadingDemos(false)
    }
  }

  // Load recent projects from localStorage
  const loadRecent = async () => {
    try {
      const raw = localStorage.getItem(RECENT_REPOS_KEY)
      if (!raw) return
      const ids: number[] = JSON.parse(raw)
      if (!Array.isArray(ids) || ids.length === 0) return

      setLoadingRecent(true)
      const fetched: Repo[] = []
      for (const id of ids.slice(0, 5)) {
        try {
          const r = await getRepo(id)
          fetched.push(r)
        } catch {
          // Ignore missing demo
        }
      }
      setRecentRepos(fetched)
    } catch {
      // LocalStorage access failure
    } finally {
      setLoadingRecent(false)
    }
  }

  useEffect(() => {
    fetchDemos()
    loadRecent()
  }, [])

  const saveRecentId = (id: number) => {
    try {
      const raw = localStorage.getItem(RECENT_REPOS_KEY)
      const ids: number[] = raw ? JSON.parse(raw) : []
      const next = [id, ...ids.filter((x) => x !== id)].slice(0, 5)
      localStorage.setItem(RECENT_REPOS_KEY, JSON.stringify(next))
    } catch {
      // Ignore storage errors
    }
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    setInputError(null)
    setApiError(null)

    const check = validateGitHubUrl(url)
    if (!check.valid) {
      setInputError(check.error || 'Please enter a valid GitHub URL.')
      return
    }

    setSubmitting(true)
    try {
      const repo = await addRepo(url.trim())
      saveRecentId(repo.id)
      navigate(`/repos/${repo.id}/progress`)
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setApiError(
        apiErr.message || 'We could not reach the server. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenDemo = (demoUrl: string) => {
    setUrl(demoUrl)
    // Directly submit
    setInputError(null)
    setApiError(null)
    setSubmitting(true)
    addRepo(demoUrl)
      .then((repo) => {
        saveRecentId(repo.id)
        navigate(`/repos/${repo.id}/progress`)
      })
      .catch((err) => {
        setApiError(err.message || 'Could not launch demo.')
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Warm banner header */}
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🔮</span>
          <span
            style={{
              fontWeight: 800,
              fontSize: '1.1rem',
              color: 'var(--accent)',
              letterSpacing: '-0.02em',
            }}
          >
            GitHub Knowledge Assistance
          </span>
        </div>
      </header>

      {/* Main hero area */}
      <main
        style={{
          flex: 1,
          maxWidth: '960px',
          margin: '0 auto',
          padding: '3.5rem 1.5rem',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: 'var(--text)',
              lineHeight: 1.2,
              marginBottom: '1rem',
              letterSpacing: '-0.03em',
            }}
          >
            Pick a function. See what breaks if you change it.
          </h1>
          <p
            style={{
              fontSize: '1.1rem',
              color: 'var(--text-muted)',
              maxWidth: '650px',
              margin: '0 auto',
            }}
          >
            Trace function dependencies, historic co-changes, and call graphs
            across Python codebases with verifiable AI.
          </p>
        </div>

        {/* 3-Step Explainer */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
            marginBottom: '3rem',
          }}
        >
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🔗</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
              1. Paste a link
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Give any public GitHub repository URL.
            </p>
          </div>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🎯</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
              2. Pick a function
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Choose the method or class you plan to edit.
            </p>
          </div>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>⚡</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
              3. See the impact
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Get scored risks with plain-English reasons.
            </p>
          </div>
        </div>

        {/* Input Form Card */}
        <div
          className="card"
          style={{
            padding: '2rem',
            marginBottom: '3rem',
            background: 'var(--surface-card)',
            border: '2px solid var(--border-strong)',
          }}
        >
          <form onSubmit={handleAnalyze}>
            <label
              htmlFor="repo-url-input"
              style={{
                display: 'block',
                fontWeight: 600,
                fontSize: '0.95rem',
                marginBottom: '0.6rem',
                color: 'var(--text)',
              }}
            >
              GitHub Repository URL
            </label>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <input
                id="repo-url-input"
                type="text"
                className="input-text"
                placeholder="https://github.com/pallets/click"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  if (inputError) setInputError(null)
                  if (apiError) setApiError(null)
                }}
                disabled={submitting}
                style={{ flex: 1, minWidth: '280px' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ padding: '0.75rem 2rem' }}
              >
                {submitting ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            {inputError && (
              <div
                style={{
                  color: 'var(--danger)',
                  fontSize: '0.85rem',
                  marginTop: '0.6rem',
                  fontWeight: 500,
                }}
              >
                {inputError}
              </div>
            )}
            {apiError && (
              <div style={{ marginTop: '1rem' }}>
                <ErrorBox
                  message={apiError}
                  onRetry={() => handleAnalyze({ preventDefault: () => {} } as React.FormEvent)}
                />
              </div>
            )}
          </form>
        </div>

        {/* Demo Projects Section */}
        <section style={{ marginBottom: '3rem' }}>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: 'var(--text)',
            }}
          >
            Ready-made Examples
          </h2>

          {loadingDemos && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <LoadingBox height={100} lines={1} />
              <LoadingBox height={100} lines={1} />
              <LoadingBox height={100} lines={1} />
            </div>
          )}

          {demoError && (
            <ErrorBox message={demoError} onRetry={fetchDemos} />
          )}

          {!loadingDemos && !demoError && demos.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
              {demos.map((demo) => (
                <div
                  key={demo.name}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        marginBottom: '0.35rem',
                        color: 'var(--text)',
                      }}
                    >
                      {demo.name}
                    </div>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                        marginBottom: '1rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {demo.description}
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenDemo(demo.url)}
                    disabled={submitting}
                  >
                    Open demo →
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Projects Section (from localStorage) */}
        {(loadingRecent || recentRepos.length > 0) && (
          <section>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                marginBottom: '1rem',
                color: 'var(--text)',
              }}
            >
              Recent Projects
            </h2>
            {loadingRecent ? (
              <LoadingBox height={60} lines={2} />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {recentRepos.map((r) => (
                  <div
                    key={r.id}
                    className="card"
                    style={{
                      padding: '0.75rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 600 }}>
                        {r.owner}/{r.name}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(r.status === 'ready' ? `/repos/${r.id}` : `/repos/${r.id}/progress`)}
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <DevMockPanel />
    </div>
  )
}

