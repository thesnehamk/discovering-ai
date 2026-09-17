import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import nodemailer from "nodemailer";
import { TAKE_MARKER } from "./prompt.js";

const CHECKLIST = [
  `Replace every "${TAKE_MARKER}" placeholder with your own opinion (this is what makes the post yours)`,
  "Open each link and confirm the facts match the source",
  "Check the editor notes below",
  "Keep the AI-assistance line at the top (Medium requires disclosure in the first two paragraphs)",
  "Add a cover image you have rights to (label it if it's AI-generated)",
  "Do NOT put this story behind the paywall unless it's mostly your own writing",
];

/** The clean article: exactly what gets pasted into Medium. */
export function articleMarkdown(draft) {
  return [
    `# ${draft.title}`,
    `*${draft.subtitle}*`,
    draft.article_markdown.trim(),
    `---\n**Tags:** ${draft.tags.join(", ")}`,
  ].join("\n\n");
}

export function draftFileContents(draft, date, report) {
  const notes = draft.editor_notes?.length
    ? draft.editor_notes.map((n) => `- ${n}`).join("\n")
    : "- None flagged";
  return [
    `<!-- Daily AI Trends draft for ${date}. Generated automatically; review before publishing. -->`,
    `## Before you publish`,
    CHECKLIST.map((c) => `- [ ] ${c}`).join("\n"),
    `## Editor notes (verify these)`,
    notes,
    `<details><summary>Source collection report</summary>\n\n${report.join("\n")}\n\n</details>`,
    `---\n\n<!-- ▼▼▼ COPY FROM HERE INTO MEDIUM ▼▼▼ -->`,
    articleMarkdown(draft),
  ].join("\n\n");
}

export function saveDraftFile(draft, date, report) {
  const file = path.resolve("drafts", `${date}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, draftFileContents(draft, date, report));
  return file;
}

function githubFileUrl(date) {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_REF_NAME } = process.env;
  if (!GITHUB_REPOSITORY) return null;
  return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/blob/${GITHUB_REF_NAME}/drafts/${date}.md`;
}

export async function sendEmail(draft, date, report, mediumUrl) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_TO } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return "skipped (no Gmail secrets set)";

  const placeholders = draft.article_markdown.split(TAKE_MARKER).length - 1;
  const fileUrl = githubFileUrl(date);
  const links = [
    fileUrl && `<a href="${fileUrl}">Markdown version on GitHub</a>`,
    mediumUrl && `<a href="${mediumUrl}">Private draft already in your Medium account</a>`,
  ].filter(Boolean);

  const html = `
  <div style="font-family:Georgia,serif;max-width:680px;margin:auto;line-height:1.6;color:#222">
    <div style="background:#fff8e1;border:1px solid #f0d58a;border-radius:8px;padding:14px 18px;font-family:Arial,sans-serif;font-size:14px">
      <strong>Before you publish (${placeholders} "My take" spots to fill):</strong>
      <ul>${CHECKLIST.map((c) => `<li>${c}</li>`).join("")}</ul>
      <strong>Verify:</strong>
      <ul>${(draft.editor_notes?.length ? draft.editor_notes : ["Nothing flagged"]).map((n) => `<li>${n}</li>`).join("")}</ul>
      ${links.length ? `<p>${links.join(" · ")}</p>` : ""}
      <p style="color:#666">Tip: select everything from the headline down, copy, and paste straight into the Medium editor. Formatting and links carry over.</p>
    </div>
    <hr style="margin:28px 0">
    ${marked.parse(articleMarkdown(draft))}
    <hr style="margin:28px 0">
    <p style="font-family:Arial,sans-serif;font-size:12px;color:#888">${report.join("<br>")}</p>
  </div>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: `AI Trends Bot <${GMAIL_USER}>`,
    to: EMAIL_TO || GMAIL_USER,
    subject: `📰 AI Trends draft ${date}: ${draft.title}`,
    html,
  });
  return `sent to ${EMAIL_TO || GMAIL_USER}`;
}

/**
 * Only works if you ALREADY have a Medium integration token
 * (Medium stopped issuing new ones). Always creates a private DRAFT,
 * never a public post, so nothing goes live without your review.
 */
export async function pushMediumDraft(draft) {
  const token = process.env.MEDIUM_TOKEN;
  if (!token) return null;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const me = await fetch("https://api.medium.com/v1/me", { headers });
  if (!me.ok) throw new Error(`Medium token rejected (HTTP ${me.status})`);
  const { data: user } = await me.json();

  const res = await fetch(`https://api.medium.com/v1/users/${user.id}/posts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: draft.title,
      contentFormat: "markdown",
      content: articleMarkdown(draft).replace(/\n\n---\n\*\*Tags:\*\*.*$/s, ""),
      tags: draft.tags.slice(0, 3), // the API only uses the first 3
      publishStatus: "draft",
    }),
  });
  if (!res.ok) throw new Error(`Medium draft failed (HTTP ${res.status}): ${await res.text()}`);
  const { data } = await res.json();
  return data.url;
}
