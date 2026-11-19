from fastapi import APIRouter

from app.agentic.router import router as agentic_router
from app.auth.router import router as auth_router
from app.graph.router import router as graph_router
from app.history.router import router as history_router
from app.impact.router import router as impact_router
from app.ingest.router import router as ingest_router
from app.llm.router import router as llm_router
from app.ml.router import router as ml_router
from app.report.router import router as report_router
from app.validation.router import router as validation_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(ingest_router)
api_router.include_router(graph_router)
api_router.include_router(history_router)
api_router.include_router(impact_router)
api_router.include_router(ml_router)
api_router.include_router(agentic_router)
api_router.include_router(report_router)
api_router.include_router(validation_router)
api_router.include_router(llm_router)
