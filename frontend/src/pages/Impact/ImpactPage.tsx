import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getImpact, getSymbols } from '../../api/client'
import type { Impact, Symbol } from '../../api/types'
import { CodeLink } from '../../components/CodeLink'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBox } from '../../components/ErrorBox'
import { LevelBadge } from '../../components/LevelBadge'
import { LoadingBox } from '../../components/LoadingBox'

export const ImpactPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const repoId = Number(id)
  const location = useLocation()
  const navigate = useNavigate()

  // URL Query params
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  )
  const symbolIdParam = searchParams.get('symbol_id')
    ? Number(searchParams.get('symbol_id'))
    : undefined
  const depthParam = searchParams.get('depth')
    ? Number(searchParams.get('depth'))
    : 2

  // States
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Symbol[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const [depth, setDepth] = useState<number>(depthParam)
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null)

  const [impactData, setImpactData] = useState<Impact | null>(null)
  const [loadingImpact, setLoadingImpact] = useState(false)
  const [impactError, setImpactError] = useState<string | null>(null)

  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  // Search symbols (API 7)
  useEffect(() => {
    if (!repoId || !searchTerm.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const list = await getSymbols(repoId, searchTerm.trim(), 10)
        setSearchResults(list || [])
        setShowDropdown(true)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [repoId, searchTerm])

  // Sync initial symbol if symbol_id in URL
  useEffect(() => {
    if (!repoId || !symbolIdParam) return

    getSymbols(repoId)
      .then((symbols) => {
        const found = symbols.find((s) => s.id === symbolIdParam)
        if (found) {
          setSelectedSymbol(found)
          setSearchTerm(found.name)
        }
      })
      .catch(() => {})
  }, [repoId, symbolIdParam])

  // Fetch impact analysis (API 10)
  const runImpactAnalysis = async (symId?: number, d?: number) => {
    const targetId = symId ?? selectedSymbol?.id
    if (!repoId || !targetId) return

    const targetDepth = d ?? depth
    setLoadingImpact(true)
    setImpactError(null)

    // Sync URL query params
    navigate(
      `/repos/${repoId}/impact?symbol_id=${targetId}&depth=${targetDepth}`,
      { replace: true }
    )

    try {
      const data = await getImpact(repoId, targetId, targetDepth)
      setImpactData(data)
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setImpactError(apiErr.message || 'Could not calculate impact analysis.')
    } finally {
      setLoadingImpact(false)
    }
  }

  // Trigger analysis when symbolIdParam changes
  useEffect(() => {
    if (symbolIdParam) {
      runImpactAnalysis(symbolIdParam, depthParam)
    }
  }, [symbolIdParam, depthParam])

  const handleSelectSymbol = (sym: Symbol) => {
    setSelectedSymbol(sym)
    setSearchTerm(sym.name)
    setShowDropdown(false)
    runImpactAnalysis(sym.id, depth)
  }

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!impactData || !impactData.items) return []
    if (activeFilter === 'all') return impactData.items
    return impactData.items.filter((item) => item.level === activeFilter)
  }, [impactData, activeFilter])

  // Summary counts
  const summary = useMemo(() => {
    if (!impactData || !impactData.items) {
      return { total: 0, high: 0, medium: 0, low: 0 }
    }
    const items = impactData.items
    return {
      total: items.length,
      high: items.filter((i) => i.level === 'high').length,
      medium: items.filter((i) => i.level === 'medium').length,
      low: items.filter((i) => i.level === 'low').length,
    }
  }, [impactData])

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            marginBottom: '0.25rem',
          }}
        >
          Blast Radius & Impact Analysis
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Select a Python function or class to determine downstream dependencies
          and historic co-change ripple risks.
        </p>
      </div>

      {/* Function Picker & Depth Form Card */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-strong)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            alignItems: 'flex-start',
          }}
        >
          {/* Function Picker with autocomplete */}
          <div style={{ position: 'relative' }}>
            <label
              style={{
                display: 'block',
                fontWeight: 600,
                fontSize: '0.9rem',
                marginBottom: '0.4rem',
              }}
            >
              Function or Class to Modify
            </label>
            <input
              type="text"
              className="input-text"
              placeholder="e.g. charge_card, create_order..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true)
              }}
            />

            {/* Dropdown results */}
            {showDropdown && searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-lg)',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  zIndex: 50,
                  marginTop: '0.25rem',
                }}
              >
                {searchResults.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSymbol(s)}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'var(--surface-hover)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'transparent')
                    }
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        {s.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {s.kind}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {s.file_path}:{s.start_line}–{s.end_line}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {searching && (
              <span
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '36px',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                Searching...
              </span>
            )}
          </div>

          {/* Depth Slider */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.4rem',
              }}
            >
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                How far to look (Depth)
              </label>
              <span
                style={{
                  fontWeight: 700,
                  color: 'var(--accent)',
                  fontSize: '0.9rem',
                }}
              >
                {depth} {depth === 1 ? 'step' : 'steps'}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={depth}
              onChange={(e) => {
                const nextDepth = Number(e.target.value)
                setDepth(nextDepth)
                if (selectedSymbol) {
                  runImpactAnalysis(selectedSymbol.id, nextDepth)
                }
              }}
              style={{
                width: '100%',
                accentColor: 'var(--accent)',
                cursor: 'pointer',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: '0.2rem',
              }}
            >
              <span>1 (Direct callers)</span>
              <span>5 (Deep ripple)</span>
            </div>
          </div>
        </div>

        {/* Selected target info & manual Analyze button */}
        {selectedSymbol && (
          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.85rem' }}>
              Selected target:{' '}
              <strong style={{ color: 'var(--accent)' }}>
                {selectedSymbol.name}
              </strong>{' '}
              in <code>{selectedSymbol.file_path}</code> (lines {selectedSymbol.start_line}–{selectedSymbol.end_line})
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => runImpactAnalysis()}
              disabled={loadingImpact}
            >
              {loadingImpact ? 'Analyzing...' : 'Re-analyze ⚡'}
            </button>
          </div>
        )}
      </div>

      {/* Stretch FR19: Paste a diff panel (collapsed / disabled) */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '2rem',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: 0.75,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📋</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Paste a Git Diff to auto-highlight affected functions
          </span>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            background: 'var(--surface-hover)',
            padding: '0.2rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          Coming soon
        </span>
      </div>

      {/* Results Area */}
      {loadingImpact ? (
        <LoadingBox height={160} lines={4} text="Computing call graph distances and co-change weights..." />
      ) : impactError ? (
        <ErrorBox message={impactError} onRetry={() => runImpactAnalysis()} />
      ) : !selectedSymbol ? (
        <EmptyState
          icon="⚡"
          title="Pick a function to begin"
          description="Type the name of any function or class in the search box above to calculate its impact score."
        />
      ) : !impactData || impactData.items.length === 0 ? (
        <EmptyState
          icon="🛡️"
          title="Nothing else seems to depend on this"
          description="We checked graph connections and commit history. No downstream dependencies or co-change ripples were detected."
        />
      ) : (
        <div>
          {/* Summary Line */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              {summary.total} {summary.total === 1 ? 'thing' : 'things'} may be affected:{' '}
              <span style={{ color: 'var(--danger)' }}>{summary.high} high</span>,{' '}
              <span style={{ color: 'var(--warn)' }}>{summary.medium} medium</span>,{' '}
              <span style={{ color: 'var(--caution)' }}>{summary.low} low</span>.
            </div>

            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {(['all', 'high', 'medium', 'low'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setActiveFilter(lvl)}
                  className={`btn btn-sm ${activeFilter === lvl ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Scored Results List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredItems.map((item) => (
              <div
                key={item.symbol_id}
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <LevelBadge level={item.level} />
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ({item.depth} {item.depth === 1 ? 'step away' : 'steps away'})
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.4rem',
                    }}
                  >
                    {item.file_path}:{item.start_line}
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.4 }}>
                    {item.reason}
                  </div>
                </div>

                {/* Score bar & Open in Code */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                  }}
                >
                  <div style={{ textAlign: 'right', minWidth: '90px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Risk Score
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                      {item.score.toFixed(2)}
                    </div>
                    <div
                      style={{
                        width: '80px',
                        height: '5px',
                        background: 'var(--surface-hover)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginTop: '2px',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round(item.score * 100)}%`,
                          height: '100%',
                          background:
                            item.level === 'high'
                              ? 'var(--danger)'
                              : item.level === 'medium'
                                ? 'var(--warn)'
                                : 'var(--caution)',
                        }}
                      />
                    </div>
                  </div>

                  <CodeLink
                    file={item.file_path}
                    line={item.start_line}
                    repoId={repoId}
                    className="btn btn-secondary btn-sm"
                  >
                    Open in code →
                  </CodeLink>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

