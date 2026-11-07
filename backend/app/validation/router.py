from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import Repo, ValidationRun
from app.db.session import get_db
from app.validation.runner import RUN_STATUS, run_validation

router = APIRouter(prefix="/api/repos", tags=["validation"])


@router.post("/{repo_id}/validation/run", status_code=status.HTTP_202_ACCEPTED)
def trigger_validation(
    repo_id: int,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    current_status = RUN_STATUS.get(repo_id)
    if current_status == "running":
        return {"status": "running"}

    RUN_STATUS[repo_id] = "running"
    background_tasks.add_task(run_validation, repo_id)
    return {"status": "running"}


@router.get("/{repo_id}/validation")
def get_validation_results(
    repo_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    runs = (
        db.query(ValidationRun)
        .filter(ValidationRun.repo_id == repo_id)
        .order_by(ValidationRun.variant.asc(), ValidationRun.k.asc())
        .all()
    )

    if not runs:
        current_status = RUN_STATUS.get(repo_id, "none")
        return {
            "status": current_status,
            "commits_tested": 0,
            "runs": [],
            "details": [],
        }

    status_str = RUN_STATUS.get(repo_id, "done")
    commits_tested = runs[0].commits_tested if runs else 0
    details = runs[0].details if runs and runs[0].details else []

    return {
        "status": status_str,
        "commits_tested": commits_tested,
        "runs": [
            {
                "variant": r.variant,
                "k": r.k,
                "precision": r.precision,
                "recall": r.recall,
            }
            for r in runs
        ],
        "details": details,
    }
