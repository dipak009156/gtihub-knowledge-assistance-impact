import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowRight,
  GitFork,
  Search,
  MessageSquareCode,
  Zap,
  Activity,
  Network,
  Code2,
  CheckCircle2,
  ChevronDown,
  Layers,
  Terminal,
  ExternalLink,
  Flame,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { addRepo, getDemoRepos, getRepo } from '../../api/client'
import type { DemoRepo, Repo } from '../../api/types'
import { BrandIcon } from '../../components/BrandIcon'
import { DevMockPanel } from '../../components/DevMockPanel'
import { ErrorBox } from '../../components/ErrorBox'
import { StatusBadge } from '../../components/StatusBadge'
import { ThemeToggle } from '../../components/ThemeToggle'
import { validateGitHubUrl } from '../../lib/github'

const RECENT_REPOS_KEY = 'gka_recent_repo_ids'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()

  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const [demos, setDemos] = useState<DemoRepo[]>([])
  const [recentRepos, setRecentRepos] = useState<Repo[]>([])

  // Interactive Product Preview Active Tab
  const [previewTab, setPreviewTab] = useState<'graph' | 'impact' | 'chat' | 'code'>('graph')

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // Load demo projects
  const fetchDemos = async () => {
    try {
      const data = await getDemoRepos()
      setDemos(data || [])
    } catch {
      // Ignore
    }
  }

  // Load recent projects from localStorage
  const loadRecent = async () => {
    try {
      const raw = localStorage.getItem(RECENT_REPOS_KEY)
      if (!raw) return
      const ids: number[] = JSON.parse(raw)
      if (!Array.isArray(ids) || ids.length === 0) return

      const fetched: Repo[] = []
      for (const id of ids.slice(0, 5)) {
        try {
          const r = await getRepo(id)
          fetched.push(r)
        } catch {
          // Ignore missing item
        }
      }
      setRecentRepos(fetched)
    } catch {
      // LocalStorage access failure
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
      setApiError(apiErr.message || 'We could not reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenDemo = (demoUrl: string) => {
    setUrl(demoUrl)
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

  const scrollToFeatures = () => {
    const el = document.getElementById('core-features')
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
      {/* ── Global Header Bar ── */}
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '0 2rem',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
            <BrandIcon size={28} />
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent)', letterSpacing: '-0.02em' }}>
              GitHub Knowledge Assistance
            </span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.875rem' }}>
            <a href="#how-it-works" style={{ color: 'var(--text-muted)' }}>How It Works</a>
            <a href="#core-features" style={{ color: 'var(--text-muted)' }}>Features</a>
            <a href="#workflow" style={{ color: 'var(--text-muted)' }}>Workflow</a>
            <a href="#tech-stack" style={{ color: 'var(--text-muted)' }}>Tech Stack</a>
            <a href="#faq" style={{ color: 'var(--text-muted)' }}>FAQ</a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/login" className="btn btn-ghost btn-sm">
            Sign In
          </Link>
          <a
            href="https://github.com/dipak009156/gtihub-knowledge-assistance-impact"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            GitHub
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Hero Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ padding: '4.5rem 1.5rem 3rem', maxWidth: '1080px', margin: '0 auto', width: '100%', textAlign: 'center' }}
      >
        <div
          className="badge badge-neutral"
          style={{ marginBottom: '1.25rem', display: 'inline-flex', padding: '0.35rem 0.75rem', gap: '0.5rem' }}
        >
          <Code2 size={13} style={{ color: 'var(--accent)' }} />
          <span>Codebase Intelligence and Impact Analysis Platform</span>
        </div>

        <h1
          style={{
            fontSize: '3rem',
            fontWeight: 800,
            lineHeight: 1.15,
            color: 'var(--text)',
            letterSpacing: '-0.03em',
            maxWidth: '820px',
            margin: '0 auto 1.25rem',
          }}
        >
          Understand Your Codebase. Before You Change It.
        </h1>

        <p
          style={{
            fontSize: '1.125rem',
            color: 'var(--text-muted)',
            maxWidth: '680px',
            margin: '0 auto 2.25rem',
            lineHeight: 1.55,
          }}
        >
          Analyze GitHub repositories, explore code dependencies, and get AI-powered explanations backed by actual source code references.
        </p>

        {/* 3-Step Explainer Tagline */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--surface-subtle)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            marginBottom: '2rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          <span>Pick a function. See what breaks if you change it.</span>
        </div>

        {/* Repository Submission Card */}
        <div
          className="card"
          style={{
            maxWidth: '680px',
            margin: '0 auto 3rem',
            padding: '1.5rem',
            boxShadow: 'var(--shadow)',
            border: '1px solid var(--border-strong)',
            textAlign: 'left',
          }}
        >
          <form onSubmit={handleAnalyze}>
            <label
              htmlFor="repo-url-input"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}
            >
              Connect GitHub Repository
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                id="repo-url-input"
                type="text"
                className="input"
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
                style={{ minWidth: '160px' }}
              >
                <span>{submitting ? 'Analyzing...' : 'Analyze Repository'}</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {inputError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginTop: '0.5rem', fontWeight: 500 }}>
                {inputError}
              </div>
            )}

            {apiError && (
              <div style={{ marginTop: '0.75rem' }}>
                <ErrorBox
                  message={apiError}
                  onRetry={() => handleAnalyze({ preventDefault: () => {} } as React.FormEvent)}
                />
              </div>
            )}
          </form>

          {/* Quick Demo Repositories Bar */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Ready-made Examples:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleOpenDemo('https://github.com/demo/shop-app')}
                disabled={submitting}
              >
                shop-app
              </button>
              {demos.map((d) => (
                <button
                  key={d.name}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenDemo(d.url)}
                  disabled={submitting}
                >
                  {d.name}
                </button>
              ))}
            </div>

            {recentRepos.length > 0 && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Recent Repositories:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                  {recentRepos.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/repos/${r.id}`)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <span>{r.name}</span>
                      <StatusBadge status={r.status} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '3.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={scrollToFeatures}>
            Explore Features
          </button>
        </div>
      </motion.section>

      {/* ── Interactive Product Preview ── */}
      <section style={{ maxWidth: '1080px', margin: '0 auto 5rem', padding: '0 1.5rem', width: '100%' }}>
        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
            border: '1px solid var(--border-strong)',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          {/* Mock Window Topbar */}
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--surface-secondary)',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--warn)' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--ok)' }} />
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                demo/shop-app - codebase-intelligence
              </span>
            </div>

            {/* Interactive Preview Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setPreviewTab('graph')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  background: previewTab === 'graph' ? 'var(--accent)' : 'transparent',
                  color: previewTab === 'graph' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Dependency Graph
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('impact')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  background: previewTab === 'impact' ? 'var(--accent)' : 'transparent',
                  color: previewTab === 'impact' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Impact Analysis
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('chat')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  background: previewTab === 'chat' ? 'var(--accent)' : 'transparent',
                  color: previewTab === 'chat' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                AI Assistant
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('code')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  background: previewTab === 'code' ? 'var(--accent)' : 'transparent',
                  color: previewTab === 'code' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Code Explorer
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div style={{ minHeight: '340px', background: 'var(--surface)', color: 'var(--text)', padding: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
            {previewTab === 'graph' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>Interactive Call Graph (Module View & Function Call View)</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Solid = Certain | Dashed = Uncertain</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem' }}>shop/views.py</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>POST /checkout (L28-62)</div>
                    <div style={{ marginTop: '0.5rem', color: 'var(--ok)', fontSize: '0.7rem' }}>calls: validate_order, pay</div>
                  </div>
                  <div style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--accent)' }}>
                    <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: '0.5rem' }}>shop/services.py</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>pay() (L45-85)</div>
                    <div style={{ marginTop: '0.5rem', color: 'var(--warn)', fontSize: '0.7rem' }}>calls: calculate_total, charge</div>
                  </div>
                  <div style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem' }}>shop/models.py</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>calculate_total() (L55-78)</div>
                    <div style={{ marginTop: '0.5rem', color: 'var(--ok)', fontSize: '0.7rem' }}>used by: pay, invoice</div>
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'impact' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Blast Radius: Modifying calculate_total (Depth: 2)</span>
                  <span style={{ color: 'var(--text-muted)' }}>3 Potentially Affected Callers</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ background: 'var(--surface-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>shop.services.pay</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.75rem' }}>Direct Caller (Depth 1)</span>
                    </div>
                    <span style={{ background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700 }}>Risk: 0.85</span>
                  </div>
                  <div style={{ background: 'var(--surface-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ color: 'var(--warn)', fontWeight: 600 }}>shop.views.checkout</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.75rem' }}>Transitive Caller (Depth 2)</span>
                    </div>
                    <span style={{ background: 'var(--warn)', color: '#fff', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700 }}>Risk: 0.68</span>
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'chat' && (
              <div>
                <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text)', fontWeight: 600 }}>
                  AI Codebase Assistant - Verifiable Citations
                </div>
                <div style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>User:</span> Where is payment handled?
                </div>
                <div style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--accent)', border: '1px solid var(--border)', borderLeftWidth: '3px', borderLeftColor: 'var(--accent)' }}>
                  <p style={{ color: 'var(--text)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    Payments are handled by <code style={{ color: 'var(--accent)' }}>charge_card</code> in <code style={{ color: 'var(--accent)' }}>shop/payment.py</code>. It verifies card tokens and communicates with the gateway.
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                    <CheckCircle2 size={12} />
                    <span>Citation: shop/payment.py:8-29 (Verified AST)</span>
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'code' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>Monaco Editor - Read-only Syntax Highlighting</span>
                  <span style={{ color: 'var(--text-muted)' }}>shop/payment.py:8-29</span>
                </div>
                <pre style={{ margin: 0, color: 'var(--text)', lineHeight: 1.6 }}>
                  <code>{` 8 | def charge_card(order_id: int, token: str) -> TransactionResult:
 9 |     """Process gateway authorization and record transaction."""
10 |     order = get_order_or_404(order_id)
11 |     total = calculate_total(order.items)
12 |     gateway_response = stripe_client.charges.create(amount=total, token=token)
13 |     return TransactionResult(status=gateway_response.status)`}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 1: How It Works ── */}
      <section id="how-it-works" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '4.5rem 1.5rem' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              How It Works
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem' }}>
              From repository ingestion to actionable dependency intelligence in four steps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius)', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Terminal size={18} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>1. Connect Repository</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Paste any public GitHub repository link. The platform clones and inspects project files securely.
              </p>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius)', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Layers size={18} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>2. Analyze Codebase</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Tree-sitter AST parser extracts functions, classes, call chains, imports, and git commit history.
              </p>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius)', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <GitFork size={18} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>3. Explore Dependencies</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Visualize bidirectional call relationships in Cytoscape and simulate change impact scores.
              </p>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius)', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <MessageSquareCode size={18} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>4. Ask AI Questions</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Query repository architecture with natural language and receive grounded answers with file and line citations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Core Features ── */}
      <section id="core-features" style={{ padding: '4.5rem 1.5rem', maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Core Platform Features
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem' }}>
            Built specifically for software engineers navigating complex codebases.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="card card-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Activity size={20} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Repository Intelligence</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Comprehensive metrics on Python files, functions, classes, and call hierarchies, with hotspot file detection.
            </p>
          </div>

          <div className="card card-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Search size={20} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Semantic Code Search</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Hybrid BM25 keyword matching and FastEmbed vector search to locate symbols and implementation contexts rapidly.
            </p>
          </div>

          <div className="card card-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <MessageSquareCode size={20} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>AI Codebase Chat</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Ask architectural questions and receive verifiable answers cited with specific source files and line ranges.
            </p>
          </div>

          <div className="card card-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Network size={20} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Dependency Explorer</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Interactive Cytoscape graph supporting module-level and function-call views with certainty indicators.
            </p>
          </div>

          <div className="card card-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Zap size={20} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Impact Analysis</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Simulate modifying any method or class and view downstream callers, risk scores, and blast radius reasons.
            </p>
          </div>

          <div className="card card-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Flame size={20} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Hotspots and Architecture</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Pinpoint high-churn, high-connection files that represent the most critical architectural hotspots in the repo.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 3: System Workflow ── */}
      <section id="workflow" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '4.5rem 1.5rem' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            System Workflow
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '3rem' }}>
            How GitHub Knowledge Assistance processes code from ingestion to intelligent answers.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              textAlign: 'left',
            }}
          >
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius)', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                1
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Git Ingest and File Filtering</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Clones repository, excludes binary assets, and reads Python modules into memory.
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius)', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                2
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>AST Symbol Extraction & Call-Graph Construction</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Inspects syntax trees for function and class definitions, identifying callers and callees with certainty labels.
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius)', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                3
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Co-change History & Risk Scoring</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Evaluates git commit logs to discover which files historically change together and calculates hotspot scores.
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius)', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                4
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Semantic Retrieval and Grounded AI Answering</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Indexes chunks with FastEmbed and feeds relevant source lines to language models with verified citation badges.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Technology Overview ── */}
      <section id="tech-stack" style={{ padding: '4.5rem 1.5rem', maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Technology Stack
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem' }}>
            Proven developer tools and libraries powering the analysis pipeline.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.25rem' }}>FastAPI & Python 3.12</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>High-performance asynchronous backend and AST parsing service.</div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.25rem' }}>PostgreSQL 16 & pgvector</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Vector-enabled relational database for symbols, relations, and embeddings.</div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.25rem' }}>React 19 & TypeScript</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Modern component architecture with strict end-to-end type safety.</div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.25rem' }}>Cytoscape.js</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Interactive dependency graph rendering with physics-based layouts.</div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.25rem' }}>Monaco Editor</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>VS Code's code viewer with read-only syntax highlighting and line focus.</div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.25rem' }}>FastEmbed & LLM Adapter</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Local 384-dimensional vector embeddings with Gemini and Ollama adapters.</div>
          </div>
        </div>
      </section>

      {/* ── Section 5: FAQ Section ── */}
      <section id="faq" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '4.5rem 1.5rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem' }}>
              Everything you need to know about codebase analysis.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              {
                q: 'Which programming languages are supported?',
                a: 'The current engine specializes in Python repositories (Python 3.8 through 3.12), parsing abstract syntax trees for def and class blocks.',
              },
              {
                q: 'How does the system calculate change impact?',
                a: 'The impact engine combines static AST call-graph traversal (direct and transitive callers) with historical git co-change frequencies from repository commit logs.',
              },
              {
                q: 'What is the difference between Certain and Uncertain dependencies?',
                a: 'A Certain dependency is a statically resolved call directly pointing to a unique function. An Uncertain dependency is flagged when multiple functions across different files share the same name.',
              },
              {
                q: 'Are AI responses verified against real code?',
                a: 'Yes. Answers include verified source citation chips. If a referenced function cannot be confirmed in the repository AST, it is explicitly flagged as an unverified inference.',
              },
              {
                q: 'Can I test the platform without setting up Docker or PostgreSQL?',
                a: 'Yes. The frontend features a complete in-browser Mock Engine (VITE_USE_MOCKS=true) that allows exploring all 9 screens with realistic demo repositories.',
              },
            ].map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div key={faq.q} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    style={{
                      width: '100%',
                      padding: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                        color: 'var(--text-muted)',
                      }}
                    />
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 1.25rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)', padding: '3rem 2rem', marginTop: 'auto' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <BrandIcon size={24} />
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--accent)', letterSpacing: '-0.02em' }}>
              GitHub Knowledge Assistance
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms and Conditions</Link>
            <Link to="/login">Sign In</Link>
            <a
              href="https://github.com/dipak009156/gtihub-knowledge-assistance-impact"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>GitHub</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </footer>

      <DevMockPanel />
    </div>
  )
}
export default HomePage
