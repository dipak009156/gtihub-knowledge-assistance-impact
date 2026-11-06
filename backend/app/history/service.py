from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.models import Commit, CommitFile
from app.db.session import SessionLocal
from app.history.gitlog import BULK_LIMIT, read_git_log


def delete_old_rows(session: Session, repo_id: int) -> None:
    """Delete previous commit rows for a repo so retries do not duplicate."""
    session.query(Commit).filter(Commit.repo_id == repo_id).delete()
    session.flush()


def analyze(
    repo_id: int, clone_path: str | Path, session: Session | None = None
) -> None:
    """Read git history, identify non-bulk commits and save commit file changes."""
    close_session = False
    if session is None:
        session = SessionLocal()
        close_session = True

    try:
        try:
            commits = read_git_log(clone_path)
        except Exception:  # noqa: BLE001
            # If git log fails or repo has no commits, catch and return safely
            return

        if not commits:
            return

        delete_old_rows(session, repo_id)

        for c in commits:
            files = c.get("files", [])
            is_bulk = len(files) > BULK_LIMIT
            try:
                committed_at = datetime.fromisoformat(c["when"])
            except (ValueError, TypeError):
                committed_at = datetime.now(UTC)

            row = Commit(
                repo_id=repo_id,
                sha=c["sha"],
                author=c.get("author"),
                committed_at=committed_at,
                message=c.get("message"),
                files_changed=len(files),
                is_bulk=is_bulk,
            )
            session.add(row)
            session.flush()

            if not is_bulk:
                py_files = {f for f in files if f.endswith(".py")}
                for path in py_files:
                    session.add(CommitFile(commit_id=row.id, path=path))

        session.commit()
    except Exception:  # noqa: BLE001
        session.rollback()
    finally:
        if close_session:
            session.close()
