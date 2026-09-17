// ─────────────────────────────────────────────────────────────
//  EDIT THIS FILE to change what your daily post is about.
// ─────────────────────────────────────────────────────────────

export const config = {
  // Who you're writing for. This shapes which stories get picked
  // and how "why it matters" is framed. Examples:
  //   "software developers who want practical AI news"
  //   "frontend and React developers"
  //   "non-technical professionals curious about AI"
  audience: "software developers who want practical AI news",

  // Your byline voice, used to guide the draft's tone.
  author: {
    name: "Sneha",
    voice: "friendly, clear, practical, a little opinionated, no hype",
  },

  // How many main stories to feature in each post.
  mainStories: 4,

  // Approximate length of the draft.
  targetWords: 800,

  // Don't repeat a link that was covered in the last N days.
  dedupeDays: 7,

  // Max items sent to the AI after collection (keeps cost low).
  maxItemsForModel: 45,

  // Claude model. Override with the CLAUDE_MODEL env var if needed.
  model: process.env.CLAUDE_MODEL || "claude-sonnet-5",

  // Words used to keep only AI-related items from general feeds (Hacker News).
  aiKeywords: [
    "ai", "llm", "gpt", "claude", "gemini", "llama", "mistral", "openai",
    "anthropic", "deepmind", "hugging face", "transformer", "diffusion",
    "agent", "agents", "machine learning", "neural", "rag", "embedding",
    "fine-tun", "inference", "model", "copilot", "chatbot", "multimodal",
  ],

  // RSS feeds of AI news. Add or remove freely.
  rssFeeds: [
    { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
    { name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
    {
      name: "Google News",
      url: "https://news.google.com/rss/search?q=artificial+intelligence+when:1d&hl=en-IN&gl=IN&ceid=IN:en",
    },
  ],

  // Reddit is optional: it sometimes blocks requests from GitHub's servers.
  // If that happens the run simply continues without it.
  subreddits: ["MachineLearning", "LocalLLaMA", "artificial"],

  // GitHub topics used to find new, fast-growing AI repositories.
  githubTopics: ["llm", "ai-agents"],
};
