# 03 — Vulnerable vs. hardened MCP tool

Backs this line from the post:

> Independent testing found command injection flaws in 43% of tested MCP implementations.

## What's here

Two implementations of the same feature — search a log file for a substring — as both plain functions and as real, callable MCP tools:

- `src/vulnerable/searchLogsTool.ts` / tool `search_logs_vulnerable` — **DEMO ONLY, DO NOT USE THIS PATTERN.** Builds a shell command by interpolating the input string directly, then runs it with `exec()`. Any shell metacharacter (`;`, `|`, `` ` ``, `$()`) in the input executes as its own command.
- `src/hardened/searchLogsTool.ts` / tool `search_logs_hardened` — same feature, two independent defenses: a strict allowlist regex on the input, and `execFile()` with an argument array instead of a command string, so there's no shell for metacharacters to break out into even if validation had a gap.

This is exactly the class of flaw the 43% figure describes, and it's the single most common shape it takes in a tool handler: user- or LLM-supplied input landing directly in a string that gets shelled out.

## Proof, not just claim

```bash
npm install
npm run demo
```

This runs three cases against both implementations and prints what actually happens:

1. A benign query (`pattern=ERROR`) — both behave identically.
2. An injection payload (`pattern=ERROR" /dev/null; echo INJECTED_BY_ATTACKER; echo "`) — the vulnerable version's output includes `INJECTED_BY_ATTACKER`, proving the injected command ran as its own process; the hardened version rejects the input before it ever reaches a process call.
3. A second benign query — the hardened version still works normally. It isn't broken, just not exploitable.

The injection payload only runs a harmless `echo` — visible in this process's own captured stdout, nothing written to disk or touched outside this demo. That's sufficient to prove arbitrary command execution without doing anything destructive.

Both tools are also registered on a real MCP server (`src/server.ts`) and were validated the same way through the MCP Inspector, not just as bare function calls:

```bash
npm run build
npx @modelcontextprotocol/inspector --cli node dist/server.js \
  --method tools/call --tool-name search_logs_vulnerable \
  --tool-arg 'pattern=ERROR" /dev/null; echo INJECTED_BY_ATTACKER; echo "'
```

## A second finding, found while building this

The first version of the injection payload used here didn't include `/dev/null`, and the resulting `grep "ERROR"` (no file argument) blocked forever waiting on stdin instead of returning cleanly. Fixing that added a `timeout` option to both `exec()` and `execFile()` calls. Worth calling out on its own: an unbounded `exec()` in a tool handler is a second, independent vulnerability class from injection — a hung command (deliberately, or just from a malformed payload) ties up the handler indefinitely. Neither the regex nor `execFile` alone would have caught this one; the timeout is the fix for this specific failure mode.
