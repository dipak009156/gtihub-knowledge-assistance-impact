import React from 'react'

interface LoadingBoxProps {
  height?: string | number
  width?: string | number
  lines?: number
  className?: string
  text?: string
}

export const LoadingBox: React.FC<LoadingBoxProps> = ({
  height = '100px',
  width = '100%',
  lines = 1,
  className = '',
  text,
}) => {
  if (lines > 1) {
    return (
      <div
        className={`loading-container ${className}`}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width }}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              height: typeof height === 'number' ? `${height}px` : height,
              width: i === lines - 1 ? '70%' : '100%',
            }}
          />
        ))}
        {text && (
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              marginTop: '0.5rem',
            }}
          >
            {text}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`skeleton ${className}`}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {text && (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {text}
        </span>
      )}
    </div>
  )
}

