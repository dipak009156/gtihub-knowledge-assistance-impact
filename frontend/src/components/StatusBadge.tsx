import React from 'react'
import { CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react'
import type { RepoStatus } from '../api/types'

interface StatusBadgeProps {
  status: RepoStatus
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const configMap: Record<RepoStatus, { label: string; badgeClass: string; icon: React.FC<{ size: number }> }> = {
    queued: { label: 'Queued', badgeClass: 'badge-neutral', icon: Clock },
    cloning: { label: 'Analyzing', badgeClass: 'badge-info', icon: Loader2 },
    ready: { label: 'Ready', badgeClass: 'badge-success', icon: CheckCircle2 },
    error: { label: 'Failed', badgeClass: 'badge-danger', icon: AlertCircle },
  }

  const { label, badgeClass, icon: Icon } = configMap[status] || {
    label: status,
    badgeClass: 'badge-neutral',
    icon: Clock,
  }

  return (
    <span className={`badge ${badgeClass} ${className}`} aria-label={`Repository status: ${label}`}>
      <span className={status === 'cloning' ? 'animate-spin' : ''} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <Icon size={12} />
      </span>
      <span>{label}</span>
    </span>
  )
}
