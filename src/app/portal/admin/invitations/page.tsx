'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import StatusPill from '@/components/ui/StatusPill';

type Invitation = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  accepted: boolean;
};

type InviteRole = 'admin' | 'coach' | 'client';

export default function AdminInvitationsPage() {
  const router = useRouter();
  const { data: sessionData, isPending } = authClient.useSession();
  const userRole = sessionData?.user?.role;

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<InviteRole>('client');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // D-10/D-11: client-side admin gating (defence-in-depth; server is source of truth)
  useEffect(() => {
    if (!isPending && userRole && userRole !== 'admin') {
      router.replace('/portal');
    }
  }, [userRole, isPending, router]);

  const refreshList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch('/api/admin/invitations');
      const data = await res.json();
      if (res.ok && data?.success) {
        setInvites(data.data as Invitation[]);
      } else {
        setInvites([]);
      }
    } catch {
      setInvites([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userRole === 'admin') {
      void refreshList();
    }
  }, [userRole, refreshList]);

  if (isPending || userRole !== 'admin') return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          role,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Invitation sent to ${email.trim()}.` });
        setEmail('');
        setName('');
        setRole('client');
        void refreshList();
      } else if (typeof data.error === 'string' && data.error.toLowerCase().includes('already exists')) {
        setMessage({ type: 'error', text: 'An account with this email already exists.' });
      } else {
        setMessage({
          type: 'error',
          text: data.error || "Couldn't send the invitation. Try again.",
        });
      }
    } catch {
      setMessage({
        type: 'error',
        text: "We couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header — pattern from src/app/portal/admin/page.tsx lines 42-82.
          UI-SPEC typography 2-weight contract: font-semibold only. */}
      <div
        className="relative overflow-hidden"
        style={{
          backgroundColor: '#0f2440',
          backgroundImage: `radial-gradient(circle, rgba(245,166,35,0.07) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      >
        <div className="relative px-8 py-14">
          <div className="flex items-center gap-1.5 mb-5">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
              Peak360
            </span>
            <svg
              className="w-3 h-3 text-white/20"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-gold/70">
              Onboarding
            </span>
          </div>

          <h1 className="text-[2.75rem] font-semibold text-white tracking-tight leading-none mb-3">
            Invitations
          </h1>
          <p className="text-white/40 text-sm max-w-md leading-relaxed">
            Invite coaches, admins, or clients. Recipients receive a sign-in link.
          </p>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-gold/60 via-gold/20 to-transparent" />
      </div>

      <div className="px-8 py-10 max-w-4xl mx-auto space-y-8">
        {/* Invite form */}
        <section className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-navy mb-4">Send an invitation</h2>
          <form onSubmit={handleInvite} className="grid gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/25"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name (optional)"
              className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/25"
            />
            <label className="text-xs text-muted">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as InviteRole)}
              className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-gold/50"
            >
              <option value="client">Client</option>
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="bg-gold text-navy px-4 py-2 rounded-md font-semibold hover:bg-gold/90 text-sm disabled:opacity-40"
            >
              {loading ? 'Sending...' : 'Send invitation'}
            </button>
            {message && (
              <p
                className={`text-sm ${
                  message.type === 'success' ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {message.text}
              </p>
            )}
          </form>
        </section>

        {/* Listing section */}
        <section className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-navy mb-4">Past invitations</h2>
          {listLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : invites.length === 0 ? (
            <p className="text-sm text-muted">No invitations sent yet.</p>
          ) : (
            <>
              {/* Desktop / md+ table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="py-2 font-medium">Email</th>
                      <th className="font-medium">Name</th>
                      <th className="font-medium">Role</th>
                      <th className="font-medium">Sent</th>
                      <th className="font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((inv) => (
                      <tr key={inv.id} className="border-t border-border hover:bg-surface-alt">
                        <td className="py-3">{inv.email}</td>
                        <td>{inv.name}</td>
                        <td>{inv.role}</td>
                        <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                        <td>
                          <StatusPill status={inv.accepted ? 'accepted' : 'pending'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile (<768px) card list — UI-SPEC §Responsive */}
              <ul className="md:hidden space-y-3">
                {invites.map((inv) => (
                  <li
                    key={inv.id}
                    className="border border-border rounded-md p-3 text-sm flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-navy break-all">{inv.email}</span>
                      <StatusPill status={inv.accepted ? 'accepted' : 'pending'} />
                    </div>
                    <div className="text-xs text-muted">
                      {inv.name} · {inv.role} ·{' '}
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
