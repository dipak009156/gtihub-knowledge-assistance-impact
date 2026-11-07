export type RepoStatus = 'queued' | 'cloning' | 'ready' | 'error'

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
  name: string
  file_path: string
  start_line: number
  depth: number
  score: number
  level: 'high' | 'medium' | 'low'
  reason: string
}

export type Impact = {
  target: Symbol
  depth: number
  items: ImpactItem[]
}

export type Hotspot = {
  path: string
  changes: number
  connections: number
  score: number
}

export type Source = {
  file: string
  start_line: number
  end_line: number
  verified: boolean
}

export type ChatAnswer = {
  answer: string
  sources: Source[]
  cached: boolean
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

