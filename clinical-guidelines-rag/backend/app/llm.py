from __future__ import annotations

from . import config
from .retrieval import RetrievedChunk

SYSTEM_PROMPT = """You are a clinical guidelines assistant for educational and \
informational purposes only. You are NOT a substitute for professional medical \
advice, diagnosis, or treatment.

Answer the user's question using ONLY the numbered context passages provided \
below. Follow these rules strictly:
1. Every factual claim must be traceable to one of the numbered passages. Cite \
   passages inline using bracketed numbers like [1] or [2].
2. If the context does not contain enough information to answer, say so plainly \
   instead of guessing or using outside knowledge.
3. Never provide an individualized diagnosis or prescribe a specific treatment \
   for the user or a named individual. Summarize what the guidelines say and \
   recommend consulting a qualified clinician for personal medical decisions.
4. Be concise and clinically precise. Use short paragraphs or bullet points.
"""


def _format_context(chunks: list[RetrievedChunk]) -> str:
    parts = []
    for i, c in enumerate(chunks, start=1):
        parts.append(f"[{i}] Source: {c.title} — Section: {c.section}\n{c.text}")
    return "\n\n".join(parts)


def _fallback_answer(chunks: list[RetrievedChunk]) -> str:
    if not chunks:
        return (
            "I couldn't find anything relevant in the indexed guidelines for that "
            "question. Try rephrasing, or ask about depression, psychosis, "
            "developmental milestones, anxiety, or ADHD."
        )
    lines = [
        "(No LLM API key configured — showing the most relevant retrieved passages "
        "instead of a generated answer.)",
        "",
    ]
    for i, c in enumerate(chunks, start=1):
        snippet = c.text if len(c.text) <= 400 else c.text[:400].rsplit(" ", 1)[0] + "…"
        lines.append(f"[{i}] {c.title} — {c.section}\n{snippet}")
    return "\n\n".join(lines)


def generate_answer(question: str, chunks: list[RetrievedChunk]) -> str:
    if not config.ANTHROPIC_API_KEY:
        return _fallback_answer(chunks)
    if not chunks:
        return (
            "I couldn't find anything relevant in the indexed guidelines for that "
            "question. Try rephrasing, or ask about depression, psychosis, "
            "developmental milestones, anxiety, or ADHD."
        )

    import anthropic

    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    context = _format_context(chunks)
    user_message = (
        f"Context passages:\n\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer the question using only the context passages above, with inline "
        "[n] citations."
    )
    response = client.messages.create(
        model=config.ANTHROPIC_MODEL,
        max_tokens=800,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )
    return "".join(block.text for block in response.content if block.type == "text")
