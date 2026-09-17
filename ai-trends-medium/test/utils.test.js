import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeUrl, isAiRelated, dedupe, todayIST, truncate, stripHtml } from "../src/utils.js";
import { buildUserMessage, TAKE_MARKER, systemPrompt } from "../src/prompt.js";
import { config } from "../src/config.js";

test("normalizeUrl strips tracking params, www, and trailing slash", () => {
  assert.equal(
    normalizeUrl("https://www.example.com/post/?utm_source=x&id=5#top"),
    "https://example.com/post/?id=5"
  );
  assert.equal(normalizeUrl("https://example.com/a/"), "https://example.com/a");
});

test("isAiRelated matches whole words, not substrings", () => {
  const k = config.aiKeywords;
  assert.ok(isAiRelated("OpenAI ships a new model", k));
  assert.ok(isAiRelated("Fine-tuning Llama on a laptop", k));
  assert.ok(isAiRelated("Why AI agents fail", k));
  assert.ok(!isAiRelated("Said the painter about his craft", k)); // "ai" inside words
  assert.ok(!isAiRelated("Rust 2.0 released", k));
});

test("dedupe removes repeats, near-identical titles, and already-covered links", () => {
  const items = [
    { title: "Big launch", url: "https://a.com/x?utm_source=hn" },
    { title: "Big launch", url: "https://b.com/y" }, // same title, other site
    { title: "Other story", url: "https://www.a.com/x" }, // same URL
    { title: "Old news", url: "https://c.com/old" },
    { title: "Fresh", url: "https://d.com/new" },
    { title: "", url: "https://e.com" }, // invalid
  ];
  const out = dedupe(items, new Set(["https://c.com/old"]));
  assert.deepEqual(out.map((i) => i.title), ["Big launch", "Fresh"]);
});

test("todayIST rolls over at Indian midnight, not UTC midnight", () => {
  // 20:00 UTC on Sep 10 is 01:30 on Sep 11 in India
  assert.equal(todayIST(new Date("2026-09-10T20:00:00Z")), "2026-09-11");
  assert.equal(todayIST(new Date("2026-09-10T18:00:00Z")), "2026-09-10");
});

test("truncate and stripHtml", () => {
  assert.equal(truncate("abcdef", 4), "abc…");
  assert.equal(stripHtml("<p>Hello &amp; <b>world</b></p>"), "Hello & world");
});

test("prompt includes items, links, and the take marker", () => {
  const msg = buildUserMessage(
    [{ source: "HN", title: "T1", url: "https://x.com", score: "10 points", summary: "S" }],
    "2026-09-11"
  );
  assert.match(msg, /\[1\] T1/);
  assert.match(msg, /URL: https:\/\/x\.com/);
  assert.ok(systemPrompt.includes(TAKE_MARKER));
  assert.ok(systemPrompt.includes("AI assistance"));
});
