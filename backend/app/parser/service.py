import os
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.models import File, Symbol
from app.db.session import SessionLocal
from app.parser.extract import parse_file

SKIP_DIRS = {
    ".git",
    "venv",
    ".venv",
    "node_modules",
    "__pycache__",
    "site-packages",
    "build",
    "dist",
}
MAX_FILE_SIZE = 1024 * 1024  # 1 MB
MAX_FILES = 500


def parse_repo(
    repo_id: int,
    path: Path | str,
    session: Session | None = None,
    max_files: int = MAX_FILES,
    max_file_size: int = MAX_FILE_SIZE,
) -> None:
    close_session = False
    if session is None:
        session = SessionLocal()
        close_session = True

    try:
        root_path = Path(path).resolve()
        file_count = 0

        for root, dirs, files in os.walk(root_path):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
            dirs.sort()

            for fname in sorted(files):
                if not fname.endswith(".py"):
                    continue

                if file_count >= max_files:
                    break

                file_path = Path(root) / fname
                try:
                    size_bytes = file_path.stat().st_size
                except OSError:
                    continue

                if size_bytes > max_file_size:
                    continue

                file_count += 1
                try:
                    text = file_path.read_text(encoding="utf-8", errors="replace")
                except OSError:
                    continue

                line_count = len(text.splitlines())
                try:
                    rel_path = str(file_path.relative_to(root_path))
                except ValueError:
                    rel_path = fname

                file_record = (
                    session.query(File)
                    .filter(File.repo_id == repo_id, File.path == rel_path)
                    .first()
                )
                if not file_record:
                    file_kwargs = {
                        "repo_id": repo_id,
                        "path": rel_path,
                        "size_bytes": size_bytes,
                        "line_count": line_count,
                        "parse_error": False,
                    }
                    if hasattr(File, "content"):
                        file_kwargs["content"] = text
                    file_record = File(**file_kwargs)
                    session.add(file_record)
                    session.flush()
                else:
                    file_record.size_bytes = size_bytes
                    file_record.line_count = line_count
                    if hasattr(File, "content"):
                        file_record.content = text
                    session.flush()

                session.query(Symbol).filter(Symbol.file_id == file_record.id).delete()

                try:
                    parsed_symbols = parse_file(text)
                    file_record.parse_error = False
                    session.flush()

                    symbol_id_by_qname: dict[str, int] = {}
                    for sym in parsed_symbols:
                        parent_id = None
                        if sym.parent_qualified_name:
                            parent_id = symbol_id_by_qname.get(
                                sym.parent_qualified_name
                            )

                        s_record = Symbol(
                            repo_id=repo_id,
                            file_id=file_record.id,
                            parent_id=parent_id,
                            name=sym.name,
                            qualified_name=sym.qualified_name,
                            kind=sym.kind,
                            start_line=sym.start_line,
                            end_line=sym.end_line,
                            is_async=sym.is_async,
                            is_decorated=sym.is_decorated,
                        )
                        session.add(s_record)
                        session.flush()
                        symbol_id_by_qname[sym.qualified_name] = s_record.id

                except SyntaxError:
                    file_record.parse_error = True

                session.commit()

            if file_count >= max_files:
                break
    finally:
        if close_session:
            session.close()
