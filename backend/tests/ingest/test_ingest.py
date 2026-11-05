import subprocess
from unittest.mock import patch

from sqlalchemy.orm import sessionmaker

from app.db.models import Edge, File, Repo, Symbol
from app.ingest.service import run_pipeline


def test_create_repo_and_bad_links(client):
    # Bad link
    resp = client.post("/api/repos", json={"url": "not-a-valid-github-url"})
    assert resp.status_code == 400
    assert (
        "Please paste a link like https://github.com/owner/name"
        in resp.json()["detail"]
    )

    # Good link
    with patch("app.ingest.router.run_pipeline") as mock_pipeline:
        resp = client.post(
            "/api/repos", json={"url": "https://github.com/pallets/click"}
        )
        assert resp.status_code == 202
        data = resp.json()
        assert data["owner"] == "pallets"
        assert data["name"] == "click"
        assert data["status"] == "queued"
        assert "id" in data
        mock_pipeline.assert_called_once_with(data["id"])


def test_retry_on_error(client, db_session):
    repo = Repo(
        url="https://github.com/test-org/retry-repo",
        owner="test-org",
        name="retry-repo",
        status="error",
        error_message="Previous failure",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    with patch("app.ingest.router.run_pipeline") as mock_pipeline:
        resp = client.post(
            "/api/repos", json={"url": "https://github.com/test-org/retry-repo"}
        )
        assert resp.status_code == 202
        data = resp.json()
        assert data["id"] == repo.id
        assert data["status"] == "queued"
        mock_pipeline.assert_called_once_with(repo.id)

    db_session.refresh(repo)
    assert repo.status == "queued"
    assert repo.error_message is None


def test_already_ready_returns_existing(client, db_session):
    repo = Repo(
        url="https://github.com/test-org/ready-repo",
        owner="test-org",
        name="ready-repo",
        status="ready",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    resp = client.post(
        "/api/repos", json={"url": "https://github.com/test-org/ready-repo"}
    )
    assert resp.status_code == 202 or resp.status_code == 200
    assert resp.json()["id"] == repo.id
    assert resp.json()["status"] == "ready"


def test_get_repo_endpoints(client, db_session):
    repo = Repo(
        url="https://github.com/test-org/viewer-repo",
        owner="test-org",
        name="viewer-repo",
        status="ready",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    # List repos
    resp = client.get("/api/repos")
    assert resp.status_code == 200
    assert any(r["id"] == repo.id for r in resp.json())

    # Get single repo
    resp = client.get(f"/api/repos/{repo.id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "viewer-repo"

    # Get non-existent repo
    resp = client.get("/api/repos/999999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Project not found"


def test_files_and_symbols_and_overview(client, db_session):
    repo = Repo(
        url="https://github.com/test-org/full-repo",
        owner="test-org",
        name="full-repo",
        status="ready",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    f = File(
        repo_id=repo.id,
        path="app/test.py",
        size_bytes=200,
        line_count=20,
        parse_error=False,
    )
    db_session.add(f)
    db_session.commit()
    db_session.refresh(f)

    s1 = Symbol(
        repo_id=repo.id,
        file_id=f.id,
        name="checkout",
        qualified_name="checkout",
        kind="function",
        start_line=1,
        end_line=5,
    )
    s2 = Symbol(
        repo_id=repo.id,
        file_id=f.id,
        name="pay",
        qualified_name="pay",
        kind="function",
        start_line=6,
        end_line=10,
    )
    db_session.add_all([s1, s2])
    db_session.commit()
    db_session.refresh(s1)
    db_session.refresh(s2)

    edge = Edge(
        repo_id=repo.id,
        caller_id=s1.id,
        callee_id=s2.id,
        certainty="certain",
        call_line=2,
    )
    db_session.add(edge)
    db_session.commit()

    # /files
    resp = client.get(f"/api/repos/{repo.id}/files")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["path"] == "app/test.py"

    # /files/{file_id}
    resp = client.get(f"/api/repos/{repo.id}/files/{f.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["path"] == "app/test.py"
    assert len(data["symbols"]) == 2

    # /symbols?q=check
    resp = client.get(f"/api/repos/{repo.id}/symbols?q=check")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["name"] == "checkout"

    # /overview
    resp = client.get(f"/api/repos/{repo.id}/overview")
    assert resp.status_code == 200
    overview = resp.json()
    assert overview["files"] == 1
    assert overview["functions"] == 2
    assert overview["calls"] == 1
    assert "commits" in overview
    assert "hotspots" in overview

    # /symbols/{id}/relations
    resp = client.get(f"/api/repos/{repo.id}/symbols/{s2.id}/relations")
    assert resp.status_code == 200
    rel = resp.json()
    assert len(rel["callers"]) == 1
    assert rel["callers"][0]["name"] == "checkout"
    assert rel["callers"][0]["certainty"] == "certain"

    # /graph?view=call
    resp = client.get(f"/api/repos/{repo.id}/graph?view=call")
    assert resp.status_code == 200
    graph = resp.json()
    assert len(graph["nodes"]) == 2
    assert len(graph["edges"]) == 1

    # /graph?view=module
    resp = client.get(f"/api/repos/{repo.id}/graph?view=module")
    assert resp.status_code == 200
    mod_graph = resp.json()
    assert len(mod_graph["nodes"]) == 1


def test_pipeline_status_flow_on_error(test_engine):
    session_factory = sessionmaker(bind=test_engine)
    session = session_factory()
    repo = Repo(
        url="https://github.com/invalid-org/does-not-exist",
        owner="invalid-org",
        name="does-not-exist",
        status="queued",
    )
    session.add(repo)
    session.commit()
    repo_id = repo.id
    session.close()

    # Run pipeline with patch to test error status flow
    with (
        patch(
            "app.ingest.service.clone_repo",
            side_effect=subprocess.CalledProcessError(1, ["git", "clone"]),
        ),
        patch("app.ingest.service.SessionLocal", session_factory),
        patch("app.ingest.service.delete_clone"),
    ):
        run_pipeline(repo_id)

    verify_session = session_factory()
    updated_repo = verify_session.query(Repo).filter(Repo.id == repo_id).first()
    assert updated_repo is not None
    assert updated_repo.status == "error"
    assert (
        updated_repo.error_message
        == "We could not download this project. Is it public?"
    )
    verify_session.close()
