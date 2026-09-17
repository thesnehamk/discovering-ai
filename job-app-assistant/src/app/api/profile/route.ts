import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ProfileInput } from '@/lib/types';

// Single-user local app: just return/update the most recent profile.
// Add real auth + per-user scoping before this ever goes multi-user.

export async function GET() {
  const profile = await prisma.profile.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const body: ProfileInput = await req.json();

  if (!body.fullName || !body.email) {
    return NextResponse.json({ error: 'fullName and email are required' }, { status: 400 });
  }

  const existing = await prisma.profile.findFirst({ orderBy: { updatedAt: 'desc' } });

  const profile = existing
    ? await prisma.profile.update({
        where: { id: existing.id },
        data: {
          fullName: body.fullName,
          email: body.email,
          phone: body.phone,
          location: body.location,
          summary: body.summary,
          workExperience: body.workExperience as any,
          education: body.education as any,
          skills: body.skills,
        },
      })
    : await prisma.profile.create({
        data: {
          fullName: body.fullName,
          email: body.email,
          phone: body.phone,
          location: body.location,
          summary: body.summary,
          workExperience: body.workExperience as any,
          education: body.education as any,
          skills: body.skills,
        },
      });

  return NextResponse.json({ profile });
}
