import os
import shutil
import stat
import subprocess
from pathlib import Path

from app.config import settings

CLONE_TIMEOUT_SECONDS = 600


def _safe_rmtree(target: Path) -> None:
    def _handle_remove_readonly(func, path, _):
        try:
            os.chmod(path, stat.S_IWRITE)
            func(path)
        except OSError:
            pass

    if target.exists():
        try:
            shutil.rmtree(target, onerror=_handle_remove_readonly)
        except Exception:  # noqa: BLE001
            shutil.rmtree(target, ignore_errors=True)


def get_repo_base_dir() -> Path:
    return Path(settings.repo_storage_dir)


def get_repo_dir(repo_id: int) -> Path:
    return get_repo_base_dir() / str(repo_id)


def clone_repo(repo_id: int, url: str) -> Path:
    base = get_repo_base_dir()
    target = get_repo_dir(repo_id)

    # If already cloned and contains files, reuse existing working tree
    if (target / ".git").exists() and any(
        p for p in target.iterdir() if p.name != ".git"
    ):
        return target

    _safe_rmtree(target)
    base.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "never"}
    try:
        subprocess.run(
            ["git", "clone", "--depth", "50", "--single-branch", url, str(target)],
            check=True,
            capture_output=True,
            timeout=CLONE_TIMEOUT_SECONDS,
            env=env,
        )
    except subprocess.CalledProcessError:
        # Fallback without --single-branch in case default branch ref is atypical
        _safe_rmtree(target)
        subprocess.run(
            ["git", "clone", "--depth", "20", url, str(target)],
            check=True,
            capture_output=True,
            timeout=CLONE_TIMEOUT_SECONDS,
            env=env,
        )
    return target


def delete_clone(repo_id: int) -> None:
    _safe_rmtree(get_repo_dir(repo_id))
