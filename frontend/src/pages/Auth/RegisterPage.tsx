import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, AlertCircle } from 'lucide-react'
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
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.5rem' }}>
        <ThemeToggle />
      </div>

      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem', textDecoration: 'none' }}>
            <BrandIcon size={30} />
            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
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

        <div className="card" style={{ padding: '1.75rem' }}>
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
