import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getFiles, getGraph, getSymbols } from '../../api/client'
import type { FileInfo, Graph, GraphNode, Symbol } from '../../api/types'
import { CodeLink } from '../../components/CodeLink'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBox } from '../../components/ErrorBox'
import { LoadingBox } from '../../components/LoadingBox'

export const GraphPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const repoId = Number(id)
  const navigate = useNavigate()

  const [viewLevel, setViewLevel] = useState<'module' | 'call'>('call')
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [files, setFiles] = useState<FileInfo[]>([])
  const [symbols, setSymbols] = useState<Symbol[]>([])

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

  // Load files and symbols
  useEffect(() => {
    if (!repoId) return
    getFiles(repoId).then(setFiles).catch(() => {})
    getSymbols(repoId).then(setSymbols).catch(() => {})
  }, [repoId])

  // Fetch graph data
  const loadGraph = async () => {
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
  }

  useEffect(() => {
    loadGraph()
  }, [repoId, viewLevel, selectedFolder])

  // Initialize and mount Cytoscape when data arrives
  useEffect(() => {
    if (!graphData || !cyContainerRef.current) return

    let isMounted = true
    let cy: any = null

    // Lazy load cytoscape
    import('cytoscape').then(({ default: cytoscape }) => {
      if (!isMounted || !cyContainerRef.current) return

      // Clean up previous instance
      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy()
        cyInstanceRef.current = null
      }

      // Cap at 300 nodes for safety
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
            id: `e_${idx}`,
            source: e.source,
            target: e.target,
            certainty: e.certainty,
          },
        })),
      ]

      cy = cytoscape({
        container: cyContainerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#fff7ed',
              'border-color': '#ea580c',
              'border-width': 2,
              label: 'data(label)',
              color: '#292524',
              'font-size': '11px',
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
              'background-color': '#f0f9ff',
              'border-color': '#0284c7',
            },
          },
          {
            selector: 'node:selected',
            style: {
              'background-color': '#ea580c',
              color: '#ffffff',
              'border-color': '#c2410c',
              'border-width': 3,
            },
          },
          {
            selector: 'edge',
            style: {
              width: 1.5,
              'line-color': '#d6cbbe',
              'target-arrow-color': '#ea580c',
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
              'line-color': '#ea580c',
              opacity: 0.7,
            },
          },
        ],
        layout: {
          name: 'cose',
          animate: false,
          padding: 30,
          nodeRepulsion: () => 4500,
          idealEdgeLength: () => 60,
        },
      })

      cy.on('tap', 'node', (evt: any) => {
        const nodeData = evt.target.data()
        setSelectedNode({
          id: nodeData.id,
          label: nodeData.label,
          kind: nodeData.kind,
          file_path: nodeData.file_path,
        })
      })

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
  }, [graphData])

  // Find symbol id corresponding to node label and file_path
  const matchingSymbol = useMemo(() => {
    if (!selectedNode || selectedNode.kind === 'module') return null
    return symbols.find(
      (s) =>
        s.name === selectedNode.label && s.file_path === selectedNode.file_path
    )
  }, [selectedNode, symbols])

  const totalNodes = graphData?.total_nodes ?? graphData?.nodes.length ?? 0
  const isTruncated = graphData?.truncated || totalNodes > 300

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>
      {/* Controls header */}
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
            Dependency & Call Graph
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Explore inter-module and function call architecture with certainty indicators.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Module / Call toggle */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
            }}
          >
            <button
              onClick={() => setViewLevel('call')}
              className={`btn btn-sm ${viewLevel === 'call' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-sm)', border: 'none' }}
            >
              Call View
            </button>
            <button
              onClick={() => setViewLevel('module')}
              className={`btn btn-sm ${viewLevel === 'module' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-sm)', border: 'none' }}
            >
              Module View
            </button>
          </div>

          {/* Folder filter */}
          {folders.length > 0 && (
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface-card)',
                color: 'var(--text)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              <option value="">All folders</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  Folder: {f}
                </option>
              ))}
            </select>
          )}

          {/* Graph Controls */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => cyInstanceRef.current?.fit()}
            title="Reset Zoom & Pan"
          >
            Fit View
          </button>
        </div>
      </div>

      {/* Truncation warning banner */}
      {isTruncated && (
        <div
          style={{
            background: 'var(--warn-bg)',
            border: '1px solid var(--warn-border)',
            color: 'var(--warn)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
          }}
        >
          Showing 300 of {totalNodes} nodes. Use the folder filter above to zoom into specific packages.
        </div>
      )}

      {/* Main Graph Area */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          background: 'var(--surface-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
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
            icon="🕸️"
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
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(4px)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.5rem 0.75rem',
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
                width: '18px',
                height: '2px',
                background: '#d6cbbe',
              }}
            />
            <span>Certain</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span
              style={{
                display: 'inline-block',
                width: '18px',
                height: '0px',
                borderTop: '2px dashed #ea580c',
              }}
            />
            <span>Uncertain</span>
          </div>
        </div>

        {/* Selected Node Details Card */}
        {selectedNode && (
          <div
            className="card"
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: '280px',
              padding: '1rem',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 10,
              background: 'var(--surface-card)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: 'var(--accent)',
                }}
              >
                {selectedNode.kind}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
              {selectedNode.label}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {selectedNode.file_path}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <CodeLink
                file={selectedNode.file_path}
                repoId={repoId}
                line={matchingSymbol?.start_line}
                end={matchingSymbol?.end_line}
                className="btn btn-secondary btn-sm"
              >
                Open in code →
              </CodeLink>

              {matchingSymbol && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() =>
                    navigate(
                      `/repos/${repoId}/impact?symbol_id=${matchingSymbol.id}&depth=2`
                    )
                  }
                >
                  Check impact ⚡
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

