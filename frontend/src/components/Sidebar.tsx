import React from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import {
  LayoutDashboard,
  FileCode2,
  GitFork,
  Zap,
  Flame,
  MessageSquareCode,
  ShieldCheck,
  Settings,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { Repo } from '../api/types'
import { BrandIcon } from './BrandIcon'
import { StatusBadge } from './StatusBadge'

interface SidebarProps {
  repo?: Repo | null
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  repo,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { id } = useParams<{ id: string }>()

  const navItems = [
    { label: 'Overview', path: `/repos/${id}`, icon: LayoutDashboard, end: true },
    { label: 'Code Explorer', path: `/repos/${id}/code`, icon: FileCode2 },
    { label: 'Dependency Graph', path: `/repos/${id}/graph`, icon: GitFork },
    { label: 'Impact Explorer', path: `/repos/${id}/impact`, icon: Zap },
    { label: 'Hotspots', path: `/repos/${id}/hotspots`, icon: Flame },
    { label: 'AI Code Chat', path: `/repos/${id}/chat`, icon: MessageSquareCode },
    { label: 'Validation', path: `/repos/${id}/validation`, icon: ShieldCheck },
    { label: 'Settings', path: `/repos/${id}/settings`, icon: Settings },
  ]

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <Link to="/" className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none', marginBottom: 0 }}>
            <BrandIcon size={24} />
            {!collapsed && (
              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                GitHub Knowledge Assistance
              </span>
            )}
          </Link>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px' }}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}
        </div>

        {repo && !collapsed && (
          <div className="sidebar-repo-card">
            <div className="sidebar-repo-name" title={`${repo.owner}/${repo.name}`}>
              {repo.owner}/{repo.name}
            </div>
            <StatusBadge status={repo.status} />
          </div>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Repository navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="nav-item-icon">
                    <Icon size={18} />
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '15%',
                        bottom: '15%',
                        width: '3px',
                        backgroundColor: 'var(--accent)',
                        borderRadius: '0 2px 2px 0',
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <Link
          to="/"
          title="Switch repository"
          className="btn btn-ghost btn-sm"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start', width: '100%', gap: '0.5rem' }}
        >
          <ArrowLeft size={15} />
          {!collapsed && <span>Switch project</span>}
        </Link>
      </div>
    </aside>
  )
}
