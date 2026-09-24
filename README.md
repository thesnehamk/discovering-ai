# discovering-ai

A collection of AI-powered projects — RAG systems, LLM-integrated apps, and automation built on the Claude API.

## Projects

- [`mcp-task-server/`](./mcp-task-server) — open-source Model Context Protocol server exposing task-management operations as agent-callable tools, with a repository-pattern storage layer that swaps from in-memory to DynamoDB with no changes to the tool interface. Node.js + TypeScript, validated with the official MCP Inspector.
- [`clinical-guidelines-rag/`](./clinical-guidelines-rag) — retrieval-augmented Q&A over public-domain clinical guidance (WHO mhGAP, CDC milestones, NIMH), with cited sources. FastAPI + Chroma + Claude + React.
- [`job-app-assistant/`](./job-app-assistant) — paste a job posting, generate a resume tailored to it from your saved profile using Claude, download as PDF. Next.js + Prisma.
- [`ai-trends-medium/`](./ai-trends-medium) — daily automation that collects AI news, has Claude draft a Medium post, and emails it to you for review. Node.js + GitHub Actions.

Each subfolder is self-contained with its own README and setup instructions.
