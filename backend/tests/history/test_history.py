import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.db.models import Commit, CommitFile, Repo
from app.history.cochange import cochange_for_file
from app.history.gitlog import read_git_log
from app.history.service import analyze


def test_read_git_log_on_tiny_repo(tmp_path: Path):
    def run(*args):
        subprocess.run(
            ["git", "-C", str(tmp_path), *args], check=True, capture_output=True
        )

    run("init", "-b", "main")
    run("config", "user.email", "t@example.com")
    run("config", "user.name", "Tester")
    (tmp_path / "a.py").write_text("x = 1\n")
    (tmp_path / "b.py").write_text("y = 1\n")
    run("add", ".")
    run("commit", "-m", "first")
    (tmp_path / "a.py").write_text("x = 2\n")
    (tmp_path / "b.py").write_text("y = 2\n")
    run("commit", "-am", "second")

    commits = read_git_log(tmp_path)
    assert len(commits) == 2
    for c in commits:
        assert "a.py" in c["files"]
        assert "b.py" in c["files"]


def test_bulk_commit_ignored(db_session):
    repo = Repo(
        url="https://github.com/fake/bulk",
        owner="fake",
        name="bulk",
        status="ready",
    )
    db_session.add(repo)
    db_session.commit()

    # Simulate 31 files changed
    bulk_files = [f"file_{i}.py" for i in range(31)]
    commit_data = [
        {
            "sha": "bulk123",
            "author": "BulkBot",
            "when": datetime.now(UTC).isoformat(),
            "message": "mass rename",
            "files": bulk_files,
        }
    ]

    from unittest import mock

    with mock.patch("app.history.service.read_git_log", return_value=commit_data):
        analyze(repo.id, "/fake/path", session=db_session)

    c = db_session.query(Commit).filter(Commit.repo_id == repo.id).first()
    assert c is not None
    assert c.is_bulk is True
    assert c.files_changed == 31

    cf_count = db_session.query(CommitFile).filter(CommitFile.commit_id == c.id).count()
    assert cf_count == 0


def test_cochange_on_fake_project(fake_project, db_session):
    repo_id = fake_project["repo"].id
    strengths = cochange_for_file(db_session, repo_id, "pay.py")
    assert "tax.py" in strengths
    assert round(strengths["tax.py"], 2) == 0.80

    # before filter with old date returns empty dict
    old_date = fake_project["base_time"] - timedelta(days=10)
    old_strengths = cochange_for_file(db_session, repo_id, "pay.py", before=old_date)
    assert old_strengths == {}


def test_hotspots_endpoint(client, fake_project):
    repo_id = fake_project["repo"].id
    resp = client.get(f"/api/repos/{repo_id}/hotspots?limit=20&sort=changes")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 3

    # pay.py has 10 changes
    by_path = {item["path"]: item for item in data}
    assert by_path["pay.py"]["changes"] == 10
    assert by_path["tax.py"]["changes"] == 8
    assert by_path["shop.py"]["changes"] == 0

    # Test sort=connections
    resp_conn = client.get(f"/api/repos/{repo_id}/hotspots?sort=connections")
    assert resp_conn.status_code == 200
    assert len(resp_conn.json()) == 3
