from collections import defaultdict, deque
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.models import File, Symbol
from app.graph.queries import load_edges, load_symbols
from app.history.cochange import cochange_details_for_file

WEIGHT_GRAPH = 0.6
WEIGHT_HISTORY = 0.4
UNCERTAIN_PENALTY = 0.6  # a guessed link counts less
HISTORY_ONLY_MIN = 0.3  # a file with no call link must co-change at least this much
HIGH, MEDIUM = 0.6, 0.3  # level cut-offs
MAX_RESULTS = 50


def callers_map(edges: list[dict]) -> dict[int, list[tuple[int, str]]]:
    """Map callee_id -> [(caller_id, certainty)]."""
    m = defaultdict(list)
    for e in edges:
        m[e["callee_id"]].append((e["caller_id"], e["certainty"]))
    return m


def walk_callers(
    m: dict[int, list[tuple[int, str]]], start_id: int, depth: int
) -> dict[int, tuple[int, bool]]:
    """Traverse callers backwards from start_id up to depth, returning {caller_id: (distance, is_uncertain)}."""
    found: dict[int, tuple[int, bool]] = {}
    seen = {start_id}
    queue: deque[tuple[int, int, bool]] = deque([(start_id, 0, False)])

    while queue:
        node, dist, unc = queue.popleft()
        if dist == depth:
            continue
        for caller_id, certainty in m.get(node, []):
            if caller_id in seen:
                continue
            seen.add(caller_id)
            is_unc = unc or (certainty == "uncertain")
            found[caller_id] = (dist + 1, is_unc)
            queue.append((caller_id, dist + 1, is_unc))
    return found


def calculate_impact(
    session: Session,
    repo_id: int,
    symbol_id: int,
    depth: int = 3,
    variant: str = "combined",
    before: datetime | None = None,
    weight_graph: float = WEIGHT_GRAPH,
    weight_history: float = WEIGHT_HISTORY,
    cached_symbols: list[dict] | None = None,
    cached_edges: list[dict] | None = None,
    cached_callers_map: dict[int, list[tuple[int, str]]] | None = None,
    cached_cochange: dict[str, dict] | None = None,
) -> dict | None:
    """Calculate impact analysis for a chosen function symbol."""
    target_sym = (
        session.query(Symbol)
        .filter(Symbol.id == symbol_id, Symbol.repo_id == repo_id)
        .first()
    )
    if not target_sym:
        return None

    target_file = session.query(File).filter(File.id == target_sym.file_id).first()
    target_file_path = target_file.path if target_file else ""
    target_file_name = Path(target_file_path).name if target_file_path else "file"

    if cached_symbols is not None:
        all_symbols_list = cached_symbols
    else:
        all_symbols_list = load_symbols(session, repo_id)
    sym_dict = {s["id"]: s for s in all_symbols_list}

    if cached_callers_map is not None:
        c_map = cached_callers_map
    else:
        edges_list = (
            cached_edges if cached_edges is not None else load_edges(session, repo_id)
        )
        c_map = callers_map(edges_list)

    found_callers = walk_callers(c_map, symbol_id, depth)
    if cached_cochange is not None:
        cochange_info = cached_cochange
    else:
        cochange_info = cochange_details_for_file(
            session, repo_id, target_file_path, before=before
        )

    results: list[dict] = []
    represented_files: set[str] = set()

    for caller_id, (dist, is_unc) in found_callers.items():
        sym_info = sym_dict.get(caller_id)
        if not sym_info:
            continue

        sym_file_path = sym_info["file_path"]
        represented_files.add(sym_file_path)

        # Graph score: 1 / distance, penalized if any link on the way is uncertain
        graph_score = 1.0 / dist
        if is_unc:
            graph_score *= UNCERTAIN_PENALTY

        # History score: co-change strength between target file and caller file (0 if same file)
        hist_entry = None
        if sym_file_path == target_file_path:
            hist_score = 0.0
        else:
            hist_entry = cochange_info.get(sym_file_path)
            hist_score = hist_entry["strength"] if hist_entry else 0.0

        if variant == "graph":
            raw_score = graph_score
        elif variant == "history":
            raw_score = hist_score
        else:  # combined
            raw_score = weight_graph * graph_score + weight_history * hist_score

        score = round(raw_score, 2)
        level = "high" if score >= HIGH else ("medium" if score >= MEDIUM else "low")

        reasons: list[str] = []
        if dist == 1:
            reasons.append(f"Calls {target_sym.name} directly.")
        else:
            reasons.append(f"Reaches {target_sym.name} through {dist} steps of calls.")

        if is_unc:
            reasons.append("This link is a guess made from the name only.")

        if hist_entry and hist_entry["strength"] >= 0.3:
            reasons.append(
                f"Changed together with {target_file_name} in {hist_entry['cochange_count']} of {hist_entry['total_commits']} past commits."
            )

        results.append(
            {
                "kind": sym_info["kind"],
                "id": sym_info["id"],
                "name": sym_info["name"],
                "qualified_name": sym_info["qualified_name"],
                "file_path": sym_file_path,
                "start_line": sym_info["start_line"],
                "score": score,
                "level": level,
                "distance": dist,
                "uncertain": is_unc,
                "reasons": reasons,
            }
        )

    # Step 3: Add files the map missed with strength >= HISTORY_ONLY_MIN
    for other_path, info in cochange_info.items():
        if (
            other_path not in represented_files
            and other_path != target_file_path
            and info["strength"] >= HISTORY_ONLY_MIN
        ):
            graph_score = 0.0
            hist_score = info["strength"]

            if variant == "graph":
                raw_score = 0.0
            elif variant == "history":
                raw_score = hist_score
            else:
                raw_score = weight_history * hist_score

            score = round(raw_score, 2)
            level = (
                "high" if score >= HIGH else ("medium" if score >= MEDIUM else "low")
            )
            reasons = [
                f"Changed together with {target_file_name} in {info['cochange_count']} of {info['total_commits']} past commits."
            ]

            results.append(
                {
                    "kind": "file",
                    "id": None,
                    "name": Path(other_path).name,
                    "qualified_name": other_path,
                    "file_path": other_path,
                    "start_line": 1,
                    "score": score,
                    "level": level,
                    "distance": 0,
                    "uncertain": False,
                    "reasons": reasons,
                }
            )

    # Step 5: Sort by score descending, tie break by name ascending
    results.sort(key=lambda item: (-item["score"], item["name"]))
    truncated = len(results) > MAX_RESULTS
    final_results = results[:MAX_RESULTS]

    return {
        "target": {
            "id": target_sym.id,
            "name": target_sym.name,
            "qualified_name": target_sym.qualified_name,
            "file_path": target_file_path,
            "start_line": target_sym.start_line,
        },
        "depth": depth,
        "variant": variant,
        "truncated": truncated,
        "results": final_results,
    }


def rank_files(
    session: Session,
    repo_id: int,
    file_path: str,
    depth: int = 3,
    variant: str = "combined",
    before: datetime | None = None,
    weight_graph: float = WEIGHT_GRAPH,
    weight_history: float = WEIGHT_HISTORY,
    cached_symbols: list[dict] | None = None,
    cached_edges: list[dict] | None = None,
    cached_callers_map: dict[int, list[tuple[int, str]]] | None = None,
) -> list[str]:
    """Rank all other affected files for a given changed file."""
    # Symbols in this file
    file_record = (
        session.query(File)
        .filter(File.repo_id == repo_id, File.path == file_path)
        .first()
    )
    if not file_record:
        return []

    symbols = (
        session.query(Symbol)
        .filter(Symbol.file_id == file_record.id, Symbol.repo_id == repo_id)
        .all()
    )

    if cached_symbols is None:
        cached_symbols = load_symbols(session, repo_id)
    if cached_callers_map is None:
        edges = (
            cached_edges if cached_edges is not None else load_edges(session, repo_id)
        )
        cached_callers_map = callers_map(edges)

    cochange_info = (
        cochange_details_for_file(session, repo_id, file_path, before=before)
        if variant in ("history", "combined")
        else {}
    )

    best_score_per_file: dict[str, float] = {}

    for sym in symbols:
        impact = calculate_impact(
            session=session,
            repo_id=repo_id,
            symbol_id=sym.id,
            depth=depth,
            variant=variant,
            before=before,
            weight_graph=weight_graph,
            weight_history=weight_history,
            cached_symbols=cached_symbols,
            cached_callers_map=cached_callers_map,
            cached_cochange=cochange_info,
        )
        if not impact:
            continue
        for res in impact["results"]:
            other_file = res["file_path"]
            if other_file != file_path:
                best_score_per_file[other_file] = max(
                    best_score_per_file.get(other_file, 0.0), res["score"]
                )

    # Also include cochange files directly if variant uses history
    if variant in ("history", "combined"):
        for other_path, info in cochange_info.items():
            if other_path != file_path and info["strength"] >= HISTORY_ONLY_MIN:
                h_score = (
                    info["strength"]
                    if variant == "history"
                    else (weight_history * info["strength"])
                )
                best_score_per_file[other_path] = max(
                    best_score_per_file.get(other_path, 0.0), round(h_score, 2)
                )

    # Sort files by best score descending, then alphabetical
    sorted_files = sorted(
        best_score_per_file.keys(),
        key=lambda fp: (-best_score_per_file[fp], fp),
    )
    return sorted_files


def calculate_diff_impact(
    session: Session,
    repo_id: int,
    changed_files: list[dict],
    depth: int = 3,
    variant: str = "combined",
    weight_graph: float = WEIGHT_GRAPH,
    weight_history: float = WEIGHT_HISTORY,
) -> dict:
    """Calculate aggregate blast radius across multiple files and modified lines (e.g. from a PR or git diff)."""
    cached_symbols = load_symbols(session, repo_id)
    edges = load_edges(session, repo_id)
    cached_callers_map = callers_map(edges)

    symbols_by_file_path: dict[str, list[dict]] = defaultdict(list)
    for s in cached_symbols:
        symbols_by_file_path[s["file_path"]].append(s)

    target_symbols: list[dict] = []
    target_files_set: set[str] = set()

    for item in changed_files:
        f_path = item.get("path", "").lstrip("/")
        lines = item.get("lines", [])
        target_files_set.add(f_path)
        file_syms = symbols_by_file_path.get(f_path, [])

        if lines:
            for s in file_syms:
                if any(s["start_line"] <= ln <= s["end_line"] for ln in lines):
                    target_symbols.append(s)
        else:
            target_symbols.extend(file_syms)

    best_impact_by_key: dict[tuple[str, str], dict] = {}

    for sym in target_symbols:
        cochange_info = (
            cochange_details_for_file(session, repo_id, sym["file_path"])
            if variant in ("history", "combined")
            else {}
        )

        res = calculate_impact(
            session=session,
            repo_id=repo_id,
            symbol_id=sym["id"],
            depth=depth,
            variant=variant,
            weight_graph=weight_graph,
            weight_history=weight_history,
            cached_symbols=cached_symbols,
            cached_callers_map=cached_callers_map,
            cached_cochange=cochange_info,
        )
        if not res:
            continue

        for it in res["results"]:
            key = (it["kind"], it["qualified_name"])
            if key not in best_impact_by_key:
                best_impact_by_key[key] = dict(it)
            else:
                existing = best_impact_by_key[key]
                if it["score"] > existing["score"]:
                    existing["score"] = it["score"]
                    existing["level"] = it["level"]
                for r in it["reasons"]:
                    if r not in existing["reasons"]:
                        existing["reasons"].append(r)

    all_results = sorted(
        best_impact_by_key.values(), key=lambda x: (-x["score"], x["name"])
    )
    high_risk_count = sum(1 for r in all_results if r["level"] == "high")
    medium_risk_count = sum(1 for r in all_results if r["level"] == "medium")
    impacted_files = sorted(
        {r["file_path"] for r in all_results if r["file_path"] not in target_files_set}
    )

    return {
        "depth": depth,
        "variant": variant,
        "target_files": sorted(target_files_set),
        "target_symbols": [
            {
                "id": s["id"],
                "name": s["name"],
                "qualified_name": s["qualified_name"],
                "file_path": s["file_path"],
                "start_line": s["start_line"],
            }
            for s in target_symbols
        ],
        "summary": {
            "total_impacted_symbols": len(all_results),
            "total_impacted_files": len(impacted_files),
            "high_risk_count": high_risk_count,
            "medium_risk_count": medium_risk_count,
        },
        "impacted_files": impacted_files,
        "results": all_results[:MAX_RESULTS],
    }
