import React from 'react'

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
    <div className={`error-box ${className}`} role="alert">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem' }}>⚠️</span>
        <span className="error-message">{message}</span>
      </div>
      {onRetry && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRetry}
          style={{
            borderColor: 'var(--danger-border)',
            color: 'var(--danger)',
            whiteSpace: 'nowrap',
          }}
        >
          Retry
        </button>
      )}
    </div>
  )
}

