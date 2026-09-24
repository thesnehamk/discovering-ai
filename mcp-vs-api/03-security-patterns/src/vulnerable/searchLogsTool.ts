/**
 * VULNERABLE — for education only. Do not deploy.
 *
 * Backs the post's claim: "Independent testing found command injection
 * flaws in 43% of tested MCP implementations." This is that class of
 * flaw, in the most common shape it actually takes: a tool handler that
 * builds a shell command string by interpolating user/LLM-supplied input
 * directly into it.
 *
 * The model is the caller here, not a human typing a known-safe string —
 * so "the pattern will usually be reasonable" is not a safety property.
 * Anything that can influence the `pattern` argument (a malicious tool
 * result upstream, a prompt-injected instruction, a model mistake) can
 * inject arbitrary shell syntax, because `exec()` runs its argument
 * through `/bin/sh -c`.
 */

import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const FIXTURE_LOG = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/sample.log"
);

export async function searchLogsVulnerable(pattern: string): Promise<string> {
  // VULNERABLE LINE: `pattern` is concatenated straight into a shell
  // command string. A pattern like `ERROR"; echo INJECTED; echo "`
  // closes the intended quoted argument early and runs `echo INJECTED`
  // as its own command, with the tool's own process privileges.
  //
  // timeout is set only so this demo fails loudly instead of hanging —
  // it does not fix the injection. An unbounded exec() is its own,
  // separate DoS-shaped problem: an injected command with no output and
  // no exit (`cat`/`tail -f` with no file, e.g.) blocks this handler
  // forever, same as it did during development of this demo the first
  // time the payload below accidentally left `grep` reading from stdin.
  const command = `grep "${pattern}" ${FIXTURE_LOG}`;
  const { stdout } = await execAsync(command, { timeout: 3000 });
  return stdout.trim();
}
