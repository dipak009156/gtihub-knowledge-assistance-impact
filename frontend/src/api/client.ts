import { getDevMockOptions, USE_MOCKS } from './config'
import { handlers } from './mocks/handlers'
import type {
  AuthResponse,
  ChatAnswer,
  DefectsResponse,
  DemoRepo,
  FileContent,
  FileInfo,
  GitHubRepoItem,
  Graph,
  GraphIntelligenceResponse,
  Hotspot,
  Impact,
  ImpactItem,
  Overview,
  PRReviewResponse,
  Relations,
  Repo,
  SequenceFlowResponse,
  Symbol,
  TestGenResponse,
  User,
  Validation,
} from './types'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function request<T>(
  path: string,
  mock: () => T | Promise<T>,
  init?: RequestInit
): Promise<T> {
  const opts = getDevMockOptions()

  if (USE_MOCKS) {
    const delay = opts.slowNetwork
      ? 2000 + Math.random() * 500
      : 300 + Math.random() * 500
    await sleep(delay)
    return mock()
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('gka_token') : null
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(init?.headers || {}),
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server unreachable'
    throw new ApiError(
      503,
      `Cannot reach the backend server at ${path} (${msg}). Please ensure the backend is running.`
    )
  }

  if (!res.ok) {
    let detail = 'Something went wrong. Please try again.'
    try {
      const data = await res.json()
      if (data && typeof data.detail === 'string') {
        detail = data.detail
      }
    } catch {
      // Ignore json parse error
    }
    throw new ApiError(res.status, detail)
  }

  return res.json() as Promise<T>
}

// 1. Add a GitHub project
export const addRepo = (url: string) =>
  request<Repo>(
    '/api/repos',
    () => handlers.addRepo(url),
    {
      method: 'POST',
      body: JSON.stringify({ url }),
    }
  )

// 2. Status of one project
export const getRepo = (id: number) =>
  request<Repo>(`/api/repos/${id}`, () => handlers.getRepo(id))

// 3. Ready-made examples
export const getDemoRepos = () =>
  request<DemoRepo[]>('/api/demo-repos', () => handlers.getDemoRepos())

// 4. Overview counts and summary
export const getOverview = (id: number) =>
  request<Overview>(`/api/repos/${id}/overview`, () =>
    handlers.getOverview(id)
  )

// 5. List of files
export const getFiles = (id: number) =>
  request<FileInfo[]>(`/api/repos/${id}/files`, () => handlers.getFiles(id))

// 6. Full text of one file
export const getFileContent = (id: number, path: string) =>
  request<FileContent>(
    `/api/repos/${id}/file?path=${encodeURIComponent(path)}`,
    () => handlers.getFileContent(id, path)
  )

// 7. Functions and classes
export const getSymbols = (id: number, q?: string, limit?: number) => {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (limit) params.set('limit', String(limit))
  const qs = params.toString() ? `?${params.toString()}` : ''
  return request<Symbol[]>(`/api/repos/${id}/symbols${qs}`, () =>
    handlers.getSymbols(id, q, limit)
  )
}

// 8. Callers and callees
export const getRelations = (id: number, symbolId: number) =>
  request<Relations>(
    `/api/repos/${id}/symbols/${symbolId}/relations`,
    () => handlers.getRelations(id, symbolId)
  )

// 9. Graph view (module or call)
export const getGraph = (
  id: number,
  level: 'module' | 'call' = 'call',
  folder?: string
) => {
  const params = new URLSearchParams({ level })
  if (folder) params.set('folder', folder)
  return request<Graph>(`/api/repos/${id}/graph?${params.toString()}`, () =>
    handlers.getGraph(id, level, folder)
  )
}

// 10. Impact scored list
export const getImpact = async (id: number, symbolId?: number, depth: number = 2): Promise<Impact> => {
  const params = new URLSearchParams({ depth: String(depth) })
  if (symbolId) params.set('symbol_id', String(symbolId))
  const data = await request<any>(
    `/api/repos/${id}/impact?${params.toString()}`,
    () => handlers.getImpact(id, symbolId, depth)
  )

  const rawList = Array.isArray(data?.results) ? data.results : (Array.isArray(data?.items) ? data.items : [])
  const normalizedItems: ImpactItem[] = rawList.map((item: any) => {
    const symId = item.symbol_id ?? item.id ?? 0
    const reasons = Array.isArray(item.reasons)
      ? item.reasons
      : item.reason
        ? [item.reason]
        : []
    const reason = reasons.join(' ') || item.reason || 'Downstream caller reached in dependency path.'
    const d = item.depth ?? item.distance ?? 1

    return {
      symbol_id: symId,
      id: symId,
      name: item.name || '',
      qualified_name: item.qualified_name || item.name || '',
      kind: item.kind || 'function',
      file_path: item.file_path || '',
      start_line: item.start_line ?? 1,
      depth: d,
      distance: d,
      score: typeof item.score === 'number' ? item.score : 0,
      level: (item.level as 'high' | 'medium' | 'low') || 'low',
      reason,
      reasons,
      uncertain: Boolean(item.uncertain),
    }
  })

  return {
    target: data?.target || {
      id: symbolId || 0,
      name: '',
      qualified_name: '',
      file_path: '',
      start_line: 1,
    },
    depth: data?.depth ?? depth,
    variant: data?.variant || 'combined',
    truncated: Boolean(data?.truncated),
    items: normalizedItems,
    results: normalizedItems,
  }
}

// 10b. Aggregate blast radius from modified files / git diff
export const postDiffImpact = (
  id: number,
  changedFiles: Array<{ path: string; lines?: number[] }>,
  depth: number = 3
) =>
  request<any>(
    `/api/repos/${id}/impact/diff`,
    () => ({
      depth,
      variant: 'combined',
      target_files: changedFiles.map((f) => f.path),
      target_symbols: [],
      summary: { total_impacted_symbols: 0, total_impacted_files: 0, high: 0, medium: 0, low: 0 },
      results: [],
    }),
    {
      method: 'POST',
      body: JSON.stringify({
        changed_files: changedFiles,
        depth,
        variant: 'combined',
      }),
    }
  )

// 11. Most-changed files (hotspots)
export const getHotspots = (id: number) =>
  request<Hotspot[]>(`/api/repos/${id}/hotspots`, () =>
    handlers.getHotspots(id)
  )

// 12. Chat with code
export const chat = async (id: number, question: string): Promise<ChatAnswer> => {
  const res = await request<ChatAnswer>(
    `/api/repos/${id}/chat`,
    () => handlers.chat(id, question),
    {
      method: 'POST',
      body: JSON.stringify({ question }),
    }
  )
  if (res && Array.isArray(res.sources)) {
    res.sources = res.sources.map((s) => ({
      ...s,
      file: s.file || s.file_path || '',
      file_path: s.file_path || s.file || '',
      verified: s.verified !== false,
    }))
  }
  return res
}

// 12b. Chat question suggestions
export const getChatSuggestions = (id: number): Promise<{ questions: string[] }> =>
  request<{ questions: string[] }>(
    `/api/repos/${id}/chat/suggestions`,
    () => ({
      questions: [
        'How to use this in my project',
        'What does this project do?',
        'What is the most important class?',
        'Where does the main work start?',
        'What are the API endpoints?',
      ],
    })
  )

// 13. Start validation run
export const runValidation = (id: number) =>
  request<{ status: string }>(
    `/api/repos/${id}/validation/run`,
    () => handlers.runValidation(id),
    {
      method: 'POST',
    }
  )

// 14. Validation results
export const getValidation = async (id: number): Promise<Validation> => {
  const data = await request<any>(`/api/repos/${id}/validation`, () =>
    handlers.getValidation(id)
  )

  const commitsTested = data?.commits_tested ?? (data?.runs?.[0]?.commits_tested || 0)

  const normalizedRuns = (data?.runs || []).map((r: any) => ({
    ...r,
    commits_tested: r.commits_tested ?? commitsTested,
  }))

  let normalizedCommits = data?.commits || []
  if ((!normalizedCommits || normalizedCommits.length === 0) && Array.isArray(data?.details)) {
    normalizedCommits = data.details.map((d: any) => {
      const pred = d.predicted || []
      const real = d.real || []
      return {
        sha: d.sha || 'commit',
        message: `Modification in ${d.changed_file || 'module'}`,
        actual: real,
        predicted: {
          combined: pred,
          graph: pred,
          history: pred,
        },
      }
    })
  }

  return {
    status: data?.status || 'none',
    runs: normalizedRuns,
    commits: normalizedCommits,
  }
}

// 15. Auth APIs
export const getGithubAuthUrl = () =>
  request<{ configured: boolean; url: string | null; client_id: string | null }>(
    '/api/auth/github/url',
    () => ({ configured: false, url: null, client_id: null })
  )

export const loginWithGithubCode = (code: string) =>
  request<AuthResponse>(
    '/api/auth/github/callback',
    () => {
      throw new Error('OAuth mock not supported')
    },
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    }
  )

export const loginWithGithubToken = (token: string) =>
  request<AuthResponse>(
    '/api/auth/github/token',
    () => {
      throw new Error('Token login mock not supported')
    },
    {
      method: 'POST',
      body: JSON.stringify({ token }),
    }
  )

export const loginWithGithubUser = (username: string) =>
  request<AuthResponse>(
    '/api/auth/github/user',
    () => {
      throw new Error('User login mock not supported')
    },
    {
      method: 'POST',
      body: JSON.stringify({ username }),
    }
  )

export const registerUser = (name: string, email: string, password?: string) =>
  request<AuthResponse>(
    '/api/auth/register',
    () => ({
      user: {
        id: 1,
        username: email.split('@')[0],
        name,
        email,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
      },
      token: 'mock_token',
    }),
    {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }
  )

export const loginUser = (email: string, password?: string) =>
  request<AuthResponse>(
    '/api/auth/login',
    () => ({
      user: {
        id: 1,
        username: email.split('@')[0],
        name: email.split('@')[0],
        email,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
      },
      token: 'mock_token',
    }),
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  )

export const getCurrentUser = () =>
  request<User>('/api/auth/me', () => ({
    id: 1,
    username: 'developer',
    name: 'Developer',
    email: 'dev@example.com',
  }))

export const getUserGithubRepos = () =>
  request<GitHubRepoItem[]>('/api/auth/github/repos', () => [])

// 15. ML Defect Predictions
export const getDefectPredictions = (id: number) =>
  request<DefectsResponse>(`/api/repos/${id}/ml/defects`, () =>
    handlers.getDefectPredictions(id)
  )

// 16. Predictive Graph Intelligence
export const getGraphIntelligence = (id: number) =>
  request<GraphIntelligenceResponse>(
    `/api/repos/${id}/ml/graph-intelligence`,
    () => handlers.getGraphIntelligence(id)
  )

// 17. Autonomous PR Review Agent
export const runPRReview = (id: number, diffText = '', symbolId?: number) =>
  request<PRReviewResponse>(
    `/api/repos/${id}/agent/pr-review`,
    () => handlers.runPRReview(id, diffText, symbolId),
    {
      method: 'POST',
      body: JSON.stringify({ diff_text: diffText, symbol_id: symbolId }),
    }
  )

// 18. Autonomous Test Generator
export const generateTests = (id: number, symbolId: number) =>
  request<TestGenResponse>(
    `/api/repos/${id}/agent/generate-tests`,
    () => handlers.generateTests(id, symbolId),
    {
      method: 'POST',
      body: JSON.stringify({ symbol_id: symbolId }),
    }
  )

// 19. Sequence Flow Generator
export const generateSequenceFlow = (
  id: number,
  symbolId: number,
  depth = 4
) =>
  request<SequenceFlowResponse>(
    `/api/repos/${id}/agent/sequence-flow`,
    () => handlers.generateSequenceFlow(id, symbolId, depth),
    {
      method: 'POST',
      body: JSON.stringify({ symbol_id: symbolId, depth }),
    }
  )

// 20. Executive Codebase Audit Report
export const getExecutiveReport = (id: number) =>
  request<any>(
    `/api/repos/${id}/report`,
    () => handlers.getExecutiveReport(id)
  )

export const downloadReportMarkdown = async (id: number, repoName: string) => {
  const sanitizedName = repoName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `${sanitizedName}-executive-audit-report.md`

  if (USE_MOCKS) {
    const mockRep = handlers.getExecutiveReport(id)
    const mockMd = `# 🛡️ Codebase Architecture & Risk Audit: ${mockRep.repository.owner}/${mockRep.repository.name}
*Generated via GitHub Knowledge Assistance (GKA) Deterministic Engine*

## 1. Executive Health Scorecard
- Overall Grade: ${mockRep.scorecard.grade} (${mockRep.scorecard.overall_score}/100)
- Architecture Score: ${mockRep.scorecard.architecture_score}/100
- Reliability Score: ${mockRep.scorecard.reliability_score}/100
- Testability Score: ${mockRep.scorecard.testability_score}/100

## 2. Codebase Metrics
- Files: ${mockRep.metrics.total_files}
- LOC: ${mockRep.metrics.total_lines_of_code}
- Symbols: ${mockRep.metrics.total_symbols}
- Call Edges: ${mockRep.metrics.total_call_edges}
- Call Certainty: ${mockRep.metrics.certainty_percentage}%
`
    const blob = new Blob([mockMd], { type: 'text/markdown;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
    return
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('gka_token') : null
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  try {
    const res = await fetch(`/api/repos/${id}/report/markdown`, { headers })
    if (!res.ok) {
      throw new Error(`Failed to download report (${res.status})`)
    }
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  } catch (err) {
    console.error('Download error:', err)
    window.open(`/api/repos/${id}/report/markdown`, '_blank')
  }
}


