import shutil
import subprocess
from pathlib import Path

CLONE_TIMEOUT_SECONDS = 120
BASE = Path("/tmp/gka")


def clone_repo(repo_id: int, url: str) -> Path:
    target = BASE / str(repo_id)
    shutil.rmtree(target, ignore_errors=True)
    BASE.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["git", "clone", "--depth", "50", url, str(target)],
        check=True,
        capture_output=True,
        timeout=CLONE_TIMEOUT_SECONDS,
    )
    return target


def delete_clone(repo_id: int) -> None:
    shutil.rmtree(BASE / str(repo_id), ignore_errors=True)
