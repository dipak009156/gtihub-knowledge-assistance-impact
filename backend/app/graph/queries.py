from sqlalchemy.orm import Session

from app.db.models import Edge, File, Symbol


def load_symbols(session: Session, repo_id: int) -> list[dict]:
    """Return all symbols for a repository with file path and line details."""
    rows = (
        session.query(
            Symbol.id,
            Symbol.name,
            Symbol.qualified_name,
            Symbol.kind,
            Symbol.file_id,
            File.path.label("file_path"),
            Symbol.start_line,
            Symbol.end_line,
        )
        .join(File, Symbol.file_id == File.id)
        .filter(Symbol.repo_id == repo_id)
        .all()
    )

    return [
        {
            "id": r.id,
            "name": r.name or "",
            "qualified_name": r.qualified_name or r.name or "",
            "kind": r.kind or "function",
            "file_id": r.file_id,
            "file_path": r.file_path or "",
            "start_line": r.start_line or 1,
            "end_line": r.end_line or r.start_line or 1,
        }
        for r in rows
    ]


def load_edges(session: Session, repo_id: int) -> list[dict]:
    """Return all call graph edges for a repository."""
    rows = (
        session.query(
            Edge.caller_id,
            Edge.callee_id,
            Edge.certainty,
            Edge.call_line,
        )
        .filter(Edge.repo_id == repo_id)
        .all()
    )

    return [
        {
            "caller_id": r.caller_id,
            "callee_id": r.callee_id,
            "certainty": r.certainty,
            "call_line": r.call_line,
        }
        for r in rows
    ]
