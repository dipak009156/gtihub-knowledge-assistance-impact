import { Component, type ErrorInfo, type ReactNode } from 'react'

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
            padding: '3rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '1.25rem',
            minHeight: '250px',
          }}
        >
          <div style={{ fontSize: '3rem' }}>🧭</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>
            Something went wrong on this screen
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px' }}>
            {this.props.fallbackMessage ||
              'An unexpected error occurred while loading this view. You can reload the page to try again.'}
          </p>
          <button className="btn btn-primary" onClick={this.handleReload}>
            Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

