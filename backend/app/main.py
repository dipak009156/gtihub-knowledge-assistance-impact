from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.graph.router import router as graph_router
from app.ingest.router import router as ingest_router

app = FastAPI(title="GitHub Knowledge Assistance", version="0.1.0")
engine = create_engine(settings.database_url, pool_pre_ping=True)

app.include_router(ingest_router)
app.include_router(graph_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/health/db")
def health_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Database unavailable") from None
    return {"status": "ok", "database": "connected"}
