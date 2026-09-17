'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Step = 'idle' | 'parsing-jd' | 'generating' | 'done' | 'error';

export default function HomePage() {
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [gapNotes, setGapNotes] = useState('');
  const [jdTitle, setJdTitle] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => setHasProfile(!!d.profile));
  }, []);

  async function handleGenerate() {
    setError('');
    setResumeId(null);
    if (!url.trim()) return;

    try {
      setStep('parsing-jd');
      const profileRes = await fetch('/api/profile').then((r) => r.json());
      if (!profileRes.profile) {
        setError('Set up your profile first.');
        setStep('error');
        return;
      }

      const jdRes = await fetch('/api/jd/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      }).then((r) => r.json());

      if (jdRes.error) {
        setError(jdRes.error);
        setStep('error');
        return;
      }
      setJdTitle(`${jdRes.jobDescription.title} at ${jdRes.jobDescription.company}`);

      setStep('generating');
      const genRes = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profileRes.profile.id,
          jobDescriptionId: jdRes.jobDescription.id,
        }),
      }).then((r) => r.json());

      if (genRes.error) {
        setError(genRes.error);
        setStep('error');
        return;
      }

      setResumeId(genRes.generatedResume.id);
      setGapNotes(genRes.generatedResume.gapNotes || '');
      setStep('done');
    } catch (err) {
      setError('Something went wrong. Check the server logs.');
      setStep('error');
    }
  }

  if (hasProfile === false) {
    return (
      <div className="bg-white border rounded p-6">
        <p className="mb-4">You need to set up your profile before generating a tailored resume.</p>
        <Link href="/profile" className="inline-block bg-black text-white px-4 py-2 rounded">
          Set up profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded p-6">
        <h1 className="text-lg font-semibold mb-2">Generate a tailored resume</h1>
        <p className="text-sm text-gray-600 mb-4">
          Paste a job posting URL. Note: some sites (Workday, LinkedIn Jobs) render via JavaScript
          and may not be fetchable this way yet — see the README for headless-browser fetching.
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm"
            placeholder="https://jobs.example.com/posting/123"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            onClick={handleGenerate}
            disabled={step === 'parsing-jd' || step === 'generating'}
            className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {step === 'parsing-jd' ? 'Reading JD…' : step === 'generating' ? 'Tailoring…' : 'Generate'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      </div>

      {step === 'done' && resumeId && (
        <div className="bg-white border rounded p-6">
          <h2 className="font-semibold mb-2">Done: {jdTitle}</h2>
          <a
            href={`/api/resume/${resumeId}/pdf`}
            className="inline-block bg-green-600 text-white px-4 py-2 rounded text-sm mb-4"
          >
            Download tailored resume (PDF)
          </a>
          {gapNotes && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="font-medium mb-1">Gap notes (from Claude — review before applying):</p>
              <p className="text-gray-700 whitespace-pre-wrap">{gapNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
