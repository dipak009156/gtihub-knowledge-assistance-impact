import subprocess
from pathlib import Path

MAX_COMMITS = 2000
BULK_LIMIT = 30  # a commit touching more files than this is a mass edit
MARK = "@@COMMIT@@"


def read_git_log(clone_path: str | Path) -> list[dict]:
    """Read up to MAX_COMMITS from a git clone and parse them into commit dictionaries."""
    out = subprocess.run(
        [
            "git",
            "-C",
            str(clone_path),
            "log",
            "--no-merges",
            f"-n{MAX_COMMITS}",
            "--name-only",
            f"--pretty=format:{MARK}%H|%an|%aI|%s",
        ],
        check=True,
        capture_output=True,
        text=True,
        errors="replace",
        timeout=120,
    ).stdout

    commits: list[dict] = []
    for block in out.split(MARK)[1:]:
        lines = block.strip("\n").split("\n")
        if not lines or not lines[0]:
            continue
        header = lines[0].split("|", 3)
        if len(header) < 4:
            continue
        sha, author, when, message = header
        files = [line.strip() for line in lines[1:] if line.strip()]
        commits.append(
            {
                "sha": sha,
                "author": author,
                "when": when,
                "message": message,
                "files": files,
            }
        )
    return commits
