import { XMLParser } from "fast-xml-parser";
import { config } from "./config.js";
import { fetchWithTimeout, isAiRelated, stripHtml, truncate } from "./utils.js";

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
const HOURS_BACK = 36;
const since = () => Date.now() - HOURS_BACK * 3_600_000;
const asArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const textOf = (x) => (x && typeof x === "object" ? x["#text"] ?? "" : x ?? "");

// ── Hacker News (top stories from the last 36h that mention AI) ──
async function hackerNews() {
  const ts = Math.floor(since() / 1000);
  const url =
    `https://hn.algolia.com/api/v1/search?tags=story` +
    `&numericFilters=created_at_i>${ts},points>30&hitsPerPage=200`;
  const data = await (await fetchWithTimeout(url)).json();
  return data.hits
    .filter((h) => isAiRelated(h.title, config.aiKeywords))
    .sort((a, b) => b.points - a.points)
    .slice(0, 12)
    .map((h) => ({
      source: "Hacker News",
      title: h.title,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      discussion: `https://news.ycombinator.com/item?id=${h.objectID}`,
      score: `${h.points} points, ${h.num_comments} comments`,
      summary: "",
    }));
}

// ── Hugging Face daily papers (community-upvoted research) ──
async function hfPapers() {
  const data = await (await fetchWithTimeout("https://huggingface.co/api/daily_papers")).json();
  return asArray(data)
    .map((d) => ({ ...d.paper, title: d.paper?.title ?? d.title }))
    .filter((p) => p?.id && p?.title)
    .sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0))
    .slice(0, 8)
    .map((p) => ({
      source: "Hugging Face Papers",
      title: p.title,
      url: `https://huggingface.co/papers/${p.id}`,
      score: `${p.upvotes ?? 0} upvotes`,
      summary: truncate(stripHtml(p.summary), 350),
    }));
}

// ── Hugging Face trending models ──
async function hfModels() {
  const url = "https://huggingface.co/api/models?sort=trendingScore&direction=-1&limit=10";
  const data = await (await fetchWithTimeout(url)).json();
  return asArray(data).map((m) => ({
    source: "Hugging Face Trending Models",
    title: `Trending model: ${m.id}`,
    url: `https://huggingface.co/${m.id}`,
    score: `${m.likes ?? 0} likes, ${m.downloads ?? 0} downloads`,
    summary: m.pipeline_tag ? `Task: ${m.pipeline_tag}` : "",
  }));
}

// ── GitHub: new repos (last 7 days) gaining stars fast ──
async function githubRepos() {
  const week = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const results = [];
  for (const topic of config.githubTopics) {
    const url =
      `https://api.github.com/search/repositories?q=topic:${encodeURIComponent(topic)}` +
      `+created:>${week}&sort=stars&order=desc&per_page=6`;
    const data = await (await fetchWithTimeout(url, { headers })).json();
    for (const r of data.items ?? []) {
      results.push({
        source: "GitHub (new repos)",
        title: `${r.full_name}: ${r.description ?? "no description"}`,
        url: r.html_url,
        score: `${r.stargazers_count} stars in its first week`,
        summary: truncate(r.description ?? "", 250),
      });
    }
  }
  return results;
}

// ── RSS / Atom news feeds ──
async function rssFeed({ name, url }) {
  const body = await (await fetchWithTimeout(url)).text();
  const doc = xml.parse(body);
  const rssItems = asArray(doc?.rss?.channel?.item);
  const atomItems = asArray(doc?.feed?.entry);
  const cutoff = since();

  const items = [
    ...rssItems.map((i) => ({
      title: textOf(i.title),
      url: textOf(i.link),
      date: i.pubDate,
      summary: textOf(i.description),
    })),
    ...atomItems.map((e) => {
      const links = asArray(e.link);
      const link = links.find((l) => l["@_rel"] === "alternate") ?? links[0];
      return {
        title: textOf(e.title),
        url: link?.["@_href"] ?? textOf(link),
        date: e.published ?? e.updated,
        summary: textOf(e.summary) || textOf(e.content),
      };
    }),
  ];

  return items
    .filter((i) => !i.date || new Date(i.date).getTime() >= cutoff)
    .slice(0, 10)
    .map((i) => ({
      source: name,
      title: stripHtml(i.title),
      url: i.url,
      score: "",
      summary: truncate(stripHtml(i.summary), 280),
    }));
}

// ── Reddit (optional; often blocked from cloud servers) ──
async function reddit(sub) {
  const url = `https://www.reddit.com/r/${sub}/top.json?t=day&limit=10`;
  const data = await (await fetchWithTimeout(url)).json();
  return data.data.children
    .map((c) => c.data)
    .filter((p) => !p.stickied && !p.over_18)
    .slice(0, 6)
    .map((p) => ({
      source: `Reddit r/${sub}`,
      title: p.title,
      url: p.is_self ? `https://www.reddit.com${p.permalink}` : p.url,
      discussion: `https://www.reddit.com${p.permalink}`,
      score: `${p.score} upvotes, ${p.num_comments} comments`,
      summary: truncate(p.selftext ?? "", 250),
    }));
}

/** Run every collector in parallel. Returns { items, report }. */
export async function collectAll() {
  const jobs = [
    ["Hacker News", hackerNews()],
    ["Hugging Face Papers", hfPapers()],
    ["Hugging Face Models", hfModels()],
    ["GitHub", githubRepos()],
    ...config.rssFeeds.map((f) => [f.name, rssFeed(f)]),
    ...config.subreddits.map((s) => [`Reddit r/${s}`, reddit(s)]),
  ];

  const settled = await Promise.allSettled(jobs.map(([, p]) => p));
  const report = [];
  const bySource = [];

  settled.forEach((r, i) => {
    const name = jobs[i][0];
    if (r.status === "fulfilled") {
      report.push(`✅ ${name}: ${r.value.length}`);
      bySource.push(r.value);
    } else {
      report.push(`⚠️ ${name}: skipped (${r.reason?.message ?? r.reason})`);
    }
  });

  // Round-robin across sources so one noisy feed can't crowd out the rest.
  const items = [];
  for (let i = 0; bySource.some((list) => i < list.length); i++) {
    for (const list of bySource) if (list[i]) items.push(list[i]);
  }
  return { items, report };
}
