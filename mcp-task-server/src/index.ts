#!/usr/bin/env node
/**
 * MCP server exposing task-management operations (create, list, complete,
 * delete) as agent-callable tools over stdio, so any MCP-compatible client
 * (Claude Desktop, custom agents, the MCP Inspector) can drive it directly.
 *
 * Storage is pluggable via the TaskRepository interface (see
 * src/repository/): STORAGE_BACKEND=memory (default) for local dev,
 * STORAGE_BACKEND=dynamodb for production. See README.md for the swap-in
 * details.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createTaskRepository } from "./repository/createTaskRepository.js";
import { registerTaskTools } from "./tools/taskTools.js";

const server = new McpServer({
  name: "mcp-task-server",
  version: "1.0.0",
});

const repository = createTaskRepository();
registerTaskTools(server, repository);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio servers must not write to stdout (it's the protocol channel) —
  // all logging goes to stderr.
  console.error(
    `mcp-task-server running on stdio (backend: ${process.env.STORAGE_BACKEND ?? "memory"})`
  );
}

main().catch((error) => {
  console.error("Fatal error starting mcp-task-server:", error);
  process.exit(1);
});
