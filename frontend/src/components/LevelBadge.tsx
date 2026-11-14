import React from 'react'
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react'

interface LevelBadgeProps {
  level: 'high' | 'medium' | 'low'
  className?: string
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({ level, className = '' }) => {
  const configs = {
    high: { label: 'High', badgeClass: 'badge-danger', icon: AlertOctagon },
    medium: { label: 'Medium', badgeClass: 'badge-warning', icon: AlertTriangle },
    low: { label: 'Low', badgeClass: 'badge-caution', icon: Info },
  }

  const { label, badgeClass, icon: Icon } = configs[level] || configs.low

  return (
    <span className={`badge ${badgeClass} level-badge level-${level} ${className}`}>
      <Icon size={11} />
      <span>{label}</span>
    </span>
  )
}
