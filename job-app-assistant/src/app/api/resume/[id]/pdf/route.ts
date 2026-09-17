import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import type { TailoredResumeContent } from '@/lib/types';
import React from 'react';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  name: { fontSize: 20, marginBottom: 2 },
  contact: { fontSize: 9, color: '#555', marginBottom: 12 },
  sectionTitle: { fontSize: 12, marginTop: 14, marginBottom: 6, borderBottom: '1 solid #333', paddingBottom: 2 },
  summary: { marginBottom: 4, lineHeight: 1.4 },
  roleHeader: { fontSize: 11, marginTop: 8 },
  roleMeta: { fontSize: 9, color: '#555', marginBottom: 3 },
  bullet: { marginLeft: 10, marginBottom: 2, lineHeight: 1.3 },
  skills: { lineHeight: 1.5 },
});

function ResumeDocument({
  fullName,
  email,
  phone,
  location,
  content,
}: {
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  content: TailoredResumeContent;
}) {
  return React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.name }, fullName),
      React.createElement(
        Text,
        { style: styles.contact },
        [email, phone, location].filter(Boolean).join('  |  '),
      ),
      React.createElement(Text, { style: styles.summary }, content.summary),
      React.createElement(Text, { style: styles.sectionTitle }, 'EXPERIENCE'),
      ...content.workExperience.map((role, i) =>
        React.createElement(
          View,
          { key: i },
          React.createElement(Text, { style: styles.roleHeader }, `${role.title} — ${role.company}`),
          React.createElement(Text, { style: styles.roleMeta }, `${role.startDate} – ${role.endDate}`),
          ...role.bullets.map((b, j) => React.createElement(Text, { style: styles.bullet, key: j }, `• ${b}`)),
        ),
      ),
      React.createElement(Text, { style: styles.sectionTitle }, 'SKILLS'),
      React.createElement(Text, { style: styles.skills }, content.skills.join('  •  ')),
    ),
  );
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const generatedResume = await prisma.generatedResume.findUnique({
    where: { id: params.id },
    include: { profile: true },
  });

  if (!generatedResume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  }

  const content = generatedResume.tailoredContent as unknown as TailoredResumeContent;
  const { profile } = generatedResume;

  const buffer = await renderToBuffer(
    ResumeDocument({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      content,
    }) as any,
  );

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="resume-${params.id}.pdf"`,
    },
  });
}
