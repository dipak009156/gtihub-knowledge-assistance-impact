from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import Repo
from app.db.session import get_db
from app.ml.defect_predictor import predict_repo_defects
from app.ml.graph_intelligence import predict_graph_links

router = APIRouter(prefix="/api/repos", tags=["ml"])


@router.get("/{repo_id}/ml/defects")
def get_defect_predictions(
    repo_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return predict_repo_defects(db, repo_id)


@router.get("/{repo_id}/ml/graph-intelligence")
def get_graph_intelligence(
    repo_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return predict_graph_links(db, repo_id)
