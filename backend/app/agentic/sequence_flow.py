from typing import Any

from sqlalchemy.orm import Session

from app.db.models import Edge, File, Symbol


def generate_sequence_diagram(
    session: Session, repo_id: int, symbol_id: int, max_depth: int = 4
) -> dict[str, Any]:
    """
    Synthesizes an interactive Mermaid sequence diagram by tracing the call graph
    from an entry-point symbol down through its callee chains.
    """
    root_sym = (
        session.query(Symbol)
        .filter(Symbol.id == symbol_id, Symbol.repo_id == repo_id)
        .first()
    )
    if not root_sym:
        return {
            "mermaid": "sequenceDiagram\n  participant Client\n  Client->>System: (Function not found)",
            "participants": [],
            "steps": [],
        }

    # Fetch file map
    files = session.query(File).filter(File.repo_id == repo_id).all()
    file_map = {f.id: f.path for f in files}

    # BFS traversal of downstream callees
    visited_symbols = {root_sym.id}
    queue = [(root_sym, 1)]
    edges_found = []
    symbol_cache = {root_sym.id: root_sym}

    while queue:
        curr_sym, depth = queue.pop(0)
        if depth > max_depth:
            continue

        out_edges = (
            session.query(Edge)
            .filter(Edge.repo_id == repo_id, Edge.caller_id == curr_sym.id)
            .all()
        )

        for edge in out_edges:
            callee = symbol_cache.get(edge.callee_id)
            if not callee:
                callee = (
                    session.query(Symbol)
                    .filter(Symbol.id == edge.callee_id, Symbol.repo_id == repo_id)
                    .first()
                )
                if callee:
                    symbol_cache[callee.id] = callee

            if not callee:
                continue

            edges_found.append((curr_sym, callee, edge.certainty))

            if callee.id not in visited_symbols and depth < max_depth:
                visited_symbols.add(callee.id)
                queue.append((callee, depth + 1))

    # Helper to clean participant name for Mermaid syntax
    def clean_name(s: str) -> str:
        base = s.replace(".", "_").replace("-", "_").replace(" ", "_")
        return "".join(c for c in base if c.isalnum() or c == "_")

    def module_name(sym: Symbol) -> str:
        file_path = file_map.get(sym.file_id, "app")
        # e.g., src/services/auth.py -> auth
        parts = file_path.replace("\\", "/").split("/")[-1].split(".")[0]
        return clean_name(parts) or "Core"

    # Build participants and calls
    participants: dict[str, str] = {"Client": "User / Client"}
    mermaid_lines = [
        "sequenceDiagram",
        "  autonumber",
        "  actor Client as User / Client",
    ]
    steps = []

    root_mod = module_name(root_sym)
    root_id = clean_name(root_mod)
    participants[root_id] = f"{root_mod} ({root_sym.name})"
    mermaid_lines.append(f"  participant {root_id} as {root_mod}")
    mermaid_lines.append(f"  Client->>+{root_id}: {root_sym.name}()")
    steps.append(
        {
            "caller": "Client",
            "callee": root_sym.name,
            "module": root_mod,
            "certainty": "certain",
        }
    )

    added_participants = {root_id}

    for caller, callee, certainty in edges_found:
        c_mod = clean_name(module_name(caller))
        t_mod = clean_name(module_name(callee))

        if t_mod not in added_participants:
            added_participants.add(t_mod)
            mermaid_lines.insert(
                3 + len(added_participants) - 1,
                f"  participant {t_mod} as {module_name(callee)}",
            )

        arrow = "->>" if certainty == "certain" else "-->>"
        call_label = f"{callee.name}()"
        if certainty == "uncertain":
            call_label += " [uncertain]"

        mermaid_lines.append(f"  {c_mod}{arrow}+{t_mod}: {call_label}")
        mermaid_lines.append(f"  {t_mod}-->>-{c_mod}: return")
        steps.append(
            {
                "caller": caller.name,
                "callee": callee.name,
                "module": module_name(callee),
                "certainty": certainty,
            }
        )

    mermaid_lines.append(f"  {root_id}-->>-Client: response")

    return {
        "symbol": {
            "id": root_sym.id,
            "name": root_sym.name,
            "file_path": file_map.get(root_sym.file_id, ""),
            "start_line": root_sym.start_line,
        },
        "mermaid": "\n".join(mermaid_lines),
        "steps_count": len(steps),
        "steps": steps,
    }
