import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, AlertCircle, ShieldCheck, GitBranch, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { BrandIcon } from '../../components/BrandIcon'
import { GithubIcon } from '../../components/GithubIcon'
import { GitHubLoginModal } from '../../components/GitHubLoginModal'
import { ThemeToggle } from '../../components/ThemeToggle'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading] = useState(false)
  const [showGithubModal, setShowGithubModal] = useState(false)
  const [error] = useState<string | null>(null)

  const handleGitHubOAuth = () => {
    setShowGithubModal(true)
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
            <div><span style={{ color: '#f43f5e' }}>auth</span>: <span style={{ color: '#60a5fa' }}>github_oauth</span>()</div>
            <div style={{ paddingLeft: '0.75rem' }}><span style={{ color: '#10b981' }}>✓ github token verified</span></div>
            <div><span style={{ color: '#cbd5e1' }}>load_dashboard()</span></div>
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
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Sign in to your account
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.5 }}>
            Connect your GitHub account to access indexed repositories, blast radius analysis, and code intelligence.
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

          {/* Primary GitHub Sign-In Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGitHubOAuth}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem 1.25rem',
              fontSize: '0.9375rem',
              fontWeight: 600,
              justifyContent: 'center',
              borderRadius: 'var(--radius-bubble)',
              gap: '0.625rem',
              boxShadow: '0 4px 14px rgba(223, 51, 51, 0.28)',
            }}
          >
            <GithubIcon size={18} />
            <span>Continue with GitHub</span>
            <ArrowRight size={16} />
          </button>

          {/* Feature Highlights List */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={14} />
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <strong>Zero Password Overhead</strong> &mdash; Authenticate securely via GitHub OAuth or PAT.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <GitBranch size={14} />
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <strong>Public & Private Repos</strong> &mdash; Works with public repos or private tokens.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Zap size={14} />
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <strong>Instant AST Intelligence</strong> &mdash; Deep call graph analysis and commit blast radius.
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          First time here?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Sign up with GitHub
          </Link>
        </div>
      </div>

      <GitHubLoginModal
        isOpen={showGithubModal}
        onClose={() => setShowGithubModal(false)}
        onSuccess={() => navigate('/')}
        mode="login"
      />
    </div>
  )
}

export default LoginPage
