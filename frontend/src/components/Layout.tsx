import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { getRepo } from '../api/client'
import type { Repo } from '../api/types'
import { DevMockPanel } from './DevMockPanel'
import { EmptyState } from './EmptyState'
import { ErrorBoundary } from './ErrorBoundary'
import { ErrorBox } from './ErrorBox'
import { LoadingBox } from './LoadingBox'
import { Sidebar } from './Sidebar'

export const Layout: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const repoId = Number(id)

  const [repo, setRepo] = useState<Repo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [is404, setIs404] = useState(false)

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

  if (loading) {
    return (
      <div className="main-layout">
        <aside className="sidebar">
          <LoadingBox height={40} lines={1} />
          <div style={{ marginTop: '2rem' }}>
            <LoadingBox height={30} lines={6} />
          </div>
        </aside>
        <main className="content-area">
          <LoadingBox height={150} lines={4} />
        </main>
      </div>
    )
  }

  if (is404) {
    return (
      <div className="app-container" style={{ padding: '4rem 2rem' }}>
        <EmptyState
          icon="🔍"
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
      <Sidebar repo={repo} />
      <main className="content-area">
        <ErrorBoundary>
          <Outlet context={{ repo }} />
        </ErrorBoundary>
      </main>
      <DevMockPanel />
    </div>
  )
}

