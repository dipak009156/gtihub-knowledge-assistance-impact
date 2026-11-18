import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Zap,
  Search,
  FileDiff,
  ShieldCheck,
  ArrowRight,
  GitFork,
  ListFilter,
  CornerDownRight,
  Sparkles,
} from 'lucide-react'
import { getImpact, getSymbols, postDiffImpact } from '../../api/client'
import type { Impact, ImpactItem, Symbol } from '../../api/types'
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
    : 3

  // States
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Symbol[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [suggestedSymbols, setSuggestedSymbols] = useState<Symbol[]>([])

  const [depth, setDepth] = useState<number>(depthParam)
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null)

  const [impactData, setImpactData] = useState<Impact | null>(null)
  const [loadingImpact, setLoadingImpact] = useState(false)
  const [impactError, setImpactError] = useState<string | null>(null)

  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [viewMode, setViewMode] = useState<'tree' | 'table' | 'diff'>('tree')

  // Diff Impact State
  const [diffFiles, setDiffFiles] = useState<string>('src/session_marker.py\nsrc/strategy_engine.py')
  const [diffLoading, setDiffLoading] = useState(false)
  const [diffResult, setDiffResult] = useState<any | null>(null)
  const [diffError, setDiffError] = useState<string | null>(null)

  // Fetch suggested symbols on load (only if no symbol selected in URL)
  useEffect(() => {
    if (!repoId || symbolIdParam) return
    getSymbols(repoId, '', 12)
      .then((symbols) => {
        if (symbols && symbols.length > 0) {
          setSuggestedSymbols(symbols.slice(0, 8))
        }
      })
      .catch(() => {})
  }, [repoId, symbolIdParam])

  // Fetch impact analysis (API 10)
  const runImpactAnalysis = useCallback(
    async (symId?: number, d?: number) => {
      if (!repoId || !symId) return

      const targetDepth = d ?? depth
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
    },
    [repoId, navigate, depth]
  )

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

  const handleSliderChange = (newDepth: number) => {
    setDepth(newDepth)
    if (selectedSymbol) {
      runImpactAnalysis(selectedSymbol.id, newDepth)
    }
  }

  // Filtered items
  const filteredItems = useMemo(() => {
    const list = impactData?.items || impactData?.results || []
    if (activeFilter === 'all') return list
    return list.filter((item) => item.level === activeFilter)
  }, [impactData, activeFilter])

  // Group items by depth for Tree View
  const groupedTreeByDepth = useMemo(() => {
    const list = filteredItems
    const groups: { [hop: number]: ImpactItem[] } = {}
    for (let h = 1; h <= depth; h++) {
      groups[h] = []
    }
    for (const item of list) {
      const hop = item.depth || item.distance || 1
      if (!groups[hop]) groups[hop] = []
      groups[hop].push(item)
    }
    return groups
  }, [filteredItems, depth])

  // Summary counts
  const summary = useMemo(() => {
    const items = impactData?.items || impactData?.results || []
    return {
      total: items.length,
      high: items.filter((i) => i.level === 'high').length,
      medium: items.filter((i) => i.level === 'medium').length,
      low: items.filter((i) => i.level === 'low').length,
    }
  }, [impactData])

  // Run Git Diff Impact
  const handleRunDiffImpact = async () => {
    if (!repoId) return
    const lines = diffFiles
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) return

    setDiffLoading(true)
    setDiffError(null)
    try {
      const changed = lines.map((p) => ({ path: p }))
      const res = await postDiffImpact(repoId, changed, depth)
      setDiffResult(res)
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setDiffError(apiErr.message || 'Could not analyze diff blast radius.')
    } finally {
      setDiffLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '2rem 2.5rem' }}>
      {/* Title & Explainer Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.35rem' }}>
          <div
            style={{
              padding: '0.45rem',
              borderRadius: 'var(--radius)',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'inline-flex',
            }}
          >
            <Zap size={22} />
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Blast Radius & Impact Analysis
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.5, maxWidth: '820px' }}>
          <strong>"If I change this function today, what else will break?"</strong> Pick any function, adjust the slider from 1 to 5 hops, and view the affected tree across caller chains and historical co-changes.
        </p>
      </div>

      {/* Function Picker & Depth Form Card */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          marginBottom: '1.75rem',
          backgroundColor: 'var(--surface-card)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.75rem',
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
                marginBottom: '0.5rem',
                color: 'var(--text)',
              }}
            >
              Function or Class to Modify
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-subtle)',
                }}
              />
              <input
                type="text"
                className="input"
                placeholder="Search function name (e.g. calculate_and_lock, run_scanner_job)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true)
                }}
                style={{ paddingLeft: '2.5rem', width: '100%' }}
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
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  zIndex: 50,
                  marginTop: '0.35rem',
                }}
              >
                {searchResults.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSymbol(s)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'background 0.15s ease',
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
                      <span
                        style={{
                          fontWeight: 600,
                          color: 'var(--accent)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.875rem',
                        }}
                      >
                        {s.name}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                        {s.kind}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        marginTop: '0.2rem',
                      }}
                    >
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
                  right: '12px',
                  top: '38px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                Searching...
              </span>
            )}

            {/* Quick suggestions shown when no function is selected yet */}
            {!symbolIdParam && !selectedSymbol && suggestedSymbols.length > 0 && (
              <div style={{ marginTop: '0.85rem' }}>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginBottom: '0.45rem',
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={12} style={{ color: 'var(--accent)' }} />
                  <span>Suggested functions in this repo:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {suggestedSymbols.map((sym) => (
                    <button
                      key={sym.id}
                      type="button"
                      onClick={() => handleSelectSymbol(sym)}
                      style={{
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-secondary)',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {sym.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Depth Slider (1 to 5 Hops) */}
          <div
            style={{
              background: 'var(--surface-secondary)',
              padding: '1.15rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.6rem',
              }}
            >
              <label style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>
                How far to look (Depth)
              </label>
              <span
                className="badge badge-neutral"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  padding: '0.25rem 0.6rem',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                }}
              >
                {depth} {depth === 1 ? 'hop' : 'hops'}
              </span>
            </div>

            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={depth}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--accent)',
                cursor: 'pointer',
                marginBottom: '0.5rem',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>1 (Direct callers)</span>
              <span>3 (Upstream routes)</span>
              <span>5 (Deep ripple)</span>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.6rem', lineHeight: 1.4 }}>
              {depth === 1 && 'Showing direct callers only — functions that invoke this target immediately.'}
              {depth === 2 && 'Showing direct callers plus their immediate upstream callers (2 steps away).'}
              {depth === 3 && 'Traversing 3 tiers: routes, scheduled jobs, and high-level orchestrators.'}
              {depth === 4 && 'Extended traversal reaching cross-module entrypoints and background workers.'}
              {depth === 5 && 'Maximum ripple radius across all callers and historic co-changed modules.'}
            </p>
          </div>
        </div>

        {/* Selected target info & Re-analyze trigger */}
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
              <span>{loadingImpact ? 'Analyzing...' : 'Re-calculate Blast Radius'}</span>
            </button>
          </div>
        )}
      </div>

      {/* View Mode Switcher & Summary Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'tree' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('tree')}
            style={{ gap: '0.35rem', fontSize: '0.8125rem' }}
          >
            <GitFork size={14} />
            <span>Affected Tree ({summary.total})</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('table')}
            style={{ gap: '0.35rem', fontSize: '0.8125rem' }}
          >
            <ListFilter size={14} />
            <span>Ranked List</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'diff' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('diff')}
            style={{ gap: '0.35rem', fontSize: '0.8125rem' }}
          >
            <FileDiff size={14} />
            <span>PR / Git Diff Blast</span>
          </button>
        </div>

        {viewMode !== 'diff' && selectedSymbol && summary.total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Filter risk:</span>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {(['all', 'high', 'medium', 'low'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setActiveFilter(lvl)}
                  className={`btn btn-sm ${activeFilter === lvl ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textTransform: 'capitalize', fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DIFF IMPACT MODE */}
      {viewMode === 'diff' && (
        <div
          className="card"
          style={{
            padding: '1.5rem',
            marginBottom: '2rem',
            background: 'var(--surface-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <FileDiff size={18} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              Multi-File Pull Request & Git Diff Blast Radius
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Calculate aggregate downstream impact across all modified files and function symbols in a proposed change.
          </p>

          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Modified File Paths (one per line):
          </label>
          <textarea
            className="input"
            rows={3}
            value={diffFiles}
            onChange={(e) => setDiffFiles(e.target.value)}
            style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleRunDiffImpact}
              disabled={diffLoading}
              style={{ gap: '0.4rem' }}
            >
              <Zap size={14} />
              <span>{diffLoading ? 'Analyzing diff...' : 'Calculate Aggregate Blast Radius'}</span>
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Depth: {depth} hops
            </span>
          </div>

          {diffError && (
            <div style={{ marginTop: '1rem' }}>
              <ErrorBox message={diffError} />
            </div>
          )}

          {diffResult && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="card" style={{ padding: '0.75rem 1rem', background: 'var(--surface-secondary)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Files</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{diffResult.target_files?.length || 0}</div>
                </div>
                <div className="card" style={{ padding: '0.75rem 1rem', background: 'var(--surface-secondary)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Symbols</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{diffResult.target_symbols?.length || 0}</div>
                </div>
                <div className="card" style={{ padding: '0.75rem 1rem', background: 'var(--surface-secondary)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Impacted Symbols</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)' }}>
                    {diffResult.summary?.total_impacted_symbols || diffResult.results?.length || 0}
                  </div>
                </div>
                <div className="card" style={{ padding: '0.75rem 1rem', background: 'var(--surface-secondary)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>High Risk Breakages</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>
                    {diffResult.summary?.high || 0}
                  </div>
                </div>
              </div>

              {diffResult.results && diffResult.results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {diffResult.results.map((r: any, idx: number) => (
                    <div
                      key={idx}
                      className="card"
                      style={{
                        padding: '0.85rem 1.15rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <LevelBadge level={r.level || 'medium'} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem' }}>
                            {r.name}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                          {r.file_path}:{r.start_line}
                        </div>
                      </div>
                      <CodeLink file={r.file_path} line={r.start_line} repoId={repoId} className="btn btn-secondary btn-sm">
                        Open in code
                      </CodeLink>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TREE & TABLE RESULTS AREA */}
      {viewMode !== 'diff' && (
        <>
          {loadingImpact ? (
            <LoadingBox
              height={180}
              lines={5}
              text="Computing multi-hop call graph callers, AST dependencies, and co-change history..."
            />
          ) : impactError ? (
            <ErrorBox
              message={impactError}
              onRetry={() => selectedSymbol && runImpactAnalysis(selectedSymbol.id, depth)}
            />
          ) : !selectedSymbol ? (
            <EmptyState
              icon={Zap}
              title="Pick a function to begin"
              description="Type the name of any function or class in the search box above (or pick one of the suggested high-impact chips) to view its affected tree."
            />
          ) : !impactData || filteredItems.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Nothing else seems to depend on this"
              description={`We checked graph connections up to depth ${depth} and commit history. No downstream dependencies or co-change ripples were detected.`}
            />
          ) : viewMode === 'tree' ? (
            /* ================= TREE VIEW ================= */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Summary Bar */}
              <div
                className="card"
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  background: 'var(--surface-secondary)',
                }}
              >
                <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                  Affected Blast Radius ({depth} {depth === 1 ? 'hop' : 'hops'}):{' '}
                  <span style={{ color: 'var(--text)' }}>{summary.total} {summary.total === 1 ? 'function' : 'functions'}</span>{' '}
                  (
                  <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{summary.high} high</span>,{' '}
                  <span style={{ color: 'var(--warn)', fontWeight: 700 }}>{summary.medium} medium</span>,{' '}
                  <span style={{ color: 'var(--caution)', fontWeight: 700 }}>{summary.low} low</span>
                  )
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Slide depth from 1 to 5 to expand or shrink the ripple boundary
                </div>
              </div>

              {/* Root Target Card */}
              <div
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  border: '2px solid var(--accent)',
                  background: 'var(--surface-card)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        🎯 Root Target
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '1.125rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                        {selectedSymbol.name}()
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                        {selectedSymbol.kind}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Defined in: <code>{selectedSymbol.file_path}</code> (lines {selectedSymbol.start_line}-{selectedSymbol.end_line})
                    </div>
                  </div>
                  <CodeLink
                    file={selectedSymbol.file_path}
                    line={selectedSymbol.start_line}
                    repoId={repoId}
                    className="btn btn-secondary btn-sm"
                  >
                    <span>View definition</span>
                    <ArrowRight size={13} />
                  </CodeLink>
                </div>
              </div>

              {/* Hop-by-Hop Affected Tree Branches */}
              {Array.from({ length: depth }, (_, i) => i + 1).map((hop) => {
                const hopItems = groupedTreeByDepth[hop] || []
                return (
                  <div
                    key={hop}
                    style={{
                      position: 'relative',
                      paddingLeft: '1.5rem',
                      borderLeft: '2px dashed var(--border)',
                      marginLeft: '1.25rem',
                    }}
                  >
                    {/* Branch Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        marginBottom: '0.85rem',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: '-1.95rem',
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: hopItems.length > 0 ? 'var(--accent)' : 'var(--border)',
                          border: '2px solid var(--surface-card)',
                        }}
                      />
                      <span
                        className="badge badge-neutral"
                        style={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          background: 'var(--surface-secondary)',
                          color: 'var(--text)',
                        }}
                      >
                        Hop {hop}
                      </span>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                        {hop === 1 && 'Direct Callers (Immediate Breakage Risk)'}
                        {hop === 2 && 'Secondary Upstream Callers (2 Steps Removed)'}
                        {hop === 3 && 'Module Routes & Orchestrators (3 Steps Removed)'}
                        {hop === 4 && 'Cross-Module Entrypoints (4 Steps Removed)'}
                        {hop === 5 && 'Deep Ripple Callers (5 Steps Removed)'}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({hopItems.length} {hopItems.length === 1 ? 'symbol' : 'symbols'})
                      </span>
                    </div>

                    {/* Hop Cards */}
                    {hopItems.length === 0 ? (
                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.8125rem',
                          color: 'var(--text-muted)',
                          fontStyle: 'italic',
                          background: 'var(--surface-subtle)',
                          borderRadius: '8px',
                          marginBottom: '0.5rem',
                        }}
                      >
                        No callers found at hop depth {hop}.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.75rem' }}>
                        {hopItems.map((item) => (
                          <div
                            key={item.symbol_id || item.name}
                            className="card card-hover"
                            style={{
                              padding: '1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '0.75rem',
                              borderLeft: `3px solid ${
                                item.level === 'high'
                                  ? 'var(--danger)'
                                  : item.level === 'medium'
                                    ? 'var(--warn)'
                                    : 'var(--caution)'
                              }`,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.5rem',
                                  marginBottom: '0.35rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <LevelBadge level={item.level} />
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      fontSize: '0.875rem',
                                      fontFamily: 'var(--font-mono)',
                                      color: 'var(--text)',
                                    }}
                                  >
                                    {item.name}
                                  </span>
                                </div>
                                <span
                                  style={{
                                    fontSize: '0.8125rem',
                                    fontWeight: 800,
                                    fontFamily: 'var(--font-mono)',
                                    color:
                                      item.level === 'high'
                                        ? 'var(--danger)'
                                        : item.level === 'medium'
                                          ? 'var(--warn)'
                                          : 'var(--caution)',
                                  }}
                                >
                                  {Math.round(item.score * 100)}%
                                </span>
                              </div>

                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-muted)',
                                  fontFamily: 'var(--font-mono)',
                                  marginBottom: '0.45rem',
                                }}
                              >
                                {item.file_path}:{item.start_line}
                              </div>

                              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
                                {item.reason}
                              </p>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingTop: '0.5rem',
                                borderTop: '1px solid var(--border)',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  // Re-center blast analysis on this function
                                  const symObj: Symbol = {
                                    id: item.symbol_id,
                                    name: item.name,
                                    qualified_name: item.qualified_name || item.name,
                                    kind: (item.kind as any) || 'function',
                                    file_path: item.file_path,
                                    start_line: item.start_line,
                                    end_line: item.start_line,
                                  }
                                  handleSelectSymbol(symObj)
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--accent)',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontWeight: 600,
                                }}
                                title="Center blast radius on this symbol"
                              >
                                <CornerDownRight size={12} />
                                <span>Trace ripple</span>
                              </button>

                              <CodeLink
                                file={item.file_path}
                                line={item.start_line}
                                repoId={repoId}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', gap: '0.25rem' }}
                              >
                                <span>Open code</span>
                                <ArrowRight size={11} />
                              </CodeLink>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* ================= RANKED LIST / TABLE VIEW ================= */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Showing {filteredItems.length} affected functions ranked by downstream breakage risk:
              </div>
              {filteredItems.map((item) => (
                <div
                  key={item.symbol_id || item.name}
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
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {item.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({item.depth} {item.depth === 1 ? 'hop away' : 'hops away'})
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
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '1.125rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
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
          )}
        </>
      )}
    </div>
  )
}

export default ImpactPage