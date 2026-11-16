import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { BrandIcon } from '../../components/BrandIcon'
import { GithubIcon } from '../../components/GithubIcon'
import { ThemeToggle } from '../../components/ThemeToggle'

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) {
      setError('Please fill in all registration fields.')
      return
    }

    setLoading(true)
    setError(null)
    setTimeout(() => {
      setLoading(false)
      navigate('/')
    }, 600)
  }

  const handleGitHubOAuth = () => {
    setOauthLoading(true)
    setError(null)
    setTimeout(() => {
      setOauthLoading(false)
      navigate('/')
    }, 700)
  }

  return (
    <div
      className="blueprint-section"
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        position: 'relative',
      }}
    >
      {/* Subtle Blueprint Dot Grid */}
      <div className="blueprint-dot-grid" />

      {/* Central Radiant Warm Accent Glow */}
      <div className="blueprint-radiant-glow" style={{ top: '25%', opacity: 0.65 }} />

      {/* Flowing Wave Contours SVG */}
      <svg className="blueprint-waves-svg" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="none">
        <path
          d="M-50 220 C 250 100, 520 340, 800 180 C 1080 20, 1300 260, 1520 160"
          stroke="var(--accent)"
          strokeWidth="1.2"
          strokeOpacity="0.12"
          fill="none"
        />
        <path
          d="M-80 320 C 220 180, 480 400, 780 260 C 1080 120, 1280 340, 1560 220"
          stroke="var(--border-strong)"
          strokeWidth="1"
          strokeOpacity="0.18"
          fill="none"
        />
      </svg>

      {/* Left 3D Floating Code Window */}
      <motion.div
        className="blueprint-flank-container blueprint-flank-left"
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        style={{ left: '5%' }}
      >
        <div className="blueprint-3d-editor">
          <div style={{ display: 'flex', gap: '5px', marginBottom: '0.625rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warn)' }} />
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ok)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', lineHeight: 1.6, color: '#94a3b8' }}>
            <div><span style={{ color: '#f43f5e' }}>developer</span>: <span style={{ color: '#60a5fa' }}>new_workspace</span>()</div>
            <div style={{ paddingLeft: '0.75rem' }}><span style={{ color: '#10b981' }}>✓ profile created</span></div>
            <div><span style={{ color: '#cbd5e1' }}>connect_repos()</span></div>
          </div>
        </div>
      </motion.div>

      {/* Right 3D Floating Token */}
      <motion.div
        className="blueprint-flank-container blueprint-flank-right"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
        style={{ right: '5%' }}
      >
        <div style={{ position: 'relative' }}>
          <div className="blueprint-3d-code-badge">
            {'</>'}
          </div>
          <div className="blueprint-octocat-token" style={{ position: 'absolute', bottom: '-20px', left: '-30px' }}>
            <GithubIcon size={34} />
          </div>
          <div className="blueprint-3d-cube" style={{ top: '80px', right: '-15px' }} />
        </div>
      </motion.div>

      <div style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', zIndex: 10 }}>
        <ThemeToggle />
      </div>

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 3 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.625rem',
              marginBottom: '1rem',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              background: 'var(--glass-surface-subtle)',
              border: '1px solid var(--glass-border-subtle)',
              borderRadius: 'var(--radius-bubble)',
              boxShadow: 'var(--glass-specular)',
            }}
          >
            <BrandIcon size={26} />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
              GitHub Knowledge Assistance
            </span>
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Create developer account
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Start analyzing codebases and exploring dependency graphs.
          </p>
        </div>

        <div className="card" style={{ padding: '2rem', borderRadius: '24px', boxShadow: 'var(--glass-shadow-lg)' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--danger-bg)',
                borderColor: 'var(--danger-border)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: 'var(--radius)',
                padding: '0.75rem',
                color: 'var(--danger)',
                fontSize: '0.8125rem',
                marginBottom: '1.25rem',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGitHubOAuth}
            disabled={oauthLoading || loading}
            style={{ width: '100%', marginBottom: '1.25rem', justifyContent: 'center' }}
          >
            <GithubIcon size={16} />
            <span>{oauthLoading ? 'Connecting to GitHub...' : 'Sign up with GitHub'}</span>
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.25rem 0',
              color: 'var(--text-subtle)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ padding: '0 0.75rem' }}>Or register with email</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label
                htmlFor="name"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                className="input"
                placeholder="Ada Lovelace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="reg-email"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}
              >
                Work Email
              </label>
              <input
                id="reg-email"
                type="email"
                className="input"
                placeholder="developer@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="reg-password"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}
              >
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                className="input"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}
            >
              <span>{loading ? 'Creating Account...' : 'Get Started'}</span>
              <ArrowRight size={15} />
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
export default RegisterPage
