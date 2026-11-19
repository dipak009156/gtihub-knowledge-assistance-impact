# GitHub Knowledge Assistance (GKA)

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.13-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%20%7C%20TypeScript-61DAFB.svg)](https://vitejs.dev)
[![Tests](https://img.shields.io/badge/Tests-70%20Backend%20%2F%2030%20Frontend%20Passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**GitHub Knowledge Assistance (GKA)** is a deterministic, verifiable codebase intelligence platform. It analyzes repositories to extract high-accuracy call and dependency graphs, compute downstream blast radius impacts, predict bug propensity using machine learning, and provide agentic code reviews with mathematically grounded citations.

---

## Key Capabilities

* 🌐 **Polyglot Code Ingestion**: Parses Python, TypeScript, JavaScript, Go, Rust, Java, C#, and C++ with fallback shallow git clone resilience.
* 📊 **Presentation-Grade Dependency & Call Graph**: Hardware-accelerated Cytoscape canvas featuring CAD architectural dot grid, multi-tier semantic node styling, 1-click Architecture Backbone filter, and reversible presets.
* 💥 **Blast Radius & Impact Explorer**: Interactive multi-hop dependency traversal (1–5 hops) with dynamic risk level scoring and affected file identification.
* 🧠 **Machine Learning Bug Propensity**: Statistical defect prediction combining cyclomatic complexity, churn velocity, and dependency graph centrality.
* 🤖 **Agentic Code Review & Test Synthesis**: Autonomous PR reviewer detecting contract breaking changes and synthesizing targeted pytest unit tests.
* ⌨️ **Global Command Palette (`Ctrl+K`)**: Rapid symbol jumping, file lookup, and screen routing directly from the keyboard.
* 📋 **1-Click Executive Audit Report**: Health scorecard (Grades A+ to F, architecture dials, defect density) with instant Markdown export & PDF printing.
* 🚀 **GitHub Action CI/CD Guard (`action.yml`)**: Automated pull request guard analyzing blast radius and posting rich step summaries.
* 💬 **AI Code Chat with Grounded Citations**: Interactive architecture Q&A backed by LLM reasoning with strict citation grounding.

---

## Directory Structure

```
gtihub-knowledge-assistance-impact/
├── backend/                  # FastAPI Backend (Python)
│   ├── app/
│   │   ├── agentic/          # Autonomous PR review & unit test synthesizer
│   │   ├── api/              # Centralized API router registry (v1)
│   │   ├── auth/             # GitHub OAuth & session tokens
│   │   ├── db/               # SQLAlchemy models & database sessions
│   │   ├── graph/            # Call graph extraction & certainty resolver
│   │   ├── history/          # Git commit mining & churn velocity engine
│   │   ├── impact/           # Multi-hop blast radius & impact engine
│   │   ├── ingest/           # Cloner, URL sanitizer, & repo reindexer
│   │   ├── llm/              # Grounded chat client & multi-model fallback
│   │   ├── ml/               # Defect propensity & graph intelligence
│   │   ├── parser/           # Polyglot AST symbol & call parser
│   │   └── validation/       # Ground-truth verification benchmark harness
│   ├── migrations/           # Alembic database migration scripts
│   └── tests/                # Pytest unit & regression test suite (70 tests)
│
├── frontend/                 # React 19 + TypeScript SPA (Vite)
│   └── src/
│       ├── api/              # Strongly typed API client & MSW mocks
│       ├── components/       # Layout, Sidebar, CommandPalette, Badges, Modals
│       ├── pages/            # 12 Modular page workspaces (Graph, Impact, ML, Chat)
│       ├── lib/              # GitHub URL parser, utilities, & helpers
│       ├── theme/            # Swiss minimalist glass design system & dark mode
│       └── tests/            # Vitest screen & component test suites (30 tests)
│
├── docs/                     # System Documentation
│   ├── ARCHITECTURE.md       # High-level architecture & certainty models
│   ├── API_REFERENCE.md      # Comprehensive REST endpoint catalogue
│   └── DEVELOPMENT.md        # Local setup, testing, & contributing guide
│
├── scripts/                  # Developer & DevOps Automation Scripts
│   ├── dev.ps1               # Concurrent backend & frontend launcher
│   ├── test.ps1              # Full pytest + vitest test runner
│   ├── share.ps1             # Instant Cloudflare tunnel sharing (PowerShell)
│   └── share.sh              # Instant Cloudflare tunnel sharing (Bash)
│
├── docker-compose.yml        # Multi-container orchestration (App + Tunnel)
├── Dockerfile                # Multi-stage production container build
└── README.md                 # Project overview and quickstart
```

---

## Quickstart

### 1. Automated Dev Launch (Windows PowerShell)
```powershell
./scripts/dev.ps1
```

### 2. Manual Setup

**Backend**:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

* UI: `http://localhost:5173`
* Interactive API Docs: `http://localhost:8000/docs`

---

## Testing & Quality Assurance

Run the complete test suite across the entire repository:

```powershell
./scripts/test.ps1
```

Or individually:
* **Backend**: `cd backend && python -m pytest tests/` (**70 / 70 passed**)
* **Frontend**: `cd frontend && npx vitest run` (**30 / 30 passed**)
* **Production Build**: `cd frontend && npm run build` (**0 errors**)

---

## Documentation Links

* [System Architecture & Models](docs/ARCHITECTURE.md)
* [API Reference & Schema](docs/API_REFERENCE.md)
* [Developer & Setup Guide](docs/DEVELOPMENT.md)
