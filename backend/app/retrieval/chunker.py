from collections.abc import Generator

WINDOW = 60
OVERLAP = 10
MAX_FUNCTION_LINES = 80


def windows(start: int, end: int) -> Generator[tuple[int, int], None, None]:
    """Generate (start, end) tuples of length up to WINDOW overlapping by OVERLAP."""
    s = start
    while s <= end:
        e = min(s + WINDOW - 1, end)
        yield s, e
        if e == end:
            break
        s = e - OVERLAP + 1


def chunk_file(text: str, symbols: list[dict]) -> list[dict]:
    """Chunk a python file along symbol boundaries and leftover lines."""
    if not text.strip():
        return []

    lines = text.split("\n")
    total = len(lines)
    covered: set[int] = set()
    chunks: list[dict] = []

    def add(start: int, end: int, symbol_id: int | None):
        body = "\n".join(lines[start - 1 : end])
        if body.strip():
            chunks.append(
                {
                    "symbol_id": symbol_id,
                    "start_line": start,
                    "end_line": end,
                    "content": body[:4000],
                }
            )

    for sym in symbols:
        start = sym["start_line"]
        end = min(sym["end_line"], total)

        if sym.get("kind") == "class":
            children = [
                c["start_line"] for c in symbols if c.get("parent_id") == sym.get("id")
            ]
            end = (min(children) - 1) if children else end
            if end < start:
                continue

        covered.update(range(start, end + 1))
        if end - start + 1 <= MAX_FUNCTION_LINES:
            add(start, end, sym.get("id"))
        else:
            for s, e in windows(start, end):
                add(s, e, sym.get("id"))

    # Leftover lines: group runs of uncovered lines
    run_start: int | None = None
    for n in range(1, total + 2):
        free = n <= total and n not in covered
        if free and run_start is None:
            run_start = n
        if not free and run_start is not None:
            for s, e in windows(run_start, n - 1):
                add(s, e, None)
            run_start = None

    return chunks
