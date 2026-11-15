import React from 'react'
import { Check, HelpCircle } from 'lucide-react'
import type { Certainty } from '../api/types'

interface CertaintyBadgeProps {
  certainty: Certainty
  className?: string
}

export const CertaintyBadge: React.FC<CertaintyBadgeProps> = ({ certainty, className = '' }) => {
  const isUncertain = certainty === 'uncertain'

  return (
    <span
      className={`badge ${isUncertain ? 'badge-caution' : 'badge-success'} certainty-badge certainty-${certainty} ${className}`}
      title={isUncertain ? 'Multiple functions share this name across files' : 'Direct exact static reference'}
    >
      {isUncertain ? <HelpCircle size={11} /> : <Check size={11} />}
      <span>{isUncertain ? 'Uncertain' : 'Certain'}</span>
    </span>
  )
}
