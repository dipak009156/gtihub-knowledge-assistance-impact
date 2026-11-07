from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.graph.router import router as graph_router
from app.history.router import router as history_router
from app.impact.router import router as impact_router
from app.ingest.router import router as ingest_router
from app.llm.router import router as llm_router
from app.validation.router import router as validation_router

app = FastAPI(title="GitHub Knowledge Assistance", version="0.1.0")
engine = create_engine(settings.database_url, pool_pre_ping=True)

app.include_router(ingest_router)
app.include_router(graph_router)
app.include_router(history_router)
app.include_router(impact_router)
app.include_router(validation_router)
app.include_router(llm_router)


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
