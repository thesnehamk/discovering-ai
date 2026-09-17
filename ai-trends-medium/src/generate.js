import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { systemPrompt, buildUserMessage, draftTool } from "./prompt.js";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

export async function generateDraft(items, date) {
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 8000,
    system: systemPrompt,
    tools: [draftTool],
    tool_choice: { type: "tool", name: draftTool.name },
    messages: [{ role: "user", content: buildUserMessage(items, date) }],
  });

  const call = response.content.find((b) => b.type === "tool_use");
  if (!call) throw new Error("Claude did not return a draft. Stop reason: " + response.stop_reason);

  const draft = call.input;
  if (!draft.article_markdown || !draft.title) {
    throw new Error("Draft was incomplete (stop reason: " + response.stop_reason + ")");
  }

  draft.tags = (draft.tags ?? []).map((t) => String(t).slice(0, 25)).slice(0, 5);
  draft.usage = response.usage;
  return draft;
}
