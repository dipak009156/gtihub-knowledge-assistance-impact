from pathlib import Path

import pytest

from app.db.models import File, Repo, Symbol
from app.parser.extract import parse_file
from app.parser.service import parse_repo

SAMPLE = """
class Order:
    def save(self):
        pass

async def fetch():
    pass
"""


def test_parse_finds_class_method_and_async_function():
    symbols = parse_file(SAMPLE)
    names = {(s.qualified_name, s.kind) for s in symbols}
    assert names == {
        ("Order", "class"),
        ("Order.save", "method"),
        ("fetch", "function"),
    }
    fetch_sym = next(s for s in symbols if s.name == "fetch")
    assert fetch_sym.is_async is True


def test_parse_syntax_error_and_empty():
    with pytest.raises(SyntaxError):
        parse_file("def (")

    assert parse_file("") == []
    assert parse_file("   \n\n  ") == []


def test_parse_sample_folder(db_session):
    repo = Repo(
        url="https://github.com/example/sample",
        owner="example",
        name="sample",
        status="cloning",
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    fixture_path = Path(__file__).parents[1] / "fixtures" / "sample_project"
    parse_repo(repo.id, fixture_path, session=db_session)

    files = (
        db_session.query(File)
        .filter(File.repo_id == repo.id)
        .order_by(File.path.asc())
        .all()
    )
    assert len(files) == 3

    files_by_name = {f.path: f for f in files}
    assert "broken.py" in files_by_name
    assert "models.py" in files_by_name
    assert "shop.py" in files_by_name

    assert files_by_name["broken.py"].parse_error is True
    assert files_by_name["models.py"].parse_error is False
    assert files_by_name["shop.py"].parse_error is False

    models_symbols = (
        db_session.query(Symbol)
        .filter(Symbol.file_id == files_by_name["models.py"].id)
        .all()
    )
    sym_map = {s.qualified_name: s for s in models_symbols}
    assert "Order" in sym_map
    assert "Order.save" in sym_map
    assert "Order.validate" in sym_map

    # Method has parent_id pointing to class
    assert sym_map["Order.save"].parent_id == sym_map["Order"].id
    assert sym_map["Order.validate"].parent_id == sym_map["Order"].id
