import React from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import type { Repo } from '../api/types'
import { StatusBadge } from './StatusBadge'

interface SidebarProps {
  repo?: Repo | null
}

export const Sidebar: React.FC<SidebarProps> = ({ repo }) => {
  const { id } = useParams<{ id: string }>()

  const navItems = [
    { label: 'Overview', path: `/repos/${id}`, icon: '📊', end: true },
    { label: 'Code', path: `/repos/${id}/code`, icon: '💻' },
    { label: 'Graph', path: `/repos/${id}/graph`, icon: '🕸️' },
    { label: 'Impact', path: `/repos/${id}/impact`, icon: '⚡' },
    { label: 'Hotspots', path: `/repos/${id}/hotspots`, icon: '🔥' },
    { label: 'Chat', path: `/repos/${id}/chat`, icon: '💬' },
    { label: 'Validation', path: `/repos/${id}/validation`, icon: '🛡️' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand">
          <span>🔮</span>
          <span>GKA Impact</span>
        </Link>
        {repo && (
          <div>
            <div className="sidebar-repo-name" title={repo.name}>
              {repo.owner}/{repo.name}
            </div>
            <StatusBadge status={repo.status} />
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            padding: '0.4rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <span>←</span> Switch project
        </Link>
      </div>
    </aside>
  )
}

