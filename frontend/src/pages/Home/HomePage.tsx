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
  Lightbulb,
  Sparkles,
  Link2,
  LogOut,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { addRepo, getDemoRepos, getRepo, getUserGithubRepos } from '../../api/client'
import type { DemoRepo, GitHubRepoItem, Repo } from '../../api/types'
import { BrandIcon } from '../../components/BrandIcon'
import { DevMockPanel } from '../../components/DevMockPanel'
import { ErrorBox } from '../../components/ErrorBox'
import { GithubIcon } from '../../components/GithubIcon'
import { StatusBadge } from '../../components/StatusBadge'
import { ThemeToggle } from '../../components/ThemeToggle'
import { useAuth } from '../../context/AuthContext'
import { validateGitHubUrl } from '../../lib/github'

const RECENT_REPOS_KEY = 'gka_recent_repo_ids'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()

  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const [demos, setDemos] = useState<DemoRepo[]>([])
  const [recentRepos, setRecentRepos] = useState<Repo[]>([])
  const [userRepos, setUserRepos] = useState<GitHubRepoItem[]>([])

  useEffect(() => {
    if (isAuthenticated) {
      getUserGithubRepos()
        .then((repos) => setUserRepos(repos || []))
        .catch(() => {})
    } else {
      setUserRepos([])
    }
  }, [isAuthenticated])

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
          borderBottom: '1px solid var(--glass-border)',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          boxShadow: 'var(--glass-shadow)',
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
            <a href="#faq" style={{ color: 'var(--text-muted)' }}>FAQ</a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'var(--surface-subtle)',
                  padding: '0.2rem 0.65rem 0.2rem 0.35rem',
                  borderRadius: 'var(--radius-bubble)',
                  border: '1px solid var(--border)',
                }}
              >
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>
                  @{user.username}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="btn btn-ghost btn-sm"
                title="Sign out"
                style={{ padding: '0.35rem 0.6rem', gap: '0.35rem' }}
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Sign Up
              </Link>
            </>
          )}
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

      {/* ── Hero Section Wrapper with Advanced Background & 3D Elements ── */}
      <div className="hero-canvas-wrapper">
        {/* Subtle Blueprint Dot Grid */}
        <div className="hero-dot-grid" />

        {/* Central Luminous Warm Radiant Accent Glow */}
        <div className="hero-radiant-glow" />

        {/* Flowing Topographic Contour Wave Lines SVG */}
        <svg className="hero-waves-svg" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="none">
          <path
            d="M-100 280 C 200 160, 450 360, 720 220 C 990 80, 1250 280, 1540 180"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeOpacity="0.14"
            fill="none"
          />
          <path
            d="M-80 340 C 220 220, 480 410, 720 290 C 980 150, 1220 340, 1560 240"
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeOpacity="0.25"
            fill="none"
          />
          <path
            d="M-50 420 C 260 300, 520 480, 740 370 C 1020 230, 1260 410, 1580 320"
            stroke="var(--accent)"
            strokeWidth="1"
            strokeOpacity="0.08"
            strokeDasharray="4 6"
            fill="none"
          />
        </svg>

        {/* Left 3D Floating Flank Graphic (Floating Code Window + 3D GitHub Octocat Token) */}
        <motion.div
          className="hero-flank-container hero-flank-left"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        >
          <div className="hero-3d-editor">
            {/* Editor Window Dots */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '0.625rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warn)' }} />
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ok)' }} />
            </div>

            {/* Syntax lines */}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', lineHeight: 1.6, color: '#94a3b8' }}>
              <div><span style={{ color: '#f43f5e' }}>def</span> <span style={{ color: '#60a5fa' }}>analyze</span>(repo):</div>
              <div style={{ paddingLeft: '0.75rem' }}><span style={{ color: '#cbd5e1' }}>ast = parse_tree(repo)</span></div>
              <div style={{ paddingLeft: '0.75rem' }}><span style={{ color: '#fbbf24' }}>graph</span> = build_impact(ast)</div>
              <div style={{ paddingLeft: '0.75rem' }}><span style={{ color: '#f43f5e' }}>return</span> <span style={{ color: '#34d399' }}>graph.summary</span>()</div>
            </div>

            {/* Overlapping 3D Circular GitHub Octocat Token Badge */}
            <div className="hero-octocat-token">
              <GithubIcon size={34} style={{ color: 'var(--text)' }} />
            </div>
          </div>
        </motion.div>

        {/* Right 3D Floating Flank Graphic (3D Code Badge + Isometric Cube) */}
        <motion.div
          className="hero-flank-container hero-flank-right"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut', delay: 0.5 }}
        >
          <div style={{ position: 'relative', width: '90px', height: '160px' }}>
            {/* 3D Code Badge < / > */}
            <div className="hero-3d-code-badge">
              &lt; / &gt;
            </div>

            {/* 3D Isometric Wireframe Cube */}
            <div className="hero-3d-cube" />
          </div>
        </motion.div>

        {/* ── Main Hero Content ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ maxWidth: '880px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 3 }}
        >
          {/* Top Pill Badge */}
          <div
            className="badge badge-neutral"
            style={{
              marginBottom: '1.25rem',
              display: 'inline-flex',
              padding: '0.4rem 0.9rem',
              gap: '0.5rem',
              borderRadius: 'var(--radius-bubble)',
              background: 'var(--glass-surface-subtle)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-specular)',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            <Code2 size={13} style={{ color: 'var(--accent)' }} />
            <span>Codebase Intelligence and Impact Analysis Platform</span>
          </div>

          {/* Two-Tone Headline (Second line in bold red accent) */}
          <h1
            style={{
              fontSize: '3.15rem',
              fontWeight: 800,
              lineHeight: 1.15,
              color: 'var(--text)',
              letterSpacing: '-0.03em',
              maxWidth: '820px',
              margin: '0 auto 1.25rem',
            }}
          >
            Understand Your Codebase.
            <br />
            <span style={{ color: 'var(--accent)' }}>Before You Change It.</span>
          </h1>

          {/* Subtitle */}
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

          {/* Repository Submission Card (Matching reference design) */}
          <div
            className="card"
            style={{
              maxWidth: '680px',
              margin: '0 auto 1.5rem',
              padding: '1.75rem',
              boxShadow: 'var(--glass-shadow-lg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '24px',
              textAlign: 'left',
              position: 'relative',
              zIndex: 3,
            }}
          >
            <form onSubmit={handleAnalyze}>
              <label
                htmlFor="repo-url-input"
                style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text)' }}
              >
                Connect GitHub Repository
              </label>
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                  <Link2
                    size={15}
                    style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
                  />
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
                    style={{ paddingLeft: '2.4rem', borderRadius: '12px' }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ minWidth: '160px', borderRadius: '12px', gap: '0.45rem' }}
                >
                  <span>{submitting ? 'Analyzing...' : 'Analyze Repository'}</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              {inputError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginTop: '0.625rem', fontWeight: 500 }}>
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
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Ready-made Examples:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {demos.map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenDemo(d.url)}
                    disabled={submitting}
                    style={{ borderRadius: 'var(--radius-bubble)' }}
                  >
                    {d.name}
                  </button>
                ))}
              </div>

              {recentRepos.length > 0 && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Recent Repositories:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {recentRepos.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/repos/${r.id}`)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: 'var(--radius-bubble)' }}
                      >
                        <span>{r.name}</span>
                        <StatusBadge status={r.status} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {userRepos.length > 0 && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <GithubIcon size={13} />
                    <span>Your GitHub Repositories:</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {userRepos.slice(0, 8).map((r) => (
                      <button
                        key={r.full_name}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenDemo(r.url)}
                        disabled={submitting}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: 'var(--radius-bubble)' }}
                      >
                        <span>{r.name}</span>
                        {r.is_private && <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>(private)</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3-Step Explainer Tagline (Centered under input card) */}
          <div
            style={{
              fontSize: '0.84rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
              marginBottom: '2rem',
            }}
          >
            <span>Pick a function. See what breaks if you change it.</span>
          </div>

          {/* 4 Floating Feature Pill Bubbles (Directly matching bottom of reference image) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.875rem' }}>
            <motion.button
              type="button"
              onClick={scrollToFeatures}
              whileHover={{ y: -3, scale: 1.03 }}
              className="hero-pill-bubble"
              style={{ cursor: 'pointer' }}
            >
              <span className="hero-pill-icon" style={{ background: 'rgba(54, 95, 145, 0.15)', color: 'var(--info)' }}>
                <GitFork size={15} />
              </span>
              <span>Explore Dependencies</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={scrollToFeatures}
              whileHover={{ y: -3, scale: 1.03 }}
              className="hero-pill-bubble"
              style={{ cursor: 'pointer' }}
            >
              <span className="hero-pill-icon" style={{ background: 'rgba(214, 166, 83, 0.15)', color: 'var(--warn)' }}>
                <Lightbulb size={15} />
              </span>
              <span>Understand Codebase</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={scrollToFeatures}
              whileHover={{ y: -3, scale: 1.03 }}
              className="hero-pill-bubble"
              style={{ cursor: 'pointer' }}
            >
              <span className="hero-pill-icon" style={{ background: 'rgba(223, 51, 51, 0.15)', color: 'var(--accent)' }}>
                <Sparkles size={15} />
              </span>
              <span>Get Smart Insights</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={scrollToFeatures}
              whileHover={{ y: -3, scale: 1.03 }}
              className="hero-pill-bubble"
              style={{ cursor: 'pointer' }}
            >
              <span className="hero-pill-icon" style={{ background: 'rgba(40, 122, 80, 0.15)', color: 'var(--ok)' }}>
                <Zap size={15} />
              </span>
              <span>Boost Productivity</span>
            </motion.button>
          </div>
        </motion.section>
      </div>

      {/* ── Interactive Product Preview ── */}
      <section className="blueprint-section" style={{ padding: '2rem 1.5rem 5rem', width: '100%' }}>
        <div className="blueprint-dot-grid" />
        <div className="blueprint-radiant-glow" style={{ top: '25%', opacity: 0.7 }} />

        {/* Contour Wave Lines */}
        <svg className="blueprint-waves-svg" viewBox="0 0 1440 500" fill="none" preserveAspectRatio="none">
          <path
            d="M-50 250 C 250 120, 520 380, 800 200 C 1080 20, 1300 260, 1520 180"
            stroke="var(--accent)"
            strokeWidth="1.2"
            strokeOpacity="0.12"
            fill="none"
          />
          <path
            d="M-80 340 C 220 200, 480 440, 780 290 C 1080 140, 1280 360, 1560 260"
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeOpacity="0.18"
            fill="none"
          />
        </svg>

        {/* 3D Floating Left Flank Accent */}
        <motion.div
          className="blueprint-flank-container blueprint-flank-left"
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
          style={{ top: '40%' }}
        >
          <div className="blueprint-3d-chip">
            <Network size={24} />
          </div>
        </motion.div>

        {/* 3D Floating Right Flank Accent */}
        <motion.div
          className="blueprint-flank-container blueprint-flank-right"
          animate={{ y: [0, 9, 0] }}
          transition={{ repeat: Infinity, duration: 6.5, ease: 'easeInOut' }}
          style={{ top: '45%' }}
        >
          <div className="blueprint-3d-cube" style={{ position: 'relative', top: 0, right: 0 }} />
        </motion.div>

        <div
          className="card"
          style={{
            maxWidth: '1080px',
            margin: '0 auto',
            padding: 0,
            overflow: 'hidden',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow-lg)',
            borderRadius: '24px',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Mock Window Topbar */}
          <div
            style={{
              padding: '0.85rem 1.25rem',
              background: 'var(--glass-surface-subtle)',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--glass-border-subtle)',
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
            <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--glass-surface)', padding: '3px', borderRadius: 'var(--radius-bubble)', border: '1px solid var(--glass-border-subtle)' }}>
              <button
                type="button"
                onClick={() => setPreviewTab('graph')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-bubble)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  background: previewTab === 'graph' ? 'var(--accent)' : 'transparent',
                  color: previewTab === 'graph' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Dependency Graph
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('impact')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-bubble)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  background: previewTab === 'impact' ? 'var(--accent)' : 'transparent',
                  color: previewTab === 'impact' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Impact Analysis
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('chat')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-bubble)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  background: previewTab === 'chat' ? 'var(--accent)' : 'transparent',
                  color: previewTab === 'chat' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                AI Assistant
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('code')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-bubble)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  background: previewTab === 'code' ? 'var(--accent)' : 'transparent',
                  color: previewTab === 'code' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Code Explorer
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div style={{ minHeight: '340px', background: 'var(--glass-surface)', color: 'var(--text)', padding: '1.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
            {previewTab === 'graph' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border-subtle)', paddingBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>Interactive Call Graph (Module View & Function Call View)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Solid = Certain | Dashed = Uncertain</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ background: 'var(--glass-bg)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: '0.4rem' }}>shop/views.py</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>POST /checkout (L28-62)</div>
                    <div style={{ marginTop: '0.625rem', color: 'var(--ok)', fontSize: '0.75rem', fontWeight: 600 }}>calls: validate_order, pay</div>
                  </div>
                  <div style={{ background: 'var(--glass-bg)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--accent)', boxShadow: '0 0 20px rgba(223, 51, 51, 0.15)' }}>
                    <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: '0.4rem' }}>shop/services.py</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>pay() (L45-85)</div>
                    <div style={{ marginTop: '0.625rem', color: 'var(--warn)', fontSize: '0.75rem', fontWeight: 600 }}>calls: calculate_total, charge</div>
                  </div>
                  <div style={{ background: 'var(--glass-bg)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: '0.4rem' }}>shop/models.py</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>calculate_total() (L55-78)</div>
                    <div style={{ marginTop: '0.625rem', color: 'var(--ok)', fontSize: '0.75rem', fontWeight: 600 }}>used by: pay, invoice</div>
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'impact' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border-subtle)', paddingBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Blast Radius: Modifying calculate_total (Depth: 2)</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>3 Potentially Affected Callers</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ background: 'var(--glass-bg)', padding: '0.875rem 1.25rem', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--glass-border)' }}>
                    <div>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>shop.services.pay</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.75rem' }}>Direct Caller (Depth 1)</span>
                    </div>
                    <span style={{ background: 'var(--accent)', color: '#fff', padding: '3px 10px', borderRadius: 'var(--radius-bubble)', fontSize: '0.75rem', fontWeight: 700 }}>Risk: 0.85</span>
                  </div>
                  <div style={{ background: 'var(--glass-bg)', padding: '0.875rem 1.25rem', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--glass-border)' }}>
                    <div>
                      <span style={{ color: 'var(--warn)', fontWeight: 700 }}>shop.views.checkout</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.75rem' }}>Transitive Caller (Depth 2)</span>
                    </div>
                    <span style={{ background: 'var(--warn)', color: '#fff', padding: '3px 10px', borderRadius: 'var(--radius-bubble)', fontSize: '0.75rem', fontWeight: 700 }}>Risk: 0.68</span>
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'chat' && (
              <div>
                <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border-subtle)', paddingBottom: '0.75rem', color: 'var(--text)', fontWeight: 700 }}>
                  AI Codebase Assistant - Verifiable Citations
                </div>
                <div style={{ background: 'var(--glass-bg)', padding: '1rem 1.25rem', borderRadius: '14px', marginBottom: '0.75rem', border: '1px solid var(--glass-border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>User:</span> Where is payment handled?
                </div>
                <div style={{ background: 'var(--glass-bg)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--glass-border)', borderLeft: '4px solid var(--accent)' }}>
                  <p style={{ color: 'var(--text)', lineHeight: 1.6, marginBottom: '0.875rem' }}>
                    Payments are handled by <code style={{ color: 'var(--accent)', fontWeight: 700 }}>charge_card</code> in <code style={{ color: 'var(--accent)', fontWeight: 700 }}>shop/payment.py</code>. It verifies card tokens and communicates with the gateway.
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)', padding: '3px 10px', borderRadius: 'var(--radius-bubble)', fontSize: '0.75rem', fontWeight: 600 }}>
                    <CheckCircle2 size={13} />
                    <span>Citation: shop/payment.py:8-29 (Verified AST)</span>
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'code' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border-subtle)', paddingBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 700 }}>Monaco Editor - Read-only Syntax Highlighting</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>shop/payment.py:8-29</span>
                </div>
                <pre style={{ margin: 0, color: 'var(--text)', lineHeight: 1.65, background: 'var(--glass-bg)', padding: '1rem', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
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
      <section id="how-it-works" className="blueprint-section" style={{ borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', padding: '5.5rem 1.5rem', background: 'var(--glass-surface-subtle)' }}>
        <div className="blueprint-dot-grid" />
        <div className="blueprint-radiant-glow" style={{ top: '20%', opacity: 0.6 }} />

        {/* Contour Wave Lines */}
        <svg className="blueprint-waves-svg" viewBox="0 0 1440 500" fill="none" preserveAspectRatio="none">
          <path
            d="M-50 200 C 250 80, 500 320, 800 160 C 1100 0, 1300 240, 1500 120"
            stroke="var(--accent)"
            strokeWidth="1.2"
            strokeOpacity="0.12"
            fill="none"
          />
          <path
            d="M-80 280 C 200 160, 480 360, 780 240 C 1080 120, 1280 320, 1550 200"
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeOpacity="0.2"
            fill="none"
          />
        </svg>

        {/* 3D Floating Left Flank Accent */}
        <motion.div
          className="blueprint-flank-container blueprint-flank-left"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          style={{ top: '50%' }}
        >
          <div className="blueprint-3d-chip">
            <Layers size={24} />
          </div>
        </motion.div>

        {/* 3D Floating Right Flank Accent */}
        <motion.div
          className="blueprint-flank-container blueprint-flank-right"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
          style={{ top: '55%' }}
        >
          <div className="blueprint-3d-code-badge" style={{ width: '56px', height: '56px', fontSize: '1.1rem' }}>
            {'</>'}
          </div>
        </motion.div>

        <div style={{ maxWidth: '1080px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div className="badge badge-accent" style={{ marginBottom: '0.85rem' }}>
              Architecture Pipeline
            </div>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              How It Works
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '0.5rem', maxWidth: '620px', margin: '0.5rem auto 0' }}>
              From repository ingestion to actionable dependency intelligence in four steps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            <motion.div
              whileHover={{ y: -4 }}
              className="card card-hover"
              style={{
                padding: '1.75rem',
                borderRadius: '22px',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div className="bubble-icon-circle" style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}>
                  <Terminal size={20} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: 'var(--radius-bubble)' }}>
                  STEP 01
                </span>
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>1. Connect Repository</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Paste any public GitHub repository link. The platform clones and inspects project files securely.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="card card-hover"
              style={{
                padding: '1.75rem',
                borderRadius: '22px',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div className="bubble-icon-circle" style={{ color: 'var(--warn)', background: 'rgba(214, 166, 83, 0.12)' }}>
                  <Layers size={20} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--warn)', background: 'rgba(214, 166, 83, 0.12)', padding: '2px 8px', borderRadius: 'var(--radius-bubble)' }}>
                  STEP 02
                </span>
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>2. Analyze Codebase</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Tree-sitter AST parser extracts functions, classes, call chains, imports, and git commit history.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="card card-hover"
              style={{
                padding: '1.75rem',
                borderRadius: '22px',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div className="bubble-icon-circle" style={{ color: 'var(--info)', background: 'rgba(54, 95, 145, 0.12)' }}>
                  <GitFork size={20} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--info)', background: 'rgba(54, 95, 145, 0.12)', padding: '2px 8px', borderRadius: 'var(--radius-bubble)' }}>
                  STEP 03
                </span>
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>3. Explore Dependencies</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Visualize bidirectional call relationships in Cytoscape and simulate change impact scores.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="card card-hover"
              style={{
                padding: '1.75rem',
                borderRadius: '22px',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div className="bubble-icon-circle" style={{ color: 'var(--ok)', background: 'rgba(40, 122, 80, 0.12)' }}>
                  <MessageSquareCode size={20} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--ok)', background: 'rgba(40, 122, 80, 0.12)', padding: '2px 8px', borderRadius: 'var(--radius-bubble)' }}>
                  STEP 04
                </span>
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>4. Ask AI Questions</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Query repository architecture with natural language and receive grounded answers with file and line citations.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Core Features ── */}
      <section id="core-features" className="blueprint-section" style={{ padding: '5.5rem 1.5rem', width: '100%' }}>
        <div className="blueprint-dot-grid" />
        <div className="blueprint-radiant-glow" style={{ top: '30%', opacity: 0.65 }} />

        {/* Contour Wave Lines */}
        <svg className="blueprint-waves-svg" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="none">
          <path
            d="M-60 300 C 280 180, 540 420, 820 260 C 1100 100, 1320 320, 1540 220"
            stroke="var(--accent)"
            strokeWidth="1.2"
            strokeOpacity="0.1"
            fill="none"
          />
          <path
            d="M-90 400 C 240 260, 500 500, 800 350 C 1100 200, 1300 420, 1580 320"
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeOpacity="0.18"
            strokeDasharray="4 6"
            fill="none"
          />
        </svg>

        {/* 3D Floating Left Flank Accent */}
        <motion.div
          className="blueprint-flank-container blueprint-flank-left"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
          style={{ top: '48%' }}
        >
          <div className="blueprint-3d-cube" style={{ position: 'relative', top: 0, left: 0 }} />
        </motion.div>

        {/* 3D Floating Right Flank Accent */}
        <motion.div
          className="blueprint-flank-container blueprint-flank-right"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
          style={{ top: '52%' }}
        >
          <div className="blueprint-octocat-token" style={{ position: 'relative', bottom: 0, right: 0 }}>
            <GithubIcon size={32} />
          </div>
        </motion.div>

        <div style={{ maxWidth: '1080px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div className="badge badge-accent" style={{ marginBottom: '0.85rem' }}>
              Engineered Capabilities
            </div>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Core Platform Features
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '0.5rem', maxWidth: '600px', margin: '0.5rem auto 0' }}>
              Built specifically for software engineers navigating complex codebases.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <motion.div
              whileHover={{ y: -4 }}
              className="card card-hover"
              style={{
                padding: '1.75rem',
                borderRadius: '22px',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span className="bubble-icon-circle" style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}>
                  <Activity size={22} />
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Repository Intelligence</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Comprehensive metrics on Python files, functions, classes, and call hierarchies, with hotspot file detection.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="card card-hover"
              style={{
                padding: '1.75rem',
                borderRadius: '22px',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span className="bubble-icon-circle" style={{ color: 'var(--warn)', background: 'rgba(214, 166, 83, 0.12)' }}>
                  <Search size={22} />
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Semantic Code Search</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Hybrid BM25 keyword matching and FastEmbed vector search to locate symbols and implementation contexts rapidly.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="card card-hover"
              style={{
                padding: '1.75rem',
                borderRadius: '22px',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span className="bubble-icon-circle" style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}>
                  <MessageSquareCode size={22} />
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>AI Codebase Chat</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Ask architectural questions and receive verifiable answers cited with specific source files and line ranges.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="card card-hover"
              style={{
                padding: '1.75rem',
                borderRadius: '22px',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span className="bubble-icon-circle" style={{ color: 'var(--info)', background: 'rgba(54, 95, 145, 0.12)' }}>
                  <Network size={22} />
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Dependency Explorer</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Interactive Cytoscape graph supporting module-level and function-call views with certainty indicators.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="card card-hover"
              style={{
                padding: '1.75rem',
                borderRadius: '22px',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span className="bubble-icon-circle" style={{ color: 'var(--ok)', background: 'rgba(40, 122, 80, 0.12)' }}>
                  <Zap size={22} />
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Impact Analysis</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Simulate modifying any method or class and view downstream callers, risk scores, and blast radius reasons.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="card card-hover"
              style={{
                padding: '1.75rem',
                borderRadius: '22px',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span className="bubble-icon-circle" style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}>
                  <Flame size={22} />
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Hotspots and Architecture</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Pinpoint high-churn, high-connection files that represent the most critical architectural hotspots in the repo.
              </p>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ── Section 3: FAQ Section ── */}
      <section id="faq" className="blueprint-section" style={{ borderTop: '1px solid var(--glass-border)', padding: '5.5rem 1.5rem', background: 'var(--glass-surface-subtle)' }}>
        <div className="blueprint-dot-grid" />
        <div className="blueprint-radiant-glow" style={{ top: '25%', opacity: 0.6 }} />

        {/* Contour Wave Lines */}
        <svg className="blueprint-waves-svg" viewBox="0 0 1440 500" fill="none" preserveAspectRatio="none">
          <path
            d="M-50 200 C 250 80, 500 320, 800 160 C 1100 0, 1300 240, 1500 120"
            stroke="var(--accent)"
            strokeWidth="1.2"
            strokeOpacity="0.12"
            fill="none"
          />
        </svg>

        <div style={{ maxWidth: '820px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div className="badge badge-accent" style={{ marginBottom: '0.85rem' }}>
              Common Questions
            </div>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '0.5rem' }}>
              Everything you need to know about codebase analysis.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
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
                <div
                  key={faq.q}
                  className="card card-hover"
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    borderRadius: '18px',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'var(--glass-blur)',
                    WebkitBackdropFilter: 'var(--glass-blur)',
                    border: isOpen ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
                    boxShadow: isOpen ? '0 0 20px rgba(223, 51, 51, 0.15)' : 'var(--glass-shadow)',
                    transition: 'all 0.25s ease',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    style={{
                      width: '100%',
                      padding: '1.35rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: isOpen ? 'var(--accent)' : 'var(--text)',
                      cursor: 'pointer',
                      transition: 'color 0.2s ease',
                    }}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                        color: isOpen ? 'var(--accent)' : 'var(--text-muted)',
                      }}
                    />
                  </button>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ padding: '0 1.5rem 1.35rem', fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.65 }}
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '3rem 2rem', marginTop: 'auto' }}>
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
