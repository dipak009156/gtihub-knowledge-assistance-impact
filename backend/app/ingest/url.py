import re

PATTERN = re.compile(
    r"^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?$"
)


def parse_github_url(url: str) -> tuple[str, str]:
    if not isinstance(url, str):
        raise TypeError("URL must be a string")
    match = PATTERN.match(url.strip())
    if not match:
        raise ValueError("Please paste a link like https://github.com/owner/name")
    return match.group(1), match.group(2)
