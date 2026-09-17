from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from . import config
from .embeddings import embed_query


@dataclass
class RetrievedChunk:
    text: str
    title: str
    source: str
    url: str
    section: str
    score: float


@lru_cache(maxsize=1)
def _client():
    import chromadb

    return chromadb.PersistentClient(path=str(config.CHROMA_DIR))


def _collection():
    # Fetched fresh each call (cheap) rather than cached, because ingestion
    # can delete and recreate the underlying collection (new id) on rebuild.
    return _client().get_or_create_collection(config.COLLECTION_NAME)


def count_indexed() -> int:
    return _collection().count()


def retrieve(question: str, top_k: int | None = None) -> list[RetrievedChunk]:
    top_k = top_k or config.TOP_K
    collection = _collection()
    if collection.count() == 0:
        return []

    query_embedding = embed_query(question)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
    )

    chunks: list[RetrievedChunk] = []
    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]
    for doc, meta, dist in zip(documents, metadatas, distances):
        # Chroma returns squared L2 distance over normalized embeddings;
        # convert to a 0-1 similarity score that's easier to reason about.
        score = max(0.0, 1.0 - dist / 2.0)
        chunks.append(
            RetrievedChunk(
                text=doc,
                title=meta.get("title", ""),
                source=meta.get("source", ""),
                url=meta.get("url", ""),
                section=meta.get("section", ""),
                score=round(score, 4),
            )
        )
    return chunks
