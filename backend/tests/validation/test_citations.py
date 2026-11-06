from app.validation.citations import verify_answer


def test_valid_citation(fake_project, db_session):
    repo_id = fake_project["repo"].id
    # shop.py has line_count = 40
    answer = "Checkout is defined in [shop.py:1-10]."
    res = verify_answer(db_session, repo_id, answer)

    assert res["grounded"] is True
    assert res["removed_count"] == 0
    assert len(res["sources"]) == 1
    assert res["sources"][0] == {
        "file_path": "shop.py",
        "start_line": 1,
        "end_line": 10,
    }
    assert "[shop.py:1-10]" in res["answer"]


def test_file_does_not_exist(fake_project, db_session):
    repo_id = fake_project["repo"].id
    answer = "Look at [nonexistent.py:5-15]."
    res = verify_answer(db_session, repo_id, answer)

    assert res["grounded"] is False
    assert res["removed_count"] == 1
    assert res["sources"] == []
    assert "[nonexistent.py:5-15]" not in res["answer"]


def test_end_line_past_file_end(fake_project, db_session):
    repo_id = fake_project["repo"].id
    # shop.py line_count is 40
    answer = "Overflow citation [shop.py:30-100]."
    res = verify_answer(db_session, repo_id, answer)

    assert res["grounded"] is False
    assert res["removed_count"] == 1
    assert res["sources"] == []
    assert "[shop.py:30-100]" not in res["answer"]


def test_start_greater_than_end(fake_project, db_session):
    repo_id = fake_project["repo"].id
    answer = "Reversed citation [shop.py:25-10]."
    res = verify_answer(db_session, repo_id, answer)

    assert res["grounded"] is False
    assert res["removed_count"] == 1
    assert res["sources"] == []


def test_two_citations_one_fake(fake_project, db_session):
    repo_id = fake_project["repo"].id
    answer = "Valid is [shop.py:1-5] but fake is [fake.py:2-4]."
    res = verify_answer(db_session, repo_id, answer)

    assert res["grounded"] is True
    assert res["removed_count"] == 1
    assert len(res["sources"]) == 1
    assert res["sources"][0]["file_path"] == "shop.py"
    assert "[shop.py:1-5]" in res["answer"]
    assert "[fake.py:2-4]" not in res["answer"]


def test_no_citations(fake_project, db_session):
    repo_id = fake_project["repo"].id
    answer = "Plain answer with no citations whatsoever."
    res = verify_answer(db_session, repo_id, answer)

    assert res["grounded"] is False
    assert res["removed_count"] == 0
    assert res["sources"] == []
    assert res["answer"] == answer


def test_unverified_symbol(fake_project, db_session):
    repo_id = fake_project["repo"].id
    # checkout() exists, ghost() does not exist
    answer = "Function `checkout()` calls `ghost()` in [shop.py:1-5]."
    res = verify_answer(db_session, repo_id, answer)

    assert res["grounded"] is True
    assert "ghost" in res["unverified_symbols"]
    assert "checkout" not in res["unverified_symbols"]
    # Does not delete ghost() from answer
    assert "`ghost()`" in res["answer"]
