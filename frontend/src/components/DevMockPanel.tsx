import React, { useEffect, useState } from 'react'
import {
  type DevMockOptions,
  getDevMockOptions,
  setDevMockOptions,
  subscribeDevMockOptions,
  USE_MOCKS,
} from '../api/config'

export const DevMockPanel: React.FC = () => {
  const [options, setOptions] = useState<DevMockOptions>(getDevMockOptions())
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    return subscribeDevMockOptions(setOptions)
  }, [])

  if (!USE_MOCKS) return null

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 9999,
          background: 'var(--surface-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-full)',
          padding: '0.4rem 0.8rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--accent)',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        <span>🛠️</span>
        <span>Mock Dev</span>
      </button>
    )
  }

  return (
    <div className="dev-mock-panel">
      <div className="dev-mock-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>🛠️</span> Demo Controls
        </span>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            padding: '0 0.2rem',
          }}
          title="Minimize"
        >
          ✕
        </button>
      </div>

      <label className="dev-mock-toggle">
        <input
          type="checkbox"
          checked={options.slowNetwork}
          onChange={(e) => setDevMockOptions({ slowNetwork: e.target.checked })}
        />
        <span>Slow network (2s)</span>
      </label>

      <label className="dev-mock-toggle">
        <input
          type="checkbox"
          checked={options.failNextCall}
          onChange={(e) => setDevMockOptions({ failNextCall: e.target.checked })}
        />
        <span>Next call fails (500)</span>
      </label>

      <label className="dev-mock-toggle">
        <input
          type="checkbox"
          checked={options.returnEmptyData}
          onChange={(e) =>
            setDevMockOptions({ returnEmptyData: e.target.checked })
          }
        />
        <span>Return empty data</span>
      </label>
    </div>
  )
}

