# GitHub Knowledge Assistance

Impact analysis for public Python repositories.

## Setup (WSL2 + Docker Desktop)
1. `cp .env.example .env` and set a password (same one in `POSTGRES_PASSWORD` and `DATABASE_URL`).
2. `docker compose up -d --build` (database on port 5433).
3. Backend: `cd backend && uv sync && uv run alembic upgrade head && uv run uvicorn app.main:app --reload --port 8000`
4. Frontend: `cd frontend && npm install && npm run dev`
5. Open http://localhost:5173

## Checks
- Backend: `uv run ruff check . && uv run pytest -q`
- Frontend: `npm run lint && npm run build`
