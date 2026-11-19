from unittest.mock import MagicMock

from app.report.service import generate_executive_report, generate_report_markdown


def test_generate_executive_report_empty():
    session = MagicMock()
    session.query().filter().first.return_value = None
    res = generate_executive_report(session, 999)
    assert res == {}


def test_generate_report_markdown():
    session = MagicMock()
    mock_repo = MagicMock()
    mock_repo.id = 1
    mock_repo.owner = "testowner"
    mock_repo.name = "testrepo"
    mock_repo.url = "https://github.com/testowner/testrepo"
    mock_repo.status = "ready"

    session.query().filter().first.return_value = mock_repo
    session.query().filter().all.return_value = []

    md = generate_report_markdown(session, 1)
    assert "# 🛡️ Codebase Architecture & Risk Audit: `testowner/testrepo`" in md
    assert "Executive Health Scorecard" in md
    assert "Overall Codebase Grade" in md
