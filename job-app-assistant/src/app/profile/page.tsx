'use client';

import { useEffect, useState } from 'react';
import type { EducationEntry, ProfileInput, WorkExperienceEntry } from '@/lib/types';

const emptyWork: WorkExperienceEntry = { company: '', title: '', startDate: '', endDate: '', bullets: [''] };
const emptyEdu: EducationEntry = { school: '', degree: '', field: '', startDate: '', endDate: '' };

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileInput>({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    workExperience: [emptyWork],
    education: [emptyEdu],
    skills: [],
  });
  const [skillsText, setSkillsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setProfile(d.profile);
          setSkillsText((d.profile.skills || []).join(', '));
        }
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const payload: ProfileInput = {
      ...profile,
      skills: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
    };
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => r.json());
    if (res.profile) {
      setProfile(res.profile);
      setSaved(true);
    }
    setSaving(false);
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError('');

    const formData = new FormData();
    formData.append('resume', file);

    const res = await fetch('/api/profile/import-resume', { method: 'POST', body: formData }).then((r) =>
      r.json(),
    );

    if (res.error) {
      setImportError(res.error);
    } else {
      setProfile((prev) => ({ ...prev, ...res.profile }));
      setSkillsText((res.profile.skills || []).join(', '));
    }
    setImporting(false);
  }

  function updateWork(i: number, field: keyof WorkExperienceEntry, value: string) {
    setProfile((prev) => {
      const next = [...prev.workExperience];
      next[i] = { ...next[i], [field]: value };
      return { ...prev, workExperience: next };
    });
  }

  function updateBullet(roleIdx: number, bulletIdx: number, value: string) {
    setProfile((prev) => {
      const next = [...prev.workExperience];
      const bullets = [...next[roleIdx].bullets];
      bullets[bulletIdx] = value;
      next[roleIdx] = { ...next[roleIdx], bullets };
      return { ...prev, workExperience: next };
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded p-6">
        <h1 className="text-lg font-semibold mb-2">Import from resume</h1>
        <p className="text-sm text-gray-600 mb-3">
          Upload a PDF resume and Claude will extract structured fields below. Review everything —
          it only pulls facts already in your resume, but always double-check before saving.
        </p>
        <input type="file" accept="application/pdf" onChange={handleResumeUpload} disabled={importing} />
        {importing && <p className="text-sm text-gray-500 mt-2">Extracting and structuring…</p>}
        {importError && <p className="text-sm text-red-600 mt-2">{importError}</p>}
      </div>

      <div className="bg-white border rounded p-6 space-y-4">
        <h2 className="font-semibold">Basic info</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="border rounded px-3 py-2 text-sm"
            placeholder="Full name"
            value={profile.fullName}
            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            placeholder="Email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            placeholder="Phone"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2 text-sm"
            placeholder="Location"
            value={profile.location}
            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
          />
        </div>
        <textarea
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="Professional summary"
          rows={3}
          value={profile.summary}
          onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
        />
      </div>

      <div className="bg-white border rounded p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Work experience</h2>
          <button
            className="text-sm text-blue-600"
            onClick={() => setProfile((p) => ({ ...p, workExperience: [...p.workExperience, { ...emptyWork, bullets: [''] }] }))}
          >
            + Add role
          </button>
        </div>
        {profile.workExperience.map((role, i) => (
          <div key={i} className="border rounded p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="border rounded px-2 py-1 text-sm"
                placeholder="Company"
                value={role.company}
                onChange={(e) => updateWork(i, 'company', e.target.value)}
              />
              <input
                className="border rounded px-2 py-1 text-sm"
                placeholder="Title"
                value={role.title}
                onChange={(e) => updateWork(i, 'title', e.target.value)}
              />
              <input
                className="border rounded px-2 py-1 text-sm"
                placeholder="Start date"
                value={role.startDate}
                onChange={(e) => updateWork(i, 'startDate', e.target.value)}
              />
              <input
                className="border rounded px-2 py-1 text-sm"
                placeholder="End date (or Present)"
                value={role.endDate}
                onChange={(e) => updateWork(i, 'endDate', e.target.value)}
              />
            </div>
            {role.bullets.map((b, j) => (
              <input
                key={j}
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder="Bullet point achievement"
                value={b}
                onChange={(e) => updateBullet(i, j, e.target.value)}
              />
            ))}
            <button
              className="text-xs text-blue-600"
              onClick={() =>
                setProfile((prev) => {
                  const next = [...prev.workExperience];
                  next[i] = { ...next[i], bullets: [...next[i].bullets, ''] };
                  return { ...prev, workExperience: next };
                })
              }
            >
              + Add bullet
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded p-6 space-y-2">
        <h2 className="font-semibold mb-2">Skills</h2>
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="Comma-separated: React, Node.js, SQL, ..."
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-black text-white px-5 py-2 rounded text-sm disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save profile'}
      </button>
      {saved && <span className="ml-3 text-sm text-green-600">Saved.</span>}
    </div>
  );
}
