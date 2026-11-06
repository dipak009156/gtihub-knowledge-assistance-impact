from app.config import settings
from app.db.models import Chunk, Repo
from app.llm.service import clear_cache


def test_chat_question_length_validation(client, fake_project):
    repo_id = fake_project["repo"].id

    # 0 characters
    r0 = client.post(f"/api/repos/{repo_id}/chat", json={"question": ""})
    assert r0.status_code == 400
    assert "1 to 1000 characters" in r0.json()["detail"]

    # 1001 characters
    r1001 = client.post(f"/api/repos/{repo_id}/chat", json={"question": "a" * 1001})
    assert r1001.status_code == 400
    assert "1 to 1000 characters" in r1001.json()["detail"]


def test_chat_repo_not_ready(client, db_session):
    repo = Repo(
        url="https://github.com/not-ready/repo",
        owner="not-ready",
        name="repo",
        status="parsing",
    )
    db_session.add(repo)
    db_session.commit()

    resp = client.post(
        f"/api/repos/{repo.id}/chat", json={"question": "Where is pay()?"}
    )
    assert resp.status_code == 409
    assert "still being analysed" in resp.json()["detail"]


def test_chat_nothing_found(client, fake_project):
    repo_id = fake_project["repo"].id
    clear_cache(repo_id)

    # Empty chunks in database for this query
    resp = client.post(
        f"/api/repos/{repo_id}/chat", json={"question": "xyznonexistentquestion"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "I could not find anything about that in this project."
    assert data["grounded"] is False
    assert data["sources"] == []


def test_chat_cache(client, fake_project, db_session, monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "fake")
    repo_id = fake_project["repo"].id
    clear_cache(repo_id)

    # Add a chunk so search finds something
    f = fake_project["files"]["shop"]
    c = Chunk(
        repo_id=repo_id,
        file_id=f.id,
        symbol_id=fake_project["symbols"]["checkout"].id,
        start_line=1,
        end_line=2,
        content="def checkout():\n    pay()",
        embedding=[0.1] * 384,
    )
    db_session.add(c)
    db_session.commit()

    # First request
    r1 = client.post(
        f"/api/repos/{repo_id}/chat", json={"question": "How does checkout work?"}
    )
    assert r1.status_code == 200
    assert r1.json()["cached"] is False

    # Second request with same question (case and spaces vary slightly)
    r2 = client.post(
        f"/api/repos/{repo_id}/chat",
        json={"question": "  how Does checkout work?  "},
    )
    assert r2.status_code == 200
    assert r2.json()["cached"] is True


def test_chat_suggestions_endpoint(client, fake_project):
    repo_id = fake_project["repo"].id
    resp = client.get(f"/api/repos/{repo_id}/chat/suggestions")
    assert resp.status_code == 200
    data = resp.json()
    assert "questions" in data
    # Contains 3 fixed questions
    assert "What does this project do?" in data["questions"]
    assert "What is the most important class?" in data["questions"]
    assert "Where does the main work start?" in data["questions"]
    # Contains dynamic question
    assert any("What does" in q for q in data["questions"])
