# System Architecture & Technical Specifications

**GitHub Knowledge Assistance (GKA)** is an enterprise-grade, verifiable codebase intelligence platform. It provides deterministic call and dependency graph extraction, impact radius analysis, predictive ML bug propensity scoring, and agentic code review.

```
                      ┌──────────────────────────────────────┐
                      │    Modern Enterprise React UI        │
                      │  (Unified Header, CAD Graph, HUD)   │
                      └──────────────────┬───────────────────┘
                                         │ JSON / SSE / REST
                                         ▼
                      ┌──────────────────────────────────────┐
                      │      FastAPI High-Performance API    │
                      │   (DDD Modular Router Architecture)   │
                      └──────────────────┬───────────────────┘
                                         │
        ┌───────────────────┬────────────┴───────┬───────────────────┐
        ▼                   ▼                    ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌────────────────┐   ┌───────────────┐
│ Ingest Engine │   │ Parser Engine │   │ Graph & Impact │   │ ML & Agentic  │
│ (Clone / Zip) │   │  (Polyglot)   │   │  (Deterministic│   │ (Bug & Review │
│               │   │               │   │   Resolution)  │   │     Suite)    │
└───────┬───────┘   └───────┬───────┘   └────────┬───────┘   └───────┬───────┘
        │                   │                    │                   │
        └───────────────────┼────────────────────┴───────────────────┘
                            ▼
              ┌───────────────────────────┐
              │ SQLite / PostgreSQL & AST │
              │ Persistent Knowledge Base │
              └───────────────────────────┘
```

---

## 1. Domain-Driven Backend Architecture

The backend follows Domain-Driven Design (DDD) principles where each business domain is isolated in its own package under `backend/app/`:

| Domain Package | Purpose & Responsibilities |
|---|---|
| `app/ingest` | Repository downloading via GitHub API zipball or fallback shallow git clone, URL parsing, sanitization, and reindexing. |
| `app/parser` | Polyglot AST parsing (Python, TS/JS, Go, Rust, Java, C#, C++), symbol identification (classes, functions, methods, modules). |
| `app/graph` | Deterministic call resolution, certain vs uncertain edge classification, and Cytoscape JSON payload generation. |
| `app/impact` | BFS/DFS graph blast radius traversal, multi-hop impact calculation, and affected symbol weighting. |
| `app/history` | Git commit mining, author metrics, file churn velocity, and temporal co-change analysis. |
| `app/ml` | Statistical bug propensity scoring combining cyclomatic complexity, churn velocity, and degree centrality. |
| `app/agentic` | Autonomous PR review agent, breaking contract identification, sequence flow diagram generation, and unit test synthesis. |
| `app/llm` | Grounded AI code assistant with strict citation verification and multi-model fallback. |
| `app/validation` | Verification benchmark test harness evaluating precision, recall, and citation accuracy against ground truth. |
| `app/auth` | GitHub OAuth authentication flow and JWT session management. |
| `app/api` | Centralized router registry combining domain endpoints under clean namespaces. |

---

## 2. Deterministic Call Resolution & Certainty Engine

Unlike heuristic or fuzzy search systems, GKA resolves function calls using formal static analysis:

1. **Intra-module Calls**: Fully qualified symbol resolution within the same file.
2. **Explicit Imports (`from module import symbol`)**: Symbol mapping across module boundaries via resolved import trees.
3. **Certainty Classification**:
   * **Certain (`certain`)**: Statically confirmed function and method calls where the target definition is uniquely resolved.
   * **Uncertain (`uncertain`)**: Dynamic dispatch, runtime attributes, polymorphic calls, or external library calls.

---

## 3. Predictive Machine Learning (ML) Engine

The defect propensity engine models the likelihood of software defects using software engineering metrics:

$$\text{Risk Score} = w_1 \cdot \text{Normalized Complexity} + w_2 \cdot \text{Churn Velocity} + w_3 \cdot \text{Centrality Rank}$$

Where:
* **Normalized Complexity**: Estimated based on branching statements, loops, and function depth.
* **Churn Velocity**: Normalized count of modifications and distinct authors in recent git history.
* **Centrality Rank**: Degree centrality within the dependency graph (higher centrality = higher regression risk).

---

## 4. Frontend Architecture & Design System

The frontend is constructed using Vite, React 19, TypeScript, Framer Motion, and Cytoscape:

* **Unified Enterprise Header**: Sticky top navigation unifying breadcrumbs, search, branch badges, and section tabs.
* **CAD Graph Visualizer**: Hardware-accelerated Cytoscape canvas featuring a blueprint dot-grid background, multi-tier semantic coloring (Violet for classes, Emerald for functions, Sky Blue for hubs), and resting edge opacities.
* **Global Command Palette**: Instant `Ctrl+K` keyboard-driven symbol finder and action launcher.
* **Reversible State Management**: 1-click Architecture Backbone filtering, inspection history navigation (`<` / `>`), and full graph snapshot exports.
