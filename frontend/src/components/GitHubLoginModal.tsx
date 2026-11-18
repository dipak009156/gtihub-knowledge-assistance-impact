import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Key, AtSign, ArrowRight, AlertCircle, CheckCircle2, Shield, ExternalLink } from 'lucide-react'
import { GithubIcon } from './GithubIcon'
import { useAuth } from '../context/AuthContext'

interface GitHubLoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  mode?: 'signup' | 'login'
}

export const GitHubLoginModal: React.FC<GitHubLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode = 'signup',
}) => {
  const { loginWithGitHubOAuth, loginWithUsername, loginWithToken } = useAuth()
  const [tab, setTab] = useState<'username' | 'token'>('username')
  const [usernameInput, setUsernameInput] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleOAuthRedirect = async () => {
    setLoading(true)
    setError(null)
    try {
      const config = await loginWithGitHubOAuth()
      if (config.configured && config.url) {
        window.location.href = config.url
      } else {
        setError(
          'GitHub OAuth App client credentials are not yet set in .env. You can connect instantly below using your GitHub username or token!'
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not initialize GitHub OAuth'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUser = usernameInput.trim().replace(/^https?:\/\/github\.com\//, '').replace(/^@/, '')
    if (!cleanUser) {
      setError('Please enter your GitHub username.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const user = await loginWithUsername(cleanUser)
      setSuccessMsg(`Welcome, ${user.name || user.username}! GitHub account linked successfully.`)
      setTimeout(() => {
        onSuccess()
      }, 700)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not verify GitHub username.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanToken = tokenInput.trim()
    if (!cleanToken) {
      setError('Please enter your GitHub Personal Access Token.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const user = await loginWithToken(cleanToken)
      setSuccessMsg(`Authenticated as ${user.name || user.username} with private repo access!`)
      setTimeout(() => {
        onSuccess()
      }, 700)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired GitHub token.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !loading) onClose()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="card"
          style={{
            width: '100%',
            maxWidth: '460px',
            borderRadius: '24px',
            padding: '2rem',
            position: 'relative',
            boxShadow: 'var(--glass-shadow-lg)',
            border: '1px solid var(--border-strong)',
            background: 'var(--surface)',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-subtle)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '50%',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>

          {/* Modal Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                marginBottom: '0.75rem',
              }}
            >
              <GithubIcon size={26} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              {mode === 'signup' ? 'Connect GitHub Account' : 'Sign in with GitHub'}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Link your developer identity to analyze codebases and blast radiuses.
            </p>
          </div>

          {/* Error / Success Notices */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius)',
                padding: '0.75rem',
                color: 'var(--danger)',
                fontSize: '0.8125rem',
                marginBottom: '1rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius)',
                padding: '0.75rem',
                color: 'var(--ok)',
                fontSize: '0.8125rem',
                marginBottom: '1rem',
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 600 }}>{successMsg}</span>
            </div>
          )}

          {/* Option 1: Standard OAuth Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleOAuthRedirect}
            disabled={loading}
            style={{ width: '100%', marginBottom: '1.25rem', justifyContent: 'center', gap: '0.5rem' }}
          >
            <GithubIcon size={16} />
            <span>Authorize via GitHub OAuth</span>
            <ExternalLink size={14} style={{ opacity: 0.6 }} />
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
            <span style={{ padding: '0 0.75rem' }}>Direct Instant Connect</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Subtabs for Username vs Token */}
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-subtle)',
              padding: '3px',
              borderRadius: 'var(--radius)',
              marginBottom: '1.25rem',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setTab('username')
                setError(null)
              }}
              className="btn btn-sm"
              style={{
                flex: 1,
                justifyContent: 'center',
                backgroundColor: tab === 'username' ? 'var(--surface)' : 'transparent',
                color: tab === 'username' ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: tab === 'username' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: tab === 'username' ? 600 : 400,
                border: 'none',
              }}
            >
              <AtSign size={14} />
              <span>Username</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('token')
                setError(null)
              }}
              className="btn btn-sm"
              style={{
                flex: 1,
                justifyContent: 'center',
                backgroundColor: tab === 'token' ? 'var(--surface)' : 'transparent',
                color: tab === 'token' ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: tab === 'token' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: tab === 'token' ? 600 : 400,
                border: 'none',
              }}
            >
              <Key size={14} />
              <span>Token (Private Repos)</span>
            </button>
          </div>

          {/* Username Form */}
          {tab === 'username' && (
            <form onSubmit={handleUsernameSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="gh-username"
                  style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}
                >
                  GitHub Username or Profile URL
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="gh-username"
                    type="text"
                    className="input"
                    placeholder="e.g. dipak009156"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Verifies your live GitHub profile picture, public repositories, and activity.
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !usernameInput.trim()}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>{loading ? 'Verifying GitHub...' : 'Connect GitHub Account'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* Token Form */}
          {tab === 'token' && (
            <form onSubmit={handleTokenSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label
                    htmlFor="gh-token"
                    style={{ fontSize: '0.8125rem', fontWeight: 600 }}
                  >
                    Personal Access Token
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.75rem', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    <span>Generate token</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
                <input
                  id="gh-token"
                  type="password"
                  className="input"
                  placeholder="ghp_••••••••••••••••••••••••••••••••"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Shield size={12} style={{ color: 'var(--ok)' }} />
                  <span>Enables cloning private repositories and deeper graph analysis.</span>
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !tokenInput.trim()}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>{loading ? 'Authenticating...' : 'Authenticate with Token'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
export default GitHubLoginModal
