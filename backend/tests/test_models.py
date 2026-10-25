from app.db.models import Base


def test_expected_tables_exist():
    expected = {
        "repos",
        "files",
        "symbols",
        "edges",
        "chunks",
        "commits",
        "commit_files",
        "validation_runs",
    }
    assert expected <= set(Base.metadata.tables)
