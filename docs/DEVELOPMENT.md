# Developer Guide & Local Setup

This guide details setting up, developing, testing, and deploying **GitHub Knowledge Assistance**.

---

## 1. Prerequisites

* **Python 3.11+** (or Python 3.13)
* **Node.js 18+** (or Node 20+)
* **Git** installed and available on PATH
* Optional: **Docker** & **Docker Compose**

---

## 2. Local Development Setup

### A. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI dev server with auto-reload
python -m uvicorn app.main:app --reload --port 8000
```
API Documentation will be available at: `http://localhost:8000/docs`

### B. Frontend Setup
```bash
cd frontend

# Install npm packages
npm install

# Start Vite dev server
npm run dev
```
The UI will be accessible at: `http://localhost:5173`

---

## 3. Convenience Scripts

Located in the `scripts/` directory:

* `scripts/dev.ps1`: Launches both backend and frontend servers in concurrent PowerShell windows.
* `scripts/test.ps1`: Runs the complete test suite (pytest + vitest).
* `scripts/share.ps1`: Instantly exposes your local application over a secure Cloudflare or SSH public tunnel for remote sharing.

---

## 4. Running Test Suites

### Backend Unit & Regression Tests
```bash
cd backend
python -m pytest tests/ -v
```

### Frontend Component & Integration Tests
```bash
cd frontend
npx vitest run
```

### Full Frontend Production Build Check
```bash
cd frontend
npm run build
```
