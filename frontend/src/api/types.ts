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

// ── ML & Predictive Graph Intelligence Types ──

export type DefectPrediction = {
  file_id: number
  path: string
  line_count: number
  symbol_count: number
  churn_count: number
  author_count: number
  inbound_callers: number
  outbound_callees: number
  defect_probability: number
  risk_score: number
  risk_level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'
  primary_drivers: string[]
  mitigations: string[]
}

export type DefectsResponse = {
  summary: {
    total_files: number
    total_commits: number
    high_risk_files: number
    average_risk_score: number
    model: string
  }
  predictions: DefectPrediction[]
}

export type LatentLink = {
  source_path: string
  target_path: string
  link_probability: number
  shared_neighbor_count: number
  cochange_count: number
  inference_type: string
  reason: string
}

export type GraphIntelligenceResponse = {
  summary: {
    total_direct_edges: number
    predicted_latent_links: number
    algorithm: string
  }
  links: LatentLink[]
}

// ── Generative AI & Agentic Assistance Types ──

export type AffectedCaller = {
  name: string
  file_path: string
  level?: string
  score?: number
  depth?: number
}

export type PRReviewResponse = {
  verdict: 'APPROVE' | 'REVIEW_REQUIRED' | 'BLOCKED_HIGH_RISK'
  risk_score: number
  summary: string
  target_symbol: {
    id: number
    name: string
    file_path: string
    kind?: string
  }
  caller_count: number
  breaking_risks: string[]
  affected_callers: AffectedCaller[]
  security_checklist: string[]
  suggested_tests: string[]
}

export type TestGenResponse = {
  symbol: {
    id: number
    name: string
    file_path: string
    kind: string
    start_line: number
    end_line: number
  }
  framework: string
  language: string
  caller_count: number
  callers: Array<{ name: string; file: string; line: number }>
  test_code: string
}

export type SequenceStep = {
  caller: string
  callee: string
  module: string
  certainty: string
}

export type SequenceFlowResponse = {
  symbol: {
    id: number
    name: string
    file_path: string
    start_line: number
  }
  mermaid: string
  steps_count: number
  steps: SequenceStep[]
}

export type Scorecard = {
  grade: string
  overall_score: number
  architecture_score: number
  reliability_score: number
  testability_score: number
}

export type ReportRecommendation = {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  category: string
  message: string
}

export type ExecutiveReport = {
  repository: {
    id: number
    owner: string
    name: string
    url: string
    status: string
    generated_at: string
  }
  scorecard: Scorecard
  metrics: {
    total_files: number
    total_lines_of_code: number
    total_symbols: number
    total_call_edges: number
    certainty_percentage: number
    languages: Record<string, number>
  }
  top_hubs: Array<{
    id: number
    name: string
    qualified_name: string
    kind: string
    callers: number
    callees: number
  }>
  hotspots: Array<{
    path: string
    changes: number
    connections: number
    score: number
  }>
  top_defect_risks: Array<{
    file_path: string
    complexity: number
    churn: number
    defect_propensity_score: number
    risk_level: string
  }>
  recommendations: ReportRecommendation[]
}



