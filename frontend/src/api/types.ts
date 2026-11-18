export type User = {
  id: number
  github_id?: string | null
  username: string
  name?: string | null
  email?: string | null
  avatar_url?: string | null
  has_token?: boolean
}

export type AuthResponse = {
  user: User
  token: string
}

export type GitHubRepoItem = {
  name: string
  full_name: string
  url: string
  description?: string | null
  is_private: boolean
  stars: number
  language?: string | null
}

export type RepoStatus =
  | 'queued'
  | 'cloning'
  | 'parsing'
  | 'analyzing'
  | 'ready'
  | 'error'

export type Repo = {
  id: number
  url: string
  owner: string
  name: string
  status: RepoStatus
  error_message: string | null
}

export type DemoRepo = {
  name: string
  url: string
  description: string
}

export type Overview = {
  repo: Repo
  files: number
  functions: number
  classes: number
  calls: number
  uncertain_calls: number
  commits: number
  skipped_files: number
}

export type FileInfo = {
  path: string
  line_count: number
}

export type FileContent = {
  path: string
  content: string
  line_count: number
}

export type Certainty = 'certain' | 'uncertain'

export type Symbol = {
  id: number
  file_path: string
  name: string
  qualified_name: string
  kind: 'function' | 'method' | 'class'
  start_line: number
  end_line: number
}

export type RelationItem = Symbol & {
  certainty: Certainty
  call_line: number
}

export type Relations = {
  callers: RelationItem[]
  callees: RelationItem[]
}

export type GraphNode = {
  id: string
  label: string
  kind: string
  file_path: string
}

export type GraphEdge = {
  source: string
  target: string
  certainty: Certainty
}

export type Graph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  total_nodes: number
  truncated: boolean
}

export type ImpactItem = {
  symbol_id: number
  id?: number
  name: string
  qualified_name?: string
  kind?: string
  file_path: string
  start_line: number
  depth: number
  distance?: number
  score: number
  level: 'high' | 'medium' | 'low'
  reason: string
  reasons?: string[]
  uncertain?: boolean
}

export type Impact = {
  target: Symbol | { id: number; name: string; qualified_name?: string; file_path: string; start_line: number; end_line?: number }
  depth: number
  variant?: string
  truncated?: boolean
  items: ImpactItem[]
  results?: ImpactItem[]
}

export type Hotspot = {
  path: string
  changes: number
  connections: number
  score: number
}

export type Source = {
  file?: string
  file_path?: string
  start_line: number
  end_line: number
  verified?: boolean
}

export type ChatAnswer = {
  answer: string
  sources: Source[]
  cached: boolean
  grounded?: boolean
}

export type ValidationRun = {
  variant: 'graph' | 'history' | 'combined'
  k: 5 | 10
  commits_tested: number
  precision: number
  recall: number
}

export type ValidationCommit = {
  sha: string
  message: string
  actual: string[]
  predicted: {
    graph: string[]
    history: string[]
    combined: string[]
  }
}

export type Validation = {
  status: 'none' | 'running' | 'done' | 'error'
  runs: ValidationRun[]
  commits: ValidationCommit[]
}

