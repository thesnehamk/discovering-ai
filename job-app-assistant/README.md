# Job App Assistant — Phase 1 (local)

Paste a job posting URL → generate a resume tailored to that JD from your saved profile → download as PDF.

This is the **Phase 1 MVP** from the architecture plan: profile management + resume tailoring.
No browser extension / auto-fill yet (that's Phase 3–4).

## What's included

- Manual profile builder (work experience, education, skills)
- Resume upload → Claude extracts structured profile data from a PDF resume
- Paste a job posting URL → Claude extracts requirements/keywords
- Claude tailors your resume to that JD (reorders/rephrases real content — doesn't invent experience)
- Download the tailored resume as a PDF
- Postgres storage via Prisma, so you keep a history of every JD + generated resume

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (you said you have this)
- An Anthropic API key: https://console.anthropic.com/settings/keys

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your local Postgres database
createdb jobapp
# (or use an existing DB — just point DATABASE_URL at it)

# 3. Configure environment variables
cp .env.example .env
# then edit .env:
#   DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/jobapp?schema=public"
#   ANTHROPIC_API_KEY="sk-ant-..."

# 4. Run the initial migration (creates tables)
npx prisma migrate dev --name init

# 5. Start the dev server
npm run dev
```

Visit **http://localhost:3000**. You'll be redirected to set up your profile first, then you can paste a job URL from the home page.

## Useful commands

```bash
npx prisma studio      # visual DB browser — inspect saved profiles/resumes
npx prisma migrate dev # run after editing prisma/schema.prisma
```

## Known limitations (by design, for Phase 1)

- **JS-heavy job sites won't fetch correctly.** The `/api/jd/parse` route does a plain `fetch()` of the page HTML. Sites like Workday or LinkedIn Jobs render content client-side via JavaScript, so the raw HTML won't contain the JD text. Fix: swap the `fetch()` in `src/app/api/jd/parse/route.ts` for a headless browser (Playwright) that waits for the page to render before extracting text. This is called out as a to-do in the architecture plan (Phase 1 note).
- **No auth.** This is a single-user local app — there's one profile, no login. Don't deploy this publicly as-is.
- **No auto-fill.** That requires a browser extension (Phase 3-4 in the architecture doc), which is a separate codebase since it needs to run inside the browser on third-party job sites.
- **PDF styling is minimal.** `src/app/api/resume/[id]/pdf/route.ts` has a bare-bones one-column layout. Worth investing in a nicer template once the core flow is validated.

## Project structure

```
prisma/schema.prisma          Data model: Profile, JobDescription, GeneratedResume
src/lib/prisma.ts             DB client
src/lib/anthropic.ts          Claude API wrapper (askClaude / askClaudeForJson)
src/lib/types.ts              Shared TS types
src/app/api/profile/          Profile CRUD + resume-upload import
src/app/api/jd/parse/         Fetch + parse a job posting URL
src/app/api/resume/generate/  Tailor profile → JD via Claude
src/app/api/resume/[id]/pdf/  Render tailored resume as downloadable PDF
src/app/page.tsx              Home: paste JD link, generate, download
src/app/profile/page.tsx      Profile builder + resume upload UI
```

## Next steps (from the architecture plan)

1. Swap plain `fetch()` for Playwright in the JD parser to handle JS-rendered job sites
2. Add application tracking (status: applied/interviewing/rejected) — the `GeneratedResume.status` field already exists in the schema, just needs UI
3. Start the browser extension for auto-fill, beginning with Greenhouse + Lever
