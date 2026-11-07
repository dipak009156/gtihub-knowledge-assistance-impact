import React from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'

export const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '500px', width: '100%' }}>
        <EmptyState
          icon="🧭"
          title="Page Not Found"
          description="The page you are looking for does not exist or has been moved."
        />
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

