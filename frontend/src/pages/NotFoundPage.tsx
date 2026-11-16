import React from 'react'
import { Link } from 'react-router-dom'
import { Compass, ArrowLeft } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'

export const NotFoundPage: React.FC = () => {
  return (
    <div
      className="blueprint-section"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '2rem',
        position: 'relative',
      }}
    >
      {/* Subtle Blueprint Dot Grid */}
      <div className="blueprint-dot-grid" />

      {/* Central Radiant Warm Accent Glow */}
      <div className="blueprint-radiant-glow" style={{ top: '25%', opacity: 0.65 }} />

      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 3 }}>
        <EmptyState
          icon={Compass}
          title="Page Not Found"
          description="The route or resource you are looking for does not exist or has been moved."
        />
        <div style={{ marginTop: '1.5rem' }}>
          <Link to="/" className="btn btn-primary" style={{ gap: '0.5rem' }}>
            <ArrowLeft size={15} />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
export default NotFoundPage
