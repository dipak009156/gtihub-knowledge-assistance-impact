import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getFileContent, getFiles, getRelations, getSymbols } from '../../api/client'
import type { FileInfo, Relations, Symbol } from '../../api/types'
import { CertaintyBadge } from '../../components/CertaintyBadge'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBox } from '../../components/ErrorBox'
import { LoadingBox } from '../../components/LoadingBox'
import { buildFileTree, type FileTreeNode } from '../../lib/fileTree'

// Lazy-load Monaco Editor
const MonacoEditor = React.lazy(() =>
  import('@monaco-editor/react').then((module) => ({
    default: module.default,
  }))
)

export const CodePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const repoId = Number(id)
  const location = useLocation()
  const navigate = useNavigate()

  // Parse URL search params (?path=...&line=...&end=...)
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  )
  const activePath = searchParams.get('path') || ''
  const lineParam = searchParams.get('line') ? Number(searchParams.get('line')) : undefined
  const endParam = searchParams.get('end') ? Number(searchParams.get('end')) : undefined

  // State
  const [files, setFiles] = useState<FileInfo[]>([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [fileFilter, setFileFilter] = useState('')

  const [content, setContent] = useState<string>('')
  const [loadingContent, setLoadingContent] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)

  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [activeSymbol, setActiveSymbol] = useState<Symbol | null>(null)

  const [relations, setRelations] = useState<Relations | null>(null)
  const [loadingRelations, setLoadingRelations] = useState(false)

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({})

  // Monaco editor ref
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const decorationsRef = useRef<string[]>([])

  // Load files list (API 5)
  const loadFiles = async () => {
    if (!repoId) return
    setLoadingFiles(true)
    setFilesError(null)
    try {
      const data = await getFiles(repoId)
      setFiles(data || [])
      // If no path in URL, default to first file
      if (!activePath && data && data.length > 0) {
        navigate(`/repos/${repoId}/code?path=${encodeURIComponent(data[0].path)}`, {
          replace: true,
        })
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setFilesError(apiErr.message || 'Could not load repository files.')
    } finally {
      setLoadingFiles(false)
    }
  }

  // Load symbols for active file (API 7)
  const loadSymbols = async () => {
    if (!repoId) return
    try {
      const data = await getSymbols(repoId)
      setSymbols(data || [])
    } catch {
      // Ignore
    }
  }

  // Load content of active file (API 6)
  const loadContent = async (path: string) => {
    if (!repoId || !path) return
    setLoadingContent(true)
    setContentError(null)
    try {
      const data = await getFileContent(repoId, path)
      setContent(data.content || '')
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setContentError(apiErr.message || 'Could not load file content.')
    } finally {
      setLoadingContent(false)
    }
  }

  // Load callers / callees for active symbol (API 8)
  const loadRelations = async (symId: number) => {
    if (!repoId) return
    setLoadingRelations(true)
    try {
      const data = await getRelations(repoId, symId)
      setRelations(data)
    } catch {
      setRelations({ callers: [], callees: [] })
    } finally {
      setLoadingRelations(false)
    }
  }

  useEffect(() => {
    loadFiles()
    loadSymbols()
  }, [repoId])

  useEffect(() => {
    if (activePath) {
      loadContent(activePath)
    }
  }, [repoId, activePath])

  // Filter files by search term
  const filteredPaths = useMemo(() => {
    const list = files.map((f) => f.path)
    if (!fileFilter) return list
    return list.filter((p) => p.toLowerCase().includes(fileFilter.toLowerCase()))
  }, [files, fileFilter])

  const fileTree = useMemo(() => buildFileTree(filteredPaths), [filteredPaths])

  // Automatically expand folders leading to active file
  useEffect(() => {
    if (activePath) {
      const parts = activePath.split('/')
      const nextFolders: Record<string, boolean> = { ...openFolders }
      let cur = ''
      for (let i = 0; i < parts.length - 1; i++) {
        cur = cur ? `${cur}/${parts[i]}` : parts[i]
        nextFolders[cur] = true
      }
      setOpenFolders(nextFolders)
    }
  }, [activePath])

  // Highlight line/range in Monaco Editor
  const applyHighlights = (start?: number, end?: number) => {
    if (!editorRef.current || !monacoRef.current) return
    const monaco = monacoRef.current
    const editor = editorRef.current

    if (!start) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
      return
    }

    const endLine = end ?? start
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(start, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: 'monaco-line-highlight',
          inlineClassName: 'monaco-inline-highlight',
        },
      },
    ])

    editor.revealLineInCenter(start)
  }

  useEffect(() => {
    if (content && lineParam) {
      applyHighlights(lineParam, endParam)
    }
  }, [content, lineParam, endParam])

  // Cursor change: find matching symbol and load callers/callees
  const handleCursorChange = (lineNumber: number) => {
    const matched = symbols.find(
      (s) =>
        s.file_path === activePath &&
        lineNumber >= s.start_line &&
        lineNumber <= s.end_line
    )

    if (matched && matched.id !== activeSymbol?.id) {
      setActiveSymbol(matched)
      loadRelations(matched.id)
    } else if (!matched && activeSymbol) {
      setActiveSymbol(null)
      setRelations(null)
    }
  }

  const handleSelectFile = (path: string) => {
    navigate(`/repos/${repoId}/code?path=${encodeURIComponent(path)}`)
  }

  const handleSelectSymbol = (sym: Symbol, line?: number) => {
    navigate(
      `/repos/${repoId}/code?path=${encodeURIComponent(sym.file_path)}&line=${line || sym.start_line}&end=${sym.end_line}`
    )
  }

  // Render tree node recursively
  const renderTreeNode = (node: FileTreeNode) => {
    if (node.isFolder) {
      const isOpen = openFolders[node.path] ?? true
      return (
        <div key={node.path} style={{ marginLeft: '0.5rem' }}>
          <div
            onClick={() =>
              setOpenFolders((prev) => ({ ...prev, [node.path]: !isOpen }))
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.4rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              userSelect: 'none',
            }}
          >
            <span>{isOpen ? '📂' : '📁'}</span>
            <span>{node.name}</span>
          </div>
          {isOpen && node.children && (
            <div>{node.children.map(renderTreeNode)}</div>
          )}
        </div>
      )
    }

    const isActive = activePath === node.path
    return (
      <div
        key={node.path}
        onClick={() => handleSelectFile(node.path)}
        style={{
          marginLeft: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.3rem 0.5rem',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontSize: '0.85rem',
          background: isActive ? 'var(--accent-light)' : 'transparent',
          color: isActive ? 'var(--accent)' : 'var(--text)',
          fontWeight: isActive ? 600 : 400,
        }}
      >
        <span>📄</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 4rem)',
        margin: '-2rem -2.5rem',
        overflow: 'hidden',
        background: 'var(--surface)',
      }}
    >
      {/* Column 1: File Tree (Left) */}
      <div
        style={{
          width: '260px',
          borderRight: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <input
            type="text"
            className="input-text"
            placeholder="Filter files..."
            value={fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {loadingFiles ? (
            <LoadingBox height={30} lines={5} />
          ) : filesError ? (
            <ErrorBox message={filesError} onRetry={loadFiles} />
          ) : files.length === 0 ? (
            <div style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No Python files were found.
            </div>
          ) : (
            <div>{fileTree.map(renderTreeNode)}</div>
          )}
        </div>
      </div>

      {/* Column 2: Monaco Editor (Middle) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface-card)',
          overflow: 'hidden',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Editor Tab Header */}
        <div
          style={{
            padding: '0.5rem 1rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{activePath || 'No file selected'}</span>
          {lineParam && (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700 }}>
              Lines {lineParam}{endParam && endParam !== lineParam ? `–${endParam}` : ''}
            </span>
          )}
        </div>

        {/* Editor Body */}
        <div style={{ flex: 1, position: 'relative' }}>
          {loadingContent ? (
            <div style={{ padding: '2rem' }}>
              <LoadingBox height={200} lines={6} text="Loading file content..." />
            </div>
          ) : contentError ? (
            <div style={{ padding: '2rem' }}>
              <ErrorBox
                message={contentError}
                onRetry={() => loadContent(activePath)}
              />
            </div>
          ) : !activePath ? (
            <EmptyState
              icon="💻"
              title="Select a file"
              description="Choose a Python file from the left sidebar to inspect code."
            />
          ) : (
            <Suspense
              fallback={
                <div style={{ padding: '2rem' }}>
                  <LoadingBox height={200} lines={4} text="Loading code editor..." />
                </div>
              }
            >
              <MonacoEditor
                height="100%"
                language="python"
                theme="light"
                value={content}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  wordWrap: 'on',
                }}
                onMount={(editor, monaco) => {
                  editorRef.current = editor
                  monacoRef.current = monaco

                  // Apply style rules for line highlights
                  monaco.editor.defineTheme('warmTheme', {
                    base: 'vs',
                    inherit: true,
                    rules: [],
                    colors: {
                      'editor.lineHighlightBackground': '#fff7ed',
                      'editorLineNumber.foreground': '#a8a29e',
                      'editorLineNumber.activeForeground': '#ea580c',
                    },
                  })
                  monaco.editor.setTheme('warmTheme')

                  if (lineParam) {
                    applyHighlights(lineParam, endParam)
                  }

                  editor.onDidChangeCursorPosition((e) => {
                    handleCursorChange(e.position.lineNumber)
                  })
                }}
              />
            </Suspense>
          )}
        </div>
      </div>

      {/* Column 3: Calls Panel (Right) */}
      <div
        style={{
          width: '320px',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflowY: 'auto',
          padding: '1rem',
        }}
      >
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Call Relations
        </h2>

        {activeSymbol ? (
          <div>
            <div
              style={{
                background: 'var(--surface-card)',
                padding: '0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                marginBottom: '1rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Active Symbol ({activeSymbol.kind})
              </div>
              <div style={{ fontWeight: 700, color: 'var(--accent)' }}>
                {activeSymbol.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Lines {activeSymbol.start_line}–{activeSymbol.end_line}
              </div>
            </div>

            {loadingRelations ? (
              <LoadingBox height={60} lines={2} />
            ) : (
              <div>
                {/* Callers */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Callers (Who calls this)
                  </div>
                  {!relations || relations.callers.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Nothing calls this
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {relations.callers.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectSymbol(c, c.call_line)}
                          className="card"
                          style={{
                            padding: '0.6rem 0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                              {c.name}
                            </span>
                            <CertaintyBadge certainty={c.certainty} />
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {c.file_path}:{c.call_line}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Callees */}
                <div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Callees (This calls)
                  </div>
                  {!relations || relations.callees.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      This calls nothing we can see
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {relations.callees.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectSymbol(c, c.call_line)}
                          className="card"
                          style={{
                            padding: '0.6rem 0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                              {c.name}
                            </span>
                            <CertaintyBadge certainty={c.certainty} />
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {c.file_path}:{c.call_line}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            Click or position cursor inside any function in the editor to view its
            callers and callees.
          </div>
        )}
      </div>
    </div>
  )
}

