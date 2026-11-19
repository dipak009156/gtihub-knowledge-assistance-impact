from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db.models import Repo
from app.db.session import get_db
from app.report.service import generate_executive_report, generate_report_markdown

router = APIRouter(prefix="/api/repos", tags=["report"])


@router.get("/{repo_id}/report")
def get_report(
    repo_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return generate_executive_report(db, repo_id)


@router.get("/{repo_id}/report/markdown")
def get_report_md(
    repo_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    md_content = generate_report_markdown(db, repo_id)
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{repo.name}-executive-audit-report.md"'
        },
    )
