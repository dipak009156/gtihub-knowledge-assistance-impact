import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useParams, useLocation, Link } from 'react-router-dom'
import { Search, ChevronRight, GitBranch } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getRepo } from '../api/client'
import type { Repo } from '../api/types'
import { DevMockPanel } from './DevMockPanel'
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
        <DevMockPanel />
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container" style={{ padding: '4rem 2rem' }}>
        <ErrorBox message={error} onRetry={loadRepo} />
        <DevMockPanel />
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

      <div className="main-content">
        {/* Top Header Bar */}
        <header className="topbar">
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

      <DevMockPanel />
    </div>
  )
}
