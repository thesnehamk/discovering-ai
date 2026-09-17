import { config } from "./config.js";
import { collectAll } from "./sources.js";
import { dedupe, loadSeen, saveSeen, todayIST, normalizeUrl } from "./utils.js";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const date = todayIST();
  console.log(`\n📰 AI Trends — ${date}${DRY_RUN ? " (dry run)" : ""}\n`);

  // 1. Collect
  const { items: raw, report } = await collectAll();
  report.forEach((line) => console.log("  " + line));

  // 2. Remove duplicates and anything covered in the last few days
  const seen = loadSeen(config.dedupeDays);
  const items = dedupe(raw, new Set(seen.map((s) => s.url))).slice(0, config.maxItemsForModel);
  console.log(`\n  ${raw.length} collected → ${items.length} fresh items after de-duplication`);

  if (items.length < config.mainStories) {
    throw new Error("Too few fresh items today; check the source report above.");
  }

  if (DRY_RUN) {
    items.forEach((it, i) => console.log(`  [${i + 1}] (${it.source}) ${it.title}`));
    console.log("\nDry run finished. No AI call, no email.");
    return;
  }

  // Loaded lazily so --dry-run works without an API key.
  const { generateDraft } = await import("./generate.js");
  const { saveDraftFile, sendEmail, pushMediumDraft } = await import("./deliver.js");

  // 3. Draft with Claude
  console.log(`\n✍️  Drafting with ${config.model}…`);
  const draft = await generateDraft(items, date);
  console.log(`  "${draft.title}"`);
  console.log(`  tokens: ${draft.usage.input_tokens} in / ${draft.usage.output_tokens} out`);

  // 4. Deliver
  const file = saveDraftFile(draft, date, report);
  console.log(`\n💾 Saved ${file}`);

  let mediumUrl = null;
  try {
    mediumUrl = await pushMediumDraft(draft);
    console.log(mediumUrl ? `📝 Medium draft: ${mediumUrl}` : "📝 Medium: skipped (no MEDIUM_TOKEN)");
  } catch (err) {
    console.warn(`⚠️ Medium draft failed: ${err.message}`);
  }

  try {
    console.log(`📧 Email: ${await sendEmail(draft, date, report, mediumUrl)}`);
  } catch (err) {
    console.warn(`⚠️ Email failed: ${err.message}`);
  }

  // 5. Remember what was covered so tomorrow's post doesn't repeat it
  const used = (draft.selected_urls ?? []).map((url) => ({ url: normalizeUrl(url), date }));
  saveSeen([...seen, ...used]);
  console.log(`\n✅ Done. ${used.length} links added to history.\n`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
});
