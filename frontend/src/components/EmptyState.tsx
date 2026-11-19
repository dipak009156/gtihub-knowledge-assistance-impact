import React from 'react'
import { Inbox, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  const renderIcon = () => {
    if (!icon) {
      return <Inbox size={24} />
    }
    if (React.isValidElement(icon)) {
      return icon
    }
    const IconComponent = icon as LucideIcon
    return <IconComponent size={24} />
  }

  return (
    <div
      className={`card ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        backgroundColor: 'var(--surface-subtle)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: 'var(--glass-surface-subtle)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-specular)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
          marginBottom: '1rem',
        }}
      >
        {renderIcon()}
      </div>
      <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text)', letterSpacing: 'var(--letter-spacing-tight)', marginBottom: '0.35rem' }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 'var(--line-height-relaxed)', marginBottom: '1.25rem' }}>
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
