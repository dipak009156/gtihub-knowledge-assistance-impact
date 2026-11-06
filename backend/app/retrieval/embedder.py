from fastembed import TextEmbedding

_model: TextEmbedding | None = None


def embed(texts: list[str]) -> list[list[float]]:
    """Compute 384-dimensional dense embeddings for a batch of strings."""
    global _model
    if not texts:
        return []

    if _model is None:
        _model = TextEmbedding("BAAI/bge-small-en-v1.5")

    vectors = [vec.tolist() for vec in _model.embed(texts, batch_size=32)]
    for vec in vectors:
        if len(vec) != 384:
            raise ValueError(
                f"Embedding dimension error: expected 384 numbers, got {len(vec)}"
            )
    return vectors
