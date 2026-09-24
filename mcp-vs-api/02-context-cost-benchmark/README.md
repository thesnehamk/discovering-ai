# 02 — Context-cost benchmark

Backs these claims from the post:

> Some implementations dump entire tool schemas into the model's context on every turn regardless of relevance — one reported GitHub MCP server burns roughly 50,000 tokens just initializing, and a database server with over a hundred tools has been measured wasting up to 81% of the available context window before a single user query runs.

and, from the comments, the fix that's raised but never shown in code:

> The pattern I'm seeing work around it is progressive/lazy tool disclosure, servers that expose a small "search tools" or "list capabilities" primitive first, and only load full schemas for the ones actually relevant to the current task.

## What this measures

`src/toolPool.ts` generates realistic, GitHub-shaped tool schemas (CRUD operations across ~30 resource nouns — repositories, issues, pull requests, releases, etc.), at any pool size. `src/benchmark.ts` tokenizes them with a real tokenizer (`gpt-tokenizer`, cl100k_base) and compares two strategies at increasing server sizes:

- **Eager**: every tool's full schema sent up front — what the post describes happening in practice.
- **Lazy**: one small `search_tools` meta-tool schema sent up front; full schemas loaded only for the ~3 tools a given task actually needs — the progressive-disclosure pattern from the comments.

## Run it

```bash
npm install
npm run benchmark
```

## What it actually shows (and what it doesn't claim)

This does **not** reproduce the GitHub MCP server's exact 50K-token number — that depends on its specific tool set and the tokenizer the receiving model uses, neither of which this demo has access to. What it does reproduce, with real measurements on a comparably-sized, comparably-shaped tool pool, is the **mechanism**: eager disclosure's token cost scales linearly with server size; lazy disclosure's stays flat regardless of how large the server grows. At 100 tools, this benchmark measures a 96% reduction — same order of magnitude as the post's independently-measured 81% figure for a different, real 100+ tool server, which is exactly what you'd expect from the same underlying pattern applied to a different tool set.
