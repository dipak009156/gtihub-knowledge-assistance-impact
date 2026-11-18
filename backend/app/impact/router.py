from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.models import Repo, Symbol
from app.db.session import get_db
from app.impact.engine import calculate_diff_impact, calculate_impact

router = APIRouter(prefix="/api/repos", tags=["impact"])


class ChangedFileItem(BaseModel):
    path: str
    lines: list[int] = Field(default_factory=list)


class DiffImpactRequest(BaseModel):
    changed_files: list[ChangedFileItem]
    depth: int = 3
    variant: str = "combined"
    weight_graph: float = 0.6
    weight_history: float = 0.4


@router.get("/{repo_id}/impact")
def get_impact_analysis(
    repo_id: int,
    symbol_id: Annotated[int, Query()],
    db: Annotated[Session, Depends(get_db)],
    depth: Annotated[int, Query()] = 3,
    variant: Annotated[str, Query()] = "combined",
    weight_graph: Annotated[float, Query(ge=0.0, le=1.0)] = 0.6,
    weight_history: Annotated[float, Query(ge=0.0, le=1.0)] = 0.4,
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    if depth < 1 or depth > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Depth must be between 1 and 5",
        )

    if variant not in ("graph", "history", "combined"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Variant must be graph, history, or combined",
        )

    sym = (
        db.query(Symbol)
        .filter(Symbol.id == symbol_id, Symbol.repo_id == repo_id)
        .first()
    )
    if not sym:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Function not found"
        )

    impact = calculate_impact(
        session=db,
        repo_id=repo_id,
        symbol_id=symbol_id,
        depth=depth,
        variant=variant,
        weight_graph=weight_graph,
        weight_history=weight_history,
    )
    if not impact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Function not found"
        )

    return impact


@router.post("/{repo_id}/impact/diff")
def post_diff_impact_analysis(
    repo_id: int,
    payload: DiffImpactRequest,
    db: Annotated[Session, Depends(get_db)],
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    if payload.depth < 1 or payload.depth > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Depth must be between 1 and 5",
        )

    if payload.variant not in ("graph", "history", "combined"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Variant must be graph, history, or combined",
        )

    changed_files = [f.model_dump() for f in payload.changed_files]
    return calculate_diff_impact(
        session=db,
        repo_id=repo_id,
        changed_files=changed_files,
        depth=payload.depth,
        variant=payload.variant,
        weight_graph=payload.weight_graph,
        weight_history=payload.weight_history,
    )
