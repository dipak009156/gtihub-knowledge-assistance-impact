from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.history.cochange import (
    cochange_details_for_file,
    cochange_for_file,
)
from app.history.cochange import (
    top_files as cochange_top_files,
)
from app.history.service import analyze


def top_files(
    session_or_repo_id,
    repo_id: int | None = None,
    limit: int = 20,
    sort: str = "changes",
) -> list[dict]:
    """Return top hotspot files. Accepts either (session, repo_id, ...) or (repo_id, limit=...)."""
    if isinstance(session_or_repo_id, Session):
        target_repo_id = repo_id if repo_id is not None else 0
        return cochange_top_files(
            session_or_repo_id, target_repo_id, limit=limit, sort=sort
        )

    # First argument is repo_id
    target_repo_id = int(session_or_repo_id)
    with SessionLocal() as s:
        return cochange_top_files(s, target_repo_id, limit=limit, sort=sort)


__all__ = [
    "analyze",
    "cochange_details_for_file",
    "cochange_for_file",
    "top_files",
]
