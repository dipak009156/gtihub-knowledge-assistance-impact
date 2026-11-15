import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Folder,
  FolderOpen,
  FileCode2,
  Search,
  PhoneIncoming,
  PhoneOutgoing,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { getFileContent, getFiles, getRelations, getSymbols } from '../../api/client'
import type { FileInfo, Relations, Symbol } from '../../api/types'
import { CertaintyBadge } from '../../components/CertaintyBadge'
import { ErrorBox } from '../../components/ErrorBox'
import { LoadingBox } from '../../components/LoadingBox'
import { buildFileTree, type FileTreeNode } from '../../lib/fileTree'
import { useTheme } from '../../theme/ThemeContext'

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
  const { resolvedTheme } = useTheme()

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

  const activeSymbolRef = useRef(activeSymbol)
  useEffect(() => {
    activeSymbolRef.current = activeSymbol
  }, [activeSymbol])

  // Load files list (API 5)
  const loadFiles = useCallback(async () => {
    if (!repoId) return
    setLoadingFiles(true)
    setFilesError(null)
    try {
      const data = await getFiles(repoId)
      setFiles(data || [])
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
  }, [repoId, activePath, navigate])

  // Load symbols for active file (API 7)
  const loadSymbols = useCallback(async () => {
    if (!repoId) return
    try {
      const data = await getSymbols(repoId)
      setSymbols(data || [])
    } catch {
      // Ignore
    }
  }, [repoId])

  // Load content of active file (API 6)
  const loadContent = useCallback(async (path: string) => {
    if (!repoId || !path) return
    setLoadingContent(true)
    setContentError(null)
    try {
      const data = await getFileContent(repoId, path)
      setContent(data.content)
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setContentError(apiErr.message || 'Could not load file contents.')
      setContent('')
    } finally {
      setLoadingContent(false)
    }
  }, [repoId])

  // Load relations for a symbol (API 8)
  const loadRelations = useCallback(async (symId: number) => {
    if (!repoId || !symId) return
    setLoadingRelations(true)
    try {
      const data = await getRelations(repoId, symId)
      setRelations(data)
    } catch {
      setRelations(null)
    } finally {
      setLoadingRelations(false)
    }
  }, [repoId])

  useEffect(() => {
    loadFiles()
    loadSymbols()
  }, [loadFiles, loadSymbols])

  useEffect(() => {
    if (activePath) {
      loadContent(activePath)
    }
  }, [activePath, loadContent])

  // Find symbols that belong to this file
  const fileSymbols = useMemo(() => {
    return symbols.filter((s) => s.file_path === activePath)
  }, [symbols, activePath])

  // Update active symbol when line param changes or symbols load
  useEffect(() => {
    if (lineParam && fileSymbols.length > 0) {
      const match = fileSymbols.find(
        (s) => lineParam >= s.start_line && lineParam <= s.end_line
      )
      if (match) {
        setActiveSymbol(match)
        loadRelations(match.id)
        return
      }
    }
    // If no line match, clear or pick first
    if (!lineParam && fileSymbols.length > 0) {
      setActiveSymbol(fileSymbols[0])
      loadRelations(fileSymbols[0].id)
    }
  }, [lineParam, fileSymbols, loadRelations])

  // Highlight lines in Monaco editor
  const applyDecorations = useCallback((start?: number, end?: number) => {
    if (!editorRef.current || !monacoRef.current) return
    const monaco = monacoRef.current
    const editor = editorRef.current

    if (!start) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
      return
    }

    const endLine = end || start
    const newDecorations = [
      {
        range: new monaco.Range(start, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: 'monaco-line-highlight',
          linesDecorationsClassName: 'monaco-gutter-highlight',
        },
      },
    ]

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations)
    editor.revealLineInCenter(start)
  }, [])

  useEffect(() => {
    if (lineParam) {
      applyDecorations(lineParam, endParam)
    } else {
      applyDecorations()
    }
  }, [lineParam, endParam, applyDecorations])

  // Handle cursor position changes in editor to detect active symbol
  const handleCursorChange = useCallback(
    (e: any) => {
      const line = e.position.lineNumber
      if (!fileSymbols || fileSymbols.length === 0) return

      const found = fileSymbols.find(
        (s) => line >= s.start_line && line <= s.end_line
      )
      if (found && (!activeSymbolRef.current || activeSymbolRef.current.id !== found.id)) {
        setActiveSymbol(found)
        loadRelations(found.id)
      }
    },
    [fileSymbols, loadRelations]
  )

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    monacoRef.current = monaco

    editor.onDidChangeCursorPosition(handleCursorChange)

    if (lineParam) {
      applyDecorations(lineParam, endParam)
    }
  }

  // Filter files by name
  const filteredFiles = useMemo(() => {
    if (!fileFilter) return files
    return files.filter((f) =>
      f.path.toLowerCase().includes(fileFilter.toLowerCase())
    )
  }, [files, fileFilter])

  // Build hierarchical file tree
  const fileTree = useMemo(() => {
    return buildFileTree(filteredFiles.map((f) => f.path))
  }, [filteredFiles])

  // Handle selecting a file from tree
  const handleSelectFile = (path: string) => {
    navigate(`/repos/${repoId}/code?path=${encodeURIComponent(path)}`)
  }

  // Handle clicking a symbol in relations panel
  const handleSelectSymbol = (sym: { file_path: string; start_line: number; end_line: number }, line?: number) => {
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
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              userSelect: 'none',
            }}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {isOpen ? <FolderOpen size={14} style={{ color: 'var(--accent)' }} /> : <Folder size={14} style={{ color: 'var(--text-subtle)' }} />}
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
          marginLeft: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.25rem 0.5rem',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontSize: '0.8125rem',
          background: isActive ? 'var(--accent-subtle)' : 'transparent',
          color: isActive ? 'var(--accent)' : 'var(--text)',
          fontWeight: isActive ? 600 : 400,
          fontFamily: 'var(--font-mono)',
        }}
      >
        <FileCode2 size={13} style={{ color: isActive ? 'var(--accent)' : 'var(--text-subtle)' }} />
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
        height: 'calc(100vh - 56px)',
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
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              type="text"
              className="input"
              placeholder="Filter files..."
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value)}
              style={{ paddingLeft: '2rem', fontSize: '0.8125rem' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {loadingFiles ? (
            <LoadingBox height={30} lines={5} />
          ) : filesError ? (
            <ErrorBox message={filesError} onRetry={loadFiles} />
          ) : files.length === 0 ? (
            <div style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              No Python files were found.
            </div>
          ) : (
            <div>{fileTree.map(renderTreeNode)}</div>
          )}
        </div>
      </div>

      {/* Column 2: Code Editor (Center) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Editor Tab Bar */}
        <div
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--surface-secondary)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--text)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCode2 size={15} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600 }}>{activePath || 'No file selected'}</span>
          </div>
          {lineParam && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Focused: L{lineParam}{endParam ? `-${endParam}` : ''}
            </span>
          )}
        </div>

        <div style={{ flex: 1, position: 'relative', background: 'var(--surface)' }}>
          {loadingContent ? (
            <div style={{ padding: '2rem' }}>
              <LoadingBox height={200} lines={4} />
            </div>
          ) : contentError ? (
            <div style={{ padding: '2rem' }}>
              <ErrorBox message={contentError} onRetry={() => loadContent(activePath)} />
            </div>
          ) : !activePath ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select a file from the explorer to view its contents.
            </div>
          ) : (
            <Suspense fallback={<LoadingBox height="100%" lines={1} />}>
              <MonacoEditor
                height="100%"
                language="python"
                theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                value={content}
                onMount={handleEditorMount}
                options={{
                  readOnly: true,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  fontFamily: 'var(--font-mono)',
                  automaticLayout: true,
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
          padding: '1.25rem',
        }}
      >
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.875rem', color: 'var(--text)' }}>
          Call Relations
        </h2>

        {activeSymbol ? (
          <div>
            <div
              className="card"
              style={{
                padding: '0.875rem',
                marginBottom: '1.25rem',
                backgroundColor: 'var(--surface-subtle)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Symbol ({activeSymbol.kind})
              </div>
              <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1rem', marginTop: '0.125rem' }}>
                {activeSymbol.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                Lines {activeSymbol.start_line}-{activeSymbol.end_line}
              </div>
            </div>

            {loadingRelations ? (
              <LoadingBox height={60} lines={2} />
            ) : (
              <div>
                {/* Callers */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <PhoneIncoming size={13} />
                    <span>Callers (Who calls this)</span>
                  </div>
                  {!relations || relations.callers.length === 0 ? (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Nothing calls this
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {relations.callers.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectSymbol(c, c.call_line)}
                          className="card card-hover"
                          style={{
                            padding: '0.625rem 0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                              {c.name}
                            </span>
                            <CertaintyBadge certainty={c.certainty} />
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
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
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <PhoneOutgoing size={13} />
                    <span>Callees (This calls)</span>
                  </div>
                  {!relations || relations.callees.length === 0 ? (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      This calls nothing we can see
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {relations.callees.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectSymbol(c, c.call_line)}
                          className="card card-hover"
                          style={{
                            padding: '0.625rem 0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                              {c.name}
                            </span>
                            <CertaintyBadge certainty={c.certainty} />
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
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
              fontSize: '0.8125rem',
            }}
          >
            Click or position cursor on any function to view its callers and callees.
          </div>
        )}
      </div>
    </div>
  )
}
export default CodePage
