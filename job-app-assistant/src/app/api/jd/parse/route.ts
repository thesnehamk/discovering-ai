import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { prisma } from '@/lib/prisma';
import { askClaudeForJson } from '@/lib/anthropic';
import type { ParsedJobDescription } from '@/lib/types';

const SYSTEM_PROMPT = `You extract structured data from raw job posting page text.
Respond with ONLY valid JSON matching this shape, nothing else:
{
  "title": string,
  "company": string,
  "requirements": string[],
  "responsibilities": string[],
  "keywords": string[]
}
"keywords" should be the key skills/technologies/qualifications a resume should echo to match this posting.`;

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobAppAssistant/0.1)' },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (status ${res.status}). Some sites (Workday, LinkedIn) render via JavaScript and require a headless browser — see README.` },
        { status: 422 },
      );
    }
    html = await res.text();
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch the job posting URL' }, { status: 422 });
  }

  const $ = cheerio.load(html);
  $('script, style, nav, footer, header').remove();
  const pageText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 15000); // keep prompt size sane

  if (!pageText) {
    return NextResponse.json({ error: 'Could not extract readable text from the page' }, { status: 422 });
  }

  let parsed: ParsedJobDescription;
  try {
    parsed = await askClaudeForJson<ParsedJobDescription>(SYSTEM_PROMPT, pageText);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to parse job description via Claude' }, { status: 500 });
  }

  const jobDescription = await prisma.jobDescription.create({
    data: {
      sourceUrl: url,
      title: parsed.title,
      company: parsed.company,
      rawText: pageText,
      requirements: parsed.requirements,
      responsibilities: parsed.responsibilities,
      keywords: parsed.keywords,
    },
  });

  return NextResponse.json({ jobDescription });
}
