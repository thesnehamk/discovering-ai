# mcp-vs-api

Companion code for ["MCP vs. API Explained: Do We Still Need APIs After MCP?"](https://dev.to/thesnehamk/mcp-vs-api-explained-do-we-still-need-apis-after-mcp-2kkk) — three claims from the post, each proven with real, runnable code rather than just asserted.

| Demo | Claim it backs | What it proves |
|---|---|---|
| [`01-same-backend-two-interfaces/`](./01-same-backend-two-interfaces) | "MCP doesn't replace APIs — it sits on top of them." | One weather-lookup function, exposed as both a REST endpoint and an MCP tool, calling identical code. |
| [`02-context-cost-benchmark/`](./02-context-cost-benchmark) | "A database server with over a hundred tools has been measured wasting up to 81% of the available context window." | Real tokenizer measurements comparing eager tool-schema loading vs. progressive/lazy disclosure, at increasing server sizes. |
| [`03-security-patterns/`](./03-security-patterns) | "Independent testing found command injection flaws in 43% of tested MCP implementations." | A vulnerable tool handler and its hardened fix, with a live proof-of-injection and proof-of-block. |

Each subfolder is self-contained (own `package.json`, own README) and independently runnable — see each one for exact commands. All three were validated against the real `@modelcontextprotocol/sdk` and the official MCP Inspector, not just asserted to work.
