import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  FileCode2,
  GitFork,
  Zap,
  Sparkles,
  Flame,
  MessageSquareCode,
  ShieldCheck,
  Settings,
  Sun,
  Moon,
  Code2,
  Boxes,
  FileText,
  CornerDownLeft,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getFiles, getSymbols } from '../api/client'
import type { FileInfo, Symbol as RepoSymbol } from '../api/types'
import { useTheme } from '../theme/ThemeContext'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  repoId?: number
}

interface PaletteItem {
  id: string
  title: string
  subtitle?: string
  category: 'PAGES' | 'SYMBOLS' | 'FILES' | 'ACTIONS'
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  action: () => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  repoId,
}) => {
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [files, setFiles] = useState<FileInfo[]>([])
  const [symbols, setSymbols] = useState<RepoSymbol[]>([])

  // Load files when repoId is available
  useEffect(() => {
    if (!repoId || !isOpen) return
    getFiles(repoId).then((data) => setFiles(data || [])).catch(() => {})
  }, [repoId, isOpen])

  // Live search symbols when user types
  useEffect(() => {
    if (!repoId || !query.trim() || !isOpen) {
      setSymbols([])
      return
    }

    const timer = setTimeout(() => {
      getSymbols(repoId, query.trim(), 8)
        .then((items) => setSymbols(items || []))
        .catch(() => setSymbols([]))
    }, 120)

    return () => clearTimeout(timer)
  }, [repoId, query, isOpen])

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Static Pages Navigation
  const pageItems = useMemo<PaletteItem[]>(() => {
    if (!repoId) return []
    return [
      {
        id: 'page-overview',
        title: 'Overview',
        subtitle: 'Repository health, symbol counts, and top hotspots',
        category: 'PAGES',
        icon: LayoutDashboard,
        action: () => navigate(`/repos/${repoId}`),
      },
      {
        id: 'page-code',
        title: 'Code Explorer',
        subtitle: 'Browse files & inspect syntax with Monaco editor',
        category: 'PAGES',
        icon: FileCode2,
        action: () => navigate(`/repos/${repoId}/code`),
      },
      {
        id: 'page-graph',
        title: 'Dependency Graph',
        subtitle: 'Multi-layout call & module architecture visualization',
        category: 'PAGES',
        icon: GitFork,
        action: () => navigate(`/repos/${repoId}/graph`),
      },
      {
        id: 'page-impact',
        title: 'Impact Explorer',
        subtitle: 'Simulate changes and assess blast radius risk',
        category: 'PAGES',
        icon: Zap,
        action: () => navigate(`/repos/${repoId}/impact`),
      },
      {
        id: 'page-intelligence',
        title: 'AI & ML Intelligence',
        subtitle: 'Bug propensity, PR blast radius review, & test generator',
        category: 'PAGES',
        icon: Sparkles,
        action: () => navigate(`/repos/${repoId}/intelligence`),
      },
      {
        id: 'page-hotspots',
        title: 'Hotspots',
        subtitle: 'High churn & coupled files requiring refactoring',
        category: 'PAGES',
        icon: Flame,
        action: () => navigate(`/repos/${repoId}/hotspots`),
      },
      {
        id: 'page-chat',
        title: 'AI Code Chat',
        subtitle: 'Ask codebase questions with grounded citations',
        category: 'PAGES',
        icon: MessageSquareCode,
        action: () => navigate(`/repos/${repoId}/chat`),
      },
      {
        id: 'page-validation',
        title: 'Validation Benchmarks',
        subtitle: 'Empirical precision & recall on historical commits',
        category: 'PAGES',
        icon: ShieldCheck,
        action: () => navigate(`/repos/${repoId}/validation`),
      },
      {
        id: 'page-settings',
        title: 'Repository Settings',
        subtitle: 'Thresholds, API configurations, and indexing options',
        category: 'PAGES',
        icon: Settings,
        action: () => navigate(`/repos/${repoId}/settings`),
      },
    ]
  }, [repoId, navigate])

  // AI & Action shortcuts
  const actionItems = useMemo<PaletteItem[]>(() => {
    if (!repoId) return []
    return [
      {
        id: 'act-pr-review',
        title: 'Run PR Blast Radius Review',
        subtitle: 'Autonomous risk gate audit and breaking contract review',
        category: 'ACTIONS',
        icon: Sparkles,
        action: () => navigate(`/repos/${repoId}/intelligence?tab=pr`),
      },
      {
        id: 'act-gen-tests',
        title: 'Synthesize Unit Tests',
        subtitle: 'Generate regression & edge-case test suites for symbols',
        category: 'ACTIONS',
        icon: Sparkles,
        action: () => navigate(`/repos/${repoId}/intelligence?tab=tests`),
      },
      {
        id: 'act-sequence',
        title: 'Trace Sequence Diagram',
        subtitle: 'Generate live Mermaid sequence flow for downstream calls',
        category: 'ACTIONS',
        icon: GitFork,
        action: () => navigate(`/repos/${repoId}/intelligence?tab=sequence`),
      },
      {
        id: 'act-theme',
        title: `Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: 'Toggle theme display appearance',
        category: 'ACTIONS',
        icon: resolvedTheme === 'dark' ? Sun : Moon,
        action: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
      },
    ]
  }, [repoId, resolvedTheme, setTheme, navigate])

  // Filtered files matching query
  const fileItems = useMemo<PaletteItem[]>(() => {
    if (!repoId || !query.trim()) return []
    const q = query.trim().toLowerCase()
    return files
      .filter((f) => f.path.toLowerCase().includes(q))
      .slice(0, 5)
      .map((f) => ({
        id: `file-${f.path}`,
        title: f.path,
        subtitle: `${f.line_count || 0} lines`,
        category: 'FILES',
        icon: FileText,
        action: () => navigate(`/repos/${repoId}/code?path=${encodeURIComponent(f.path)}`),
      }))
  }, [repoId, query, files, navigate])

  // Symbols matching query
  const symbolItems = useMemo<PaletteItem[]>(() => {
    if (!repoId) return []
    return symbols.map((s) => ({
      id: `sym-${s.id}`,
      title: s.name,
      subtitle: `${s.kind} • ${s.file_path || 'file'}:${s.start_line}`,
      category: 'SYMBOLS',
      icon: s.kind === 'class' ? Boxes : Code2,
      action: () => {
        if (s.file_path) {
          navigate(`/repos/${repoId}/code?path=${encodeURIComponent(s.file_path)}&line=${s.start_line}`)
        } else {
          navigate(`/repos/${repoId}/graph`)
        }
      },
    }))
  }, [repoId, symbols, navigate])

  // All combined filtered items
  const allFilteredItems = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return [...pageItems, ...actionItems]
    }

    const filteredPages = pageItems.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.subtitle && p.subtitle.toLowerCase().includes(q))
    )
    const filteredActions = actionItems.filter(
      (a) => a.title.toLowerCase().includes(q) || (a.subtitle && a.subtitle.toLowerCase().includes(q))
    )

    return [...symbolItems, ...fileItems, ...filteredPages, ...filteredActions]
  }, [query, pageItems, actionItems, symbolItems, fileItems])

  // Handle keyboard arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < allFilteredItems.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allFilteredItems.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allFilteredItems[selectedIndex]) {
        allFilteredItems[selectedIndex].action()
        onClose()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="command-palette-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '10vh',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="command-palette-modal"
          style={{
            width: '100%',
            maxWidth: '640px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 24px 48px -8px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--glass-border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Input Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface-hover)',
            }}
          >
            <Search size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search code, functions, files, or actions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.9375rem',
                color: 'var(--text)',
                fontFamily: 'inherit',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="btn btn-ghost btn-sm"
                style={{ padding: '2px', color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            )}
            <kbd
              style={{
                fontSize: '0.6875rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              padding: '0.5rem',
            }}
          >
            {allFilteredItems.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Search size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>No results found</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  Try searching for another symbol, file, or action
                </div>
              </div>
            ) : (
              allFilteredItems.map((item, idx) => {
                const ItemIcon = item.icon
                const isSelected = idx === selectedIndex

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      item.action()
                      onClose()
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.625rem 0.85rem',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                      color: isSelected ? 'var(--text)' : 'var(--text-muted)',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                      transition: 'all 0.1s ease',
                      marginBottom: '2px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: isSelected ? 'var(--accent)' : 'var(--surface-hover)',
                          color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.1s ease',
                        }}
                      >
                        <ItemIcon size={15} />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: isSelected ? 600 : 500,
                            color: isSelected ? 'var(--text)' : 'var(--text)',
                            fontFamily: item.category === 'SYMBOLS' || item.category === 'FILES' ? 'var(--font-mono)' : 'inherit',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: '1px',
                            }}
                          >
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: 'var(--surface-hover)',
                          color: 'var(--text-subtle)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.category}
                      </span>
                      {isSelected && (
                        <CornerDownLeft size={13} style={{ color: 'var(--accent)' }} />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Navigation Hints */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 1rem',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface-hover)',
              fontSize: '0.75rem',
              color: 'var(--text-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
              <span><kbd>↵</kbd> to select</span>
              <span><kbd>ESC</kbd> to close</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={11} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Quick Command</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
