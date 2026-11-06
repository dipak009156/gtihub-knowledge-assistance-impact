from unittest.mock import patch

from app.db.models import ValidationRun
from app.validation.runner import RUN_STATUS, run_validation


def test_validation_runner_fake_project(fake_project, db_session):
    repo_id = fake_project["repo"].id

    run_validation(repo_id, session=db_session)

    runs = (
        db_session.query(ValidationRun).filter(ValidationRun.repo_id == repo_id).all()
    )
    # 3 variants x 2 k-values = 6 rows
    assert len(runs) == 6

    variants = {r.variant for r in runs}
    assert variants == {"graph", "history", "combined"}

    ks = {r.k for r in runs}
    assert ks == {5, 10}

    for r in runs:
        assert 0.0 <= r.precision <= 1.0
        assert 0.0 <= r.recall <= 1.0
        assert r.commits_tested > 0


def test_validation_endpoints(client, fake_project, db_session):
    repo_id = fake_project["repo"].id
    RUN_STATUS.pop(repo_id, None)

    # Before run: returns status="none"
    resp = client.get(f"/api/repos/{repo_id}/validation")
    assert resp.status_code == 200
    assert resp.json()["status"] == "none"
    assert resp.json()["runs"] == []

    # Run validation in test
    with patch("app.validation.router.run_validation") as mock_run:
        post_resp = client.post(f"/api/repos/{repo_id}/validation/run")
        assert post_resp.status_code == 202
        assert post_resp.json()["status"] == "running"
        mock_run.assert_called_once_with(repo_id)

    # Actually execute runner to populate DB
    run_validation(repo_id, session=db_session)

    get_resp = client.get(f"/api/repos/{repo_id}/validation")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["status"] == "done"
    assert data["commits_tested"] > 0
    assert len(data["runs"]) == 6
    assert isinstance(data["details"], list)
