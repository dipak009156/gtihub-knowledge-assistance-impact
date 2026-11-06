from collections.abc import Generator
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.models import (
    Base,
    Commit,
    CommitFile,
    Edge,
    File,
    Repo,
    Symbol,
    ValidationRun,
)
from app.db.session import get_db
from app.main import app

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "sample_project"


@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(
        engine,
        tables=[
            Repo.__table__,
            File.__table__,
            Symbol.__table__,
            Edge.__table__,
            Commit.__table__,
            CommitFile.__table__,
            ValidationRun.__table__,
        ],
    )
    return engine


@pytest.fixture
def db_session(test_engine) -> Generator[Session, None, None]:
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    from fastapi.testclient import TestClient

    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def fake_project(db_session: Session):
    """Setup standard test project specified in Guide B Section 9."""
    repo = Repo(
        url="https://github.com/fake/project",
        owner="fake",
        name="project",
        status="ready",
    )
    db_session.add(repo)
    db_session.flush()

    f_shop = File(repo_id=repo.id, path="shop.py", size_bytes=400, line_count=40)
    f_pay = File(repo_id=repo.id, path="pay.py", size_bytes=400, line_count=40)
    f_tax = File(repo_id=repo.id, path="tax.py", size_bytes=400, line_count=40)
    db_session.add_all([f_shop, f_pay, f_tax])
    db_session.flush()

    s_checkout = Symbol(
        repo_id=repo.id,
        file_id=f_shop.id,
        name="checkout",
        qualified_name="checkout",
        kind="function",
        start_line=1,
        end_line=10,
    )
    s_pay = Symbol(
        repo_id=repo.id,
        file_id=f_pay.id,
        name="pay",
        qualified_name="pay",
        kind="function",
        start_line=1,
        end_line=10,
    )
    s_rate = Symbol(
        repo_id=repo.id,
        file_id=f_tax.id,
        name="rate",
        qualified_name="rate",
        kind="function",
        start_line=1,
        end_line=10,
    )
    db_session.add_all([s_checkout, s_pay, s_rate])
    db_session.flush()

    e1 = Edge(
        repo_id=repo.id,
        caller_id=s_checkout.id,
        callee_id=s_pay.id,
        certainty="certain",
        call_line=5,
    )
    e2 = Edge(
        repo_id=repo.id,
        caller_id=s_pay.id,
        callee_id=s_rate.id,
        certainty="certain",
        call_line=5,
    )
    db_session.add_all([e1, e2])
    db_session.flush()

    base_time = datetime(2026, 1, 1, 12, 0, 0)
    for i in range(10):
        c_time = base_time + timedelta(days=i)
        c = Commit(
            repo_id=repo.id,
            sha=f"sha{i:04d}",
            author="Tester",
            committed_at=c_time,
            message=f"commit {i}",
            files_changed=2 if i < 8 else 1,
            is_bulk=False,
        )
        db_session.add(c)
        db_session.flush()
        db_session.add(CommitFile(commit_id=c.id, path="pay.py"))
        if i < 8:
            db_session.add(CommitFile(commit_id=c.id, path="tax.py"))

    db_session.commit()
    return {
        "repo": repo,
        "files": {"shop": f_shop, "pay": f_pay, "tax": f_tax},
        "symbols": {"checkout": s_checkout, "pay": s_pay, "rate": s_rate},
        "edges": [e1, e2],
        "base_time": base_time,
    }
