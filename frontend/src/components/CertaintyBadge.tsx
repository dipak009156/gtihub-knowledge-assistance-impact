import React from 'react'
import type { Certainty } from '../api/types'

interface CertaintyBadgeProps {
  certainty: Certainty
}

export const CertaintyBadge: React.FC<CertaintyBadgeProps> = ({ certainty }) => {
  const isUncertain = certainty === 'uncertain'

  return (
    <span
      className={`certainty-badge certainty-${certainty}`}
      title={isUncertain ? 'Several functions share this name' : 'Direct exact reference'}
    >
      {isUncertain ? 'Uncertain' : 'Certain'}
    </span>
  )
}

