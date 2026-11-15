import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Zap,
  Search,
  FileDiff,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'
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

  // Fetch impact analysis (API 10)
  const runImpactAnalysis = useCallback(async (symId?: number, d?: number) => {
    if (!repoId) return
    if (!symId) return

    const targetDepth = d ?? depthParam
    setLoadingImpact(true)
    setImpactError(null)

    // Sync URL query params
    navigate(
      `/repos/${repoId}/impact?symbol_id=${symId}&depth=${targetDepth}`,
      { replace: true }
    )

    try {
      const data = await getImpact(repoId, symId, targetDepth)
      setImpactData(data)
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setImpactError(apiErr.message || 'Could not calculate impact analysis.')
    } finally {
      setLoadingImpact(false)
    }
  }, [repoId, navigate, depthParam])

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
    }, 300)

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

  // Trigger analysis when symbolIdParam changes
  useEffect(() => {
    if (symbolIdParam) {
      runImpactAnalysis(symbolIdParam, depthParam)
    }
  }, [symbolIdParam, depthParam, runImpactAnalysis])

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
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '2rem 2.5rem' }}>
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
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Select a Python function or class to determine downstream dependencies and historic co-change ripple risks.
        </p>
      </div>

      {/* Function Picker & Depth Form Card */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          backgroundColor: 'var(--surface-card)',
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
                fontSize: '0.875rem',
                marginBottom: '0.4rem',
              }}
            >
              Function or Class to Modify
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                className="input"
                placeholder="e.g. charge_card, create_order..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true)
                }}
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>

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
                      <span style={{ fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                        {s.name}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                        {s.kind}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                      {s.file_path}:{s.start_line}-{s.end_line}
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
                  fontSize: '0.75rem',
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
              <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                How far to look (Depth)
              </label>
              <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {depth} {depth === 1 ? 'hop' : 'hops'}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              onMouseUp={(e) => {
                const nextDepth = Number((e.target as HTMLInputElement).value)
                if (selectedSymbol) runImpactAnalysis(selectedSymbol.id, nextDepth)
              }}
              onTouchEnd={(e) => {
                const nextDepth = Number((e.target as HTMLInputElement).value)
                if (selectedSymbol) runImpactAnalysis(selectedSymbol.id, nextDepth)
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
                marginTop: '0.25rem',
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
            <div style={{ fontSize: '0.875rem' }}>
              Selected target:{' '}
              <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                {selectedSymbol.name}
              </strong>{' '}
              in <code>{selectedSymbol.file_path}</code> (lines {selectedSymbol.start_line}-{selectedSymbol.end_line})
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => runImpactAnalysis(selectedSymbol.id, depth)}
              disabled={loadingImpact}
              style={{ gap: '0.4rem' }}
            >
              <Zap size={13} />
              <span>{loadingImpact ? 'Analyzing...' : 'Re-analyze'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Stretch Diff Banner */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '2rem',
          background: 'var(--surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <FileDiff size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            Paste a Git Diff to auto-highlight affected functions
          </span>
        </div>
        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
          Coming soon
        </span>
      </div>

      {/* Results Area */}
      {loadingImpact ? (
        <LoadingBox height={160} lines={4} text="Computing call graph distances and co-change weights..." />
      ) : impactError ? (
        <ErrorBox message={impactError} onRetry={() => selectedSymbol && runImpactAnalysis(selectedSymbol.id, depth)} />
      ) : !selectedSymbol ? (
        <EmptyState
          icon={Zap}
          title="Pick a function to begin"
          description="Type the name of any function or class in the search box above to calculate its impact score."
        />
      ) : !impactData || impactData.items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
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
            <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
              {summary.total} {summary.total === 1 ? 'item' : 'items'} may be affected:{' '}
              <span style={{ color: 'var(--danger)' }}>{summary.high} high</span>,{' '}
              <span style={{ color: 'var(--warn)' }}>{summary.medium} medium</span>,{' '}
              <span style={{ color: 'var(--caution)' }}>{summary.low} low</span>.
            </div>

            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {(['all', 'high', 'medium', 'low'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setActiveFilter(lvl)}
                  className={`btn btn-sm ${activeFilter === lvl ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textTransform: 'capitalize', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
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
                className="card card-hover"
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
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'var(--font-mono)' }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ({item.depth} {item.depth === 1 ? 'step away' : 'steps away'})
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    {item.file_path}:{item.start_line}
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text)', lineHeight: 1.45 }}>
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
                    <div style={{ fontWeight: 800, fontSize: '1.125rem', fontFamily: 'var(--font-mono)' }}>
                      {item.score.toFixed(2)}
                    </div>
                    <div
                      style={{
                        width: '80px',
                        height: '5px',
                        background: 'var(--surface-subtle)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginTop: '3px',
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
                    style={{ gap: '0.35rem' }}
                  >
                    <span>Open in code</span>
                    <ArrowRight size={13} />
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
export default ImpactPage
