import pytest

from app.ingest.url import parse_github_url


def test_valid_github_urls():
    assert parse_github_url("https://github.com/pallets/click") == ("pallets", "click")
    assert parse_github_url("https://github.com/pallets/click.git") == (
        "pallets",
        "click",
    )
    assert parse_github_url("https://github.com/pallets/click/") == ("pallets", "click")
    assert parse_github_url("https://github.com/pallets/click.git/") == (
        "pallets",
        "click",
    )
    assert parse_github_url("https://github.com/psf/requests") == ("psf", "requests")
    assert parse_github_url("https://github.com/my-org_123/my.repo_name") == (
        "my-org_123",
        "my.repo_name",
    )


def test_invalid_urls():
    invalid_cases = [
        "http://evil.com/a/b",
        "http://github.com/pallets/click",  # must be https
        "https://gitlab.com/pallets/click",
        "https://github.com/onlyonepart",
        "https://github.com/too/many/parts/here",
        "random text",
        "",
        "https://github.com/",
    ]
    for url in invalid_cases:
        with pytest.raises(ValueError) as exc:
            parse_github_url(url)
        assert "Please paste a link like https://github.com/owner/name" in str(
            exc.value
        )
