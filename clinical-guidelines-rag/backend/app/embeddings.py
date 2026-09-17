"""Thin wrapper around a local sentence-transformers model so ingestion and
retrieval always embed text the same way, independent of any LLM provider."""

from functools import lru_cache

from . import config


@lru_cache(maxsize=1)
def _model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(config.EMBEDDING_MODEL)


def embed_texts(texts: list[str]) -> list[list[float]]:
    return _model().encode(list(texts), normalize_embeddings=True).tolist()


def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]
