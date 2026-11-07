from pathlib import Path

from sqlalchemy.orm import Session

from app.db.models import Chunk, File, Symbol
from app.db.session import SessionLocal
from app.retrieval.chunker import chunk_file
from app.retrieval.embedder import embed


def index(repo_id: int, session: Session | None = None) -> None:
    """Chunk and embed all Python files in a repository, saving chunks into the database."""
    close_session = False
    if session is None:
        session = SessionLocal()
        close_session = True

    try:
        # Clear chat cache for this repo
        try:
            from app.llm.service import clear_cache

            clear_cache(repo_id)
        except Exception:  # noqa: BLE001, S110
            pass

        # 2. Delete old chunks for this repo
        session.query(Chunk).filter(Chunk.repo_id == repo_id).delete()
        session.commit()

        # 3. Load files and symbols
        files = session.query(File).filter(File.repo_id == repo_id).all()
        symbols = session.query(Symbol).filter(Symbol.repo_id == repo_id).all()

        symbols_by_file: dict[int, list[dict]] = {}
        symbol_qname_map: dict[int, str] = {}
        for s in symbols:
            symbol_qname_map[s.id] = s.qualified_name or s.name
            symbols_by_file.setdefault(s.file_id, []).append(
                {
                    "id": s.id,
                    "kind": s.kind,
                    "start_line": s.start_line,
                    "end_line": s.end_line,
                    "parent_id": s.parent_id,
                }
            )

        disk_base = Path("/tmp/gka") / str(repo_id)

        for f in files:
            content: str | None = None
            if hasattr(f, "content") and getattr(f, "content", None):
                content = f.content
            else:
                file_on_disk = disk_base / f.path
                if file_on_disk.exists():
                    try:
                        content = file_on_disk.read_text(
                            encoding="utf-8", errors="replace"
                        )
                    except OSError:
                        content = None

            if not content:
                continue

            file_symbols = symbols_by_file.get(f.id, [])
            file_chunks = chunk_file(content, file_symbols)
            if not file_chunks:
                continue

            # Build texts to embed
            embed_texts = [
                f"{f.path}\n{symbol_qname_map.get(c['symbol_id'], '')}\n{c['content']}"
                for c in file_chunks
            ]

            # Try generating embeddings, fallback to None if embedder fails
            embeddings: list[list[float] | None]
            try:
                # Embed in batches of 64
                embeddings = []
                batch_size = 64
                for i in range(0, len(embed_texts), batch_size):
                    batch = embed_texts[i : i + batch_size]
                    batch_vecs = embed(batch)
                    embeddings.extend(batch_vecs)
            except Exception:  # noqa: BLE001
                embeddings = [None] * len(file_chunks)

            # Insert Chunk rows
            for c_info, emb in zip(file_chunks, embeddings, strict=False):
                chunk_record = Chunk(
                    repo_id=repo_id,
                    file_id=f.id,
                    symbol_id=c_info["symbol_id"],
                    start_line=c_info["start_line"],
                    end_line=c_info["end_line"],
                    content=c_info["content"],
                    embedding=emb,
                )
                session.add(chunk_record)

            session.commit()
    except Exception:  # noqa: BLE001
        # Never let any error escape index to avoid breaking pipeline
        if session:
            session.rollback()
    finally:
        if close_session:
            session.close()
