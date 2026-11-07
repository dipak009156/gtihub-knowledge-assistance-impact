import { getDevMockOptions, USE_MOCKS } from './config'
import { handlers } from './mocks/handlers'
import type {
  ChatAnswer,
  DemoRepo,
  FileContent,
  FileInfo,
  Graph,
  Hotspot,
  Impact,
  Overview,
  Relations,
  Repo,
  Symbol,
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

  let res: Response
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError(0, 'We could not reach the server. Please try again.')
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
export const getImpact = (id: number, symbolId?: number, depth: number = 2) => {
  const params = new URLSearchParams({ depth: String(depth) })
  if (symbolId) params.set('symbol_id', String(symbolId))
  return request<Impact>(
    `/api/repos/${id}/impact?${params.toString()}`,
    () => handlers.getImpact(id, symbolId, depth)
  )
}

// 11. Most-changed files (hotspots)
export const getHotspots = (id: number) =>
  request<Hotspot[]>(`/api/repos/${id}/hotspots`, () =>
    handlers.getHotspots(id)
  )

// 12. Chat with code
export const chat = (id: number, question: string) =>
  request<ChatAnswer>(
    `/api/repos/${id}/chat`,
    () => handlers.chat(id, question),
    {
      method: 'POST',
      body: JSON.stringify({ question }),
    }
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
export const getValidation = (id: number) =>
  request<Validation>(`/api/repos/${id}/validation`, () =>
    handlers.getValidation(id)
  )
