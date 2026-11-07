from app.db.models import Edge, File, Repo, Symbol
from app.impact.engine import calculate_impact, rank_files


def test_impact_pay_graph(fake_project, db_session):
    repo_id = fake_project["repo"].id
    pay_id = fake_project["symbols"]["pay"].id

    impact = calculate_impact(
        db_session, repo_id, symbol_id=pay_id, depth=3, variant="graph"
    )
    assert impact is not None
    assert impact["depth"] == 3
    assert impact["variant"] == "graph"

    results = impact["results"]
    assert len(results) >= 1
    checkout_res = next(r for r in results if r["name"] == "checkout")
    assert round(checkout_res["score"], 2) == 1.0
    assert checkout_res["level"] == "high"
    assert checkout_res["distance"] == 1
    assert "Calls pay directly." in checkout_res["reasons"]


def test_impact_rate_graph(fake_project, db_session):
    repo_id = fake_project["repo"].id
    rate_id = fake_project["symbols"]["rate"].id

    # Depth 3: pay has 1.0, checkout has 0.5
    impact_d3 = calculate_impact(
        db_session, repo_id, symbol_id=rate_id, depth=3, variant="graph"
    )
    assert impact_d3 is not None
    res_d3 = {r["name"]: r for r in impact_d3["results"]}
    assert round(res_d3["pay"]["score"], 2) == 1.0
    assert res_d3["pay"]["distance"] == 1
    assert round(res_d3["checkout"]["score"], 2) == 0.5
    assert res_d3["checkout"]["distance"] == 2
    assert "Reaches rate through 2 steps of calls." in res_d3["checkout"]["reasons"]

    # Same, depth 1: Only pay is returned
    impact_d1 = calculate_impact(
        db_session, repo_id, symbol_id=rate_id, depth=1, variant="graph"
    )
    assert impact_d1 is not None
    res_d1 = impact_d1["results"]
    assert len(res_d1) == 1
    assert res_d1[0]["name"] == "pay"


def test_impact_uncertain_edge(fake_project, db_session):
    repo_id = fake_project["repo"].id
    rate_id = fake_project["symbols"]["rate"].id

    # Change edge from pay -> rate to uncertain
    edge = (
        db_session.query(Edge)
        .filter(Edge.repo_id == repo_id, Edge.callee_id == rate_id)
        .first()
    )
    assert edge is not None
    edge.certainty = "uncertain"
    db_session.commit()

    impact = calculate_impact(
        db_session, repo_id, symbol_id=rate_id, depth=1, variant="graph"
    )
    assert impact is not None
    pay_res = impact["results"][0]
    # 1.0 * 0.6 = 0.6
    assert round(pay_res["score"], 2) == 0.6
    assert pay_res["uncertain"] is True
    assert "This link is a guess made from the name only." in pay_res["reasons"]


def test_function_nobody_calls(fake_project, db_session):
    repo_id = fake_project["repo"].id
    checkout_id = fake_project["symbols"]["checkout"].id

    # Nobody calls checkout
    impact = calculate_impact(
        db_session, repo_id, symbol_id=checkout_id, depth=3, variant="graph"
    )
    assert impact is not None
    assert impact["results"] == []


def test_recursive_loop_finishes(db_session):
    repo = Repo(
        url="https://github.com/loop/repo",
        owner="loop",
        name="repo",
        status="ready",
    )
    db_session.add(repo)
    db_session.flush()

    f = File(repo_id=repo.id, path="loop.py", size_bytes=100, line_count=20)
    db_session.add(f)
    db_session.flush()

    s_a = Symbol(
        repo_id=repo.id,
        file_id=f.id,
        name="a",
        qualified_name="a",
        kind="function",
        start_line=1,
        end_line=5,
    )
    s_b = Symbol(
        repo_id=repo.id,
        file_id=f.id,
        name="b",
        qualified_name="b",
        kind="function",
        start_line=6,
        end_line=10,
    )
    db_session.add_all([s_a, s_b])
    db_session.flush()

    # a calls b, b calls a
    e1 = Edge(
        repo_id=repo.id,
        caller_id=s_a.id,
        callee_id=s_b.id,
        certainty="certain",
        call_line=3,
    )
    e2 = Edge(
        repo_id=repo.id,
        caller_id=s_b.id,
        callee_id=s_a.id,
        certainty="certain",
        call_line=8,
    )
    db_session.add_all([e1, e2])
    db_session.commit()

    # Calculating impact of a terminates safely without recursion error
    impact = calculate_impact(
        db_session, repo.id, symbol_id=s_a.id, depth=5, variant="graph"
    )
    assert impact is not None
    assert len(impact["results"]) == 1
    assert impact["results"][0]["name"] == "b"


def test_rank_files(fake_project, db_session):
    repo_id = fake_project["repo"].id
    ranked = rank_files(db_session, repo_id, "pay.py", depth=3, variant="combined")
    assert "pay.py" not in ranked
    # shop.py and tax.py should be in ranked
    assert "shop.py" in ranked or "tax.py" in ranked


def test_impact_endpoint(client, fake_project):
    repo_id = fake_project["repo"].id
    pay_id = fake_project["symbols"]["pay"].id

    resp = client.get(
        f"/api/repos/{repo_id}/impact?symbol_id={pay_id}&depth=3&variant=combined"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["target"]["name"] == "pay"
    assert "results" in data

    # Bad depth
    bad_depth = client.get(f"/api/repos/{repo_id}/impact?symbol_id={pay_id}&depth=10")
    assert bad_depth.status_code == 400
    assert "Depth must be between 1 and 5" in bad_depth.json()["detail"]

    # Bad variant
    bad_variant = client.get(
        f"/api/repos/{repo_id}/impact?symbol_id={pay_id}&variant=invalid"
    )
    assert bad_variant.status_code == 400
    assert "Variant must be graph, history, or combined" in bad_variant.json()["detail"]

    # Unknown symbol
    unknown_sym = client.get(f"/api/repos/{repo_id}/impact?symbol_id=999999")
    assert unknown_sym.status_code == 404
    assert "Function not found" in unknown_sym.json()["detail"]
