from pathlib import Path

import app.retrieval.indexer
from app.db.models import Chunk, File, Repo, Symbol
from app.retrieval.indexer import index
from app.retrieval.search import search
from tests.conftest import fake_embed


def test_index_and_repeat_run(db_session, monkeypatch):
    repo = Repo(
        url="https://github.com/test/search-repo",
        owner="test",
        name="search-repo",
        status="ready",
    )
    db_session.add(repo)
    db_session.flush()

    f1 = File(
        repo_id=repo.id,
        path="shop.py",
        size_bytes=50,
        line_count=4,
        parse_error=False,
    )
    f2 = File(
        repo_id=repo.id,
        path="models.py",
        size_bytes=60,
        line_count=4,
        parse_error=False,
    )
    if hasattr(File, "content"):
        f1.content = "def checkout():\n    pay()\n\ndef pay():\n    pass\n"
        f2.content = "class Order:\n    pass\n"
    db_session.add_all([f1, f2])
    db_session.flush()

    s1 = Symbol(
        repo_id=repo.id,
        file_id=f1.id,
        name="checkout",
        qualified_name="checkout",
        kind="function",
        start_line=1,
        end_line=2,
    )
    s2 = Symbol(
        repo_id=repo.id,
        file_id=f1.id,
        name="pay",
        qualified_name="pay",
        kind="function",
        start_line=4,
        end_line=5,
    )
    db_session.add_all([s1, s2])
    db_session.commit()

    monkeypatch.setattr(
        Path,
        "exists",
        lambda self: bool("shop.py" in str(self) or "models.py" in str(self)),
    )
    monkeypatch.setattr(
        Path,
        "read_text",
        lambda self, *a, **k: (
            "def checkout():\n    pay()\n\ndef pay():\n    pass\n"
            if "shop.py" in str(self)
            else "class Order:\n    pass\n"
        ),
    )

    index(repo.id, session=db_session)
    count_first = db_session.query(Chunk).filter(Chunk.repo_id == repo.id).count()
    assert count_first > 0

    # Run index a second time -> same chunk count (no doubles)
    index(repo.id, session=db_session)
    count_second = db_session.query(Chunk).filter(Chunk.repo_id == repo.id).count()
    assert count_second == count_first


def test_index_embedder_failure(db_session, monkeypatch):
    def failing_embed(texts):
        raise RuntimeError("No internet connection")

    orig_embed = app.retrieval.indexer.embed
    app.retrieval.indexer.embed = failing_embed

    try:
        repo = Repo(
            url="https://github.com/test/fail-embed",
            owner="test",
            name="fail-embed",
            status="ready",
        )
        db_session.add(repo)
        db_session.flush()

        f = File(
            repo_id=repo.id,
            path="app.py",
            size_bytes=30,
            line_count=2,
            parse_error=False,
        )
        db_session.add(f)
        db_session.flush()

        monkeypatch.setattr(Path, "exists", lambda self: True)
        monkeypatch.setattr(Path, "read_text", lambda self, *a, **k: "x = 1\ny = 2\n")

        # index does not crash and saves chunks with embedding = None
        index(repo.id, session=db_session)
        chunks = db_session.query(Chunk).filter(Chunk.repo_id == repo.id).all()
        assert len(chunks) > 0
        for c in chunks:
            assert c.embedding is None
    finally:
        app.retrieval.indexer.embed = orig_embed


def test_search_word_in_one_function(db_session):
    repo = Repo(
        url="https://github.com/test/search-precision",
        owner="test",
        name="search-precision",
        status="ready",
    )
    db_session.add(repo)
    db_session.flush()

    f = File(
        repo_id=repo.id,
        path="test.py",
        size_bytes=100,
        line_count=10,
        parse_error=False,
    )
    db_session.add(f)
    db_session.flush()

    s = Symbol(
        repo_id=repo.id,
        file_id=f.id,
        name="process_order",
        qualified_name="process_order",
        kind="function",
        start_line=1,
        end_line=5,
    )
    db_session.add(s)
    db_session.flush()

    c1 = Chunk(
        repo_id=repo.id,
        file_id=f.id,
        symbol_id=s.id,
        start_line=1,
        end_line=5,
        content="def process_order():\n    return 'processed'",
        embedding=fake_embed(["process_order"])[0],
    )
    c2 = Chunk(
        repo_id=repo.id,
        file_id=f.id,
        symbol_id=None,
        start_line=6,
        end_line=10,
        content="def other_unrelated_function():\n    pass",
        embedding=fake_embed(["other_unrelated_function"])[0],
    )
    db_session.add_all([c1, c2])
    db_session.commit()

    # Search for process_order
    results = search(db_session, repo.id, "Where is process_order?", top_k=2)
    assert len(results) > 0
    assert results[0]["chunk_id"] == c1.id


def test_search_nothing_matching(db_session):
    repo = Repo(
        url="https://github.com/test/empty-search",
        owner="test",
        name="empty-search",
        status="ready",
    )
    db_session.add(repo)
    db_session.commit()

    results = search(db_session, repo.id, "nonexistent_term_xyz_12345", top_k=5)
    assert results == []


def test_search_sql_injection_attempt(db_session):
    repo = Repo(
        url="https://github.com/test/sql-inject",
        owner="test",
        name="sql-inject",
        status="ready",
    )
    db_session.add(repo)
    db_session.commit()

    # Weird question: '); drop table chunks; --
    results = search(db_session, repo.id, "'); drop table chunks; --", top_k=5)
    assert results == []
    # Table still exists
    assert db_session.query(Chunk).count() >= 0


def test_search_repo_isolation(db_session):
    repo1 = Repo(
        url="https://github.com/test/repo1",
        owner="test",
        name="repo1",
        status="ready",
    )
    repo2 = Repo(
        url="https://github.com/test/repo2",
        owner="test",
        name="repo2",
        status="ready",
    )
    db_session.add_all([repo1, repo2])
    db_session.flush()

    f1 = File(repo_id=repo1.id, path="r1.py", size_bytes=10, line_count=2)
    f2 = File(repo_id=repo2.id, path="r2.py", size_bytes=10, line_count=2)
    db_session.add_all([f1, f2])
    db_session.flush()

    c1 = Chunk(
        repo_id=repo1.id,
        file_id=f1.id,
        symbol_id=None,
        start_line=1,
        end_line=2,
        content="secret_code_repo1",
        embedding=fake_embed(["secret_code_repo1"])[0],
    )
    c2 = Chunk(
        repo_id=repo2.id,
        file_id=f2.id,
        symbol_id=None,
        start_line=1,
        end_line=2,
        content="secret_code_repo2",
        embedding=fake_embed(["secret_code_repo2"])[0],
    )
    db_session.add_all([c1, c2])
    db_session.commit()

    results_r1 = search(db_session, repo1.id, "secret_code", top_k=10)
    for res in results_r1:
        assert res["chunk_id"] != c2.id
