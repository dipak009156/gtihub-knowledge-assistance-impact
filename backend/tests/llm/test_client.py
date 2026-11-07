import pytest

from app.config import settings
from app.llm.client import FakeClient, LLMUnavailable, OllamaClient, get_llm


def test_get_llm_fake(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "fake")
    client = get_llm()
    assert isinstance(client, FakeClient)
    res = client.generate("system", "user")
    assert "This is a test answer" in res


def test_ollama_client_error(monkeypatch):
    import httpx

    def mock_post(*args, **kwargs):
        raise httpx.ConnectError("Connection refused")

    monkeypatch.setattr(httpx, "post", mock_post)
    ollama = OllamaClient()

    with pytest.raises(LLMUnavailable):
        ollama.generate("sys", "user")
