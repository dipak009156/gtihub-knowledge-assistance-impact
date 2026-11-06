from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.models import Repo
from app.db.session import get_db
from app.history.cochange import top_files

router = APIRouter(prefix="/api/repos", tags=["history"])


@router.get("/{repo_id}/hotspots")
def get_repo_hotspots(
    repo_id: int,
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    sort: Annotated[str, Query(pattern="^(changes|connections)$")] = "changes",
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    return top_files(db, repo_id, limit=limit, sort=sort)
