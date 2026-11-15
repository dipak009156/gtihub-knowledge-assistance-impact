import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { BrandIcon } from '../../components/BrandIcon'
import { ThemeToggle } from '../../components/ThemeToggle'

export const TermsPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
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

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div className="badge badge-neutral" style={{ marginBottom: '0.75rem' }}>
            Legal Documentation
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Terms and Conditions
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            Effective: November 14, 2026. Please review these operational terms for using the platform.
          </p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', lineHeight: 1.65 }}>
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--ok)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>1. Acceptable Use</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              The GitHub Knowledge Assistance service is provided for architectural analysis, dependency exploration,
              and code intelligence. Users agree not to submit malicious repositories or attempt denial-of-service
              attacks against indexing and parsing servers.
            </p>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertCircle size={18} style={{ color: 'var(--warn)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>2. Analysis Accuracy and Disclaimers</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              Impact calculations and dependency graphs are produced using AST analysis, static call graphs, and
              historical co-change records. Dynamic dispatch, runtime reflections, or external network calls may introduce
              uncertainties, which are explicitly flagged with Uncertainty indicators in the interface.
              Results should be validated before deploying critical production changes.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>3. Intellectual Property</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              All rights in user-submitted repositories remain with their respective copyright holders.
              The parser, indexing engines, and visualization UI are protected open-source and proprietary software.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
export default TermsPage

