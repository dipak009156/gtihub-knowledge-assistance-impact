from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.models import Repo, Symbol
from app.db.session import get_db
from app.llm.client import LLMUnavailable
from app.llm.service import answer_question

router = APIRouter(prefix="/api/repos", tags=["chat"])


class ChatRequest(BaseModel):
    question: str


@router.post("/{repo_id}/chat")
def chat(
    repo_id: int,
    payload: ChatRequest,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        return answer_question(db, repo_id, payload.question)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from None
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        ) from None
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from None
    except LLMUnavailable:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI helper is not reachable right now. Try again in a minute.",
        ) from None
    except Exception:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again.",
        ) from None


@router.get("/{repo_id}/chat/suggestions")
def get_chat_suggestions(
    repo_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    repo = db.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    fixed_questions = [
        "What does this project do?",
        "What is the most important class?",
        "Where does the main work start?",
    ]

    # Find up to 2 longest functions in symbols table
    symbols = (
        db.query(Symbol)
        .filter(
            Symbol.repo_id == repo_id,
            Symbol.kind.in_(["function", "method"]),
        )
        .all()
    )

    if not symbols:
        return {"questions": fixed_questions}

    # Sort by line length descending
    symbols.sort(key=lambda s: s.end_line - s.start_line, reverse=True)
    extra_questions: list[str] = []
    for s in symbols[:2]:
        extra_questions.append(f"What does {s.name} do?")

    return {"questions": fixed_questions + extra_questions}
