import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useParams, useLocation, Link, NavLink } from 'react-router-dom'
import {
  Search,
  ChevronRight,
  GitBranch,
  LayoutDashboard,
  FileCode2,
  GitFork,
  Zap,
  Flame,
  MessageSquareCode,
  ShieldCheck,
  Settings,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getRepo } from '../api/client'
import type { Repo } from '../api/types'
import { EmptyState } from './EmptyState'
import { ErrorBoundary } from './ErrorBoundary'
import { ErrorBox } from './ErrorBox'
import { LoadingBox } from './LoadingBox'
import { Sidebar } from './Sidebar'
import { StatusBadge } from './StatusBadge'
import { ThemeToggle } from './ThemeToggle'

export const Layout: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const repoId = Number(id)
  const location = useLocation()

  const [repo, setRepo] = useState<Repo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [is404, setIs404] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const loadRepo = async () => {
    if (!repoId || isNaN(repoId)) {
      setIs404(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setIs404(false)

    try {
      const data = await getRepo(repoId)
      setRepo(data)
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string }
      if (apiErr.status === 404) {
        setIs404(true)
      } else {
        setError(apiErr.message || 'We could not reach the server. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRepo()
  }, [repoId])

  // Determine current screen title for breadcrumbs
  const getBreadcrumbTitle = () => {
    const pathname = location.pathname
    if (pathname.endsWith('/code')) return 'Code Explorer'
    if (pathname.endsWith('/graph')) return 'Dependency Graph'
    if (pathname.endsWith('/impact')) return 'Impact Explorer'
    if (pathname.endsWith('/hotspots')) return 'Hotspots'
    if (pathname.endsWith('/chat')) return 'AI Code Chat'
    if (pathname.endsWith('/validation')) return 'Validation'
    if (pathname.endsWith('/settings')) return 'Settings'
    return 'Overview'
  }

  if (loading) {
    return (
      <div className="main-layout">
        <aside className="sidebar">
          <LoadingBox height={36} lines={1} />
          <div style={{ marginTop: '2rem' }}>
            <LoadingBox height={28} lines={7} />
          </div>
        </aside>
        <main className="main-content" style={{ padding: '2rem' }}>
          <LoadingBox height={160} lines={4} />
        </main>
      </div>
    )
  }

  if (is404) {
    return (
      <div className="app-container" style={{ padding: '4rem 2rem' }}>
        <EmptyState
          icon={Search}
          title="We cannot find that project"
          description="The repository id you requested does not exist or may have been removed."
          actionLabel="Return Home"
          onAction={() => (window.location.href = '/')}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container" style={{ padding: '4rem 2rem' }}>
        <ErrorBox message={error} onRetry={loadRepo} />
      </div>
    )
  }

  // Redirect to progress if not ready
  if (repo && repo.status !== 'ready') {
    return <Navigate to={`/repos/${repo.id}/progress`} replace />
  }

  return (
    <div className="main-layout">
      <Sidebar
        repo={repo}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="main-content" style={{ position: 'relative', overflowX: 'hidden' }}>
        {/* Subtle Blueprint Dot Grid */}
        <div className="blueprint-dot-grid-full" />

        {/* Ambient Radiant Red & Soft Slate Glow Orbs */}
        <div className="blueprint-radiant-glow" style={{ top: '-8%', left: '45%', opacity: 0.55 }} />
        <div className="blueprint-radiant-glow-secondary" style={{ opacity: 0.35 }} />

        {/* Flowing Topographic Contour Wave Lines SVG */}
        <svg className="blueprint-waves-svg" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="none" style={{ opacity: 0.45 }}>
          <path
            d="M-50 180 C 250 80, 520 280, 800 140 C 1080 0, 1300 200, 1520 120"
            stroke="var(--accent)"
            strokeWidth="1.2"
            strokeOpacity="0.1"
            fill="none"
          />
          <path
            d="M-80 300 C 220 180, 480 380, 780 240 C 1080 100, 1280 280, 1560 200"
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeOpacity="0.16"
            fill="none"
          />
        </svg>

        {/* Top Header Bar */}
        <header className="topbar" style={{ position: 'relative', zIndex: 10 }}>
          <div className="topbar-left">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <Link to="/">Projects</Link>
              <ChevronRight size={14} style={{ color: 'var(--text-subtle)' }} />
              {repo && (
                <>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                    {repo.owner}/{repo.name}
                  </span>
                  <ChevronRight size={14} style={{ color: 'var(--text-subtle)' }} />
                </>
              )}
              <span className="breadcrumb-current">{getBreadcrumbTitle()}</span>
            </nav>
          </div>

          <div className="topbar-right">
            {repo && <StatusBadge status={repo.status} />}
            <div
              className="badge badge-neutral"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                gap: '0.35rem',
              }}
            >
              <GitBranch size={12} />
              <span>main</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Horizontal Navigation Tab Bar for 1-Click Access across all pages */}
        {repo && (
          <nav
            aria-label="Repository sections"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0 1.25rem',
              margin: '0.5rem 1rem 0 0.75rem',
              borderBottom: '1px solid var(--border)',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              position: 'relative',
              zIndex: 10,
            }}
          >
            {[
              { label: 'Overview', path: `/repos/${repoId}`, icon: LayoutDashboard, end: true },
              { label: 'Code Explorer', path: `/repos/${repoId}/code`, icon: FileCode2 },
              { label: 'Dependency Graph', path: `/repos/${repoId}/graph`, icon: GitFork },
              { label: 'Impact Explorer', path: `/repos/${repoId}/impact`, icon: Zap },
              { label: 'Hotspots', path: `/repos/${repoId}/hotspots`, icon: Flame },
              { label: 'AI Code Chat', path: `/repos/${repoId}/chat`, icon: MessageSquareCode },
              { label: 'Validation', path: `/repos/${repoId}/validation`, icon: ShieldCheck },
              { label: 'Settings', path: `/repos/${repoId}/settings`, icon: Settings },
            ].map((tab) => {
              const isActive = tab.end
                ? location.pathname === tab.path
                : location.pathname.startsWith(tab.path)
              const TabIcon = tab.icon
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  end={tab.end}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    borderRadius: 'var(--radius) var(--radius) 0 0',
                    backgroundColor: isActive ? 'var(--accent-subtle)' : 'transparent',
                    transition: 'all 0.15s ease',
                    marginBottom: '-1px',
                  }}
                >
                  <TabIcon size={14} style={{ color: isActive ? 'var(--accent)' : 'var(--text-subtle)' }} />
                  <span>{tab.label}</span>
                </NavLink>
              )
            })}
          </nav>
        )}

        {/* Dynamic Route Content with Smooth Motion Transition */}
        <main className="content-area" style={{ flex: 1, minWidth: 0 }}>
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ height: '100%' }}
              >
                <Outlet context={{ repo }} />
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
