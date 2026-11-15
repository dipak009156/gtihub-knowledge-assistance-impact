import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../theme/ThemeContext'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn btn-secondary btn-sm ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: showLabel ? '0.35rem 0.65rem' : '0.4rem',
        borderRadius: 'var(--radius)',
        color: 'var(--text)',
        borderColor: 'var(--border)',
        backgroundColor: 'var(--surface)',
      }}
      title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
      aria-label={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
    >
      {isDark ? (
        <Sun size={15} style={{ color: 'var(--text)' }} />
      ) : (
        <Moon size={15} style={{ color: 'var(--text)' }} />
      )}
      {showLabel && <span>{isDark ? 'Light' : 'Dark'}</span>}
    </button>
  )
}
export default ThemeToggle

