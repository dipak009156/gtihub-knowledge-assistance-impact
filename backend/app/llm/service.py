from collections import OrderedDict

from sqlalchemy.orm import Session

from app.db.models import Repo
from app.llm.client import get_llm
from app.llm.prompt import SYSTEM_PROMPT, build_user_prompt
from app.retrieval.search import search
from app.validation.citations import verify_answer

# Cache key: (repo_id, normalized_question) -> response_dict
# Max 200 entries LRU
_CHAT_CACHE: OrderedDict[tuple[int, str], dict] = OrderedDict()
MAX_CACHE_ENTRIES = 200


def clear_cache(repo_id: int | None = None) -> None:
    """Clear cached chat responses, optionally filtered by repo_id."""
    if repo_id is None:
        _CHAT_CACHE.clear()
    else:
        keys_to_remove = [k for k in _CHAT_CACHE if k[0] == repo_id]
        for k in keys_to_remove:
            _CHAT_CACHE.pop(k, None)


def _normalize_question(q: str) -> str:
    return " ".join(q.lower().split())


def answer_question(session: Session, repo_id: int, question: str) -> dict:
    """Orchestrate chunk retrieval, LLM generation, citation verification, and caching."""
    cleaned = question.strip() if question else ""
    if not cleaned or len(cleaned) > 1000:
        raise ValueError("Please ask a question of 1 to 1000 characters")

    repo = session.query(Repo).filter(Repo.id == repo_id).first()
    if not repo:
        raise KeyError("Project not found")

    if repo.status != "ready":
        raise RuntimeError("This project is still being analysed. Try again soon.")

    cache_key = (repo_id, _normalize_question(cleaned))
    if cache_key in _CHAT_CACHE:
        cached_result = dict(_CHAT_CACHE[cache_key])
        _CHAT_CACHE.move_to_end(cache_key)
        cached_result["cached"] = True
        return cached_result

    # 4. Search
    chunks = search(session, repo_id, cleaned, top_k=8)

    # 5. If no chunks found, do not call AI
    if not chunks:
        return {
            "answer": "I could not find anything about that in this project.",
            "sources": [],
            "grounded": False,
            "removed_count": 0,
            "unverified_symbols": [],
            "cached": False,
        }

    # 6. Ask AI
    llm = get_llm()
    prompt_text = build_user_prompt(cleaned, chunks)
    raw_answer = llm.generate(SYSTEM_PROMPT, prompt_text)

    # 7. Check sources with B's verify_answer
    verified = verify_answer(session, repo_id, raw_answer)
    result = {
        "answer": verified["answer"],
        "sources": verified["sources"],
        "grounded": verified["grounded"],
        "removed_count": verified["removed_count"],
        "unverified_symbols": verified["unverified_symbols"],
        "cached": False,
    }

    # 8. Save to cache
    if len(_CHAT_CACHE) >= MAX_CACHE_ENTRIES:
        _CHAT_CACHE.popitem(last=False)
    _CHAT_CACHE[cache_key] = result

    return result
