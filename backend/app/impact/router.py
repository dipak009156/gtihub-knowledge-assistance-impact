from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.models import Repo, Symbol
from app.db.session import get_db
from app.impact.engine import calculate_impact

router = APIRouter(prefix="/api/repos", tags=["impact"])


@router.get("/{repo_id}/impact")
def get_impact_analysis(
    repo_id: int,
    symbol_id: Annotated[int, Query()],
    db: Annotated[Session, Depends(get_db)],
    depth: Annotated[int, Query(ge=1, le=5)] = 3,
    variant: Annotated[str, Query()] = "combined",
    before: Annotated[datetime | None, Query()] = None,
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
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
        before=before,
    )
    if not impact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Function not found"
        )

    return impact
