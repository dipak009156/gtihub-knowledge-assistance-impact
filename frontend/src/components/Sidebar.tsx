import React, { useState } from 'react'
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
  Sparkles,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Repo } from '../api/types'
import { BrandIcon } from './BrandIcon'
import { StatusBadge } from './StatusBadge'
import { useAuth } from '../context/AuthContext'

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
  const { user, logout } = useAuth()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const navItems = [
    { label: 'Overview', path: `/repos/${id}`, icon: LayoutDashboard, end: true },
    { label: 'Code Explorer', path: `/repos/${id}/code`, icon: FileCode2 },
    { label: 'Dependency Graph', path: `/repos/${id}/graph`, icon: GitFork },
    { label: 'Impact Explorer', path: `/repos/${id}/impact`, icon: Zap },
    { label: 'AI Intelligence', path: `/repos/${id}/intelligence`, icon: Sparkles },
    { label: 'Hotspots', path: `/repos/${id}/hotspots`, icon: Flame },
    { label: 'AI Code Chat', path: `/repos/${id}/chat`, icon: MessageSquareCode },
    { label: 'Validation', path: `/repos/${id}/validation`, icon: ShieldCheck },
    { label: 'Settings', path: `/repos/${id}/settings`, icon: Settings },
  ]

  return (
    <motion.aside
      className={`sidebar bubble-sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
      animate={{ width: collapsed ? 80 : 270 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      aria-label="Sidebar navigation"
    >
      {/* ── Brand Header Bubble ── */}
      <div className="sidebar-header" style={collapsed ? { alignItems: 'center' } : undefined}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            flexDirection: collapsed ? 'column' : 'row',
            gap: '0.65rem',
            width: '100%',
          }}
        >
          <Link
            to="/"
            className="sidebar-brand sidebar-brand-bubble"
            title="GitHub Knowledge Assistance"
            style={collapsed ? { padding: '0.45rem', justifyContent: 'center' } : undefined}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(223, 51, 51, 0.35) 0%, transparent 70%)',
                  filter: 'blur(4px)',
                  pointerEvents: 'none',
                }}
              />
              <BrandIcon size={24} style={{ position: 'relative', zIndex: 1 }} />
            </div>
            {!collapsed && (
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  color: 'var(--accent)',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                GitHub Knowledge Assistance
              </span>
            )}
          </Link>

          {onToggleCollapse && (
            <motion.button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="bubble-toggle-btn"
              whileHover={{ scale: 1.1, rotate: collapsed ? -5 : 5 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </motion.button>
          )}
        </div>

        {repo && !collapsed && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="sidebar-repo-card sidebar-repo-bubble"
          >
            <div className="sidebar-repo-name" title={`${repo.owner}/${repo.name}`}>
              {repo.owner}/{repo.name}
            </div>
            <StatusBadge status={repo.status} />
          </motion.div>
        )}
      </div>

      {/* ── Floating Bubble Navigation List ── */}
      <nav className="sidebar-nav" aria-label="Repository navigation">
        {navItems.map((item, index) => {
          const Icon = item.icon
          const isHovered = hoveredIndex === index

          return (
            <div
              key={item.label}
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <NavLink
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `nav-item bubble-nav-item ${isActive ? 'active' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Liquid Sliding Active Glass Bubble Pill */}
                    {isActive && (
                      <motion.div
                        layoutId="activeBubblePill"
                        className="bubble-active-glow"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}

                    {/* Icon Bubble Sphere */}
                    <span className="bubble-icon-sphere">
                      <Icon size={17} />
                    </span>

                    {/* Navigation Label */}
                    {!collapsed && (
                      <span className="bubble-nav-label">
                        {item.label}
                      </span>
                    )}

                    {/* Glowing Active Dot */}
                    {isActive && !collapsed && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bubble-active-dot"
                      />
                    )}
                  </>
                )}
              </NavLink>

              {/* Floating Tooltip for Collapsed Bubble Mode */}
              <AnimatePresence>
                {collapsed && isHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: -8, scale: 0.92 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -6, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="bubble-tooltip"
                  >
                    {item.label}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>

      {/* ── Footer Bubble ── */}
      <div className="sidebar-footer">
        {user && (
          <div
            style={{
              padding: collapsed ? '0.4rem 0' : '0.45rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              gap: '0.5rem',
              marginBottom: '0.4rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                />
              )}
              {!collapsed && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  @{user.username}
                </span>
              )}
            </div>
            {!collapsed && (
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-subtle)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                }}
              >
                <LogOut size={13} />
              </button>
            )}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <Link
            to="/"
            title={collapsed ? 'Switch repository' : undefined}
            className="bubble-nav-item bubble-footer-btn"
            style={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              width: '100%',
              padding: collapsed ? '0.5rem 0' : '0.55rem 0.85rem',
            }}
          >
            <span className="bubble-icon-sphere">
              <ArrowLeft size={15} />
            </span>
            {!collapsed && (
              <span className="bubble-nav-label">
                Switch project
              </span>
            )}
          </Link>
        </div>
      </div>
    </motion.aside>
  )
}

export default Sidebar
