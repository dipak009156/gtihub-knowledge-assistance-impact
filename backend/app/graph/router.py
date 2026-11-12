from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.models import Edge, File, Repo, Symbol
from app.db.session import get_db

router = APIRouter(prefix="/api/repos", tags=["graph"])


@router.get("/{repo_id}/symbols/{symbol_id}/relations")
def get_symbol_relations(
    repo_id: int,
    symbol_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    target_symbol = (
        db.query(Symbol)
        .filter(Symbol.id == symbol_id, Symbol.repo_id == repo_id)
        .first()
    )
    if not target_symbol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Symbol not found"
        )

    caller_rows = (
        db.query(Symbol, File.path.label("file_path"), Edge.certainty)
        .join(Edge, Edge.caller_id == Symbol.id)
        .join(File, Symbol.file_id == File.id)
        .filter(Edge.callee_id == symbol_id, Edge.repo_id == repo_id)
        .all()
    )

    callee_rows = (
        db.query(Symbol, File.path.label("file_path"), Edge.certainty)
        .join(Edge, Edge.callee_id == Symbol.id)
        .join(File, Symbol.file_id == File.id)
        .filter(Edge.caller_id == symbol_id, Edge.repo_id == repo_id)
        .all()
    )

    callers = [
        {
            "id": sym.id,
            "name": sym.name,
            "qualified_name": sym.qualified_name,
            "file_path": file_path,
            "start_line": sym.start_line,
            "certainty": certainty,
        }
        for sym, file_path, certainty in caller_rows
    ]

    callees = [
        {
            "id": sym.id,
            "name": sym.name,
            "qualified_name": sym.qualified_name,
            "file_path": file_path,
            "start_line": sym.start_line,
            "certainty": certainty,
        }
        for sym, file_path, certainty in callee_rows
    ]

    return {"callers": callers, "callees": callees}


@router.get("/{repo_id}/graph")
def get_repo_graph(
    repo_id: int,
    db: Annotated[Session, Depends(get_db)],
    view: Annotated[str, Query(pattern="^(call|module)$")] = "call",
    level: Annotated[str | None, Query(pattern="^(call|module)$")] = None,
    folder: str | None = None,
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    active_view = level or view
    folder_prefix = f"{folder.strip('/')}/" if folder and folder.strip("/") else None

    if active_view == "call":
        sym_query = (
            db.query(Symbol, File.path.label("file_path"))
            .join(File, Symbol.file_id == File.id)
            .filter(Symbol.repo_id == repo_id)
        )
        if folder_prefix:
            sym_query = sym_query.filter(File.path.startswith(folder_prefix))
        all_symbols = sym_query.all()
        edges = db.query(Edge).filter(Edge.repo_id == repo_id).all()

        degree: dict[int, int] = {s.id: 0 for s, _ in all_symbols}
        for e in edges:
            if e.caller_id in degree:
                degree[e.caller_id] += 1
            if e.callee_id in degree:
                degree[e.callee_id] += 1

        total_nodes = len(all_symbols)
        sorted_symbols = sorted(
            all_symbols,
            key=lambda pair: degree.get(pair[0].id, 0),
            reverse=True,
        )[:300]
        selected_ids = {s.id for s, _ in sorted_symbols}

        nodes = [
            {
                "id": s.id,
                "label": s.qualified_name or s.name,
                "kind": s.kind,
                "file_path": file_path,
            }
            for s, file_path in sorted_symbols
        ]

        graph_edges = [
            {
                "source": e.caller_id,
                "target": e.callee_id,
                "certainty": e.certainty,
            }
            for e in edges
            if e.caller_id in selected_ids and e.callee_id in selected_ids
        ]

        return {
            "nodes": nodes,
            "edges": graph_edges,
            "total_nodes": total_nodes,
            "truncated": total_nodes > 300,
        }

    # view == 'module'
    file_query = db.query(File).filter(File.repo_id == repo_id)
    if folder_prefix:
        file_query = file_query.filter(File.path.startswith(folder_prefix))
    files = file_query.all()
    edge_rows = (
        db.query(
            Symbol.file_id.label("caller_file_id"),
            Edge.callee_id,
            Edge.certainty,
        )
        .join(Edge, Edge.caller_id == Symbol.id)
        .filter(Edge.repo_id == repo_id)
        .all()
    )

    symbol_file_map = {
        s.id: s.file_id
        for s in db.query(Symbol.id, Symbol.file_id)
        .filter(Symbol.repo_id == repo_id)
        .all()
    }

    module_edges_map: dict[tuple[int, int], str] = {}
    for caller_file_id, callee_sym_id, certainty in edge_rows:
        callee_file_id = symbol_file_map.get(callee_sym_id)
        if not callee_file_id or caller_file_id == callee_file_id:
            continue
        pair = (caller_file_id, callee_file_id)
        if pair not in module_edges_map or certainty == "certain":
            module_edges_map[pair] = certainty

    total_nodes = len(files)
    nodes = [
        {
            "id": f.id,
            "label": f.path,
            "kind": "module",
            "file_path": f.path,
        }
        for f in files[:300]
    ]

    selected_file_ids = {f["id"] for f in nodes}
    graph_edges = [
        {
            "source": src,
            "target": tgt,
            "certainty": cert,
        }
        for (src, tgt), cert in module_edges_map.items()
        if src in selected_file_ids and tgt in selected_file_ids
    ]

    return {
        "nodes": nodes,
        "edges": graph_edges,
        "total_nodes": total_nodes,
        "truncated": total_nodes > 300,
    }
