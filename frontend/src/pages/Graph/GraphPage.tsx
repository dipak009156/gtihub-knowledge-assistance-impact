import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  Info,
  Network,
  Code2,
  X,
} from 'lucide-react'
import { getFiles, getGraph } from '../../api/client'
import type { FileInfo, Graph, GraphNode } from '../../api/types'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBox } from '../../components/ErrorBox'
import { LoadingBox } from '../../components/LoadingBox'
import { useTheme } from '../../theme/ThemeContext'

export const GraphPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const repoId = Number(id)
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()

  const [viewLevel, setViewLevel] = useState<'module' | 'call'>('call')
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [files, setFiles] = useState<FileInfo[]>([])

  const [graphData, setGraphData] = useState<Graph | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  const cyContainerRef = useRef<HTMLDivElement>(null)
  const cyInstanceRef = useRef<any>(null)

  // Top-level folders from files
  const folders = useMemo(() => {
    const set = new Set<string>()
    for (const f of files) {
      const parts = f.path.split('/')
      if (parts.length > 1) {
        set.add(parts[0])
      }
    }
    return Array.from(set).sort()
  }, [files])

  // Load files
  useEffect(() => {
    if (!repoId) return
    getFiles(repoId).then(setFiles).catch(() => {})
  }, [repoId])

  // Fetch graph data
  const loadGraph = useCallback(async () => {
    if (!repoId) return
    setLoading(true)
    setError(null)
    setSelectedNode(null)
    try {
      const data = await getGraph(repoId, viewLevel, selectedFolder || undefined)
      setGraphData(data)
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setError(apiErr.message || 'Could not load graph data.')
    } finally {
      setLoading(false)
    }
  }, [repoId, viewLevel, selectedFolder])

  useEffect(() => {
    loadGraph()
  }, [loadGraph])

  // Initialize and mount Cytoscape when data arrives
  useEffect(() => {
    if (!graphData || !cyContainerRef.current) return

    let isMounted = true

    // Lazy load cytoscape
    import('cytoscape').then(({ default: cytoscape }) => {
      if (!isMounted || !cyContainerRef.current) return

      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy()
        cyInstanceRef.current = null
      }

      // Cap at 300 nodes for rendering performance
      const cappedNodes = graphData.nodes.slice(0, 300)
      const validNodeIds = new Set(cappedNodes.map((n) => n.id))
      const cappedEdges = graphData.edges.filter(
        (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
      )

      const elements = [
        ...cappedNodes.map((n) => ({
          data: {
            id: n.id,
            label: n.label,
            kind: n.kind,
            file_path: n.file_path,
          },
        })),
        ...cappedEdges.map((e, idx) => ({
          data: {
            id: `e-${idx}`,
            source: e.source,
            target: e.target,
            certainty: e.certainty,
          },
        })),
      ]

      const isDark = resolvedTheme === 'dark'

      const cy = cytoscape({
        container: cyContainerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              label: 'data(label)',
              'background-color': isDark ? '#282A2D' : '#FFFFFF',
              'border-width': 2,
              'border-color': '#DF3333',
              color: isDark ? '#F5F5F2' : '#202124',
              'font-size': '11px',
              'font-family': "'JetBrains Mono', ui-monospace, monospace",
              'text-valign': 'center',
              'text-halign': 'center',
              width: 'label',
              height: 28,
              padding: '6px',
              shape: 'round-rectangle',
            },
          },
          {
            selector: 'node[kind = "module"]',
            style: {
              'background-color': isDark ? '#303338' : '#EBECE8',
              'border-color': isDark ? '#54575E' : '#C4C6BE',
              color: isDark ? '#B2B4B7' : '#777B80',
              shape: 'round-rectangle',
            },
          },
          {
            selector: 'node:selected',
            style: {
              'background-color': isDark ? '#432725' : '#FCE9E9',
              'border-color': isDark ? '#F05A50' : '#C62929',
              'border-width': 3,
            },
          },
          {
            selector: 'edge',
            style: {
              width: 1.5,
              'line-color': isDark ? '#414449' : '#DEDFDA',
              'target-arrow-color': isDark ? '#414449' : '#DEDFDA',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'arrow-scale': 0.8,
            },
          },
          {
            selector: 'edge[certainty = "uncertain"]',
            style: {
              'line-style': 'dashed',
              'line-dash-pattern': [4, 4],
              'line-color': isDark ? '#D6A653' : '#A66B17',
              'target-arrow-color': isDark ? '#D6A653' : '#A66B17',
            },
          },
          {
            selector: 'edge[certainty = "certain"]',
            style: {
              'line-style': 'solid',
              'line-color': '#DF3333',
              'target-arrow-color': '#DF3333',
            },
          },
        ],
        layout: {
          name: 'cose',
          animate: false,
          padding: 40,
          nodeRepulsion: () => 6000,
          idealEdgeLength: () => 80,
        },
      })

      // Click node
      cy.on('tap', 'node', (evt: any) => {
        const node = evt.target
        const nodeId = node.data('id')
        const rawNode = graphData.nodes.find((n) => n.id === nodeId)
        if (rawNode) {
          setSelectedNode(rawNode)
        }
      })

      // Click canvas background to deselect
      cy.on('tap', (evt: any) => {
        if (evt.target === cy) {
          setSelectedNode(null)
        }
      })

      cyInstanceRef.current = cy
    })

    return () => {
      isMounted = false
      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy()
        cyInstanceRef.current = null
      }
    }
  }, [graphData, resolvedTheme])

  const totalNodes = graphData?.nodes.length || 0
  const isTruncated = totalNodes > 300

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 56px)',
        padding: '1.5rem 2rem',
        background: 'var(--bg)',
      }}
    >
      {/* Header & Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Dependency and Call Graph
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Explore inter-module and function call architecture with certainty indicators.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          {/* Mode Switcher */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewLevel('call')}
              className={`btn btn-sm ${viewLevel === 'call' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Call View
            </button>
            <button
              type="button"
              onClick={() => setViewLevel('module')}
              className={`btn btn-sm ${viewLevel === 'module' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Module View
            </button>
          </div>

          {/* Folder filter */}
          {folders.length > 0 && (
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="input"
              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}
            >
              <option value="">All folders</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  Folder: {f}
                </option>
              ))}
            </select>
          )}

          {/* Zoom and Fit Controls */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => cyInstanceRef.current?.zoom(cyInstanceRef.current.zoom() * 1.2)}
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => cyInstanceRef.current?.zoom(cyInstanceRef.current.zoom() * 0.8)}
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => cyInstanceRef.current?.fit()}
              title="Reset Zoom and Pan"
            >
              <Maximize2 size={14} />
              <span>Fit View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Truncation warning */}
      {isTruncated && (
        <div
          className="badge badge-warning"
          style={{ padding: '0.5rem 0.875rem', marginBottom: '0.75rem', fontSize: '0.8125rem' }}
        >
          <Info size={14} />
          <span>Showing 300 of {totalNodes} nodes. Filter by folder to inspect specific packages.</span>
        </div>
      )}

      {/* Main Graph Area */}
      <div
        className="card"
        style={{
          flex: 1,
          position: 'relative',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--surface-card)',
        }}
      >
        {loading ? (
          <div style={{ padding: '3rem', height: '100%' }}>
            <LoadingBox height="100%" text="Generating interactive graph layout..." />
          </div>
        ) : error ? (
          <div style={{ padding: '2rem' }}>
            <ErrorBox message={error} onRetry={loadGraph} />
          </div>
        ) : !graphData || graphData.nodes.length === 0 ? (
          <EmptyState
            icon={Network}
            title="No calls were found"
            description="We could not detect call relationships or module dependencies for this filter."
            actionLabel="Reset filters"
            onAction={() => {
              setSelectedFolder('')
              setViewLevel('call')
            }}
          />
        ) : (
          <div
            ref={cyContainerRef}
            style={{ width: '100%', height: '100%', cursor: 'grab' }}
          />
        )}

        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '0.45rem 0.75rem',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span
              style={{
                display: 'inline-block',
                width: '16px',
                height: '2px',
                background: 'var(--accent)',
              }}
            />
            <span style={{ fontWeight: 600 }}>Certain</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span
              style={{
                display: 'inline-block',
                width: '16px',
                height: '2px',
                borderTop: '2px dashed var(--caution)',
              }}
            />
            <span style={{ fontWeight: 600, color: 'var(--caution)' }}>Uncertain</span>
          </div>
        </div>

        {/* Selected Node Details Panel */}
        {selectedNode && (
          <div
            className="card"
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: '320px',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 20,
              backgroundColor: 'var(--surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.6875rem' }}>
                  {selectedNode.kind}
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
                  {selectedNode.label}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedNode(null)}
                style={{ padding: '4px', display: 'flex', alignItems: 'center' }}
                title="Close"
              >
                <X size={14} />
              </button>
            </div>

            {selectedNode.file_path && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Defined in:</div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', wordBreak: 'break-all', marginTop: '0.2rem' }}>
                  {selectedNode.file_path}
                </div>
              </div>
            )}

            {selectedNode.file_path && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ width: '100%', justifyContent: 'center', gap: '0.4rem' }}
                onClick={() =>
                  navigate(`/repos/${repoId}/code?path=${encodeURIComponent(selectedNode.file_path!)}`)
                }
              >
                <Code2 size={13} />
                <span>Open in Code Explorer</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
export default GraphPage
