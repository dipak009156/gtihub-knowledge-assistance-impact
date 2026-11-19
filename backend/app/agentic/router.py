from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agentic.pr_agent import review_diff_or_symbol
from app.agentic.sequence_flow import generate_sequence_diagram
from app.agentic.test_gen import generate_tests_for_symbol
from app.db.models import Repo
from app.db.session import get_db

router = APIRouter(prefix="/api/repos", tags=["agentic"])


class PRReviewRequest(BaseModel):
    diff_text: str | None = ""
    symbol_id: int | None = None


class TestGenRequest(BaseModel):
    symbol_id: int


class SequenceFlowRequest(BaseModel):
    symbol_id: int
    depth: int | None = 4


@router.post("/{repo_id}/agent/pr-review")
def post_pr_review(
    repo_id: int,
    payload: PRReviewRequest,
    db: Annotated[Session, Depends(get_db)],
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return review_diff_or_symbol(
        session=db,
        repo_id=repo_id,
        diff_text=payload.diff_text or "",
        symbol_id=payload.symbol_id,
    )


@router.post("/{repo_id}/agent/generate-tests")
def post_generate_tests(
    repo_id: int,
    payload: TestGenRequest,
    db: Annotated[Session, Depends(get_db)],
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    try:
        return generate_tests_for_symbol(db, repo_id, payload.symbol_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from None


@router.post("/{repo_id}/agent/sequence-flow")
def post_sequence_flow(
    repo_id: int,
    payload: SequenceFlowRequest,
    db: Annotated[Session, Depends(get_db)],
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return generate_sequence_diagram(
        db, repo_id, payload.symbol_id, max_depth=payload.depth or 4
    )
