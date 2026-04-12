'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function AssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    fetch(`/api/assessments/${id}`)
      .then((r) => r.json())
      .then(({ data }) => {
        router.replace(`/assessment/${id}/section/${data.currentSection || 1}`);
      });
  }, [id, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-muted">Loading assessment...</p>
    </div>
  );
}
