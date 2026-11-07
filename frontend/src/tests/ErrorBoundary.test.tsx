import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../components/ErrorBoundary'

const ThrowingComponent: React.FC = () => {
  throw new Error('Simulated runtime error')
}

describe('ErrorBoundary component', () => {
  it('catches render errors and displays fallback UI with reload button', () => {
    // Suppress React error boundary console log for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary fallbackMessage="Custom error occurred">
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(
      screen.getByText('Something went wrong on this screen')
    ).toBeInTheDocument()
    expect(screen.getByText('Custom error occurred')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reload page' })
    ).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })
})

