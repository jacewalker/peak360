'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function AssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: sessionData, isPending } = authClient.useSession();
  const role = sessionData?.user?.role;

  useEffect(() => {
    // Wait until the session resolves before deciding the target so a client
    // is never momentarily routed to currentSection during the loading window.
    if (isPending) return;

    fetch(`/api/assessments/${id}`)
      .then((r) => r.json())
      .then(({ data }) => {
        // Clients default to the Section 11 report; coaches/admins resume at
        // their current section. (Also fixes the legacy missing-/portal-prefix bug.)
        const target =
          role === 'client'
            ? `/portal/assessment/${id}/section/11`
            : `/portal/assessment/${id}/section/${data.currentSection || 1}`;
        router.replace(target);
      });
  }, [id, role, isPending, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-muted">Loading assessment...</p>
    </div>
  );
}
