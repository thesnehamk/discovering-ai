# mcp-task-server

An open-source [Model Context Protocol](https://modelcontextprotocol.io) server that exposes task-management operations as agent-callable tools. Any MCP-compatible client — Claude Desktop, a custom agent, the MCP Inspector — can `create_task`, `list_tasks`, `complete_task`, and `delete_task` directly, with no bespoke integration code on the client side.

## Tools

| Tool | Description |
|---|---|
| `create_task` | Create a task with a title and optional description. Returns the task, including its id. |
| `list_tasks` | List tasks, filterable by `status` (`open` \| `completed` \| `all`), paginated with `limit`/`offset`. |
| `complete_task` | Mark a task completed by id. Returns the updated task. |
| `delete_task` | Permanently delete a task by id. |

Each tool is registered with the modern `McpServer.registerTool` API, validates input at runtime with [Zod](https://zod.dev), and carries `readOnlyHint` / `destructiveHint` / `idempotentHint` / `openWorldHint` annotations so clients can reason about side effects before calling them.

## Architecture: the repository pattern

The tool handlers in `src/tools/taskTools.ts` are written entirely against the `TaskRepository` interface in `src/types.ts`:

```ts
interface TaskRepository {
  createTask(input: { title: string; description?: string }): Promise<Task>;
  getTask(id: string): Promise<Task | undefined>;
  listTasks(options: ListTasksOptions): Promise<ListTasksResult>;
  completeTask(id: string): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
}
```

Two implementations exist today:

- **`InMemoryTaskRepository`** (`src/repository/InMemoryTaskRepository.ts`) — a `Map`-backed store, zero setup, used by default. Data doesn't survive a restart; this is meant for local development and the test suite.
- **`DynamoDbTaskRepository`** (`src/repository/DynamoDbTaskRepository.ts`) — backed by AWS DynamoDB via `@aws-sdk/lib-dynamodb`, for production use.

`src/repository/createTaskRepository.ts` is the single switch point: it reads `STORAGE_BACKEND` and instantiates the matching implementation. Nothing in `src/tools/` or `src/schemas/` needs to change to move backends — that's the point of coding to the interface rather than to a concrete store. This is the same discipline that matters when connecting an agent to a real enterprise system: the tool-use contract the agent depends on has to stay stable while what's behind it changes.

### Production swap-in

```bash
# .env (or your deployment's environment)
STORAGE_BACKEND=dynamodb
TASKS_TABLE_NAME=mcp-tasks
AWS_REGION=us-east-1
# AWS credentials come from the standard SDK credential chain
# (env vars, shared config, or an IAM role) — not from this file.
```

Create the table (partition key `id`, type String):

```bash
aws dynamodb create-table \
  --table-name mcp-tasks \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

**Known limitation, called out honestly rather than hidden:** `DynamoDbTaskRepository.listTasks` currently does a table `Scan` with a `FilterExpression` on `status`, then slices the result by `limit`/`offset` in memory. That's fine at small/demo scale and keeps the repository's pagination contract identical to the in-memory implementation, but it doesn't scale — a real production deployment past that point would add a GSI on `(status, createdAt)` and switch `listTasks` to a `Query` with cursor-based pagination (`ExclusiveStartKey`) instead of scanning the whole table. The interface (`ListTasksOptions` / `ListTasksResult`) is designed so that change stays internal to `DynamoDbTaskRepository` — callers wouldn't see it.

## Running it

```bash
npm install
npm run build
npm start                 # runs dist/index.js over stdio, STORAGE_BACKEND=memory by default
```

### Using it from Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "task-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-task-server/dist/index.js"],
      "env": { "STORAGE_BACKEND": "memory" }
    }
  }
}
```

### Validating with the MCP Inspector

This was validated end-to-end with the official [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector node dist/index.js        # interactive UI
# or, non-interactively:
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list
npx @modelcontextprotocol/inspector --cli node dist/index.js \
  --method tools/call --tool-name create_task --tool-arg title="Try it"
```

### Tests

```bash
npm test    # unit tests for InMemoryTaskRepository (node's built-in test runner)
```

## Project structure

```
src/
├── index.ts                          Entry point: McpServer + stdio transport
├── types.ts                          Task type and TaskRepository interface
├── constants.ts                      CHARACTER_LIMIT, pagination defaults
├── repository/
│   ├── InMemoryTaskRepository.ts     Default, local-dev backend
│   ├── DynamoDbTaskRepository.ts     Production backend
│   └── createTaskRepository.ts       STORAGE_BACKEND switch point
├── schemas/
│   └── taskSchemas.ts                Zod input schemas per tool
└── tools/
    └── taskTools.ts                  Tool registration + handlers
test/
└── inMemoryTaskRepository.test.ts
```
