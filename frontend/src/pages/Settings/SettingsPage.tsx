import React, { useState } from 'react'
import { Settings, Sliders, Database, CheckCircle2, Save, Sun, Moon, Monitor } from 'lucide-react'
import { GithubIcon } from '../../components/GithubIcon'
import { useTheme } from '../../theme/ThemeContext'

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const [maxDepth, setMaxDepth] = useState(2)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Settings size={22} style={{ color: 'var(--accent)' }} />
          <span>Workspace Settings</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Configure repository analysis preferences, model adapters, and display options.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Appearance & Theme */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Monitor size={18} style={{ color: 'var(--accent)' }} />
                <span>Appearance & Theme</span>
              </div>
              <div className="card-subtitle">Customize interface color scheme and readability.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTheme('light')}
              style={{ flex: 1, justifyContent: 'center', gap: '0.5rem' }}
            >
              <Sun size={15} />
              <span>Light Mode</span>
            </button>
            <button
              type="button"
              className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTheme('dark')}
              style={{ flex: 1, justifyContent: 'center', gap: '0.5rem' }}
            >
              <Moon size={15} />
              <span>Dark Mode</span>
            </button>
            <button
              type="button"
              className={`btn ${theme === 'system' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTheme('system')}
              style={{ flex: 1, justifyContent: 'center', gap: '0.5rem' }}
            >
              <Monitor size={15} />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Analysis Preferences */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} style={{ color: 'var(--accent)' }} />
                <span>Impact Analysis Engine</span>
              </div>
              <div className="card-subtitle">Default parameters for call graph blast radius calculation.</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Default Traversal Depth ({maxDepth} hops)
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                <span>1 hop (Direct callers)</span>
                <span>3 hops</span>
                <span>5 hops (Deep transitive)</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Strict AST Grounding</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Flag dynamic method calls as Uncertain when multiple symbols share the same identifier.
                </div>
              </div>
              <span className="badge badge-success">Enforced</span>
            </div>
          </div>
        </div>

        {/* GitHub Connection */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GithubIcon size={18} />
                <span>GitHub Integration</span>
              </div>
              <div className="card-subtitle">Repository ingestion and public clone access.</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GithubIcon size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Public Repository Access</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Git clone over HTTPS enabled for public open-source projects.
                </div>
              </div>
            </div>
            <span className="badge badge-success">
              <CheckCircle2 size={12} />
              <span>Connected</span>
            </span>
          </div>
        </div>

        {/* Database & Storage */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={18} style={{ color: 'var(--accent)' }} />
                <span>Database and Vector Index</span>
              </div>
              <div className="card-subtitle">Storage backend for AST nodes and FastEmbed vector search.</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Relational & Graph Storage</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>PostgreSQL 16 + pgvector</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Embedding Dimension</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>384 (FastEmbed BAAI/bge-small-en-v1.5)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>LLM Grounding Mode</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Active (Gemini / Ollama)</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            <Save size={15} />
            <span>{saved ? 'Preferences Saved' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
export default SettingsPage
