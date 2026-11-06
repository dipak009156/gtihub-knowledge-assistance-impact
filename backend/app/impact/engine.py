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

    all_symbols_list = load_symbols(session, repo_id)
    sym_dict = {s["id"]: s for s in all_symbols_list}

    edges_list = load_edges(session, repo_id)
    c_map = callers_map(edges_list)

    found_callers = walk_callers(c_map, symbol_id, depth)
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
            raw_score = WEIGHT_GRAPH * graph_score + WEIGHT_HISTORY * hist_score

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
                raw_score = WEIGHT_HISTORY * hist_score

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

    best_score_per_file: dict[str, float] = {}

    for sym in symbols:
        impact = calculate_impact(
            session=session,
            repo_id=repo_id,
            symbol_id=sym.id,
            depth=depth,
            variant=variant,
            before=before,
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
        cochange_info = cochange_details_for_file(
            session, repo_id, file_path, before=before
        )
        for other_path, info in cochange_info.items():
            if other_path != file_path and info["strength"] >= HISTORY_ONLY_MIN:
                h_score = (
                    info["strength"]
                    if variant == "history"
                    else (WEIGHT_HISTORY * info["strength"])
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
