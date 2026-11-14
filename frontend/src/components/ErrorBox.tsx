import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface ErrorBoxProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export const ErrorBox: React.FC<ErrorBoxProps> = ({
  message = 'We could not reach the server. Please try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`card ${className}`}
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        backgroundColor: 'var(--danger-bg)',
        borderColor: 'var(--danger-border)',
        padding: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <AlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
        <span className="error-message" style={{ color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 500 }}>
          {message}
        </span>
      </div>
      {onRetry && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onRetry}
          style={{
            borderColor: 'var(--danger-border)',
            color: 'var(--danger)',
            whiteSpace: 'nowrap',
            gap: '0.35rem',
          }}
        >
          <RotateCcw size={13} />
          <span>Retry</span>
        </button>
      )}
    </div>
  )
}
