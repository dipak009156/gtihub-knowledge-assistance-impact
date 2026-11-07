import { ApiError } from '../client'
import { getDevMockOptions } from '../config'
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
} from '../types'
import {
  mockChatAnswer,
  mockDemoRepos,
  mockFileContents,
  mockFiles,
  mockGraphCallView,
  mockGraphModuleView,
  mockHotspots,
  mockImpactChargeCard,
  mockOverview,
  mockRelations,
  mockRepos,
  mockSymbols,
  mockValidation,
} from './data'

// State for dynamic repo simulation (e.g. repo 2 progressing from queued -> cloning -> ready)
const repoState: Record<number, { repo: Repo; startTime?: number }> = {
  1: { repo: { ...mockRepos[1] } },
  2: { repo: { ...mockRepos[2] }, startTime: Date.now() },
  3: { repo: { ...mockRepos[3] } },
}

let validationStatus: 'none' | 'running' | 'done' | 'error' = 'done'
let validationStartTime = 0

export const handlers = {
  getRepo: (id: number): Repo => {
    const opts = getDevMockOptions()
    if (opts.failNextCall) {
      throw new ApiError(500, 'We could not reach the server. Please try again.')
    }

    const item = repoState[id]
    if (!item) {
      throw new ApiError(404, 'We cannot find that project.')
    }

    // Dynamic progression for repo 2: queued -> cloning (after 4s) -> ready (after 8s)
    if (id === 2 && item.startTime) {
      const elapsed = (Date.now() - item.startTime) / 1000
      if (elapsed < 4) {
        item.repo.status = 'queued'
      } else if (elapsed < 8) {
        item.repo.status = 'cloning'
      } else {
        item.repo.status = 'ready'
      }
    }

    return { ...item.repo }
  },

  addRepo: (url: string): Repo => {
    const opts = getDevMockOptions()
    if (opts.failNextCall) {
      throw new ApiError(500, 'We could not reach the server. Please try again.')
    }

    if (url.toLowerCase().includes('private')) {
      return { ...mockRepos[3] }
    }

    if (url.toLowerCase().includes('slow')) {
      repoState[2] = { repo: { ...mockRepos[2] }, startTime: Date.now() }
      return { ...repoState[2].repo }
    }

    // Default returns ready repo 1
    return { ...repoState[1].repo }
  },

  getDemoRepos: (): DemoRepo[] => {
    const opts = getDevMockOptions()
    if (opts.returnEmptyData) return []
    return [...mockDemoRepos]
  },

  getOverview: (id: number): Overview => {
    const repo = handlers.getRepo(id)
    const opts = getDevMockOptions()
    if (opts.returnEmptyData) {
      return {
        repo,
        files: 0,
        functions: 0,
        classes: 0,
        calls: 0,
        uncertain_calls: 0,
        commits: 0,
        skipped_files: 0,
      }
    }
    return { ...mockOverview, repo }
  },

  getFiles: (_id: number): FileInfo[] => {
    const opts = getDevMockOptions()
    if (opts.returnEmptyData) return []
    return [...mockFiles]
  },

  getFileContent: (_id: number, path: string): FileContent => {
    const opts = getDevMockOptions()
    if (opts.failNextCall) {
      throw new ApiError(500, 'Could not load file content.')
    }
    const content = mockFileContents[path]
    if (!content) {
      throw new ApiError(404, `File ${path} not found.`)
    }
    return content
  },

  getSymbols: (_id: number, q?: string, limit?: number): Symbol[] => {
    const opts = getDevMockOptions()
    if (opts.returnEmptyData) return []
    let list = [...mockSymbols]
    if (q) {
      const lower = q.toLowerCase()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          s.qualified_name.toLowerCase().includes(lower)
      )
    }
    if (limit && limit > 0) {
      list = list.slice(0, limit)
    }
    return list
  },

  getRelations: (_id: number, symbolId: number): Relations => {
    const opts = getDevMockOptions()
    if (opts.returnEmptyData) return { callers: [], callees: [] }
    const rel = mockRelations[symbolId]
    if (rel) {
      return {
        callers: [...rel.callers],
        callees: [...rel.callees],
      }
    }
    return { callers: [], callees: [] }
  },

  getGraph: (_id: number, level?: 'module' | 'call', _folder?: string): Graph => {
    const opts = getDevMockOptions()
    if (opts.returnEmptyData) {
      return { nodes: [], edges: [], total_nodes: 0, truncated: false }
    }
    if (level === 'module') {
      return { ...mockGraphModuleView }
    }
    return { ...mockGraphCallView }
  },

  getImpact: (
    _id: number,
    symbolId?: number,
    depth: number = 2
  ): Impact => {
    const opts = getDevMockOptions()
    if (opts.returnEmptyData || !symbolId) {
      return {
        target: {
          id: 0,
          name: '',
          file_path: '',
          qualified_name: '',
          kind: 'function',
          start_line: 0,
          end_line: 0,
        },
        depth,
        items: [],
      }
    }

    const sym = mockSymbols.find((s) => s.id === symbolId) || mockSymbols[0]

    if (symbolId === 3) {
      // charge_card
      return {
        ...mockImpactChargeCard,
        target: sym,
        depth,
      }
    }

    // Return empty items for other symbols to test empty state
    return {
      target: sym,
      depth,
      items: [],
    }
  },

  getHotspots: (_id: number): Hotspot[] => {
    const opts = getDevMockOptions()
    if (opts.returnEmptyData) return []
    return [...mockHotspots]
  },

  chat: (_id: number, question: string): ChatAnswer => {
    const lower = question.toLowerCase()
    if (lower.includes('error')) {
      throw new ApiError(500, 'Something went wrong. Please try again.')
    }
    if (lower.includes('limit')) {
      throw new ApiError(429, 'Too many questions. Wait a moment.')
    }

    const opts = getDevMockOptions()
    if (opts.returnEmptyData) {
      return {
        answer: 'I could not find anything about that in this project.',
        sources: [],
        cached: false,
      }
    }

    return { ...mockChatAnswer }
  },

  runValidation: (_id: number): { status: string } => {
    const opts = getDevMockOptions()
    if (opts.failNextCall) {
      throw new ApiError(500, 'Validation failed to start.')
    }
    validationStatus = 'running'
    validationStartTime = Date.now()
    return { status: 'running' }
  },

  getValidation: (_id: number): Validation => {
    const opts = getDevMockOptions()
    if (opts.returnEmptyData) {
      return { status: 'none', runs: [], commits: [] }
    }

    if (validationStatus === 'running') {
      const elapsed = (Date.now() - validationStartTime) / 1000
      if (elapsed > 4) {
        validationStatus = 'done'
      } else {
        return { status: 'running', runs: [], commits: [] }
      }
    }

    return {
      ...mockValidation,
      status: validationStatus,
    }
  },
}

