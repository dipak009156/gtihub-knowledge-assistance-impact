import subprocess

from app.db.models import Repo
from app.db.session import SessionLocal
from app.graph.service import build_graph
from app.ingest.cloner import clone_repo, delete_clone
from app.parser.service import parse_repo


def set_status(repo_id: int, status: str, error_message: str | None = None) -> None:
    """Helper to update a repo's status and error message in the database."""
    with SessionLocal() as session:
        repo = session.query(Repo).filter(Repo.id == repo_id).first()
        if repo:
            repo.status = status
            repo.error_message = error_message
            session.commit()


def run_pipeline(repo_id: int) -> None:
    """Run ingest pipeline: clone, parse, graph, handoff, ready."""
    try:
        set_status(repo_id, "cloning")
        with SessionLocal() as session:
            repo = session.query(Repo).filter(Repo.id == repo_id).first()
            if not repo:
                return
            repo_url = repo.url

        path = clone_repo(repo_id, repo_url)
        set_status(repo_id, "parsing")
        parse_repo(repo_id, path)
        build_graph(repo_id, repo_path=path)

        set_status(repo_id, "analyzing")
        # Task B handoff
        try:
            from app.history import analyze as history_analyze

            history_analyze(repo_id, str(path))
        except (ImportError, AttributeError):
            pass

        # Task D handoff
        try:
            from app.retrieval import index as retrieval_index

            retrieval_index(repo_id)
        except (ImportError, AttributeError):
            pass

        set_status(repo_id, "ready")

    except subprocess.TimeoutExpired:
        set_status(repo_id, "error", "The download took too long.")
    except subprocess.CalledProcessError:
        set_status(
            repo_id, "error", "We could not download this project. Is it public?"
        )
    except Exception:  # noqa: BLE001
        set_status(
            repo_id,
            "error",
            "Something went wrong while analysing this project.",
        )
        delete_clone(repo_id)
