import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api import api_router
from app.db.session import engine, init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        init_db()
        from app.db.models import Repo
        from app.db.session import SessionLocal

        with SessionLocal() as session:
            stuck = (
                session.query(Repo)
                .filter(Repo.status.in_(["cloning", "parsing", "analyzing"]))
                .all()
            )
            for r in stuck:
                r.status = "error"
                r.error_message = (
                    "Analysis was interrupted when server restarted. Click Retry to re-run."
                )
            session.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not auto-initialize DB tables: %s", exc)
    yield


app = FastAPI(title="GitHub Knowledge Assistance", version="0.1.0", lifespan=lifespan)


@app.exception_handler(SQLAlchemyError)
def sqlalchemy_exception_handler(_request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=503,
        content={"detail": f"Database unavailable: {exc}"},
    )


# Register Modular API Routers
app.include_router(api_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/demo-repos")
def list_demo_repos():
    return [
        {
            "name": "click",
            "url": "https://github.com/pallets/click",
            "description": "Composable command line interface toolkit for Python.",
        },
        {
            "name": "flask",
            "url": "https://github.com/pallets/flask",
            "description": "The Python micro framework for building web applications.",
        },
        {
            "name": "requests",
            "url": "https://github.com/psf/requests",
            "description": "A simple, yet elegant, HTTP library for Python.",
        },
    ]


@app.get("/api/health/db")
def health_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Database unavailable") from None
    return {"status": "ok", "database": "connected"}


# Serve built React frontend if available (unified container / production mode)
FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if not FRONTEND_DIST.exists():
    FRONTEND_DIST = Path("/app/frontend/dist")
if not FRONTEND_DIST.exists():
    FRONTEND_DIST = Path("/app/dist")

if FRONTEND_DIST.exists():
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles

    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount(
            "/assets", StaticFiles(directory=assets_dir.as_posix()), name="assets"
        )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(_request: Request, full_path: str):
        if full_path.startswith("api/") or full_path in (
            "docs",
            "openapi.json",
            "redoc",
        ):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path.as_posix())
        return FileResponse((FRONTEND_DIST / "index.html").as_posix())
