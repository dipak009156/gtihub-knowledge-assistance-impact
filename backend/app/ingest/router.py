import logging
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.models import Commit, Edge, File, Repo, Symbol
from app.db.session import get_db
from app.ingest.service import run_pipeline
from app.ingest.url import parse_github_url

router = APIRouter(prefix="/api/repos", tags=["repos"])
logger = logging.getLogger(__name__)


class RepoCreateRequest(BaseModel):
    url: str


@router.post("", status_code=status.HTTP_202_ACCEPTED)
@router.post("/", status_code=status.HTTP_202_ACCEPTED, include_in_schema=False)
def create_repo(
    payload: RepoCreateRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        owner, name = parse_github_url(payload.url)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from None

    canonical_url = f"https://github.com/{owner}/{name}"
    existing = (
        db.query(Repo)
        .filter((Repo.url == canonical_url) | (Repo.url == payload.url.strip()))
        .first()
    )

    if existing:
        if existing.status == "ready":
            return {
                "id": existing.id,
                "url": existing.url,
                "owner": existing.owner,
                "name": existing.name,
                "status": existing.status,
            }
        if existing.status == "error":
            existing.status = "queued"
            existing.error_message = None
            db.commit()
            db.refresh(existing)
            background_tasks.add_task(run_pipeline, existing.id)
            return {
                "id": existing.id,
                "url": existing.url,
                "owner": existing.owner,
                "name": existing.name,
                "status": existing.status,
            }
        return {
            "id": existing.id,
            "url": existing.url,
            "owner": existing.owner,
            "name": existing.name,
            "status": existing.status,
        }

    repo = Repo(
        url=canonical_url,
        owner=owner,
        name=name,
        status="queued",
        error_message=None,
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)

    background_tasks.add_task(run_pipeline, repo.id)
    return {
        "id": repo.id,
        "url": repo.url,
        "owner": repo.owner,
        "name": repo.name,
        "status": repo.status,
    }


@router.get("")
def list_repos(db: Annotated[Session, Depends(get_db)]):
    repos = db.query(Repo).order_by(Repo.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "url": r.url,
            "owner": r.owner,
            "name": r.name,
            "status": r.status,
            "error_message": r.error_message,
        }
        for r in repos
    ]


@router.get("/{repo_id}")
def get_repo(repo_id: int, db: Annotated[Session, Depends(get_db)]):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return {
        "id": repo.id,
        "url": repo.url,
        "owner": repo.owner,
        "name": repo.name,
        "status": repo.status,
        "error_message": repo.error_message,
    }


@router.get("/{repo_id}/files")
def list_repo_files(repo_id: int, db: Annotated[Session, Depends(get_db)]):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    files = (
        db.query(File).filter(File.repo_id == repo_id).order_by(File.path.asc()).all()
    )
    return [
        {
            "id": f.id,
            "path": f.path,
            "line_count": f.line_count,
            "parse_error": f.parse_error,
        }
        for f in files
    ]


@router.get("/{repo_id}/files/{file_id}")
def get_repo_file(repo_id: int, file_id: int, db: Annotated[Session, Depends(get_db)]):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    f = db.query(File).filter(File.id == file_id, File.repo_id == repo_id).first()
    if not f:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    symbols = (
        db.query(Symbol)
        .filter(Symbol.file_id == f.id)
        .order_by(Symbol.start_line.asc())
        .all()
    )
    content = getattr(f, "content", "") or ""
    disk_path = Path("/tmp/gka") / str(repo_id) / f.path
    if not content and not disk_path.exists():
        try:
            from app.ingest.cloner import clone_repo

            clone_repo(repo_id, repo.url)
        except Exception:
            logger.exception("Failed to clone repo %s", repo_id)
    if not content and disk_path.exists():
        try:
            content = disk_path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            pass

    return {
        "id": f.id,
        "path": f.path,
        "line_count": f.line_count,
        "content": content,
        "symbols": [
            {
                "id": s.id,
                "name": s.name,
                "kind": s.kind,
                "start_line": s.start_line,
                "end_line": s.end_line,
            }
            for s in symbols
        ],
    }


@router.get("/{repo_id}/file")
def get_repo_file_by_path(
    repo_id: int,
    path: str,
    db: Annotated[Session, Depends(get_db)],
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    norm_path = path.lstrip("/")
    f = (
        db.query(File)
        .filter(File.path.in_([path, norm_path]), File.repo_id == repo_id)
        .first()
    )
    if not f:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    content = getattr(f, "content", "") or ""
    disk_path = Path("/tmp/gka") / str(repo_id) / f.path
    if not content and not disk_path.exists():
        try:
            from app.ingest.cloner import clone_repo

            clone_repo(repo_id, repo.url)
        except Exception:
            logger.exception("Failed to clone repo %s", repo_id)
    if not content and disk_path.exists():
        try:
            content = disk_path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            pass

    return {
        "id": f.id,
        "path": f.path,
        "line_count": f.line_count,
        "content": content,
    }


@router.get("/{repo_id}/symbols")
def search_repo_symbols(
    repo_id: int,
    db: Annotated[Session, Depends(get_db)],
    q: Annotated[str, Query()] = "",
    limit: Annotated[int, Query(le=100)] = 20,
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    query = (
        db.query(Symbol, File.path.label("file_path"))
        .join(File, Symbol.file_id == File.id)
        .filter(Symbol.repo_id == repo_id)
    )

    if q.strip():
        search_pattern = f"%{q.strip()}%"
        query = query.filter(Symbol.name.ilike(search_pattern))

    results = query.order_by(Symbol.name.asc()).limit(limit).all()

    return [
        {
            "id": s.id,
            "name": s.name,
            "qualified_name": s.qualified_name,
            "kind": s.kind,
            "file_path": file_path,
            "start_line": s.start_line,
            "end_line": s.end_line,
        }
        for s, file_path in results
    ]


@router.get("/{repo_id}/overview")
def get_repo_overview(repo_id: int, db: Annotated[Session, Depends(get_db)]):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    files_count = db.query(File).filter(File.repo_id == repo_id).count()
    functions_count = (
        db.query(Symbol)
        .filter(
            Symbol.repo_id == repo_id,
            Symbol.kind.in_(["function", "method"]),
        )
        .count()
    )
    classes_count = (
        db.query(Symbol)
        .filter(Symbol.repo_id == repo_id, Symbol.kind == "class")
        .count()
    )
    calls_count = db.query(Edge).filter(Edge.repo_id == repo_id).count()
    uncertain_calls_count = (
        db.query(Edge)
        .filter(Edge.repo_id == repo_id, Edge.certainty == "uncertain")
        .count()
    )
    skipped_files_count = (
        db.query(File)
        .filter(File.repo_id == repo_id, File.parse_error.is_(True))
        .count()
    )

    commits_count = db.query(Commit).filter(Commit.repo_id == repo_id).count()
    hotspots = []
    try:
        from app.history import top_files as history_top_files

        res = history_top_files(db, repo_id, limit=10)
        if isinstance(res, tuple):
            hotspots = res[1]
        elif isinstance(res, list):
            hotspots = res
    except (ImportError, AttributeError):
        pass

    return {
        "repo": {
            "id": repo.id,
            "url": repo.url,
            "owner": repo.owner,
            "name": repo.name,
            "status": repo.status,
            "error_message": repo.error_message,
        },
        "files": files_count,
        "functions": functions_count,
        "classes": classes_count,
        "calls": calls_count,
        "uncertain_calls": uncertain_calls_count,
        "commits": commits_count,
        "skipped_files": skipped_files_count,
        "hotspots": hotspots,
    }
