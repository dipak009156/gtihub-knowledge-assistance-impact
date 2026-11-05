from collections.abc import Generator
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.models import Base, Edge, File, Repo, Symbol
from app.db.session import get_db
from app.main import app

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "sample_project"


@pytest.fixture(scope="session")
def test_engine():
    # Use in-memory SQLite with StaticPool so all connections share the same memory db
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Create tables needed for Person A's work
    Base.metadata.create_all(
        engine,
        tables=[Repo.__table__, File.__table__, Symbol.__table__, Edge.__table__],
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
