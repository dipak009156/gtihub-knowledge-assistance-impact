import React from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { Source } from '../api/types'
import { CodeLink } from './CodeLink'

interface SourceChipProps {
  source: Source
  repoId?: number | string
}

export const SourceChip: React.FC<SourceChipProps> = ({ source, repoId }) => {
  return (
    <CodeLink
      file={source.file}
      line={source.start_line}
      end={source.end_line}
      repoId={repoId}
      className={`source-chip ${source.verified ? 'verified' : 'unverified'}`}
    >
      <span
        title={
          source.verified
            ? 'Verified source location'
            : 'We could not confirm this location.'
        }
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {source.verified ? (
          <CheckCircle2 size={13} style={{ color: 'var(--ok)' }} />
        ) : (
          <AlertCircle size={13} style={{ color: 'var(--caution)' }} />
        )}
      </span>
      <span>
        {source.file}:{source.start_line}-{source.end_line}
      </span>
    </CodeLink>
  )
}
