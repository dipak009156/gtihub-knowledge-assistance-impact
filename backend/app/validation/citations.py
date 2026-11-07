import re

from sqlalchemy.orm import Session

from app.db.models import File, Symbol

CITATION = re.compile(r"\[([^\[\]:]+\.py):(\d+)(?:-(\d+))?\]")
BACKTICK_FUNC = re.compile(r"`([A-Za-z0-9_]+)\(\)`")


def _normalize_path(path: str) -> str:
    cleaned = path.replace("\\", "/").strip()
    cleaned = cleaned.removeprefix("./")
    return cleaned


def verify_answer(session: Session, repo_id: int, answer: str) -> dict:
    """Verify citations and symbol references in an AI answer against repository code."""
    if not isinstance(answer, str) or not answer.strip():
        return {
            "answer": answer if isinstance(answer, str) else "",
            "sources": [],
            "removed_count": 0,
            "unverified_symbols": [],
            "grounded": False,
        }

    # 1. Load file paths and line counts
    file_rows = (
        session.query(File.path, File.line_count).filter(File.repo_id == repo_id).all()
    )
    files_map = {_normalize_path(p): count for p, count in file_rows}

    # 2. Find every citation in the answer
    sources: list[dict] = []
    seen_sources: set[tuple[str, int, int]] = set()
    removed_count = 0

    def citation_replacer(match: re.Match) -> str:
        nonlocal removed_count
        raw_path = match.group(1)
        normalized = _normalize_path(raw_path)
        start_line = int(match.group(2))
        end_line = int(match.group(3)) if match.group(3) else start_line

        # Validation checks
        if (
            normalized in files_map
            and start_line >= 1
            and end_line >= start_line
            and end_line <= files_map[normalized]
        ):
            source_key = (normalized, start_line, end_line)
            if source_key not in seen_sources:
                seen_sources.add(source_key)
                sources.append(
                    {
                        "file_path": normalized,
                        "start_line": start_line,
                        "end_line": end_line,
                    }
                )
            return match.group(0)

        # Invalid citation: strip from text
        removed_count += 1
        return ""

    processed_answer = CITATION.sub(citation_replacer, answer)

    # 6. Look at words in backticks that end with (), e.g. `checkout()`
    symbol_names = {
        name
        for (name,) in session.query(Symbol.name)
        .filter(Symbol.repo_id == repo_id)
        .all()
    }

    unverified_symbols: list[str] = []
    seen_unverified: set[str] = set()
    for match in BACKTICK_FUNC.finditer(answer):
        func_name = match.group(1)
        if func_name not in symbol_names and func_name not in seen_unverified:
            seen_unverified.add(func_name)
            unverified_symbols.append(func_name)

    grounded = len(sources) > 0

    return {
        "answer": processed_answer,
        "sources": sources,
        "removed_count": removed_count,
        "unverified_symbols": unverified_symbols,
        "grounded": grounded,
    }
