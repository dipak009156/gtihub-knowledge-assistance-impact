from collections import defaultdict

from sqlalchemy.orm import Session

from app.db.models import Commit, CommitFile, File, ValidationRun
from app.db.session import SessionLocal
from app.impact.engine import rank_files

RUN_STATUS: dict[int, str] = {}  # repo_id -> 'running' | 'done' | 'error'


def run_validation(repo_id: int, session: Session | None = None) -> None:
    """Run validation tests against real historical commits."""
    close_session = False
    if session is None:
        session = SessionLocal()
        close_session = True

    RUN_STATUS[repo_id] = "running"

    try:
        # Existing files in repo
        existing_paths = {
            f.path
            for f in session.query(File.path).filter(File.repo_id == repo_id).all()
        }

        # Commits that are not bulk and touched at least 2 .py files that exist today
        candidate_commits = (
            session.query(Commit)
            .filter(Commit.repo_id == repo_id, Commit.is_bulk.is_(False))
            .order_by(Commit.committed_at.desc())
            .all()
        )

        usable_commits: list[tuple[Commit, list[str]]] = []
        for c in candidate_commits:
            cf_paths = [
                cf.path
                for cf in session.query(CommitFile.path)
                .filter(CommitFile.commit_id == c.id)
                .all()
            ]
            valid_py_files = sorted(
                [p for p in cf_paths if p in existing_paths and p.endswith(".py")]
            )
            if len(valid_py_files) >= 2:
                usable_commits.append((c, valid_py_files))
            if len(usable_commits) == 50:
                break

        # Delete older rows for repo before saving new run
        session.query(ValidationRun).filter(ValidationRun.repo_id == repo_id).delete()
        session.flush()

        if not usable_commits:
            session.commit()
            RUN_STATUS[repo_id] = "done"
            return

        variants = ["graph", "history", "combined"]
        ks = [5, 10]

        precisions: dict[tuple[str, int], list[float]] = defaultdict(list)
        recalls: dict[tuple[str, int], list[float]] = defaultdict(list)
        combined_k5_details: list[dict] = []

        for commit, valid_py_files in usable_commits:
            changed_file = valid_py_files[0]
            real = [f for f in valid_py_files if f != changed_file]

            for variant in variants:
                predicted = rank_files(
                    session=session,
                    repo_id=repo_id,
                    file_path=changed_file,
                    depth=3,
                    variant=variant,
                    before=commit.committed_at,
                )

                for k in ks:
                    pred_k = predicted[:k]
                    hits = [f for f in real if f in pred_k]
                    prec = len(hits) / k
                    rec = len(hits) / len(real) if real else 0.0

                    precisions[(variant, k)].append(prec)
                    recalls[(variant, k)].append(rec)

                    if (
                        variant == "combined"
                        and k == 5
                        and len(combined_k5_details) < 20
                    ):
                        combined_k5_details.append(
                            {
                                "sha": commit.sha,
                                "changed_file": changed_file,
                                "variant": variant,
                                "predicted": pred_k,
                                "real": real,
                                "hits": hits,
                            }
                        )

        total_tested = len(usable_commits)
        for variant in variants:
            for k in ks:
                prec_list = precisions[(variant, k)]
                rec_list = recalls[(variant, k)]

                avg_prec = sum(prec_list) / len(prec_list) if prec_list else 0.0
                avg_rec = sum(rec_list) / len(rec_list) if rec_list else 0.0

                run_record = ValidationRun(
                    repo_id=repo_id,
                    variant=variant,
                    k=k,
                    commits_tested=total_tested,
                    precision=round(avg_prec, 2),
                    recall=round(avg_rec, 2),
                    details=combined_k5_details,
                )
                session.add(run_record)

        session.commit()
        RUN_STATUS[repo_id] = "done"
    except Exception:  # noqa: BLE001
        session.rollback()
        RUN_STATUS[repo_id] = "error"
    finally:
        if close_session:
            session.close()
