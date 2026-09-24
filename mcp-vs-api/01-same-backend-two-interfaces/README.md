# 01 — Same backend, two interfaces

Backs this line from the post directly:

> No. MCP doesn't replace APIs — it sits on top of them. An MCP server is, almost always, a thin adapter that calls a REST/GraphQL/gRPC API underneath and translates it into a shape an LLM can safely discover and call.

This is that claim made literal, using the post's own weather-lookup example. `src/service/weatherService.ts` is the one implementation of "look up the weather for a city." Two thin interfaces sit in front of it:

- `src/api/server.ts` — a plain REST endpoint, `GET /weather?city=...`, for a human developer writing deterministic code against a known URL.
- `src/mcp/server.ts` — an MCP tool, `get_weather`, for an LLM that discovers it via `tools/list` and decides when to call it.

Neither interface reimplements the lookup — they both call `getWeather()` from the same file. That's the whole point: the "adapter" in the post's claim isn't a metaphor, it's the ~15 lines of `mcp/server.ts` that translate one function into a tool schema.

## Run it

```bash
npm install
npm run build

# REST
npm run api
curl "http://localhost:3000/weather?city=Delhi"

# MCP
npx @modelcontextprotocol/inspector --cli node dist/mcp/server.js --method tools/call --tool-name get_weather --tool-arg city=Delhi
```

Both return the same `temperatureC`/`condition` for the same city, from the same function call.

## Note on the data source

The post's own example calls a real weather API (`api.weatherapi.com`). This demo uses a small local fixture instead of a live HTTP call, purely so it runs deterministically offline — swap `lookupUpstream()` in `weatherService.ts` for a real `fetch()` and nothing about either interface changes. That's also a second, smaller proof point from the post's comparison table: the API key would live in `lookupUpstream()`, server-side, in both a real version of this function and the current one — neither the REST caller nor the model ever sees it.
