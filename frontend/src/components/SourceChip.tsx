import React from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { Source } from '../api/types'
import { CodeLink } from './CodeLink'

interface SourceChipProps {
  source: Source
  repoId?: number | string
}

export const SourceChip: React.FC<SourceChipProps> = ({ source, repoId }) => {
  const filePath = source.file || source.file_path || ''
  const isVerified = source.verified !== false

  return (
    <CodeLink
      file={filePath}
      line={source.start_line}
      end={source.end_line}
      repoId={repoId}
      className={`source-chip ${isVerified ? 'verified' : 'unverified'}`}
    >
      <span
        title={
          isVerified
            ? 'Verified source location'
            : 'We could not confirm this location.'
        }
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {isVerified ? (
          <CheckCircle2 size={13} style={{ color: 'var(--ok)' }} />
        ) : (
          <AlertCircle size={13} style={{ color: 'var(--caution)' }} />
        )}
      </span>
      <span>
        {filePath ? `${filePath}:${source.start_line}-${source.end_line}` : `${source.start_line}-${source.end_line}`}
      </span>
    </CodeLink>
  )
}
