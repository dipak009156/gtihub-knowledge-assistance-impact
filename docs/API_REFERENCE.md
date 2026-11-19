# API Reference & Endpoints

All backend endpoints are served under `/api` and documented interactively via OpenAPI / Swagger at `http://localhost:8000/docs`.

---

## 1. System & Health

* `GET /api/health`: Health status check. Returns `{"status": "ok"}`.
* `GET /api/health/db`: Database connectivity verification.
* `GET /api/demo-repos`: Preconfigured demonstration repositories.

---

## 2. Ingestion & Repository Management

* `POST /api/repos`: Ingest a GitHub repository. Accepts `{"url": "owner/repo"}` or full URL.
* `GET /api/repos/{id}`: Ingestion status and repository summary metadata.
* `POST /api/repos/{id}/reindex`: Triggers a full re-parse and re-index of the repository codebase.
* `GET /api/repos/{id}/files`: Recursive file tree structure with line counts and sizes.
* `GET /api/repos/{id}/symbols`: Indexed symbol catalogue (classes, functions, methods, modules).

---

## 3. Dependency & Call Graph

* `GET /api/repos/{id}/graph`: Retrieves the call and dependency graph payload.
  * Query parameters:
    * `view_level`: `'call'` (fine-grained function calls) or `'module'` (coarse-grained module dependencies).
    * `folder`: Filter by root subdirectory (e.g. `src`, `backend`).
  * Returns nodes with `degree`, `kind`, `file_path`, and edges with `certainty` (`'certain'` / `'uncertain'`).

---

## 4. Blast Radius & Impact Analysis

* `GET /api/repos/{id}/impact`: Computes downstream blast radius for a given symbol.
  * Query parameters:
    * `symbol`: Symbol name or label.
    * `symbol_id`: Integer symbol identifier.
    * `depth`: Traversal hops (1 to 5).
  * Returns impacted files, direct callers, indirect callers, and dynamic risk level (`Low`, `Medium`, `High`, `Critical`).

---

## 5. Machine Learning & Predictive Defect Scoring

* `GET /api/repos/{id}/ml/defect-propensity`: Retrieves file-level bug propensity predictions.
  * Returns ranked files, complexity scores, churn velocity, centrality weights, and mitigation advice.
* `GET /api/repos/{id}/ml/hot-paths`: Identifies critical architectural call paths with highest execution centrality.

---

## 6. Agentic Code Assistance & PR Reviewer

* `POST /api/repos/{id}/agentic/pr-review`: Evaluates pull request changes.
  * Body: `{"diff": "...", "title": "...", "target_branch": "main"}`
  * Returns automated verdict (`Approved`, `Warning`, `Block`), breaking contract risks, and blast radius.
* `POST /api/repos/{id}/agentic/test-gen`: Generates targeted unit tests for a symbol.
  * Body: `{"symbol_id": 123, "framework": "pytest"}`
  * Returns production-ready Python unit test code with edge case mocks.
* `GET /api/repos/{id}/agentic/sequence-flow`: Generates Mermaid sequence diagram syntax for a call path.

---

## 7. AI Code Chat with Grounded Citations

* `POST /api/repos/{id}/chat`: Questions codebase architecture with grounded citations.
  * Body: `{"query": "How is authentication handled?", "history": []}`
  * Returns response text with explicit file/line citations and verified code citations.
