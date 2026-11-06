import httpx

from app.config import settings


class LLMUnavailable(Exception):
    pass


class OllamaClient:
    def generate(self, system: str, user: str) -> str:
        try:
            r = httpx.post(
                f"{settings.ollama_url}/api/chat",
                timeout=120,
                json={
                    "model": settings.ollama_model,
                    "stream": False,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
            )
            r.raise_for_status()
            return r.json()["message"]["content"]
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            raise LLMUnavailable("Ollama did not answer") from exc


class GeminiClient:
    def generate(self, system: str, user: str) -> str:
        if not settings.gemini_api_key:
            raise LLMUnavailable("LLM_PROVIDER is gemini but GEMINI_API_KEY is empty")
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.gemini_model}:generateContent"
        )
        try:
            r = httpx.post(
                url,
                timeout=60,
                headers={"x-goog-api-key": settings.gemini_api_key},
                json={
                    "systemInstruction": {"parts": [{"text": system}]},
                    "contents": [{"role": "user", "parts": [{"text": user}]}],
                },
            )
            r.raise_for_status()
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
            raise LLMUnavailable("Gemini did not answer") from exc


class FakeClient:
    """For tests and demos: needs no internet and no key."""

    def generate(self, system: str, user: str) -> str:
        return "This is a test answer. See [shop.py:1-2]."


def get_llm():
    provider = settings.llm_provider.lower()
    if provider == "gemini":
        return GeminiClient()
    if provider == "fake":
        return FakeClient()
    return OllamaClient()
