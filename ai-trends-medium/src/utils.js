import fs from "node:fs";
import path from "node:path";

const SEEN_FILE = path.resolve("data/seen.json");

/** Today's date in India (YYYY-MM-DD), so drafts are named by your local day. */
export function todayIST(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Normalise a URL so the same story from two sources counts once. */
export function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const p of [...u.searchParams.keys()]) {
      if (p.startsWith("utm_") || ["ref", "source", "fbclid", "gclid"].includes(p)) {
        u.searchParams.delete(p);
      }
    }
    u.hostname = u.hostname.replace(/^www\./, "");
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** True if the text mentions any AI keyword as a whole word/prefix. */
export function isAiRelated(text, keywords) {
  const t = ` ${String(text).toLowerCase()} `;
  return keywords.some((k) => {
    const escaped = k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // "fine-tun" is a prefix on purpose (fine-tune, fine-tuning)
    const pattern = k.endsWith("-tun") ? `\\b${escaped}` : `\\b${escaped}\\b`;
    return new RegExp(pattern).test(t);
  });
}

export function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text = "", max = 280) {
  const t = String(text).trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Remove duplicate URLs and anything already covered recently. */
export function dedupe(items, seenUrls = new Set()) {
  const out = [];
  const local = new Set();
  const titles = new Set();
  for (const item of items) {
    if (!item?.url || !item?.title) continue;
    const key = normalizeUrl(item.url);
    const titleKey = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
    if (seenUrls.has(key) || local.has(key) || titles.has(titleKey)) continue;
    local.add(key);
    titles.add(titleKey);
    out.push({ ...item, url: key });
  }
  return out;
}

/** Load links covered in the last `days` days. */
export function loadSeen(days, now = Date.now()) {
  try {
    const data = JSON.parse(fs.readFileSync(SEEN_FILE, "utf8"));
    const cutoff = now - days * 86_400_000;
    return data.filter((e) => new Date(e.date).getTime() >= cutoff);
  } catch {
    return [];
  }
}

export function saveSeen(entries) {
  fs.mkdirSync(path.dirname(SEEN_FILE), { recursive: true });
  fs.writeFileSync(SEEN_FILE, JSON.stringify(entries, null, 2));
}

/** Fetch with a timeout and a friendly User-Agent. */
export async function fetchWithTimeout(url, options = {}, ms = 15_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "ai-trends-daily/1.0 (personal newsletter bot)",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}
