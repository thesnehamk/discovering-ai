# AI Trends Daily → Medium

Every morning at **6:00 AM IST** this project:

1. Collects the last ~36 hours of AI news from Hacker News, Hugging Face (papers + trending models), new GitHub repos, TechCrunch, The Verge, Google News and Reddit
2. Removes duplicates and anything you covered in the past week
3. Asks Claude to pick the top stories and write a **first draft** with source links
4. Emails you the draft (ready to copy-paste into Medium) and saves it in `drafts/`

You then spend ~15 minutes fact-checking, filling in the **✍️ MY TAKE** spots with your own opinion, and publishing.

> **Why not auto-publish?** Medium no longer gives out new API tokens, and its AI policy limits undisclosed AI writing to your followers only and bans AI-generated stories from the paywall. Your own take is what keeps posts eligible for wider distribution. The draft already includes the required disclosure line.

---

## Setup (about 20 minutes, one time)

### 1. Put the code on GitHub
Create a **private** repository (for example `ai-trends-daily`) and upload all these files, including the hidden `.github` folder.

```bash
cd ai-trends-medium
git init && git add . && git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ai-trends-daily.git
git push -u origin main
```

### 2. Get a Claude API key
Go to https://console.anthropic.com → **API Keys** → create a key. Add some credit under **Billing**. Each run uses roughly 6–8K input tokens and 2–3K output tokens; see https://docs.claude.com for current pricing.

### 3. Create a Gmail app password (for the daily email)
1. Turn on 2-Step Verification in your Google account
2. Open https://myaccount.google.com/apppasswords
3. Create one called "AI Trends Bot" and copy the 16-character password

### 4. Add your secrets to GitHub
Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value | Required? |
|---|---|---|
| `ANTHROPIC_API_KEY` | your Claude key | ✅ |
| `GMAIL_USER` | your Gmail address | for email |
| `GMAIL_APP_PASSWORD` | the 16-character app password | for email |
| `EMAIL_TO` | where to send drafts (defaults to `GMAIL_USER`) | optional |
| `MEDIUM_TOKEN` | only if you have an **old** Medium integration token | optional |

If `MEDIUM_TOKEN` works, the script also creates a **private draft** in your Medium account. It never publishes publicly.

### 5. Test it
Repo → **Actions** tab → **Daily AI Trends Draft** → **Run workflow**. In a minute or two you should get an email and see a new file in `drafts/`.

After that it runs by itself every day. (GitHub's scheduler can sometimes start a little late.)

---

## Your daily routine (~15 min)

1. Open the morning email
2. Click through the links and check the "Verify" notes
3. Copy everything from the headline down → Medium → **Write** → paste
4. Replace each **✍️ MY TAKE** placeholder with 2–3 sentences of your own view
5. Add a cover image and the 5 suggested tags, then publish

Keep the italic AI-assistance line at the top.

---

## Customising

Everything lives in **`src/config.js`**:

- `audience`: who you write for (try `"frontend and React developers"` for a sharper niche)
- `author.voice`: your tone
- `mainStories`, `targetWords`: post size
- `rssFeeds`, `subreddits`, `githubTopics`: where news comes from

The writing instructions are in **`src/prompt.js`** if you want to change the article structure.

To change the time, edit the `cron` line in `.github/workflows/daily.yml` (it's in UTC; `30 0 * * *` = 6:00 AM IST).

---

## Running on your own computer

```bash
npm install
npm run dry-run   # shows what news was found; no AI call, no email
cp .env.example .env   # then fill in your keys
npm run local     # full run using .env
npm test          # unit tests
```

Requires Node.js 20.6 or newer.

## Troubleshooting

- **Reddit shows "skipped (HTTP 403)"**: Reddit often blocks GitHub's servers. Everything else still works; remove it from `config.js` if you like.
- **No email arrives**: check the Actions log for "Email failed", re-check the app password, and look in spam.
- **"Too few fresh items today"**: most sources failed; the log lists which ones and why.
- **Model error**: set a different model with the `CLAUDE_MODEL` environment variable, or edit `model` in `config.js`.
