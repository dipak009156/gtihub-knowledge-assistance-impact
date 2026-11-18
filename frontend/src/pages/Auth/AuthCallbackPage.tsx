import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { loginWithGithubCode } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { BrandIcon } from '../../components/BrandIcon'
import { GithubIcon } from '../../components/GithubIcon'

export const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLogin, setUserLogin] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error_description') || searchParams.get('error')

    if (errorParam) {
      setError(errorParam)
      setLoading(false)
      return
    }

    if (!code) {
      setError('Missing authorization code from GitHub callback.')
      setLoading(false)
      return
    }

    const exchangeCode = async () => {
      try {
        const res = await loginWithGithubCode(code)
        setSession(res.user, res.token)
        setUserLogin(res.user.username)
        setLoading(false)
        setTimeout(() => {
          navigate('/')
        }, 1200)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to complete GitHub authentication.'
        setError(msg)
        setLoading(false)
      }
    }

    exchangeCode()
  }, [searchParams, navigate, setSession])

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
      }}
    >
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem', textAlign: 'center', borderRadius: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <BrandIcon size={36} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>
          GitHub Authentication
        </h1>

        {loading && (
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <span className="spinner" style={{ width: '32px', height: '32px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Finalizing handshake with GitHub and creating your developer session...
            </p>
          </div>
        )}

        {!loading && !error && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <CheckCircle2 size={24} />
              <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                Welcome, {userLogin}!
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Your GitHub account is verified. Redirecting to workspace...
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <span>Go to Dashboard</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius)',
                padding: '0.875rem',
                color: 'var(--danger)',
                fontSize: '0.8125rem',
                marginBottom: '1.5rem',
                textAlign: 'left',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link to="/login" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                <GithubIcon size={16} />
                <span>Try Again</span>
              </Link>
              <Link to="/" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default AuthCallbackPage
