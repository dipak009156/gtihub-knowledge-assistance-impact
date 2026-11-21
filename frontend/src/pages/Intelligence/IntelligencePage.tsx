import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  FileCode2,
  Copy,
  Check,
  GitPullRequest,
  Activity,
  Layers,
  ArrowRight,
  Cpu,
  HelpCircle,
  BookOpen,
  Info,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  generateSequenceFlow,
  generateTests,
  getDefectPredictions,
  getGraphIntelligence,
  getSymbols,
  runPRReview,
} from '../../api/client'
import type {
  DefectsResponse,
  GraphIntelligenceResponse,
  PRReviewResponse,
  SequenceFlowResponse,
  Symbol,
  TestGenResponse,
} from '../../api/types'
import { LoadingBox } from '../../components/LoadingBox'
import { ErrorBox } from '../../components/ErrorBox'
import { CodeLink } from '../../components/CodeLink'

type TabType = 'pr' | 'defects' | 'tests' | 'graph'

export const IntelligencePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const repoId = Number(id)
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab = (searchParams.get('tab') as TabType) || 'pr'
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [showPlainGuide, setShowPlainGuide] = useState(true)

  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [selectedSymbolId, setSelectedSymbolId] = useState<number | undefined>(
    searchParams.get('symbol_id') ? Number(searchParams.get('symbol_id')) : undefined
  )
  const selectedSymbol = symbols.find((s) => s.id === selectedSymbolId)

  // PR Review State
  const [diffInput, setDiffInput] = useState('')
  const [prLoading, setPrLoading] = useState(false)
  const [prResult, setPrResult] = useState<PRReviewResponse | null>(null)
  const [prError, setPrError] = useState<string | null>(null)

  // Defect Predictor State
  const [defectsLoading, setDefectsLoading] = useState(false)
  const [defectsData, setDefectsData] = useState<DefectsResponse | null>(null)
  const [defectsError, setDefectsError] = useState<string | null>(null)

  // Test Gen State
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestGenResponse | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [copiedTest, setCopiedTest] = useState(false)

  // Sequence & Latent Graph State
  const [seqLoading, setSeqLoading] = useState(false)
  const [seqResult, setSeqResult] = useState<SequenceFlowResponse | null>(null)
  const [seqError, setSeqError] = useState<string | null>(null)
  const [graphIntel, setGraphIntel] = useState<GraphIntelligenceResponse | null>(null)
  const [graphLoading, setGraphLoading] = useState(false)
  const [copiedMermaid, setCopiedMermaid] = useState(false)

  // Load symbols for selectors
  useEffect(() => {
    if (!repoId) return
    getSymbols(repoId)
      .then((data) => {
        setSymbols(data || [])
        if (!selectedSymbolId && data && data.length > 0) {
          setSelectedSymbolId(data[0].id)
        }
      })
      .catch(() => {})
  }, [repoId])

  // Sync tab with URL
  const handleTabChange = (t: TabType) => {
    setActiveTab(t)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', t)
      return next
    })
  }

  // Load ML Defects
  const loadDefects = async () => {
    if (!repoId) return
    setDefectsLoading(true)
    setDefectsError(null)
    try {
      const data = await getDefectPredictions(repoId)
      setDefectsData(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not fetch defect predictions'
      setDefectsError(msg)
    } finally {
      setDefectsLoading(false)
    }
  }

  // Load Graph Intelligence
  const loadGraphIntel = async () => {
    if (!repoId) return
    setGraphLoading(true)
    try {
      const data = await getGraphIntelligence(repoId)
      setGraphIntel(data)
    } catch {
      // Ignore
    } finally {
      setGraphLoading(false)
    }
  }

  // Trigger PR Review
  const handleRunPRReview = async () => {
    if (!repoId) return
    setPrLoading(true)
    setPrError(null)
    try {
      const res = await runPRReview(repoId, diffInput, selectedSymbolId)
      setPrResult(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Autonomous PR review failed'
      setPrError(msg)
    } finally {
      setPrLoading(false)
    }
  }

  // Trigger Test Gen
  const handleGenerateTests = async (symId?: number) => {
    const targetId = symId || selectedSymbolId
    if (!repoId || !targetId) return
    setTestLoading(true)
    setTestError(null)
    try {
      const res = await generateTests(repoId, targetId)
      setTestResult(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test synthesis failed'
      setTestError(msg)
    } finally {
      setTestLoading(false)
    }
  }

  // Trigger Sequence Flow
  const handleGenerateSequence = async (symId?: number) => {
    const targetId = symId || selectedSymbolId
    if (!repoId || !targetId) return
    setSeqLoading(true)
    setSeqError(null)
    try {
      const res = await generateSequenceFlow(repoId, targetId, 4)
      setSeqResult(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sequence diagram synthesis failed'
      setSeqError(msg)
    } finally {
      setSeqLoading(false)
    }
  }

  // Load tab-specific data on mount or tab switch
  useEffect(() => {
    if (activeTab === 'defects' && !defectsData) {
      loadDefects()
    }
    if (activeTab === 'graph') {
      if (!graphIntel) loadGraphIntel()
      if (!seqResult && selectedSymbolId) handleGenerateSequence(selectedSymbolId)
    }
  }, [activeTab])

  // Run initial PR review if empty
  useEffect(() => {
    if (activeTab === 'pr' && !prResult && selectedSymbolId) {
      handleRunPRReview()
    }
  }, [selectedSymbolId])

  const copyToClipboard = (text: string, isMermaid = false) => {
    navigator.clipboard.writeText(text)
    if (isMermaid) {
      setCopiedMermaid(true)
      setTimeout(() => setCopiedMermaid(false), 2000)
    } else {
      setCopiedTest(true)
      setTimeout(() => setCopiedTest(false), 2000)
    }
  }

  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: '1240px' }}>
      {/* Suite Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.35rem' }}>
            <div
              style={{
                padding: '0.45rem',
                borderRadius: 'var(--radius)',
                background: 'var(--accent-subtle)',
                color: 'var(--accent)',
                display: 'inline-flex',
              }}
            >
              <Sparkles size={22} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
              AI & Machine Learning Intelligence Suite
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', margin: 0 }}>
            Automated code review, predictive bug detection, and execution flow tracing — explained in plain English.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPlainGuide(!showPlainGuide)}
          className={`btn btn-sm ${showPlainGuide ? 'btn-primary' : 'btn-secondary'}`}
          style={{ gap: '0.4rem', fontSize: '0.8125rem' }}
          title="Toggle beginner-friendly plain English explanations for all tabs"
        >
          <HelpCircle size={14} />
          <span>{showPlainGuide ? 'Hide Plain English Guide' : 'Explain Like I\'m 5'}</span>
        </button>
      </div>

      {/* Contextual Plain English Tab Guide */}
      {showPlainGuide && (
        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
            background: 'var(--surface)',
            borderLeft: '4px solid var(--accent)',
            borderRadius: 'var(--radius)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <BookOpen size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>
                {activeTab === 'pr' && 'Plain English: What is the PR Review Agent?'}
                {activeTab === 'defects' && 'Plain English: How does AI predict bugs before they happen?'}
                {activeTab === 'tests' && 'Plain English: What are Automated Unit Tests?'}
                {activeTab === 'graph' && 'Plain English: What is Execution Flow & Hidden Link Prediction?'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPlainGuide(false)}
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px 6px', fontSize: '0.75rem' }}
            >
              Dismiss
            </button>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>
            {activeTab === 'pr' && (
              <>
                Think of this as an <strong>AI Senior Software Architect</strong>. When a developer submits a code change (Pull Request),
                this agent automatically scans every other file in the repository to calculate the <strong>Blast Radius</strong> — warning you
                in advance if modifying this function will accidentally break other features across your website.
              </>
            )}
            {activeTab === 'defects' && (
              <>
                Computers don't guess bugs by magic — they detect risky human habits. Software studies show that <strong>80% of software bugs</strong> occur
                in files that are modified frequently by multiple developers (high churn) and have complex nested logic. Our ML model scores each file
                from <strong>0% (Healthy & Stable)</strong> to <strong>100% (High Danger Zone)</strong> so you know where to focus testing.
              </>
            )}
            {activeTab === 'tests' && (
              <>
                Writing tests manually takes hours of tedious typing. This GenAI engine reads your selected function and automatically writes real,
                runnable test cases (testing standard inputs, empty/zero values, and invalid edge cases) so you can prove the code works without testing by hand.
              </>
            )}
            {activeTab === 'graph' && (
              <>
                <strong>Execution Sequence</strong> traces the exact step-by-step chain of events when code runs (e.g., Step 1 calls Step 2, which calls Step 3).{' '}
                <strong>Hidden Link Prediction</strong> uncovers 'silent twin' files: files that don't directly import each other, but almost always get changed together in git commits (like updating a database schema and its form).
              </>
            )}
          </p>
        </div>
      )}

      {/* Primary Sub-Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border)',
          marginBottom: '1.75rem',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'pr', label: 'PR Review Agent', icon: GitPullRequest, badge: 'Agentic' },
          { id: 'defects', label: 'ML Bug Propensity', icon: Activity, badge: 'ML' },
          { id: 'tests', label: 'Automated Test Synthesis', icon: FileCode2, badge: 'GenAI' },
          { id: 'graph', label: 'Sequence Flow & Latent Graph', icon: Layers, badge: 'Graph ML' },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          const TabIcon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as TabType)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1rem',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: isActive ? 'var(--accent-subtle)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                borderRadius: 'var(--radius) var(--radius) 0 0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: '-1px',
              }}
            >
              <TabIcon size={16} />
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-bubble)',
                  background: isActive ? 'var(--accent)' : 'var(--surface-secondary)',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {tab.badge}
              </span>
            </button>
          )
        })}
      </div>

      {/* Function Selector Toolbar (Common for PR, Tests, Sequence) */}
      {activeTab !== 'defects' && (
        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'var(--surface-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Target Function:
            </span>
            <select
              value={selectedSymbolId || ''}
              onChange={(e) => {
                const val = Number(e.target.value)
                setSelectedSymbolId(val)
                if (activeTab === 'tests') handleGenerateTests(val)
                if (activeTab === 'graph') handleGenerateSequence(val)
              }}
              className="input"
              style={{ minWidth: '260px', fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
            >
              {symbols.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.file_path}:{s.start_line})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {activeTab === 'pr' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleRunPRReview}
                disabled={prLoading}
                style={{ gap: '0.4rem' }}
              >
                <Play size={13} />
                <span>{prLoading ? 'Analyzing...' : 'Run Autonomous Review'}</span>
              </button>
            )}
            {activeTab === 'tests' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleGenerateTests()}
                disabled={testLoading}
                style={{ gap: '0.4rem' }}
              >
                <Cpu size={13} />
                <span>{testLoading ? 'Synthesizing...' : 'Regenerate Tests'}</span>
              </button>
            )}
            {activeTab === 'graph' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleGenerateSequence()}
                disabled={seqLoading}
                style={{ gap: '0.4rem' }}
              >
                <Layers size={13} />
                <span>{seqLoading ? 'Tracing...' : 'Trace Sequence Flow'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 1: PR REVIEW AGENT ── */}
      {activeTab === 'pr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Diff Input Drawer */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>
                Simulate Git Diff or Proposed Pull Request (Optional)
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setDiffInput(`diff --git a/shop/payment.py b/shop/payment.py\n--- a/shop/payment.py\n+++ b/shop/payment.py\n@@ -5,3 +5,4 @@\n-def charge_card(amount, token):\n+def charge_card(amount, token, currency="USD", idempotent=True):`)
                }
                style={{ fontSize: '0.75rem', color: 'var(--accent)' }}
              >
                Insert Sample Diff
              </button>
            </div>
            <textarea
              className="input"
              rows={3}
              placeholder="Paste raw unified git diff here (e.g. diff --git a/orders.py b/orders.py...)"
              value={diffInput}
              onChange={(e) => setDiffInput(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', width: '100%' }}
            />
          </div>

          {prError && <ErrorBox message={prError} onRetry={handleRunPRReview} />}

          {prLoading && <LoadingBox height={240} lines={5} />}

          {prResult && !prLoading && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Verdict Banner */}
              <div
                className="card"
                style={{
                  padding: '1.5rem',
                  borderLeft: `5px solid ${
                    prResult.verdict === 'BLOCKED_HIGH_RISK'
                      ? 'var(--danger)'
                      : prResult.verdict === 'REVIEW_REQUIRED'
                      ? 'var(--warn)'
                      : 'var(--ok)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {prResult.verdict === 'BLOCKED_HIGH_RISK' ? (
                      <ShieldAlert size={28} style={{ color: 'var(--danger)' }} />
                    ) : prResult.verdict === 'REVIEW_REQUIRED' ? (
                      <AlertTriangle size={28} style={{ color: 'var(--warn)' }} />
                    ) : (
                      <ShieldCheck size={28} style={{ color: 'var(--ok)' }} />
                    )}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        Architectural Gate Verdict
                      </div>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          color:
                            prResult.verdict === 'BLOCKED_HIGH_RISK'
                              ? 'var(--danger)'
                              : prResult.verdict === 'REVIEW_REQUIRED'
                              ? 'var(--warn)'
                              : 'var(--ok)',
                        }}
                      >
                        {prResult.verdict.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Blast Radius Risk Score
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
                        {prResult.risk_score}
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>
                  {prResult.summary}
                </p>

                {/* Plain English Impact Interpretation */}
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent)', marginBottom: '0.25rem' }}>
                    What this verdict means in plain English:
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
                    {prResult.verdict === 'BLOCKED_HIGH_RISK'
                      ? '⚠️ High Risk: This code change impacts central functions used across multiple files. Do not merge without updating and testing the affected callers listed below.'
                      : prResult.verdict === 'REVIEW_REQUIRED'
                      ? '⚠️ Caution: Several files depend on this function. Please test those files carefully before deploying.'
                      : '✅ Safe to Merge: This change is self-contained and does not disturb any downstream systems.'}
                  </p>
                </div>
              </div>

              {/* 2-Column: Breaking Risks & Security Checklist */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
                <div className="card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <AlertTriangle size={16} style={{ color: 'var(--warn)' }} />
                    <span>Breaking Contract Risks ({prResult.breaking_risks.length})</span>
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {prResult.breaking_risks.map((risk, i) => (
                      <li key={i}>{risk}</li>
                    ))}
                  </ul>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <ShieldCheck size={16} style={{ color: 'var(--ok)' }} />
                    <span>Security & Sanity Checks</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {prResult.security_checklist.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        <Check size={14} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Downstream Callers Table */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                      Affected Callers in Blast Radius ({prResult.caller_count})
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      Functions that will trigger regressions if this interface contract shifts.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setActiveTab('tests')
                      handleGenerateTests(prResult.target_symbol.id)
                    }}
                    style={{ gap: '0.35rem' }}
                  >
                    <FileCode2 size={13} />
                    <span>Synthesize Tests for Target</span>
                  </button>
                </div>

                {prResult.affected_callers.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    No upstream callers detected. This modification is self-contained.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Caller Symbol</th>
                          <th>Location</th>
                          <th>Hop Depth</th>
                          <th>Risk Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prResult.affected_callers.map((c, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                              {c.name}()
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <FileCode2 size={13} style={{ color: 'var(--accent)' }} />
                                <CodeLink file={c.file_path} repoId={repoId}>
                                  {c.file_path}
                                </CodeLink>
                              </div>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                              {c.depth || 1} {c.depth === 1 ? 'direct call' : 'steps away'}
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  c.level === 'high' ? 'badge-danger' : c.level === 'medium' ? 'badge-warn' : 'badge-ok'
                                }`}
                              >
                                {c.level || 'medium'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ── TAB 2: ML BUG PROPENSITY & DEFECT PREDICTOR ── */}
      {activeTab === 'defects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {defectsLoading && <LoadingBox height={280} lines={5} />}

          {defectsError && <ErrorBox message={defectsError} onRetry={loadDefects} />}

          {defectsData && !defectsLoading && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    High-Risk Files
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.25rem' }}>
                    {defectsData.summary.high_risk_files}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Out of {defectsData.summary.total_files} analyzed
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Avg Defect Propensity
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', marginTop: '0.25rem' }}>
                    {defectsData.summary.average_risk_score}
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>%</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Cross-file regression risk
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Commits Trained
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.25rem' }}>
                    {defectsData.summary.total_commits}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Historical training vectors
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    ML Architecture
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', marginTop: '0.5rem' }}>
                    Ensemble Metric v1.4
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Calibrated logistic entropy
                  </div>
                </div>
              </div>

              {/* Predictions Table */}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>File Path</th>
                      <th>Defect Probability</th>
                      <th>Risk Level</th>
                      <th>Churn / Authors</th>
                      <th>Explainable AI Primary Drivers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defectsData.predictions.map((p) => (
                      <tr key={p.file_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <FileCode2 size={14} style={{ color: 'var(--accent)' }} />
                            <CodeLink file={p.path} repoId={repoId}>
                              {p.path}
                            </CodeLink>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div
                              style={{
                                width: '60px',
                                height: '6px',
                                background: 'var(--border)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${p.risk_score}%`,
                                  height: '100%',
                                  background:
                                    p.risk_level === 'CRITICAL'
                                      ? 'var(--danger)'
                                      : p.risk_level === 'HIGH'
                                      ? 'var(--warn)'
                                      : 'var(--ok)',
                                }}
                              />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600 }}>
                              {p.risk_score}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              p.risk_level === 'CRITICAL'
                                ? 'badge-danger'
                                : p.risk_level === 'HIGH'
                                ? 'badge-warn'
                                : p.risk_level === 'MODERATE'
                                ? 'badge-neutral'
                                : 'badge-ok'
                            }`}
                          >
                            {p.risk_level}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                          {p.churn_count} commits &bull; {p.author_count} authors
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <ul style={{ margin: 0, paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {p.primary_drivers.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ── TAB 3: AUTOMATED TEST SYNTHESIS ── */}
      {activeTab === 'tests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {testLoading && <LoadingBox height={280} lines={5} />}

          {testError && <ErrorBox message={testError} onRetry={() => handleGenerateTests()} />}

          {testResult && !testLoading && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                      Generated {testResult.framework} Suite for `{testResult.symbol.name}()`
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      Includes happy-path, boundary edge cases, and regression assertions for {testResult.caller_count} downstream callers.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyToClipboard(testResult.test_code)}
                    style={{ gap: '0.4rem' }}
                  >
                    {copiedTest ? <Check size={14} style={{ color: 'var(--ok)' }} /> : <Copy size={14} />}
                    <span>{copiedTest ? 'Copied to Clipboard' : 'Copy Test Suite'}</span>
                  </button>
                </div>

                <div
                  style={{
                    marginTop: '1rem',
                    background: 'var(--surface-secondary)',
                    borderRadius: 'var(--radius)',
                    padding: '1rem',
                    overflowX: 'auto',
                    border: '1px solid var(--border)',
                  }}
                >
                  <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', lineHeight: 1.5, color: 'var(--text)' }}>
                    <code>{testResult.test_code}</code>
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ── TAB 4: SEQUENCE FLOW & LATENT GRAPH INTELLIGENCE ── */}
      {activeTab === 'graph' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Section A: Sequence Flow */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                  Interactive Execution Sequence Flow
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Traced recursive call chains across modules from entry-point function.
                </p>
              </div>
              {seqResult && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyToClipboard(seqResult.mermaid, true)}
                  style={{ gap: '0.4rem' }}
                >
                  {copiedMermaid ? <Check size={14} style={{ color: 'var(--ok)' }} /> : <Copy size={14} />}
                  <span>{copiedMermaid ? 'Mermaid Copied' : 'Copy Mermaid Markdown'}</span>
                </button>
              )}
            </div>

            {seqLoading && <LoadingBox height={160} lines={3} />}

            {seqError && <ErrorBox message={seqError} onRetry={() => handleGenerateSequence()} />}

            {seqResult && !seqLoading && (
              <div>
                {/* Story Summary Card */}
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    background: 'var(--surface-subtle)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                  }}
                >
                  <BookOpen size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text)', lineHeight: 1.45 }}>
                    <strong>Execution Story in Plain English:</strong> Running this function triggers a sequence of{' '}
                    <strong>{seqResult.steps.length} call{seqResult.steps.length === 1 ? '' : 's'}</strong>{' '}
                    across <strong>{new Set(seqResult.steps.map((s) => s.module)).size} file(s)</strong>.
                    Follow the numbered steps below to see how control moves through your codebase.
                  </div>
                </div>

                {/* Step-by-Step Flow with Plain English Explanations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {seqResult.steps.map((step, idx) => {
                    const isCertain = step.certainty === 'certain'
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '0.75rem 1rem',
                          background: 'var(--surface)',
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <span
                              style={{
                                background: 'var(--accent-subtle)',
                                color: 'var(--accent)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-bubble)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              Step {idx + 1}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text)', fontSize: '0.875rem' }}>
                              {step.caller}
                            </span>
                            <ArrowRight size={14} style={{ color: 'var(--accent)' }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', fontSize: '0.875rem' }}>
                              {step.callee}()
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              className={`badge ${isCertain ? 'badge-ok' : 'badge-warn'}`}
                              style={{ fontSize: '0.6875rem' }}
                              title={isCertain ? 'Deterministic static code call' : 'Conditional or dynamic invocation'}
                            >
                              {isCertain ? 'Direct Call' : 'Conditional Call'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              in <code>{step.module}</code>
                            </span>
                          </div>
                        </div>

                        {/* Plain English explanation of the call */}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                          👉 <strong>What happens here:</strong> Code running in <code>{step.caller}</code> hands off execution to{' '}
                          <code>{step.callee}()</code> in file <code>{step.module}</code>.{' '}
                          {isCertain
                            ? 'This call is guaranteed to execute whenever this flow is reached.'
                            : 'This call only executes if certain input conditions or branch checks pass.'}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Mermaid Code Snippet Preview */}
                <div style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Mermaid Diagram Definition (Copy & Share):
                  </div>
                  <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text)' }}>
                    <code>{seqResult.mermaid}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Section B: Latent Coupling Graph Intelligence */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Latent Coupling & Hidden Link Prediction
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Discovered non-obvious coupling between modules that lack direct AST imports but frequently co-change or bridge through common nodes.
              </p>
            </div>

            {/* Plain English Explainer Card */}
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'var(--surface-subtle)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                marginBottom: '1rem',
                fontSize: '0.78rem',
                color: 'var(--text)',
                lineHeight: 1.45,
              }}
            >
              💡 <strong>Why this matters to anyone editing code:</strong> Some files are like &quot;silent twins&quot; — for example, updating a payment API often requires updating the checkout receipt page. If you only edit one file and forget the other, bugs happen. Graph ML highlights these hidden links so you know which related files to check.
            </div>

            {graphLoading && <LoadingBox height={160} lines={3} />}

            {graphIntel && !graphLoading && (
              <div>
                {graphIntel.links.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    No latent hidden coupling detected beyond direct call edges.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Source Module</th>
                          <th>Target Module</th>
                          <th>Latent Probability</th>
                          <th>Inference Topology</th>
                          <th>Architectural Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {graphIntel.links.map((link, idx) => (
                          <tr key={idx}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <FileCode2 size={13} style={{ color: 'var(--accent)' }} />
                                <CodeLink file={link.source_path} repoId={repoId}>
                                  {link.source_path}
                                </CodeLink>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <FileCode2 size={13} style={{ color: 'var(--accent)' }} />
                                <CodeLink file={link.target_path} repoId={repoId}>
                                  {link.target_path}
                                </CodeLink>
                              </div>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', fontSize: '0.8125rem' }}>
                              {Math.round(link.link_probability * 100)}%
                            </td>
                            <td>
                              <span className="badge badge-neutral">
                                {link.inference_type === 'co_change'
                                  ? 'Git Co-Editing Habit'
                                  : link.inference_type === 'common_neighbors'
                                  ? 'Shared Helper Libraries'
                                  : link.inference_type}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {link.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default IntelligencePage
