import ast
import re
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.models import Edge, File, Symbol
from app.db.session import SessionLocal
from app.graph.calls import find_calls
from app.ingest.cloner import get_repo_dir


def _find_matching_file(module_name: str, file_by_path: dict[str, File]) -> File | None:
    """Find a project file matching an imported module name across languages."""
    clean_mod = module_name.lstrip("./").replace("\\", "/")
    parts = clean_mod.split(".") if "/" not in clean_mod else clean_mod.split("/")
    base_target = "/".join(parts)

    common_exts = (
        ".py",
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".go",
        ".rs",
        ".java",
        ".c",
        ".cpp",
    )
    candidates = [base_target] + [f"{base_target}{ext}" for ext in common_exts]
    candidates += [f"{base_target}/index{ext}" for ext in common_exts]
    candidates += [f"{base_target}/__init__.py"]

    for path, f in file_by_path.items():
        norm_p = path.replace("\\", "/")
        if any(norm_p == c or norm_p.endswith("/" + c) for c in candidates):
            return f

    # Fallback to stem match
    last_name = parts[-1]
    for path, f in file_by_path.items():
        norm_p = path.replace("\\", "/")
        stem = Path(norm_p).stem
        if stem == last_name:
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
            base_path = get_repo_dir(repo_id)
        else:
            base_path = Path(repo_path)

        file_trees: dict[int, ast.AST] = {}
        file_contents: dict[int, str] = {}

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

            file_contents[f.id] = text

            try:
                tree = ast.parse(text)
                file_trees[f.id] = tree
            except SyntaxError:
                continue

            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom):
                    target_file = None
                    if node.level and node.level > 0:
                        norm_path = f.path.replace("\\", "/")
                        parts = norm_path.split("/")[:-1]
                        slice_len = len(parts) - (node.level - 1)
                        if slice_len >= 0:
                            dir_parts = parts[:slice_len]
                            mod_parts = node.module.split(".") if node.module else []
                            rel_parts = dir_parts + mod_parts
                            if rel_parts:
                                rel_module = ".".join(rel_parts)
                                target_file = _find_matching_file(
                                    rel_module, file_by_path
                                )
                    elif node.module:
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

        # Multi-language import extraction for JS, TS, Go, etc.
        js_ts_import_named = re.compile(
            r'import\s+\{([^}]+)\}\s+from\s+[\'"]([^\'"]+)[\'"]'
        )
        js_ts_import_default = re.compile(
            r'import\s+([A-Za-z0-9_$]+)\s+from\s+[\'"]([^\'"]+)[\'"]'
        )
        js_require_named = re.compile(
            r'(?:const|let|var)\s+\{([^}]+)\}\s*=\s*require\([\'"]([^\'"]+)[\'"]\)'
        )

        for f in all_files:
            if f.id in file_trees or f.parse_error:
                continue
            text = file_contents.get(f.id)
            if not text:
                continue

            for match in js_ts_import_named.finditer(text):
                names_blob, mod_path = match.group(1), match.group(2)
                target_file = _find_matching_file(mod_path, file_by_path)
                if target_file and target_file.id in by_file_and_name:
                    for part in names_blob.split(","):
                        part = part.strip()
                        if not part:
                            continue
                        if " as " in part:
                            orig, alias = [p.strip() for p in part.split(" as ", 1)]
                        else:
                            orig, alias = part, part
                        if orig in by_file_and_name[target_file.id]:
                            imports_per_file[f.id][alias] = by_file_and_name[target_file.id][orig]

            for match in js_ts_import_default.finditer(text):
                default_name, mod_path = match.group(1).strip(), match.group(2)
                target_file = _find_matching_file(mod_path, file_by_path)
                if target_file and target_file.id in by_file_and_name:
                    for sym_name, sym_id in by_file_and_name[target_file.id].items():
                        imports_per_file[f.id][sym_name] = sym_id
                        imports_per_file[f.id][default_name] = sym_id
                        break

            for match in js_require_named.finditer(text):
                names_blob, mod_path = match.group(1), match.group(2)
                target_file = _find_matching_file(mod_path, file_by_path)
                if target_file and target_file.id in by_file_and_name:
                    for part in names_blob.split(","):
                        part = part.strip()
                        if not part:
                            continue
                        if ":" in part:
                            orig, alias = [p.strip() for p in part.split(":", 1)]
                        else:
                            orig, alias = part, part
                        if orig in by_file_and_name[target_file.id]:
                            imports_per_file[f.id][alias] = by_file_and_name[target_file.id][orig]

        # Step 3: resolve calls and produce edges
        session.query(Edge).filter(Edge.repo_id == repo_id).delete()

        symbols_by_file_and_line: dict[tuple[int, int, str], Symbol] = {}
        for sym in all_symbols:
            symbols_by_file_and_line[(sym.file_id, sym.start_line, sym.name)] = sym

        class_bases: dict[int, list[str]] = {}
        for f in all_files:
            tree = file_trees.get(f.id)
            if not tree:
                continue
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    class_sym = symbols_by_file_and_line.get(
                        (f.id, node.lineno, node.name)
                    )
                    if not class_sym:
                        matches = [
                            s
                            for s in all_symbols
                            if s.file_id == f.id
                            and s.name == node.name
                            and s.kind == "class"
                        ]
                        if matches:
                            class_sym = matches[0]
                    if class_sym:
                        base_ids = []
                        for b in node.bases:
                            if isinstance(b, ast.Name):
                                base_ids.append(b.id)
                            elif isinstance(b, ast.Attribute):
                                base_ids.append(b.attr)
                        class_bases[class_sym.id] = base_ids

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

                    # 3. self call, method exists in the same class or inherited from base class -> certain
                    if call_type == "self" and caller_sym.parent_id:
                        method_key = (caller_sym.parent_id, target_name)
                        callee_id = by_class_method.get(method_key)
                        if not callee_id and caller_sym.parent_id in class_bases:
                            for base_name in class_bases[caller_sym.parent_id]:
                                base_class_id = (
                                    by_file_and_name.get(f.id, {}).get(base_name)
                                    or imports_per_file.get(f.id, {}).get(base_name)
                                    or (by_name.get(base_name, [None])[0])
                                )
                                if (
                                    base_class_id
                                    and (base_class_id, target_name) in by_class_method
                                ):
                                    callee_id = by_class_method[
                                        (base_class_id, target_name)
                                    ]
                                    break

                        if callee_id:
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

        # Multi-language call resolution for non-Python or non-AST files
        non_ast_files = [
            f for f in all_files if f.id not in file_trees and not f.parse_error
        ]
        regex_call = re.compile(r"\b([A-Za-z0-9_$]{2,})\s*\(")
        call_keywords = {
            "if",
            "for",
            "while",
            "switch",
            "catch",
            "return",
            "sizeof",
            "typeof",
            "new",
            "super",
            "require",
            "import",
            "console",
            "make",
            "len",
            "append",
            "panic",
            "assert",
            "func",
            "function",
        }

        for f in non_ast_files:
            text = file_contents.get(f.id)
            if not text:
                continue
            lines = text.splitlines()
            syms_in_file = [s for s in all_symbols if s.file_id == f.id]

            for caller_sym in syms_in_file:
                s_idx = max(0, caller_sym.start_line - 1)
                e_idx = min(len(lines), caller_sym.end_line)
                for line_offset, line_str in enumerate(lines[s_idx:e_idx]):
                    curr_line = s_idx + line_offset + 1
                    for match in regex_call.finditer(line_str):
                        target_name = match.group(1)
                        if (
                            target_name in call_keywords
                            or target_name == caller_sym.name
                        ):
                            continue

                        # 0. imported symbol
                        if target_name in imports_per_file.get(f.id, {}):
                            callee_id = imports_per_file[f.id][target_name]
                            key = (caller_sym.id, callee_id, curr_line)
                            if key not in seen_edges:
                                seen_edges.add(key)
                                edges_to_insert.append(
                                    {
                                        "repo_id": repo_id,
                                        "caller_id": caller_sym.id,
                                        "callee_id": callee_id,
                                        "certainty": "certain",
                                        "call_line": curr_line,
                                    }
                                )
                            continue

                        # 1. same file
                        if target_name in by_file_and_name.get(f.id, {}):
                            callee_id = by_file_and_name[f.id][target_name]
                            key = (caller_sym.id, callee_id, curr_line)
                            if key not in seen_edges:
                                seen_edges.add(key)
                                edges_to_insert.append(
                                    {
                                        "repo_id": repo_id,
                                        "caller_id": caller_sym.id,
                                        "callee_id": callee_id,
                                        "certainty": "certain",
                                        "call_line": curr_line,
                                    }
                                )
                            continue

                        # 2. across repo (1 to 3 matches)
                        matches = by_name.get(target_name, [])
                        if 1 <= len(matches) <= 3:
                            for callee_id in matches:
                                key = (caller_sym.id, callee_id, curr_line)
                                if key not in seen_edges:
                                    seen_edges.add(key)
                                    edges_to_insert.append(
                                        {
                                            "repo_id": repo_id,
                                            "caller_id": caller_sym.id,
                                            "callee_id": callee_id,
                                            "certainty": "uncertain",
                                            "call_line": curr_line,
                                        }
                                    )

        for edge_data in edges_to_insert:
            session.add(Edge(**edge_data))

        session.commit()
    finally:
        if close_session:
            session.close()
