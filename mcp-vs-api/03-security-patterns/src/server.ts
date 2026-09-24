#!/usr/bin/env node
/**
 * Exposes both tool implementations over real MCP, so the comparison
 * isn't just "code that looks like a tool handler" but an actual callable
 * MCP tool you can hit with the Inspector — search_logs_vulnerable is
 * clearly labeled and safe to call (see fixtures/sample.log), but do not
 * copy its pattern into anything real.
 *
 * Try it:
 *   npm run build && npm run mcp:inspect
 *   (or)
 *   npx @modelcontextprotocol/inspector --cli node dist/server.js \
 *     --method tools/call --tool-name search_logs_hardened --tool-arg 'pattern=ERROR'
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchLogsVulnerable } from "./vulnerable/searchLogsTool.js";
import { InvalidPatternError, searchLogsHardened } from "./hardened/searchLogsTool.js";

const server = new McpServer({ name: "mcp-security-patterns-demo", version: "1.0.0" });

server.registerTool(
  "search_logs_vulnerable",
  {
    title: "Search Logs (VULNERABLE — demo only)",
    description: `DEMO ONLY, DO NOT USE THIS PATTERN. Searches fixtures/sample.log for a
substring by shelling out to grep with the pattern interpolated directly
into a command string. Any shell metacharacter in 'pattern' (; | & \` $()
etc.) executes as its own command. See ../vulnerable/searchLogsTool.ts.

Args:
  - pattern (string, required): text to search for — or, since this tool
    is intentionally unsafe, shell syntax to inject`,
    inputSchema: { pattern: z.string().min(1) },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async ({ pattern }) => {
    try {
      const result = await searchLogsVulnerable(pattern);
      return { content: [{ type: "text", text: result || "(no matches)" }] };
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: `Error: ${(error as Error).message}` }] };
    }
  }
);

server.registerTool(
  "search_logs_hardened",
  {
    title: "Search Logs (hardened)",
    description: `Searches fixtures/sample.log for a substring. Input is validated against a
strict allowlist regex and passed to grep via execFile (argument array,
no shell), so shell metacharacters cannot be interpreted as commands.
See ../hardened/searchLogsTool.ts.

Args:
  - pattern (string, required): text to search for — letters, numbers,
    spaces, dots, hyphens, and underscores only`,
    inputSchema: { pattern: z.string().min(1) },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ pattern }) => {
    try {
      const result = await searchLogsHardened(pattern);
      return { content: [{ type: "text", text: result || "(no matches)" }] };
    } catch (error) {
      if (error instanceof InvalidPatternError) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
      return { isError: true, content: [{ type: "text", text: `Error: ${(error as Error).message}` }] };
    }
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-security-patterns-demo running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
