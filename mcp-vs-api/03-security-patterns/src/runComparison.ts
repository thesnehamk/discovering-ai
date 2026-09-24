/**
 * Runs the same three cases against both tool implementations and prints
 * what actually happens — this is the proof, not just the claim.
 *
 *   1. A normal, benign query        -> both should behave identically.
 *   2. An injection payload          -> vulnerable executes the injected
 *                                        command; hardened rejects it.
 *   3. A second normal query         -> hardened still works fine after
 *                                        rejecting the attack — it isn't
 *                                        broken, just not exploitable.
 *
 * The injection payload only runs `echo INJECTED_BY_ATTACKER` — visible
 * in this process's own stdout capture, nothing written to disk, nothing
 * touched outside this demo. That's enough to prove arbitrary command
 * execution without doing anything destructive.
 *
 * Payload note: it points the *original* grep at /dev/null (empty, so it
 * exits immediately) rather than dropping its file argument entirely —
 * an earlier version of this demo did that and the resulting `grep`
 * with no file blocked forever waiting on stdin. Worth keeping in mind:
 * that's a second, independent way a naive injection payload can turn
 * into a hang/DoS rather than the clean output an attacker actually wants.
 */

import { searchLogsVulnerable } from "./vulnerable/searchLogsTool.js";
import { InvalidPatternError, searchLogsHardened } from "./hardened/searchLogsTool.js";

const INJECTION_PAYLOAD = 'ERROR" /dev/null; echo INJECTED_BY_ATTACKER; echo "';

async function main(): Promise<void> {
  console.log("=== 1. Benign query: pattern=\"ERROR\" ===");
  console.log("--- vulnerable ---");
  console.log(await searchLogsVulnerable("ERROR"));
  console.log("--- hardened ---");
  console.log(await searchLogsHardened("ERROR"));

  console.log(`\n=== 2. Injection payload: pattern=${JSON.stringify(INJECTION_PAYLOAD)} ===`);

  console.log("--- vulnerable ---");
  try {
    const result = await searchLogsVulnerable(INJECTION_PAYLOAD);
    console.log(result);
    if (result.includes("INJECTED_BY_ATTACKER")) {
      console.log(
        "^ VULNERABLE: the injected `echo INJECTED_BY_ATTACKER` ran as its own " +
          "shell command. This tool handler executes arbitrary commands, not just grep."
      );
    }
  } catch (error) {
    console.log(`(threw: ${(error as Error).message})`);
  }

  console.log("--- hardened ---");
  try {
    await searchLogsHardened(INJECTION_PAYLOAD);
    console.log("^ NOT SUPPOSED TO HAPPEN: hardened version accepted the payload.");
  } catch (error) {
    if (error instanceof InvalidPatternError) {
      console.log(`Rejected before it reached a process call: ${error.message}`);
    } else {
      throw error;
    }
  }

  console.log('\n=== 3. Benign query again: pattern="database" (hardened still works) ===');
  console.log(await searchLogsHardened("database"));
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
