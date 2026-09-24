/**
 * HARDENED. Same feature as ../vulnerable/searchLogsTool.ts — search a
 * log file for a pattern — with two independent layers, either of which
 * alone would have stopped the vulnerable version's flaw:
 *
 *   1. Input validation: a strict Zod schema rejects anything containing
 *      shell metacharacters before it ever reaches a process call.
 *   2. No shell at all: execFile() with an argument array execs the
 *      `grep` binary directly. There is no `/bin/sh -c` parsing the
 *      arguments, so even a validation gap can't be turned into shell
 *      syntax — the string is passed to grep as inert data, never
 *      interpreted as a command.
 *
 * This is "don't expose an MCP server without real auth" from the post,
 * one layer down: the equivalent discipline applied inside a single tool
 * handler's input handling.
 */

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const FIXTURE_LOG = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/sample.log"
);

const SafePatternSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(
    /^[\w .-]+$/,
    "pattern may only contain letters, numbers, spaces, dots, hyphens, and underscores"
  );

export class InvalidPatternError extends Error {}

export async function searchLogsHardened(pattern: string): Promise<string> {
  const parsed = SafePatternSchema.safeParse(pattern);
  if (!parsed.success) {
    throw new InvalidPatternError(parsed.error.issues[0]?.message ?? "invalid pattern");
  }

  // Argument array, not a command string: grep never sees a shell, so
  // there's no shell syntax for a malicious pattern to break out into,
  // even hypothetically.
  const { stdout } = await execFileAsync("grep", [parsed.data, FIXTURE_LOG], { timeout: 3000 });
  return stdout.trim();
}
