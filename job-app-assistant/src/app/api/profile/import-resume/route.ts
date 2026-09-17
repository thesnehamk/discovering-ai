import { NextRequest, NextResponse } from 'next/server';
import { askClaudeForJson } from '@/lib/anthropic';
import type { ProfileInput } from '@/lib/types';

// NOTE: pdf-parse is CommonJS and has some quirks with Next's bundler in dev;
// dynamic import keeps it out of the client bundle entirely.
async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const result = await pdfParse(buffer);
  return result.text;
}

const SYSTEM_PROMPT = `You convert raw resume text into structured JSON.
Extract ONLY information that is explicitly present in the text — never invent
dates, employers, titles, or skills that aren't stated. If a field is unclear,
leave it as an empty string or empty array rather than guessing.

Respond with ONLY valid JSON matching this shape, nothing else:
{
  "fullName": string,
  "email": string,
  "phone": string,
  "location": string,
  "summary": string,
  "workExperience": [{ "company": string, "title": string, "startDate": string, "endDate": string, "bullets": string[] }],
  "education": [{ "school": string, "degree": string, "field": string, "startDate": string, "endDate": string }],
  "skills": string[]
}`;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('resume') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded under field "resume"' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText: string;
  try {
    if (file.type === 'application/pdf') {
      rawText = await extractPdfText(buffer);
    } else {
      // Plain text / other formats: best-effort decode
      rawText = buffer.toString('utf-8');
    }
  } catch (err) {
    return NextResponse.json({ error: 'Failed to extract text from file' }, { status: 422 });
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: 'Could not extract any text from the uploaded file' }, { status: 422 });
  }

  try {
    const structured = await askClaudeForJson<ProfileInput>(SYSTEM_PROMPT, rawText);
    return NextResponse.json({ profile: structured, rawResumeText: rawText });
  } catch (err) {
     console.error('import-resume failed:', err);
    return NextResponse.json({ error: 'Failed to structure resume text via Claude' }, { status: 500 });
  }
}
