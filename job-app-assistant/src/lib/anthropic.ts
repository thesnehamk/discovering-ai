import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = 'claude-sonnet-4-6';

/**
 * Sends a prompt to Claude and returns the text response.
 * Throws if the response isn't a text block (shouldn't happen for our use cases).
 */
export async function askClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude did not return a text response');
  }
  return textBlock.text;
}

/**
 * Same as askClaude, but strips markdown code fences and parses the result as JSON.
 * Use this when the system prompt instructs Claude to respond with JSON only.
 */
export async function askClaudeForJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const raw = await askClaude(systemPrompt, userPrompt);
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
  return JSON.parse(cleaned) as T;
}
