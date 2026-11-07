import React from 'react'

interface LevelBadgeProps {
  level: 'high' | 'medium' | 'low'
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({ level }) => {
  const labels: Record<'high' | 'medium' | 'low', string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  }

  return (
    <span className={`level-badge level-${level}`}>
      {labels[level] || level}
    </span>
  )
}

