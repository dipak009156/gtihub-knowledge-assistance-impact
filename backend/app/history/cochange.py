from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Commit, CommitFile, Edge, File, Symbol


def cochange_for_file(
    session: Session, repo_id: int, path: str, before: datetime | None = None
) -> dict[str, float]:
    """Calculate co-change strength between a target file and other files."""
    details = cochange_details_for_file(session, repo_id, path, before=before)
    return {p: info["strength"] for p, info in details.items()}


def cochange_details_for_file(
    session: Session, repo_id: int, path: str, before: datetime | None = None
) -> dict[str, dict]:
    """Return co-change strength and raw counts for explanation generation."""
    q = (
        select(Commit.id)
        .join(CommitFile, CommitFile.commit_id == Commit.id)
        .where(
            Commit.repo_id == repo_id,
            Commit.is_bulk.is_(False),
            CommitFile.path == path,
        )
    )
    if before is not None:
        q = q.where(Commit.committed_at < before)

    ids = list(session.scalars(q))
    if not ids:
        return {}

    total_commits = len(ids)
    rows = session.execute(
        select(CommitFile.path, func.count())
        .where(CommitFile.commit_id.in_(ids), CommitFile.path != path)
        .group_by(CommitFile.path)
    ).all()

    return {
        p: {
            "strength": n / total_commits,
            "cochange_count": n,
            "total_commits": total_commits,
        }
        for p, n in rows
    }


def top_files(
    session: Session,
    repo_id: int,
    limit: int = 20,
    sort: str = "changes",
) -> list[dict]:
    """Return hotspot files ranked by non-bulk commit changes or graph connections."""
    # Only files that exist in the files table
    existing_files = session.query(File).filter(File.repo_id == repo_id).all()
    if not existing_files:
        return []

    file_paths = {f.path: f.id for f in existing_files}

    # Count non-bulk changes per path
    change_rows = (
        session.query(CommitFile.path, func.count(CommitFile.commit_id))
        .join(Commit, Commit.id == CommitFile.commit_id)
        .filter(
            Commit.repo_id == repo_id,
            Commit.is_bulk.is_(False),
            CommitFile.path.in_(list(file_paths.keys())),
        )
        .group_by(CommitFile.path)
        .all()
    )
    changes_map = {path: count for path, count in change_rows}

    # Count graph connections per file
    # A connection is an edge where caller symbol or callee symbol belongs to that file
    # Map symbols to file_id
    symbol_to_file = dict(
        session.query(Symbol.id, Symbol.file_id).filter(Symbol.repo_id == repo_id).all()
    )

    edges = (
        session.query(Edge.caller_id, Edge.callee_id)
        .filter(Edge.repo_id == repo_id)
        .all()
    )

    connections_map: dict[str, set[int]] = {path: set() for path in file_paths}
    file_id_to_path = {f.id: f.path for f in existing_files}

    for idx, (caller_id, callee_id) in enumerate(edges):
        caller_fid = symbol_to_file.get(caller_id)
        callee_fid = symbol_to_file.get(callee_id)

        if caller_fid and caller_fid in file_id_to_path:
            connections_map[file_id_to_path[caller_fid]].add(idx)
        if callee_fid and callee_fid in file_id_to_path:
            connections_map[file_id_to_path[callee_fid]].add(idx)

    hotspots: list[dict] = []
    for path in file_paths:
        changes = changes_map.get(path, 0)
        connections = len(connections_map.get(path, set()))
        hotspots.append(
            {
                "path": path,
                "changes": changes,
                "connections": connections,
            }
        )

    sort_key = "connections" if sort == "connections" else "changes"
    hotspots.sort(
        key=lambda item: (item[sort_key], item["path"]),
        reverse=True,
    )

    # Secondary tie breaker: alphabetical path ascending if same count
    hotspots.sort(key=lambda item: item[sort_key], reverse=True)

    return hotspots[:limit]
