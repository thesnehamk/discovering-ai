from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .ingestion import build_index
from .llm import generate_answer
from .models import Citation, HealthResponse, QueryRequest, QueryResponse
from .retrieval import count_indexed, retrieve

app = FastAPI(
    title="Clinical Guidelines RAG Assistant",
    description=(
        "Retrieval-augmented question answering over public-domain clinical "
        "guidance (WHO mhGAP, CDC developmental milestones, NIMH fact sheets). "
        "Educational use only — not a substitute for professional medical advice."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", documents_indexed=count_indexed())


@app.post("/api/ingest", response_model=HealthResponse)
def ingest() -> HealthResponse:
    n = build_index(reset=True)
    return HealthResponse(status="indexed", documents_indexed=n)


@app.post("/api/query", response_model=QueryResponse)
def query(request: QueryRequest) -> QueryResponse:
    if count_indexed() == 0:
        raise HTTPException(
            status_code=409,
            detail="No documents indexed yet. Call POST /api/ingest first.",
        )

    chunks = retrieve(request.question, top_k=request.top_k)
    answer = generate_answer(request.question, chunks)
    citations = [
        Citation(
            source=c.source,
            title=c.title,
            url=c.url,
            section=c.section,
            snippet=c.text[:280] + ("…" if len(c.text) > 280 else ""),
            score=c.score,
        )
        for c in chunks
    ]
    return QueryResponse(answer=answer, citations=citations)


@app.on_event("startup")
def maybe_build_index_on_startup() -> None:
    if count_indexed() == 0 and config.SOURCES_DIR.exists():
        build_index(reset=True)
