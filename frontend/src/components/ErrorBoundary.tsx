import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '4rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '1rem',
            minHeight: '280px',
          }}
        >
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              background: 'var(--risk-high-bg)',
              color: 'var(--risk-high)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'inline-flex',
            }}
          >
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Something went wrong on this screen
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '440px', lineHeight: 1.5 }}>
            {this.props.fallbackMessage ||
              'An unexpected error occurred while loading this view. You can reload the page to try again.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={this.handleReload}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
          >
            <RotateCcw size={15} />
            <span>Reload page</span>
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
