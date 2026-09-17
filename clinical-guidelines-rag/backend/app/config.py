import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SOURCES_DIR = BASE_DIR / "data" / "sources"
CHROMA_DIR = BASE_DIR / "data" / "chroma_db"
COLLECTION_NAME = "clinical_guidelines"

EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

CHUNK_SIZE = 800
CHUNK_OVERLAP = 150
TOP_K = 4
