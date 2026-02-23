'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewAssessmentPage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then(({ data }) => {
        router.replace(`/assessment/${data.id}/section/1`);
      });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted">Creating assessment...</p>
    </div>
  );
}
