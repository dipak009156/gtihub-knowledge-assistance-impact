import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Lock, Eye, FileText } from 'lucide-react'
import { BrandIcon } from '../../components/BrandIcon'
import { ThemeToggle } from '../../components/ThemeToggle'

export const PrivacyPage: React.FC = () => {
  return (
    <div className="blueprint-section" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', position: 'relative' }}>
      {/* Subtle Blueprint Dot Grid */}
      <div className="blueprint-dot-grid" />

      {/* Central Radiant Warm Accent Glow */}
      <div className="blueprint-radiant-glow" style={{ top: '15%', opacity: 0.55 }} />

      {/* Flowing Wave Contours SVG */}
      <svg className="blueprint-waves-svg" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="none">
        <path
          d="M-50 200 C 250 80, 520 320, 800 160 C 1080 0, 1300 240, 1520 140"
          stroke="var(--accent)"
          strokeWidth="1.2"
          strokeOpacity="0.1"
          fill="none"
        />
        <path
          d="M-80 300 C 220 160, 480 380, 780 240 C 1080 100, 1280 320, 1560 200"
          stroke="var(--border-strong)"
          strokeWidth="1"
          strokeOpacity="0.16"
          fill="none"
        />
      </svg>

      <header
        style={{
          borderBottom: '1px solid var(--glass-border)',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          boxShadow: 'var(--glass-shadow)',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Link to="/" className="btn btn-ghost btn-sm" style={{ gap: '0.4rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--accent)' }}>
            <BrandIcon size={22} />
            <span>GitHub Knowledge Assistance</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '3.5rem 1.5rem', position: 'relative', zIndex: 3 }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div className="badge badge-neutral" style={{ marginBottom: '0.75rem' }}>
            Legal Documentation
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            Last revised: November 14, 2026. This policy describes how repository data is processed.
          </p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', lineHeight: 1.65, borderRadius: '24px', boxShadow: 'var(--glass-shadow-lg)', padding: '2.5rem' }}>
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Lock size={18} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>1. Repository Data Processing</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              GitHub Knowledge Assistance only accesses public GitHub repositories submitted for analysis.
              Source code files are cloned temporarily into isolated sandbox environments for syntax tree extraction,
              call-graph generation, and semantic index creation. We do not sell or monetize your source code.
            </p>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Eye size={18} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>2. Information We Collect</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              We collect information provided directly by developers, including public GitHub repository URLs,
              analysis configurations, query strings, and session preferences stored in local browser storage.
              Analysis metadata (symbol names, line numbers, call graphs) is cached to provide instant dependency lookups.
            </p>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FileText size={18} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>3. AI and Model Interactions</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              When asking questions via the AI Codebase Assistant, relevant code chunks are retrieved using local
              embeddings and sent to configured language model adapters (Gemini or Ollama) strictly to generate
              grounded answers with source citations. User code is not used for generalized model training.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>4. Data Retention and Control</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              Developers may clear local storage session records or request deletion of cloned repositories
              at any time. Cloned workspace clones expire automatically after ingestion and graph construction.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
export default PrivacyPage

