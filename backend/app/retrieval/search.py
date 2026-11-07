import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Chunk, File, Symbol
from app.retrieval.embedder import embed


def load_results(
    session: Session, best_chunk_ids: list[int], points: dict[int, float]
) -> list[dict]:
    """Fetch chunks with their file path and symbol qualified name in ranked order."""
    if not best_chunk_ids:
        return []

    chunks = (
        session.query(
            Chunk.id.label("chunk_id"),
            Chunk.start_line,
            Chunk.end_line,
            Chunk.content,
            File.path.label("file_path"),
            Symbol.qualified_name.label("symbol_name"),
            Symbol.name.label("raw_symbol_name"),
        )
        .join(File, Chunk.file_id == File.id)
        .outerjoin(Symbol, Chunk.symbol_id == Symbol.id)
        .filter(Chunk.id.in_(best_chunk_ids))
        .all()
    )

    by_id = {
        c.chunk_id: {
            "chunk_id": c.chunk_id,
            "file_path": c.file_path,
            "start_line": c.start_line,
            "end_line": c.end_line,
            "symbol": c.symbol_name or c.raw_symbol_name or "",
            "content": c.content,
            "score": round(points.get(c.chunk_id, 0.0), 4),
        }
        for c in chunks
    }

    # Return in the exact order of best_chunk_ids
    return [by_id[cid] for cid in best_chunk_ids if cid in by_id]


def search(session: Session, repo_id: int, question: str, top_k: int = 8) -> list[dict]:
    """Execute hybrid search (semantic embedding + keyword) and merge via reciprocal rank fusion."""
    lists: list[list[int]] = []

    # 1) Meaning search
    try:
        qvec = embed([question])[0]
        # Check dialect: if PostgreSQL, use pgvector cosine_distance
        if session.bind and session.bind.dialect.name == "postgresql":
            ids = session.scalars(
                select(Chunk.id)
                .where(Chunk.repo_id == repo_id, Chunk.embedding.is_not(None))
                .order_by(Chunk.embedding.cosine_distance(qvec))
                .limit(20)
            ).all()
            lists.append(list(ids))
        else:
            # Fallback for SQLite / non-pgvector environments
            rows = (
                session.query(Chunk.id, Chunk.embedding)
                .filter(Chunk.repo_id == repo_id, Chunk.embedding.is_not(None))
                .all()
            )
            scored = []
            for cid, emb in rows:
                if emb:
                    sim = sum(a * b for a, b in zip(qvec, emb, strict=False))
                    scored.append((cid, sim))
            scored.sort(key=lambda x: x[1], reverse=True)
            lists.append([cid for cid, _ in scored[:20]])
    except Exception:  # noqa: BLE001, S110
        pass

    # 2) Keyword search
    words = re.findall(r"[A-Za-z_][A-Za-z0-9_]{2,}", question)
    if words:
        expanded: list[str] = []
        for w in words:
            expanded.append(w)
            if "_" in w:
                expanded.extend([part for part in w.split("_") if len(part) >= 2])
        unique_words = list(dict.fromkeys(expanded))

        try:
            if session.bind and session.bind.dialect.name == "postgresql":
                tsq = func.to_tsquery("english", " | ".join(unique_words))
                ids = session.scalars(
                    select(Chunk.id)
                    .where(Chunk.repo_id == repo_id, Chunk.tsv.op("@@")(tsq))
                    .order_by(func.ts_rank(Chunk.tsv, tsq).desc())
                    .limit(20)
                ).all()
                lists.append(list(ids))
            else:
                # Fallback for SQLite
                matches: set[int] = set()
                for w in unique_words:
                    matching_ids = (
                        session.query(Chunk.id)
                        .filter(
                            Chunk.repo_id == repo_id,
                            Chunk.content.ilike(f"%{w}%"),
                        )
                        .limit(20)
                        .all()
                    )
                    matches.update([mid for (mid,) in matching_ids])
                lists.append(list(matches)[:20])
        except Exception:  # noqa: BLE001, S110
            pass

    # 3) Mix lists via Reciprocal Rank Fusion
    points: dict[int, float] = {}
    for ranked in lists:
        for pos, chunk_id in enumerate(ranked):
            points[chunk_id] = points.get(chunk_id, 0.0) + 1.0 / (60.0 + pos + 1)

    best = sorted(points, key=points.get, reverse=True)[:top_k]
    return load_results(session, best, points)
