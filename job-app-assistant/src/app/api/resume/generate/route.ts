import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { askClaudeForJson } from '@/lib/anthropic';
import type { TailoredResumeResult } from '@/lib/types';

const SYSTEM_PROMPT = `You tailor a candidate's resume to a specific job description.

STRICT RULES — do not violate these:
1. Never invent employers, titles, dates, skills, or achievements that are not
   present in the candidate's original profile. You may only reorder, re-emphasize,
   and rephrase bullets that already exist.
2. You MAY rephrase a bullet's wording to use terminology from the job description,
   but the underlying fact/accomplishment must remain true to the original.
3. Reorder work experience bullets within each role to put the most JD-relevant ones first.
4. Reorder/select skills to prioritize ones matching the JD, but do not add skills
   the candidate didn't list.
5. Write a 2-3 sentence professional summary tailored to this specific role.
6. In "gapNotes", honestly flag any JD requirements the candidate's profile does not
   clearly demonstrate — this helps the candidate write a cover letter or decide
   whether to apply. Do not paper over gaps in the resume itself.

Respond with ONLY valid JSON matching this shape, nothing else:
{
  "tailoredContent": {
    "summary": string,
    "workExperience": [{ "company": string, "title": string, "startDate": string, "endDate": string, "bullets": string[] }],
    "skills": string[]
  },
  "gapNotes": string
}`;

export async function POST(req: NextRequest) {
  const { profileId, jobDescriptionId } = await req.json();

  if (!profileId || !jobDescriptionId) {
    return NextResponse.json({ error: 'profileId and jobDescriptionId are required' }, { status: 400 });
  }

  const [profile, jobDescription] = await Promise.all([
    prisma.profile.findUnique({ where: { id: profileId } }),
    prisma.jobDescription.findUnique({ where: { id: jobDescriptionId } }),
  ]);

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (!jobDescription) return NextResponse.json({ error: 'Job description not found' }, { status: 404 });

  const userPrompt = `CANDIDATE PROFILE:
${JSON.stringify(
  {
    summary: profile.summary,
    workExperience: profile.workExperience,
    education: profile.education,
    skills: profile.skills,
  },
  null,
  2,
)}

JOB DESCRIPTION (${jobDescription.title} at ${jobDescription.company}):
Requirements: ${JSON.stringify(jobDescription.requirements)}
Responsibilities: ${JSON.stringify(jobDescription.responsibilities)}
Keywords: ${JSON.stringify(jobDescription.keywords)}`;

  let result: TailoredResumeResult;
  try {
    result = await askClaudeForJson<TailoredResumeResult>(SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate tailored resume' }, { status: 500 });
  }

  const generatedResume = await prisma.generatedResume.create({
    data: {
      profileId,
      jobDescriptionId,
      tailoredContent: result.tailoredContent as any,
      gapNotes: result.gapNotes,
    },
  });

  return NextResponse.json({ generatedResume });
}
