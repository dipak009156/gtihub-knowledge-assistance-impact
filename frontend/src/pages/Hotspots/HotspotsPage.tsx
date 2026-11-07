import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getHotspots } from '../../api/client'
import type { Hotspot } from '../../api/types'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBox } from '../../components/ErrorBox'
import { LoadingBox } from '../../components/LoadingBox'

type SortColumn = 'rank' | 'path' | 'changes' | 'connections' | 'score'
type SortDir = 'asc' | 'desc'

export const HotspotsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const repoId = Number(id)
  const navigate = useNavigate()

  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sortCol, setSortCol] = useState<SortColumn>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const loadData = async () => {
    if (!repoId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getHotspots(repoId)
      setHotspots(data || [])
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setError(
        apiErr.message || 'We could not reach the server. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [repoId])

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const sortedList = useMemo(() => {
    const list = [...hotspots]
    list.sort((a, b) => {
      const valA: any = a[sortCol === 'rank' ? 'score' : sortCol]
      const valB: any = b[sortCol === 'rank' ? 'score' : sortCol]

      if (sortCol === 'path') {
        return sortDir === 'asc'
          ? a.path.localeCompare(b.path)
          : b.path.localeCompare(a.path)
      }

      return sortDir === 'asc' ? valA - valB : valB - valA
    })
    return list
  }, [hotspots, sortCol, sortDir])

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Hotspot Files
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Files that change a lot and touch many others are risky to edit.
        </p>
        <LoadingBox height={250} lines={5} />
      </div>
    )
  }

  if (error) {
    return <ErrorBox message={error} onRetry={loadData} />
  }

  if (hotspots.length === 0) {
    return (
      <EmptyState
        icon="🔥"
        title="No git history was found for this project"
        description="We could not find commit logs to calculate file churn or hotspots."
        actionLabel="Retry"
        onAction={loadData}
      />
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            marginBottom: '0.25rem',
          }}
        >
          Hotspot Files
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Files that change a lot and touch many others are risky to edit.
        </p>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr
              style={{
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                textAlign: 'left',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                userSelect: 'none',
              }}
            >
              <th
                onClick={() => handleSort('rank')}
                style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}
              >
                Rank {sortCol === 'rank' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th
                onClick={() => handleSort('path')}
                style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}
              >
                File Path {sortCol === 'path' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th
                onClick={() => handleSort('changes')}
                style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}
              >
                Number of Changes {sortCol === 'changes' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th
                onClick={() => handleSort('connections')}
                style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}
              >
                Call Connections {sortCol === 'connections' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th
                onClick={() => handleSort('score')}
                style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}
              >
                Risk Score {sortCol === 'score' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedList.map((h, idx) => (
              <tr
                key={h.path}
                onClick={() =>
                  navigate(`/repos/${repoId}/code?path=${encodeURIComponent(h.path)}`)
                }
                style={{
                  borderBottom:
                    idx === sortedList.length - 1 ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--surface-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>
                  #{idx + 1}
                </td>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--accent)' }}>
                  {h.path}
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>{h.changes} commits</td>
                <td style={{ padding: '0.85rem 1rem' }}>{h.connections} calls</td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        flex: 1,
                        maxWidth: '90px',
                        height: '6px',
                        background: 'var(--surface-hover)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round(h.score * 100)}%`,
                          height: '100%',
                          background:
                            h.score >= 0.7
                              ? 'var(--danger)'
                              : h.score >= 0.4
                                ? 'var(--warn)'
                                : 'var(--caution)',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                      {h.score.toFixed(2)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
