'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

// Persistent, sticky banner shown across the whole portal while an admin is
// impersonating another user. The server layout decides when to render this
// (only when session.session.impersonatedBy is set) and passes down the
// impersonated user's display name + role.
export default function ImpersonationBanner({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReturn = async () => {
    setLoading(true);
    setError(null);
    try {
      // stopImpersonating takes NO arguments — the server resolves the
      // impersonator from the rotated session cookie.
      const { error: stopError } = await authClient.admin.stopImpersonating();
      if (stopError) {
        setError("Couldn't switch back. Try again.");
        setLoading(false);
        return;
      }
      router.push('/portal/admin/users');
      router.refresh();
    } catch {
      setError("Couldn't switch back. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 bg-gold-brand px-4 py-2 text-[13px] text-bg">
      <span>
        Viewing as <span className="font-medium">{name}</span> ({role})
      </span>
      <div className="flex items-center gap-2">
        {error ? <span className="text-[11px] text-danger">{error}</span> : null}
        <button
          type="button"
          onClick={handleReturn}
          disabled={loading}
          className="rounded-md border border-bg/30 px-3 py-1.5 text-[12px] font-medium tracking-[0.02em] text-bg hover:bg-bg/10 transition-colors disabled:opacity-50"
        >
          {loading ? 'Returning…' : 'Return to your admin account'}
        </button>
      </div>
    </div>
  );
}
