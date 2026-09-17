# Clinical Guidelines RAG Assistant

A retrieval-augmented generation (RAG) assistant that answers questions about
mental health and developmental guidance using public-domain clinical sources,
with every answer grounded in cited passages.

**Educational demo only — not medical advice, diagnosis, or treatment.**

## Sources

Curated, summarized excerpts from public-domain guidance, stored as markdown
in [`backend/data/sources`](backend/data/sources):

- WHO [mhGAP Intervention Guide](https://www.who.int/publications/i/item/9789241549790) — Depression, Psychosis
- CDC [Learn the Signs. Act Early.](https://www.cdc.gov/ncbddd/actearly/milestones/index.html) — Developmental Milestones
- NIMH fact sheets — [Anxiety Disorders](https://www.nimh.nih.gov/health/topics/anxiety-disorders), [ADHD](https://www.nimh.nih.gov/health/topics/attention-deficit-hyperactivity-disorder-adhd)

Add more `.md` files (with a `title` / `source` / `url` YAML frontmatter
block) to that folder and re-run ingestion to expand the knowledge base.

## Architecture

```
frontend (React/Vite chat UI)
        │  POST /api/query { question }
        ▼
FastAPI backend
  ├─ ingestion.py   — chunk markdown sources, embed, upsert into Chroma
  ├─ embeddings.py  — sentence-transformers (all-MiniLM-L6-v2), local, free
  ├─ retrieval.py   — embed the question, similarity search top-k chunks
  └─ llm.py         — prompt Claude with the retrieved passages, requiring
                       inline [n] citations; falls back to showing raw
                       retrieved passages if no API key is configured
        │
        ▼
Chroma (persistent local vector store, backend/data/chroma_db)
```

## Running it

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optionally set ANTHROPIC_API_KEY for generated answers
uvicorn app.main:app --reload
```

The index is built automatically on first startup (or manually via
`POST /api/ingest` or `python -m app.ingestion`).

Without `ANTHROPIC_API_KEY` set, `/api/query` still performs full retrieval
and returns the most relevant sourced passages directly — useful for testing
the RAG pipeline without an API key.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit the printed local URL (Vite proxies `/api` to `http://localhost:8000`).

## API

- `GET /api/health` — status + number of indexed passages
- `POST /api/ingest` — (re)build the vector index from `backend/data/sources`
- `POST /api/query` — `{ "question": "..." }` → `{ answer, citations[] }`,
  where each citation includes the source title, section, URL, snippet, and
  similarity score

## Notes on design choices

- **Chunking** splits each source on markdown `##` section headings, then
  packs paragraphs up to ~800 characters with overlap, so citations map to a
  coherent clinical section rather than an arbitrary character window.
- **Embeddings run locally** (sentence-transformers) so retrieval works with
  zero API cost/key; only the final answer synthesis calls out to an LLM.
- **Citations are enforced structurally**: the LLM only ever sees the
  retrieved passages (never open-ended knowledge) and is instructed to cite
  every claim by passage number; the API separately returns the raw passages
  so a caller can verify the answer independent of the model's citations.
