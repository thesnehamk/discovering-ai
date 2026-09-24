/**
 * Measures, with a real tokenizer, what it costs to put an MCP server's
 * tools in context two different ways:
 *
 *   EAGER:  every tool's full schema is sent up front (what the post
 *           describes happening in practice: "some implementations dump
 *           entire tool schemas into the model's context on every turn
 *           regardless of relevance").
 *
 *   LAZY:   only a small `search_tools` meta-tool schema is sent up
 *           front; full schemas are fetched only for the handful of
 *           tools a given task actually needs (the "progressive/lazy
 *           tool disclosure" pattern raised in the post's comments as
 *           the practical fix).
 *
 * This doesn't reproduce the GitHub MCP server's exact 50K-token number —
 * that depends on its specific tool set and the tokenizer the receiving
 * model uses. What it does reproduce, with real measurements on a
 * comparably-sized, comparably-shaped tool pool, is the *mechanism*: why
 * eager disclosure scales linearly with server size while lazy disclosure
 * stays roughly flat, and how large the gap gets as a server grows past
 * ~100 tools (the post's other cited example: "a database server with
 * over a hundred tools ... wasting up to 81% of the available context
 * window").
 *
 * Tokenizer: gpt-tokenizer (cl100k_base), used as a widely-available,
 * reproducible stand-in for "a model's tokenizer" — exact counts vary by
 * model, but the relative eager-vs-lazy gap this demonstrates does not
 * depend on which tokenizer you pick.
 */

import { encode } from "gpt-tokenizer";
import { generateToolPool, searchToolsMetaSchema, type ToolSchema } from "./toolPool.js";

const POOL_SIZES = [10, 25, 50, 100, 150, 200];
const TASK_TOOLS_NEEDED = 3; // a single task typically only needs a handful of tools

function tokenCount(schema: ToolSchema): number {
  return encode(JSON.stringify(schema)).length;
}

function eagerCost(pool: ToolSchema[]): number {
  return pool.reduce((sum, tool) => sum + tokenCount(tool), 0);
}

function lazyCost(pool: ToolSchema[], tasksNeeded: number): number {
  const metaCost = tokenCount(searchToolsMetaSchema());
  const neededCost = pool
    .slice(0, tasksNeeded)
    .reduce((sum, tool) => sum + tokenCount(tool), 0);
  return metaCost + neededCost;
}

interface Row {
  toolCount: number;
  eagerTokens: number;
  lazyTokens: number;
  wastedPercent: number;
}

function runBenchmark(): Row[] {
  return POOL_SIZES.map((toolCount) => {
    const pool = generateToolPool(toolCount);
    const eagerTokens = eagerCost(pool);
    const lazyTokens = lazyCost(pool, Math.min(TASK_TOOLS_NEEDED, toolCount));
    const wastedPercent = ((eagerTokens - lazyTokens) / eagerTokens) * 100;
    return { toolCount, eagerTokens, lazyTokens, wastedPercent };
  });
}

function printTable(rows: Row[]): void {
  const header = ["Tools", "Eager (tokens)", "Lazy (tokens)", "Saved"];
  const widths = [8, 16, 16, 8];
  const line = (cells: string[]) =>
    cells.map((c, i) => c.padEnd(widths[i])).join(" | ");

  console.log(line(header));
  console.log(widths.map((w) => "-".repeat(w)).join("-|-"));
  for (const row of rows) {
    console.log(
      line([
        String(row.toolCount),
        row.eagerTokens.toLocaleString(),
        row.lazyTokens.toLocaleString(),
        `${row.wastedPercent.toFixed(1)}%`,
      ])
    );
  }
}

const rows = runBenchmark();
printTable(rows);

const hundredPlus = rows.find((r) => r.toolCount >= 100);
if (hundredPlus) {
  console.log(
    `\nAt ${hundredPlus.toolCount} tools: eager disclosure spends ` +
      `${hundredPlus.eagerTokens.toLocaleString()} tokens before a single user query runs; ` +
      `lazy disclosure spends ${hundredPlus.lazyTokens.toLocaleString()} — a ` +
      `${hundredPlus.wastedPercent.toFixed(1)}% reduction. The post cites an independently ` +
      `measured 81% context waste on a comparably-sized (100+ tool) real-world server — same ` +
      `order of magnitude, same mechanism, different tool set.`
  );
}
