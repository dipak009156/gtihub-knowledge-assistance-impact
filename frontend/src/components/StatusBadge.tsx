import React from 'react'
import type { RepoStatus } from '../api/types'

interface StatusBadgeProps {
  status: RepoStatus
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const labelMap: Record<RepoStatus, string> = {
    queued: 'Queued',
    cloning: 'Analysing',
    ready: 'Ready',
    error: 'Failed',
  }

  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" />
      {labelMap[status] || status}
    </span>
  )
}

