import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Info,
  Network,
  Code2,
  X,
  Search,
  Download,
  FileDown,
  Layers,
  Focus,
  Zap,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  SlidersHorizontal,
  Eye,
  Workflow,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { getFiles, getGraph } from '../../api/client'
import type { FileInfo, Graph, GraphNode } from '../../api/types'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBox } from '../../components/ErrorBox'
import { LoadingBox } from '../../components/LoadingBox'
import { useTheme } from '../../theme/ThemeContext'

type LayoutAlgorithm = 'cose' | 'breadthfirst' | 'concentric' | 'circle'
type ViewPreset = 'all' | 'backbone' | 'verified'

interface HoverCardState {
  node: GraphNode
  x: number
  y: number
  callerCount: number
  calleeCount: number
}

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

  // Presentation State & Retrievability
  const [viewPreset, setViewPreset] = useState<ViewPreset>('all')
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [history, setHistory] = useState<GraphNode[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [hoveredNode, setHoveredNode] = useState<HoverCardState | null>(null)

  const [layoutAlgorithm, setLayoutAlgorithm] = useState<LayoutAlgorithm>('cose')
  const [searchQuery, setSearchQuery] = useState('')
  const [neighborhoodFocus, setNeighborhoodFocus] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

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
    setHistory([])
    setHistoryIndex(-1)
    setHoveredNode(null)
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

  // Filtered graph elements according to viewPreset (all, backbone, verified)
  const filteredElements = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [], degreeMap: new Map<string, number>() }

    const degreeMap = new Map<string, number>()
    for (const e of graphData.edges) {
      degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1)
      degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1)
    }

    let activeNodes = graphData.nodes
    let activeEdges = graphData.edges

    if (viewPreset === 'backbone') {
      // Architecture Backbone: keep modules or nodes with degree >= 2 (excludes single leaf clutter)
      const backboneIds = new Set(
        activeNodes.filter((n) => n.kind === 'module' || (degreeMap.get(n.id) || 0) >= 2).map((n) => n.id)
      )
      activeNodes = activeNodes.filter((n) => backboneIds.has(n.id))
      activeEdges = activeEdges.filter((e) => backboneIds.has(e.source) && backboneIds.has(e.target))
    } else if (viewPreset === 'verified') {
      // High Certainty: only verified edges and their connected endpoints
      activeEdges = activeEdges.filter((e) => e.certainty === 'certain')
      const verifiedIds = new Set<string>()
      for (const e of activeEdges) {
        verifiedIds.add(e.source)
        verifiedIds.add(e.target)
      }
      activeNodes = activeNodes.filter((n) => verifiedIds.has(n.id))
    }

    // Cap at 300 nodes for Cytoscape DOM rendering performance
    const cappedNodes = activeNodes.slice(0, 300)
    const validNodeIds = new Set(cappedNodes.map((n) => n.id))
    const cappedEdges = activeEdges.filter(
      (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
    )

    return {
      nodes: cappedNodes,
      edges: cappedEdges,
      totalUncappedNodes: activeNodes.length,
      degreeMap,
    }
  }, [graphData, viewPreset])

  // Live Canvas Micro-HUD Stats
  const stats = useMemo(() => {
    const nodeCount = filteredElements.nodes.length
    const edgeCount = filteredElements.edges.length
    const certainCount = filteredElements.edges.filter((e) => e.certainty === 'certain').length
    const certaintyPct = edgeCount > 0 ? Math.round((certainCount / edgeCount) * 100) : 100
    return { nodeCount, edgeCount, certainCount, certaintyPct }
  }, [filteredElements])

  // Apply layout
  const applyLayout = useCallback((layoutName: LayoutAlgorithm, cy?: any) => {
    const instance = cy || cyInstanceRef.current
    if (!instance) return

    let layoutOptions: any = {
      name: layoutName,
      animate: true,
      animationDuration: 450,
      padding: 40,
    }

    if (layoutName === 'cose') {
      layoutOptions = {
        ...layoutOptions,
        nodeRepulsion: () => 7500,
        idealEdgeLength: () => 95,
        gravity: 0.22,
      }
    } else if (layoutName === 'breadthfirst') {
      layoutOptions = {
        ...layoutOptions,
        directed: true,
        spacingFactor: 1.5,
      }
    } else if (layoutName === 'concentric') {
      layoutOptions = {
        ...layoutOptions,
        concentric: (node: any) => node.data('degree') || 1,
        levelWidth: () => 2,
      }
    }

    instance.layout(layoutOptions).run()
  }, [])

  // Change layout
  const handleLayoutChange = (newLayout: LayoutAlgorithm) => {
    setLayoutAlgorithm(newLayout)
    applyLayout(newLayout)
  }

  // Node selection with history tracking for full retrievability
  const selectNodeWithHistory = useCallback((node: GraphNode | null) => {
    setSelectedNode(node)
    if (!node) return

    setHistory((prev) => {
      if (historyIndex >= 0 && prev[historyIndex]?.id === node.id) return prev
      const next = prev.slice(0, historyIndex + 1)
      next.push(node)
      setHistoryIndex(next.length - 1)
      return next
    })
  }, [historyIndex])

  // Center & focus in Cytoscape
  const focusNodeInCy = useCallback((nodeId: string) => {
    const cy = cyInstanceRef.current
    if (!cy) return
    const cyNode = cy.$(`node[id = "${nodeId}"]`)
    if (cyNode.length) {
      cy.animate({
        center: { eles: cyNode },
        zoom: 2.2,
        duration: 400,
      })
      cyNode.select()
    }
  }, [])

  // History Back / Forward
  const handleHistoryBack = () => {
    if (historyIndex > 0) {
      const prevNode = history[historyIndex - 1]
      setHistoryIndex(historyIndex - 1)
      setSelectedNode(prevNode)
      focusNodeInCy(prevNode.id)
    }
  }

  const handleHistoryForward = () => {
    if (historyIndex < history.length - 1) {
      const nextNode = history[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      setSelectedNode(nextNode)
      focusNodeInCy(nextNode.id)
    }
  }

  // Highlight neighborhood when selectedNode changes
  useEffect(() => {
    const cy = cyInstanceRef.current
    if (!cy) return

    const isDark = resolvedTheme === 'dark'

    if (!selectedNode || !neighborhoodFocus) {
      // Reset styles across all elements
      cy.elements().removeStyle()
      return
    }

    const targetNode = cy.$(`node[id = "${selectedNode.id}"]`)
    if (!targetNode.length) return

    const inboundNodes = targetNode.incomers('node')
    const outboundNodes = targetNode.outgoers('node')
    const connectedEdges = targetNode.connectedEdges()
    const neighborhood = targetNode.union(inboundNodes).union(outboundNodes).union(connectedEdges)

    // Dim unconnected elements
    cy.elements().not(neighborhood).style({
      opacity: 0.08,
    })

    // Highlight target node with radiant red glow
    targetNode.style({
      opacity: 1,
      'border-color': '#EF4444',
      'border-width': 3.5,
      'background-color': isDark ? '#3D1E1E' : '#FEE2E2',
      'shadow-blur': 16,
      'shadow-color': 'rgba(239, 68, 68, 0.45)',
    })

    // Highlight inbound callers (Cyan / Sky)
    inboundNodes.style({
      opacity: 1,
      'border-color': '#0284C7',
      'border-width': 2.5,
      'background-color': isDark ? '#0F2636' : '#E0F2FE',
    })

    // Highlight outbound callees (Emerald / Green)
    outboundNodes.style({
      opacity: 1,
      'border-color': '#10B981',
      'border-width': 2.5,
      'background-color': isDark ? '#0F2C20' : '#DCFCE7',
    })

    // Style connected edges
    targetNode.incomers('edge').style({
      opacity: 1,
      width: 2.5,
      'line-color': '#0284C7',
      'target-arrow-color': '#0284C7',
    })

    targetNode.outgoers('edge').style({
      opacity: 1,
      width: 2.5,
      'line-color': '#10B981',
      'target-arrow-color': '#10B981',
    })
  }, [selectedNode, neighborhoodFocus, resolvedTheme])

  // Initialize and mount Cytoscape when filtered elements update
  useEffect(() => {
    if (!cyContainerRef.current) return

    let isMounted = true

    import('cytoscape').then(({ default: cytoscape }) => {
      if (!isMounted || !cyContainerRef.current) return

      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy()
        cyInstanceRef.current = null
      }

      const elements = [
        ...filteredElements.nodes.map((n) => {
          const deg = filteredElements.degreeMap.get(n.id) || 0
          return {
            data: {
              id: n.id,
              label: n.label,
              kind: n.kind,
              file_path: n.file_path,
              degree: deg,
              isHub: deg >= 4 ? 'true' : 'false',
            },
          }
        }),
        ...filteredElements.edges.map((e, idx) => ({
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
          // Base node styling
          {
            selector: 'node',
            style: {
              label: 'data(label)',
              'background-color': isDark ? '#1E293B' : '#FFFFFF',
              'border-width': 1.8,
              'border-color': isDark ? '#64748B' : '#94A3B8',
              color: isDark ? '#F1F5F9' : '#0F172A',
              'font-size': '11px',
              'font-weight': 500,
              'font-family': "'JetBrains Mono', ui-monospace, monospace",
              'text-valign': 'center',
              'text-halign': 'center',
              width: 'label',
              height: 28,
              padding: '7px 10px',
              shape: 'round-rectangle',
              'border-opacity': 0.9,
            },
          },
          // Class nodes - Violet Theme
          {
            selector: 'node[kind = "class"]',
            style: {
              'background-color': isDark ? '#231E3D' : '#F5F3FF',
              'border-color': '#8B5CF6',
              'border-width': 2,
              color: isDark ? '#E9D5FF' : '#5B21B6',
              'font-weight': 600,
            },
          },
          // Function / Method nodes - Emerald Theme
          {
            selector: 'node[kind = "function"], node[kind = "method"]',
            style: {
              'background-color': isDark ? '#112920' : '#ECFDF5',
              'border-color': '#10B981',
              'border-width': 1.8,
              color: isDark ? '#A7F3D0' : '#047857',
            },
          },
          // Hub nodes (degree >= 4) - Sky Blue Theme
          {
            selector: 'node[isHub = "true"]',
            style: {
              'background-color': isDark ? '#0C263A' : '#F0F9FF',
              'border-color': '#0EA5E9',
              'border-width': 2.5,
              color: isDark ? '#BAE6FD' : '#0369A1',
              'font-weight': 600,
              height: 32,
              padding: '8px 12px',
            },
          },
          // Module nodes - Slate Theme
          {
            selector: 'node[kind = "module"]',
            style: {
              'background-color': isDark ? '#1E293B' : '#F1F5F9',
              'border-color': isDark ? '#475569' : '#94A3B8',
              color: isDark ? '#94A3B8' : '#475569',
              shape: 'round-rectangle',
            },
          },
          // Selected node
          {
            selector: 'node:selected',
            style: {
              'background-color': isDark ? '#451A1A' : '#FEE2E2',
              'border-color': '#EF4444',
              'border-width': 3,
            },
          },
          // Base edge styling with resting opacity
          {
            selector: 'edge',
            style: {
              width: 1.5,
              opacity: 0.35,
              'line-color': isDark ? '#64748B' : '#94A3B8',
              'target-arrow-color': isDark ? '#64748B' : '#94A3B8',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'arrow-scale': 0.75,
            },
          },
          // Uncertain edges (dashed amber)
          {
            selector: 'edge[certainty = "uncertain"]',
            style: {
              'line-style': 'dashed',
              'line-dash-pattern': [4, 4],
              'line-color': '#F59E0B',
              'target-arrow-color': '#F59E0B',
              opacity: 0.45,
            },
          },
          // Certain edges (solid electric red)
          {
            selector: 'edge[certainty = "certain"]',
            style: {
              'line-style': 'solid',
              'line-color': isDark ? '#DF3333' : '#DC2626',
              'target-arrow-color': isDark ? '#DF3333' : '#DC2626',
              opacity: 0.5,
            },
          },
        ],
        layout: {
          name: layoutAlgorithm,
          animate: false,
          padding: 40,
          nodeRepulsion: () => 7000,
          idealEdgeLength: () => 90,
        },
      })

      // Click node
      cy.on('tap', 'node', (evt: any) => {
        const node = evt.target
        const nodeId = node.data('id')
        const rawNode = graphData?.nodes.find((n) => n.id === nodeId)
        if (rawNode) {
          selectNodeWithHistory(rawNode)
        }
      })

      // Hover node: show micro-card
      cy.on('mouseover', 'node', (evt: any) => {
        const node = evt.target
        const renderedPos = node.renderedPosition()
        const rawNode = graphData?.nodes.find((n) => n.id === node.data('id'))
        if (rawNode) {
          const callerCount = node.incomers('node').length
          const calleeCount = node.outgoers('node').length
          setHoveredNode({
            node: rawNode,
            x: renderedPos.x,
            y: renderedPos.y,
            callerCount,
            calleeCount,
          })
        }
      })

      cy.on('mouseout', 'node', () => {
        setHoveredNode(null)
      })

      cy.on('pan zoom', () => {
        setHoveredNode(null)
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
  }, [filteredElements, resolvedTheme, selectNodeWithHistory, graphData])

  // Focus and select node from search
  const handleFocusNode = useCallback((node: GraphNode) => {
    selectNodeWithHistory(node)
    setSearchQuery('')
    focusNodeInCy(node.id)
  }, [selectNodeWithHistory, focusNodeInCy])

  // Filtered nodes for search
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q || !graphData) return []
    return graphData.nodes
      .filter((n) => n.label.toLowerCase().includes(q) || (n.file_path && n.file_path.toLowerCase().includes(q)))
      .slice(0, 6)
  }, [searchQuery, graphData])

  // Inbound Callers and Outbound Callees for selectedNode
  const nodeRelationships = useMemo(() => {
    if (!selectedNode || !graphData) return { callers: [], callees: [] }
    const callerIds = new Set<string>()
    const calleeIds = new Set<string>()

    for (const edge of graphData.edges) {
      if (edge.target === selectedNode.id) {
        callerIds.add(edge.source)
      }
      if (edge.source === selectedNode.id) {
        calleeIds.add(edge.target)
      }
    }

    const callers = graphData.nodes.filter((n) => callerIds.has(n.id))
    const callees = graphData.nodes.filter((n) => calleeIds.has(n.id))
    return { callers, callees }
  }, [selectedNode, graphData])

  // Export high-res PNG
  const handleExportPng = () => {
    const cy = cyInstanceRef.current
    if (!cy) return
    const pngData = cy.png({
      full: true,
      scale: 2,
      bg: resolvedTheme === 'dark' ? '#0E1117' : '#FFFFFF',
    })
    const link = document.createElement('a')
    link.download = `repo-${repoId}-architecture-graph.png`
    link.href = pngData
    link.click()
  }

  // Export Graph JSON for snapshotting / state retrieval
  const handleExportJson = () => {
    if (!graphData) return
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(graphData, null, 2))
    const link = document.createElement('a')
    link.setAttribute('href', dataStr)
    link.setAttribute('download', `repo-${repoId}-architecture-graph.json`)
    link.click()
  }

  // Restore graph to pristine baseline state
  const handleResetGraph = () => {
    setSelectedNode(null)
    setSearchQuery('')
    setViewPreset('all')
    setSelectedFolder('')
    setViewLevel('call')
    setLayoutAlgorithm('cose')
    if (cyInstanceRef.current) {
      cyInstanceRef.current.elements().removeStyle()
      cyInstanceRef.current.fit(undefined, 40)
    }
  }

  const isTruncated = (graphData?.nodes.length || 0) > 300

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: isFullscreen ? '100vh' : 'calc(100vh - 105px)',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 1000 : 1,
        padding: isFullscreen ? '1rem' : '1.25rem 2rem 1.5rem 2rem',
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
          gap: '0.75rem',
          marginBottom: '0.85rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
            Dependency and Call Graph
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
            Multi-tier architectural topology with neighborhood isolation, CAD grid, and reversible view presets.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Real-time Node Search */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '0.3rem 0.65rem',
              }}
            >
              <Search size={13} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search symbol / file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    handleFocusNode(searchResults[0])
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: '0.8125rem',
                  width: '150px',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <X size={12} style={{ color: 'var(--text-muted)' }} />
                </button>
              )}
            </div>

            {/* Search Suggestions Dropdown */}
            {searchResults.length > 0 && (
              <div
                className="card"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  zIndex: 50,
                  padding: '0.35rem',
                  boxShadow: 'var(--shadow-lg)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleFocusNode(n)}
                    className="btn btn-ghost btn-sm"
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.5rem',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{n.label}</span>
                    {n.file_path && (
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{n.file_path}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Architecture View Presets (Reversible / Retrievable) */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '2px 4px',
            }}
          >
            <Eye size={13} style={{ color: 'var(--text-muted)', marginLeft: '4px' }} />
            <select
              value={viewPreset}
              onChange={(e) => setViewPreset(e.target.value as ViewPreset)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontSize: '0.8125rem',
                outline: 'none',
                cursor: 'pointer',
                padding: '0.25rem 0.35rem',
              }}
              title="Select Architecture View Preset"
            >
              <option value="all">Full Graph (All Nodes)</option>
              <option value="backbone">Architecture Backbone (Core Hubs)</option>
              <option value="verified">Verified Calls Only</option>
            </select>
          </div>

          {/* 1-Click Architecture Backbone Presentation Mode */}
          <button
            type="button"
            onClick={() => setViewPreset(viewPreset === 'backbone' ? 'all' : 'backbone')}
            className={`btn btn-sm ${viewPreset === 'backbone' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ gap: '0.35rem', fontSize: '0.8125rem' }}
            title="Filter out leaf nodes to present clean architectural backbone"
          >
            <SlidersHorizontal size={13} />
            <span>{viewPreset === 'backbone' ? 'Backbone Active' : 'Backbone View'}</span>
          </button>

          {/* Layout Switcher */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '2px 4px',
            }}
          >
            <Layers size={13} style={{ color: 'var(--text-muted)', marginLeft: '4px' }} />
            <select
              value={layoutAlgorithm}
              onChange={(e) => handleLayoutChange(e.target.value as LayoutAlgorithm)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontSize: '0.8125rem',
                outline: 'none',
                cursor: 'pointer',
                padding: '0.25rem 0.35rem',
              }}
              title="Select Graph Layout Engine"
            >
              <option value="cose">Force-Directed</option>
              <option value="breadthfirst">Hierarchical Flow</option>
              <option value="concentric">Radial Hubs</option>
              <option value="circle">Circular</option>
            </select>
          </div>

          {/* Neighborhood Focus Toggle */}
          <button
            type="button"
            onClick={() => setNeighborhoodFocus(!neighborhoodFocus)}
            className={`btn btn-sm ${neighborhoodFocus ? 'btn-primary' : 'btn-secondary'}`}
            style={{ gap: '0.35rem', fontSize: '0.8125rem' }}
            title="Focus neighborhood: highlight callers (cyan) and callees (emerald)"
          >
            <Focus size={13} />
            <span>Neighborhood</span>
          </button>

          {/* Call vs Module Level */}
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
              style={{ borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}
            >
              Call View
            </button>
            <button
              type="button"
              onClick={() => setViewLevel('module')}
              className={`btn btn-sm ${viewLevel === 'module' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}
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
              style={{ width: 'auto', padding: '0.25rem 0.65rem', fontSize: '0.8125rem' }}
            >
              <option value="">All folders</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}/
                </option>
              ))}
            </select>
          )}

          {/* Zoom and Fit Controls */}
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => cyInstanceRef.current?.zoom(cyInstanceRef.current.zoom() * 1.2)}
              title="Zoom In"
              style={{ padding: '0.35rem 0.5rem' }}
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => cyInstanceRef.current?.zoom(cyInstanceRef.current.zoom() * 0.8)}
              title="Zoom Out"
              style={{ padding: '0.35rem 0.5rem' }}
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleResetGraph}
              title="Restore Graph to Pristine Baseline (Reset Zoom, Filters, Selections)"
              style={{ padding: '0.35rem 0.5rem' }}
            >
              <RefreshCw size={13} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportPng}
              title="Export High-Resolution PNG Architecture Diagram"
              style={{ padding: '0.35rem 0.5rem' }}
            >
              <Download size={13} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportJson}
              title="Export Graph JSON snapshot for offline inspection or version retrieval"
              style={{ padding: '0.35rem 0.5rem' }}
            >
              <FileDown size={13} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Full Window Canvas'}
              style={{ padding: '0.35rem 0.5rem' }}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* Truncation warning */}
      {isTruncated && (
        <div
          className="badge badge-warning"
          style={{ padding: '0.45rem 0.85rem', marginBottom: '0.65rem', fontSize: '0.8125rem' }}
        >
          <Info size={14} />
          <span>Showing {filteredElements.nodes.length} of {graphData?.nodes.length} nodes. Switch to Backbone View or filter by folder to inspect specific submodules.</span>
        </div>
      )}

      {/* Main Architectural CAD Graph Canvas */}
      <div
        className="card"
        style={{
          flex: 1,
          position: 'relative',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: resolvedTheme === 'dark' ? '#0E1117' : '#F8FAFC',
          backgroundImage:
            resolvedTheme === 'dark'
              ? 'radial-gradient(rgba(255, 255, 255, 0.08) 1.2px, transparent 1.2px)'
              : 'radial-gradient(rgba(0, 0, 0, 0.07) 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'inset 0 0 24px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Floating Canvas Micro-HUD */}
        {graphData && (
          <div
            className="graph-micro-hud"
            style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.4rem 0.75rem',
              boxShadow: 'var(--shadow-sm)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Workflow size={13} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{stats.nodeCount}</span> Nodes
            </div>
            <span style={{ color: 'var(--border)' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{stats.edgeCount}</span> Calls
            </div>
            <span style={{ color: 'var(--border)' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontWeight: 700, color: '#10B981' }}>{stats.certaintyPct}%</span> Verified
            </div>
            {viewPreset !== 'all' && (
              <>
                <span style={{ color: 'var(--border)' }}>|</span>
                <span className="badge badge-info" style={{ fontSize: '0.6875rem', textTransform: 'capitalize' }}>
                  {viewPreset} View
                </span>
              </>
            )}
          </div>
        )}

        {/* Hover Micro-Card Tooltip */}
        {hoveredNode && !selectedNode && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(hoveredNode.x + 16, (cyContainerRef.current?.clientWidth || 800) - 240),
              top: Math.max(hoveredNode.y - 40, 60),
              zIndex: 25,
              pointerEvents: 'none',
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius)',
              padding: '0.5rem 0.75rem',
              boxShadow: 'var(--shadow-lg)',
              fontSize: '0.75rem',
              maxWidth: '260px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <span
                className={`badge ${
                  hoveredNode.node.kind === 'class'
                    ? 'badge-info'
                    : hoveredNode.node.kind === 'module'
                    ? 'badge-neutral'
                    : 'badge-success'
                }`}
                style={{ fontSize: '0.625rem', textTransform: 'uppercase' }}
              >
                {hoveredNode.node.kind}
              </span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {hoveredNode.node.label}
              </span>
            </div>
            {hoveredNode.node.file_path && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.35rem' }}>
                {hoveredNode.node.file_path}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.65rem', fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>
              <span>In: <strong style={{ color: '#0284C7' }}>{hoveredNode.callerCount}</strong> callers</span>
              <span>Out: <strong style={{ color: '#10B981' }}>{hoveredNode.calleeCount}</strong> callees</span>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3rem', height: '100%' }}>
            <LoadingBox height="100%" text="Generating interactive presentation graph layout..." />
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
            onAction={handleResetGraph}
          />
        ) : (
          <div
            ref={cyContainerRef}
            style={{ width: '100%', height: '100%', cursor: 'grab' }}
          />
        )}

        {/* Semantic Multi-Tier Legend */}
        <div
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '0.45rem 0.85rem',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.85rem',
            boxShadow: 'var(--shadow-sm)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#8B5CF6' }} />
            <span style={{ fontWeight: 600 }}>Class</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#10B981' }} />
            <span style={{ fontWeight: 600 }}>Function</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#0EA5E9' }} />
            <span style={{ fontWeight: 600, color: '#0EA5E9' }}>Hub Function</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#64748B' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Module</span>
          </div>

          <div style={{ width: '1px', height: '12px', background: 'var(--border)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ display: 'inline-block', width: '14px', height: '2px', background: '#DF3333' }} />
            <span style={{ fontWeight: 600 }}>Certain Call</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ display: 'inline-block', width: '14px', height: '2px', borderTop: '2px dashed #F59E0B' }} />
            <span style={{ fontWeight: 600, color: '#F59E0B' }}>Uncertain</span>
          </div>

          {neighborhoodFocus && selectedNode && (
            <>
              <div style={{ width: '1px', height: '12px', background: 'var(--border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284C7' }} />
                <span style={{ color: '#0284C7', fontWeight: 600 }}>Callers</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                <span style={{ color: '#10B981', fontWeight: 600 }}>Callees</span>
              </div>
            </>
          )}
        </div>

        {/* Professional Inspector Side Drawer with History Navigation */}
        {selectedNode && (
          <div
            className="card"
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              bottom: '1rem',
              width: '340px',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 30,
              backgroundColor: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* Drawer Header with Retrievable History Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
              <div>
                <span
                  className="badge badge-info"
                  style={{ textTransform: 'uppercase', fontSize: '0.6875rem', letterSpacing: '0.04em' }}
                >
                  {selectedNode.kind}
                </span>
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    marginTop: '0.35rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text)',
                    wordBreak: 'break-all',
                  }}
                >
                  {selectedNode.label}
                </h3>
              </div>

              {/* History & Close Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleHistoryBack}
                  disabled={historyIndex <= 0}
                  style={{ padding: '4px', opacity: historyIndex <= 0 ? 0.35 : 1 }}
                  title="Previous Inspected Node"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleHistoryForward}
                  disabled={historyIndex >= history.length - 1}
                  style={{ padding: '4px', opacity: historyIndex >= history.length - 1 ? 0.35 : 1 }}
                  title="Next Inspected Node"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedNode(null)}
                  style={{ padding: '4px', display: 'flex', alignItems: 'center' }}
                  title="Close Inspector"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* File Location */}
            {selectedNode.file_path && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  background: 'var(--surface-hover)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.75rem',
                  marginBottom: '1rem',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ color: 'var(--text-subtle)', marginBottom: '0.2rem' }}>Source File:</div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text)',
                    wordBreak: 'break-all',
                    fontWeight: 500,
                  }}
                >
                  {selectedNode.file_path}
                </div>
              </div>
            )}

            {/* Architecture Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  padding: '0.6rem',
                  background: 'rgba(2, 132, 199, 0.08)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#0284C7', fontSize: '0.75rem', fontWeight: 600 }}>
                  <ArrowDownRight size={13} />
                  <span>Callers</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--text)' }}>
                  {nodeRelationships.callers.length}
                </div>
              </div>

              <div
                style={{
                  padding: '0.6rem',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#10B981', fontSize: '0.75rem', fontWeight: 600 }}>
                  <ArrowUpRight size={13} />
                  <span>Callees</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--text)' }}>
                  {nodeRelationships.callees.length}
                </div>
              </div>
            </div>

            {/* Interactive Connected Callers & Callees Lists */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
              {/* Callers List */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  INCOMING CALLERS ({nodeRelationships.callers.length})
                </div>
                {nodeRelationships.callers.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                    No incoming calls detected
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {nodeRelationships.callers.slice(0, 5).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleFocusNode(c)}
                        className="btn btn-ghost btn-sm"
                        style={{
                          justifyContent: 'flex-start',
                          padding: '0.3rem 0.5rem',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          color: '#0284C7',
                          border: '1px solid rgba(2, 132, 199, 0.15)',
                        }}
                      >
                        <ArrowDownRight size={12} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Callees List */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  OUTGOING DEPENDENCIES ({nodeRelationships.callees.length})
                </div>
                {nodeRelationships.callees.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                    Leaf node — makes no outgoing calls
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {nodeRelationships.callees.slice(0, 5).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleFocusNode(c)}
                        className="btn btn-ghost btn-sm"
                        style={{
                          justifyContent: 'flex-start',
                          padding: '0.3rem 0.5rem',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          color: '#10B981',
                          border: '1px solid rgba(16, 185, 129, 0.15)',
                        }}
                      >
                        <ArrowUpRight size={12} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 1-Click Codebase Assistant Integration Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
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

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
                onClick={() =>
                  navigate(`/repos/${repoId}/impact?symbol=${encodeURIComponent(selectedNode.label)}`)
                }
              >
                <Zap size={12} />
                <span>Calculate Blast Radius</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
                onClick={() =>
                  navigate(`/repos/${repoId}/intelligence?tab=tests&symbol_id=${selectedNode.id}`)
                }
              >
                <Sparkles size={12} />
                <span>Synthesize Unit Tests</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GraphPage
