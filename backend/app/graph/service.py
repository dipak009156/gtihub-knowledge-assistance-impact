import ast
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.models import Edge, File, Symbol
from app.db.session import SessionLocal
from app.graph.calls import find_calls


def _find_matching_file(module_name: str, file_by_path: dict[str, File]) -> File | None:
    """Find a project file matching an imported module name like 'utils' or 'app.utils'."""
    parts = module_name.split(".")
    target_py = "/".join(parts) + ".py"
    target_init = "/".join(parts) + "/__init__.py"

    for path, f in file_by_path.items():
        if path in (target_py, target_init) or path.endswith(
            ("/" + target_py, "/" + target_init)
        ):
            return f
    # Fallback: if module is just 'utils', match 'utils.py' filename
    last_name = parts[-1] + ".py"
    for path, f in file_by_path.items():
        if path == last_name or path.endswith("/" + last_name):
            return f
    return None


def build_graph(
    repo_id: int,
    session: Session | None = None,
    repo_path: Path | str | None = None,
) -> None:
    """Build call graph for a repository and store edges in the database."""
    close_session = False
    if session is None:
        session = SessionLocal()
        close_session = True

    try:
        all_symbols = session.query(Symbol).filter(Symbol.repo_id == repo_id).all()
        all_files = session.query(File).filter(File.repo_id == repo_id).all()

        file_by_path: dict[str, File] = {f.path: f for f in all_files}

        # Step 2: build lookup tables from symbols table (once, in memory)
        # by_file_and_name: for each file, dict name -> symbol id for top-level functions and classes
        by_file_and_name: dict[int, dict[str, int]] = {}
        # by_class_method: dict (class_symbol_id, method_name) -> symbol id
        by_class_method: dict[tuple[int, str], int] = {}
        # by_name: dict name -> [symbol ids] across the whole project
        by_name: dict[str, list[int]] = {}

        for sym in all_symbols:
            by_name.setdefault(sym.name, []).append(sym.id)

            if sym.parent_id is None:
                by_file_and_name.setdefault(sym.file_id, {})[sym.name] = sym.id
            elif sym.kind == "method":
                by_class_method[(sym.parent_id, sym.name)] = sym.id

        # imports_per_file: file_id -> dict of imported_name -> symbol_id
        imports_per_file: dict[int, dict[str, int]] = {}

        if repo_path is None:
            base_path = Path("/tmp/gka") / str(repo_id)
        else:
            base_path = Path(repo_path)

        file_trees: dict[int, ast.AST] = {}

        for f in all_files:
            imports_per_file[f.id] = {}
            if f.parse_error:
                continue

            text: str | None = None
            if hasattr(f, "content") and getattr(f, "content", None):
                text = f.content
            elif base_path.exists():
                disk_file = base_path / f.path
                if disk_file.exists():
                    try:
                        text = disk_file.read_text(encoding="utf-8", errors="replace")
                    except OSError:
                        text = None

            if not text:
                continue

            try:
                tree = ast.parse(text)
                file_trees[f.id] = tree
            except SyntaxError:
                continue

            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom) and node.module:
                    target_file = _find_matching_file(node.module, file_by_path)
                    if target_file and target_file.id in by_file_and_name:
                        for alias in node.names:
                            bound_name = alias.asname or alias.name
                            orig_name = alias.name
                            if orig_name in by_file_and_name[target_file.id]:
                                target_sym_id = by_file_and_name[target_file.id][
                                    orig_name
                                ]
                                imports_per_file[f.id][bound_name] = target_sym_id
                elif isinstance(node, ast.Import):
                    for alias in node.names:
                        target_file = _find_matching_file(alias.name, file_by_path)
                        if target_file and target_file.id in by_file_and_name:
                            bound_name = alias.asname or alias.name.split(".")[0]
                            if bound_name in by_file_and_name[target_file.id]:
                                imports_per_file[f.id][bound_name] = by_file_and_name[
                                    target_file.id
                                ][bound_name]

        # Step 3: resolve calls and produce edges
        session.query(Edge).filter(Edge.repo_id == repo_id).delete()

        symbols_by_file_and_line: dict[tuple[int, int, str], Symbol] = {}
        for sym in all_symbols:
            symbols_by_file_and_line[(sym.file_id, sym.start_line, sym.name)] = sym

        edges_to_insert: list[dict] = []
        seen_edges: set[tuple[int, int, int]] = set()

        for f in all_files:
            tree = file_trees.get(f.id)
            if not tree:
                continue

            for node in ast.walk(tree):
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue

                caller_sym = symbols_by_file_and_line.get(
                    (f.id, node.lineno, node.name)
                )
                if not caller_sym:
                    matches = [
                        s
                        for s in all_symbols
                        if s.file_id == f.id
                        and s.name == node.name
                        and s.start_line <= node.lineno <= s.end_line
                    ]
                    if matches:
                        caller_sym = matches[0]

                if not caller_sym:
                    continue

                calls = find_calls(node)

                for call_type, target_name, line_no in calls:
                    # 1. name call, found in the same file -> certain
                    if call_type == "name" and target_name in by_file_and_name.get(
                        f.id, {}
                    ):
                        callee_id = by_file_and_name[f.id][target_name]
                        key = (caller_sym.id, callee_id, line_no)
                        if key not in seen_edges:
                            seen_edges.add(key)
                            edges_to_insert.append(
                                {
                                    "repo_id": repo_id,
                                    "caller_id": caller_sym.id,
                                    "callee_id": callee_id,
                                    "certainty": "certain",
                                    "call_line": line_no,
                                }
                            )
                        continue

                    # 2. name call, found through an import -> certain
                    if call_type == "name" and target_name in imports_per_file.get(
                        f.id, {}
                    ):
                        callee_id = imports_per_file[f.id][target_name]
                        key = (caller_sym.id, callee_id, line_no)
                        if key not in seen_edges:
                            seen_edges.add(key)
                            edges_to_insert.append(
                                {
                                    "repo_id": repo_id,
                                    "caller_id": caller_sym.id,
                                    "callee_id": callee_id,
                                    "certainty": "certain",
                                    "call_line": line_no,
                                }
                            )
                        continue

                    # 3. self call, method exists in the same class -> certain
                    if call_type == "self" and caller_sym.parent_id:
                        method_key = (caller_sym.parent_id, target_name)
                        if method_key in by_class_method:
                            callee_id = by_class_method[method_key]
                            key = (caller_sym.id, callee_id, line_no)
                            if key not in seen_edges:
                                seen_edges.add(key)
                                edges_to_insert.append(
                                    {
                                        "repo_id": repo_id,
                                        "caller_id": caller_sym.id,
                                        "callee_id": callee_id,
                                        "certainty": "certain",
                                        "call_line": line_no,
                                    }
                                )
                            continue

                    # 4. attr call or name call not found yet, and by_name has 1 to 3 matches
                    matches = by_name.get(target_name, [])
                    if 1 <= len(matches) <= 3:
                        for callee_id in matches:
                            key = (caller_sym.id, callee_id, line_no)
                            if key not in seen_edges:
                                seen_edges.add(key)
                                edges_to_insert.append(
                                    {
                                        "repo_id": repo_id,
                                        "caller_id": caller_sym.id,
                                        "callee_id": callee_id,
                                        "certainty": "uncertain",
                                        "call_line": line_no,
                                    }
                                )
                        continue

                    # 5. Anything else -> skip it

        for edge_data in edges_to_insert:
            session.add(Edge(**edge_data))

        session.commit()
    finally:
        if close_session:
            session.close()
