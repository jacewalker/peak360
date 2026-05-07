'use client';

import { use, useEffect, useState } from 'react';
import Section11 from '@/components/sections/Section11';
import type { Assessment } from '@/types/assessment';

export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    fetch(`/api/assessments/${id}`)
      .then((r) => r.json())
      .then((res) => setAssessment(res.data ?? null))
      .catch(() => setAssessment(null));
  }, [id]);

  const dateLabel = assessment?.assessmentDate
    ? new Date(assessment.assessmentDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-navy">
          Assessment · {dateLabel}
        </h1>
        <a
          href={`/api/assessments/${id}/pdf`}
          download
          className="px-4 py-2 bg-gold text-navy font-semibold rounded-lg hover:bg-gold/90 text-sm"
        >
          Download PDF
        </a>
      </div>
      <Section11 assessmentId={id} />
    </main>
  );
}
