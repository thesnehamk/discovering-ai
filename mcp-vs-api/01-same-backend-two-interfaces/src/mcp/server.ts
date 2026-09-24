#!/usr/bin/env node
/**
 * MCP interface over the exact same weatherService.getWeather used by
 * ../api/server.ts. Nothing about the lookup logic is duplicated or
 * reimplemented here — this file is only the adapter: a name, a
 * description, and a JSON Schema an LLM can read to know what the tool
 * does and how to call it, without a human reading documentation first.
 *
 * Try it:
 *   npm run build && npm run mcp:inspect
 *   (or) npx @modelcontextprotocol/inspector --cli node dist/mcp/server.js \
 *          --method tools/call --tool-name get_weather --tool-arg city=Delhi
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CityNotFoundError, getWeather } from "../service/weatherService.js";

const server = new McpServer({ name: "weather-mcp-demo", version: "1.0.0" });

server.registerTool(
  "get_weather",
  {
    title: "Get Weather",
    description: `Get the current weather for a city.

Args:
  - city (string, required): city name, e.g. "Delhi"

Returns the temperature (Celsius), condition, and observation time.
This calls the identical weatherService.getWeather() function the REST
API in ../api/server.ts uses — same logic, same upstream lookup, same
error cases. Only the calling contract differs.`,
    inputSchema: { city: z.string().min(1).describe("City name, e.g. 'Delhi'") },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ city }) => {
    try {
      const result = getWeather(city);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      if (error instanceof CityNotFoundError) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${error.message}` }],
        };
      }
      throw error;
    }
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("weather-mcp-demo running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
