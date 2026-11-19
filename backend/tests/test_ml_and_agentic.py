from app.agentic.pr_agent import review_diff_or_symbol
from app.agentic.sequence_flow import generate_sequence_diagram
from app.agentic.test_gen import generate_tests_for_symbol
from app.ml.defect_predictor import predict_repo_defects
from app.ml.graph_intelligence import predict_graph_links


def test_ml_defect_predictor(fake_project, db_session):
    repo_id = fake_project["repo"].id
    res = predict_repo_defects(db_session, repo_id)

    assert "summary" in res
    assert res["summary"]["total_files"] >= 1
    assert "predictions" in res
    assert len(res["predictions"]) >= 1

    first = res["predictions"][0]
    assert "path" in first
    assert "risk_score" in first
    assert "risk_level" in first
    assert first["risk_level"] in ("CRITICAL", "HIGH", "MODERATE", "LOW")
    assert "primary_drivers" in first
    assert isinstance(first["mitigations"], list)


def test_ml_graph_intelligence(fake_project, db_session):
    repo_id = fake_project["repo"].id
    res = predict_graph_links(db_session, repo_id)

    assert "summary" in res
    assert "links" in res
    assert isinstance(res["links"], list)


def test_agentic_pr_review(fake_project, db_session):
    repo_id = fake_project["repo"].id
    pay_id = fake_project["symbols"]["pay"].id

    res = review_diff_or_symbol(db_session, repo_id, symbol_id=pay_id)
    assert res["verdict"] in ("APPROVE", "REVIEW_REQUIRED", "BLOCKED_HIGH_RISK")
    assert "risk_score" in res
    assert "breaking_risks" in res
    assert "target_symbol" in res
    assert res["target_symbol"]["name"] == "pay"
    assert "affected_callers" in res


def test_agentic_sequence_flow(fake_project, db_session):
    repo_id = fake_project["repo"].id
    checkout_id = fake_project["symbols"]["checkout"].id

    res = generate_sequence_diagram(db_session, repo_id, symbol_id=checkout_id)
    assert "mermaid" in res
    assert "sequenceDiagram" in res["mermaid"]
    assert "checkout" in res["mermaid"]
    assert "steps" in res
    assert len(res["steps"]) >= 1


def test_agentic_test_generator(fake_project, db_session):
    repo_id = fake_project["repo"].id
    pay_id = fake_project["symbols"]["pay"].id

    res = generate_tests_for_symbol(db_session, repo_id, symbol_id=pay_id)
    assert res["symbol"]["name"] == "pay"
    assert res["framework"] in ("pytest", "vitest", "jest")
    assert "test_code" in res
    assert "def test_pay" in res["test_code"] or "test(" in res["test_code"] or "describe(" in res["test_code"]
