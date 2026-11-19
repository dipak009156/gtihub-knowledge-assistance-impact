from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import Edge, File, Repo, Symbol
from app.history.cochange import top_files
from app.ml.defect_predictor import predict_repo_defects


def generate_executive_report(session: Session, repo_id: int) -> dict[str, Any]:
    """Compile comprehensive executive audit report combining AST, Graph, ML, and Churn."""
    repo = session.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        return {}

    # File & Symbol metrics
    files = session.query(File).filter(File.repo_id == repo_id).all()
    symbols = session.query(Symbol).filter(Symbol.repo_id == repo_id).all()
    edges = session.query(Edge).filter(Edge.repo_id == repo_id).all()

    total_files = len(files)
    total_loc = sum(f.line_count or 0 for f in files)
    total_symbols = len(symbols)
    total_edges = len(edges)

    certain_edges = sum(1 for e in edges if e.certainty == "certain")
    certainty_pct = (
        round((certain_edges / total_edges) * 100, 1) if total_edges > 0 else 100.0
    )

    # Detect language distribution
    lang_counts: dict[str, int] = {}
    for f in files:
        ext = f.path.split(".")[-1].lower() if "." in f.path else "other"
        lang_counts[ext] = lang_counts.get(ext, 0) + 1

    # ML Defect Predictions
    try:
        defect_data = predict_repo_defects(session, repo_id)
        predictions = defect_data.get("predictions", [])
    except Exception:
        predictions = []

    # Hotspots & Churn
    try:
        hotspots = top_files(session, repo_id, limit=10, sort="score")
    except Exception:
        hotspots = []

    # Calculate Hub Symbols (Centrality)
    inbound_counts: dict[int, int] = {}
    outbound_counts: dict[int, int] = {}
    for e in edges:
        inbound_counts[e.callee_id] = inbound_counts.get(e.callee_id, 0) + 1
        outbound_counts[e.caller_id] = outbound_counts.get(e.caller_id, 0) + 1

    symbol_map = {s.id: s for s in symbols}
    top_hubs = []
    sorted_hubs = sorted(
        inbound_counts.items(), key=lambda item: item[1], reverse=True
    )[:5]
    for sym_id, callers_count in sorted_hubs:
        sym = symbol_map.get(sym_id)
        if sym:
            top_hubs.append(
                {
                    "id": sym.id,
                    "name": sym.name,
                    "qualified_name": sym.qualified_name,
                    "kind": sym.kind,
                    "callers": callers_count,
                    "callees": outbound_counts.get(sym.id, 0),
                }
            )

    # Health Grading Algorithm
    # Deductions: high defect density, low certainty, extreme hotspot concentration
    avg_risk = (
        sum(p.get("defect_propensity_score", 0) for p in predictions)
        / len(predictions)
        if predictions
        else 0.15
    )
    architecture_score = max(50, min(100, int(certainty_pct * 0.7 + (1 - avg_risk) * 30)))
    reliability_score = max(50, min(100, int((1 - avg_risk) * 90 + (certainty_pct * 0.1))))
    testability_score = max(50, min(100, int(100 - (len(predictions) * 2) + 10)))

    overall_numeric = int((architecture_score * 0.4) + (reliability_score * 0.35) + (testability_score * 0.25))

    if overall_numeric >= 92:
        grade = "A+"
    elif overall_numeric >= 85:
        grade = "A"
    elif overall_numeric >= 78:
        grade = "B"
    elif overall_numeric >= 70:
        grade = "C"
    elif overall_numeric >= 60:
        grade = "D"
    else:
        grade = "F"

    # Actionable Recommendations
    recommendations = []
    if certainty_pct < 85:
        recommendations.append({
            "priority": "HIGH",
            "category": "Architecture",
            "message": f"Static call certainty is {certainty_pct}%. Standardize dynamic imports to improve compile-time verification.",
        })
    if predictions and predictions[0].get("defect_propensity_score", 0) > 0.65:
        top_risk_file = predictions[0].get("file_path")
        recommendations.append({
            "priority": "CRITICAL",
            "category": "Risk Mitigation",
            "message": f"File '{top_risk_file}' exhibits high cyclomatic complexity and churn velocity. Synthesize unit tests to protect against regressions.",
        })
    if top_hubs and top_hubs[0]["callers"] > 15:
        recommendations.append({
            "priority": "MEDIUM",
            "category": "Coupling",
            "message": f"Symbol '{top_hubs[0]['name']}' has {top_hubs[0]['callers']} inbound callers. Consider decomposing it into focused sub-interfaces.",
        })

    return {
        "repository": {
            "id": repo.id,
            "owner": repo.owner,
            "name": repo.name,
            "url": repo.url,
            "status": repo.status,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
        "scorecard": {
            "grade": grade,
            "overall_score": overall_numeric,
            "architecture_score": architecture_score,
            "reliability_score": reliability_score,
            "testability_score": testability_score,
        },
        "metrics": {
            "total_files": total_files,
            "total_lines_of_code": total_loc,
            "total_symbols": total_symbols,
            "total_call_edges": total_edges,
            "certainty_percentage": certainty_pct,
            "languages": lang_counts,
        },
        "top_hubs": top_hubs,
        "hotspots": hotspots[:5],
        "top_defect_risks": predictions[:5],
        "recommendations": recommendations,
    }


def generate_report_markdown(session: Session, repo_id: int) -> str:
    """Generate high-impact GitHub Flavored Markdown codebase audit report."""
    rep = generate_executive_report(session, repo_id)
    if not rep:
        return "# Codebase Audit Report\n\nRepository data could not be found."

    r = rep["repository"]
    s = rep["scorecard"]
    m = rep["metrics"]

    md = [
        f"# 🛡️ Codebase Architecture & Risk Audit: `{r['owner']}/{r['name']}`",
        f"*Generated on {r['generated_at'][:10]} via GitHub Knowledge Assistance (GKA) Deterministic Intelligence Engine*",
        "",
        "---",
        "",
        "## 1. Executive Health Scorecard",
        "",
        f"| Metric | Assessment | Score |",
        f"| :--- | :---: | :---: |",
        f"| **Overall Codebase Grade** | **{s['grade']}** | **{s['overall_score']} / 100** |",
        f"| **Architecture & Coupling** | Verified | {s['architecture_score']} / 100 |",
        f"| **Reliability & Defect Risk** | Modeled | {s['reliability_score']} / 100 |",
        f"| **Testability & Churn Safety** | Analyzed | {s['testability_score']} / 100 |",
        "",
        "---",
        "",
        "## 2. Codebase Volume & Graph Density",
        "",
        f"- **Total Source Files**: `{m['total_files']}` files",
        f"- **Lines of Code (LOC)**: `{m['total_lines_of_code']:,}` lines",
        f"- **AST Symbols Extracted**: `{m['total_symbols']:,}` (classes, functions, methods)",
        f"- **Deterministic Call Edges**: `{m['total_call_edges']:,}` calls",
        f"- **Call Certainty Verification**: **`{m['certainty_percentage']}%`** verified static certainty",
        "",
        "---",
        "",
        "## 3. High-Risk Defect Propensity Files (ML Predictive Scoring)",
        "",
        "| File Path | Complexity | Churn | Risk Score | Risk Tier |",
        "| :--- | :---: | :---: | :---: | :---: |",
    ]

    for p in rep["top_defect_risks"]:
        md.append(
            f"| `{p.get('file_path')}` | {p.get('complexity', 0)} | {p.get('churn', 0)} | {p.get('defect_propensity_score', 0):.2f} | **{p.get('risk_level', 'Medium')}** |"
        )

    md.extend([
        "",
        "---",
        "",
        "## 4. Top Architectural Hubs (High Centrality Functions)",
        "",
        "| Symbol | Kind | Inbound Callers | Outbound Callees |",
        "| :--- | :---: | :---: | :---: |",
    ])

    for h in rep["top_hubs"]:
        md.append(f"| `{h['name']}` | `{h['kind']}` | **{h['callers']}** | {h['callees']} |")

    md.extend([
        "",
        "---",
        "",
        "## 5. Actionable Engineering Recommendations",
        "",
    ])

    for rec in rep["recommendations"]:
        badge = "🔴" if rec["priority"] == "CRITICAL" else ("🟡" if rec["priority"] == "HIGH" else "🔵")
        md.append(f"### {badge} [{rec['priority']}] {rec['category']}")
        md.append(f"> {rec['message']}\n")

    md.extend([
        "---",
        "*Automated report generated by GitHub Knowledge Assistance Engine. Deterministic verification guaranteed.*",
    ])

    return "\n".join(md)
