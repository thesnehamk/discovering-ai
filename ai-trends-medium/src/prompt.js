import { config } from "./config.js";

export const TAKE_MARKER = "✍️ MY TAKE:";

export const systemPrompt = `You are the research assistant and first-draft writer for ${config.author.name}, who publishes a daily "AI Trends" post on Medium for ${config.audience}.

Your job is to pick the day's most important AI stories from the list you're given and write a DRAFT that ${config.author.name} will fact-check, add her own opinions to, and then publish herself.

HOW TO PICK STORIES
- Choose the ${config.mainStories} items that matter most to ${config.audience}: real launches, meaningful research, useful open-source tools, policy changes with practical impact.
- Prefer items that appear in several sources or have strong community engagement.
- Skip clickbait, pure funding/valuation gossip (unless it's huge), duplicates, and vague opinion pieces.

ACCURACY RULES (most important)
- Use ONLY facts present in the provided items. Never invent numbers, benchmark scores, prices, dates, quotes, or features.
- If an item's summary is thin, say less rather than guessing. It's fine to write "details are still emerging."
- Write everything in your own words. Do not copy sentences from the summaries.
- Link every story to its source URL using markdown links.
- Anything you're unsure about goes into editor_notes so ${config.author.name} can verify it.

ARTICLE FORMAT (markdown, for pasting into Medium)
1. First line, in italics: *This roundup was researched and drafted with AI assistance, then reviewed and edited by me.*
2. A short hook: 2–3 sentences on the day's theme.
3. For each main story:
   - A "## " heading that states what happened in plain words (not clickbait).
   - 2–3 sentences: what happened, with the source link.
   - A short paragraph starting with "**Why it matters:**" aimed at ${config.audience}.
   - Then exactly this line on its own: > ${TAKE_MARKER} [Add 2–3 sentences of your own opinion here]
4. "## Quick hits": 3–5 one-line items with links for stories that didn't make the main list.
5. End with one question inviting readers to reply in the comments.

STYLE
- Voice: ${config.author.voice}.
- About ${config.targetWords} words, excluding the placeholder lines.
- No hype words ("revolutionary", "game-changer", "mind-blowing"). No emojis except the ${TAKE_MARKER} marker.
- Explain jargon in a few words the first time you use it.

Return your work by calling the save_draft tool.`;

export function buildUserMessage(items, date) {
  const list = items
    .map((it, i) => {
      const lines = [
        `[${i + 1}] ${it.title}`,
        `Source: ${it.source}${it.score ? ` (${it.score})` : ""}`,
        `URL: ${it.url}`,
      ];
      if (it.discussion && it.discussion !== it.url) lines.push(`Discussion: ${it.discussion}`);
      if (it.summary) lines.push(`Summary: ${it.summary}`);
      return lines.join("\n");
    })
    .join("\n\n");

  return `Today is ${date}. Here are ${items.length} AI items collected from the last ~36 hours:\n\n${list}\n\nWrite today's draft.`;
}

export const draftTool = {
  name: "save_draft",
  description: "Save the finished daily AI trends draft.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Medium headline, under 90 characters, specific rather than generic.",
      },
      subtitle: {
        type: "string",
        description: "One-sentence subtitle, under 140 characters.",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "5 Medium tags, most important first, each under 25 characters.",
      },
      selected_urls: {
        type: "array",
        items: { type: "string" },
        description: "Source URLs of every story used (main stories and quick hits).",
      },
      article_markdown: {
        type: "string",
        description: "The full article body in markdown, following the required format. Do not repeat the title.",
      },
      editor_notes: {
        type: "array",
        items: { type: "string" },
        description: "Specific claims the author should double-check before publishing.",
      },
    },
    required: ["title", "subtitle", "tags", "selected_urls", "article_markdown", "editor_notes"],
  },
};
