"""Load markdown source documents, split them into overlapping chunks, and
index them (with citation metadata) into a persistent Chroma collection."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path

import yaml

from . import config
from .embeddings import embed_texts


@dataclass
class Chunk:
    id: str
    text: str
    title: str
    source: str
    url: str
    section: str


def _parse_document(path: Path) -> tuple[dict, str]:
    raw = path.read_text(encoding="utf-8")
    if raw.startswith("---"):
        _, frontmatter, body = raw.split("---", 2)
        meta = yaml.safe_load(frontmatter) or {}
    else:
        meta, body = {}, raw
    return meta, body.strip()


def _split_sections(body: str) -> list[tuple[str, str]]:
    """Split a markdown body into (heading, text) pairs on '## ' headings."""
    sections: list[tuple[str, str]] = []
    current_heading = "Overview"
    current_lines: list[str] = []
    for line in body.splitlines():
        if line.startswith("## "):
            if current_lines:
                sections.append((current_heading, "\n".join(current_lines).strip()))
            current_heading = line[3:].strip()
            current_lines = []
        else:
            current_lines.append(line)
    if current_lines:
        sections.append((current_heading, "\n".join(current_lines).strip()))
    return [(h, t) for h, t in sections if t]


def _chunk_text(text: str, size: int, overlap: int) -> list[str]:
    """Chunk on paragraph boundaries, packing paragraphs up to `size` chars
    and repeating the tail of one chunk at the start of the next."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        candidate = f"{current}\n\n{para}".strip() if current else para
        if len(candidate) > size and current:
            chunks.append(current)
            tail = current[-overlap:]
            current = f"{tail}\n\n{para}".strip()
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def load_chunks(sources_dir: Path = config.SOURCES_DIR) -> list[Chunk]:
    chunks: list[Chunk] = []
    for path in sorted(sources_dir.glob("*.md")):
        meta, body = _parse_document(path)
        title = meta.get("title", path.stem)
        source = meta.get("source", path.stem)
        url = meta.get("url", "")
        for heading, section_text in _split_sections(body):
            for piece in _chunk_text(section_text, config.CHUNK_SIZE, config.CHUNK_OVERLAP):
                chunk_id = hashlib.sha1(f"{path.name}:{heading}:{piece[:50]}".encode()).hexdigest()
                chunks.append(
                    Chunk(
                        id=chunk_id,
                        text=piece,
                        title=title,
                        source=source,
                        url=url,
                        section=heading,
                    )
                )
    return chunks


def build_index(reset: bool = True) -> int:
    import chromadb

    config.CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(config.CHROMA_DIR))

    if reset:
        try:
            client.delete_collection(config.COLLECTION_NAME)
        except Exception:
            pass
    collection = client.get_or_create_collection(config.COLLECTION_NAME)

    chunks = load_chunks()
    if not chunks:
        return 0

    embeddings = embed_texts([c.text for c in chunks])
    collection.upsert(
        ids=[c.id for c in chunks],
        embeddings=embeddings,
        documents=[c.text for c in chunks],
        metadatas=[
            {"title": c.title, "source": c.source, "url": c.url, "section": c.section}
            for c in chunks
        ],
    )
    return len(chunks)


if __name__ == "__main__":
    n = build_index()
    print(f"Indexed {n} chunks from {config.SOURCES_DIR} into {config.CHROMA_DIR}")
