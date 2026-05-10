'use client';

import { Fragment, useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import RolePill from '@/components/ui/RolePill';
import StatusPill from '@/components/ui/StatusPill';
import Toast, { type ToastVariant } from '@/components/ui/Toast';

type Role = 'admin' | 'coach' | 'client';

type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  banned: boolean | null;
  banReason: string | null;
  banExpires: number | null;
  createdAt: string;
  lastActive: string | null;
  coachCount: number;
  clientCount: number;
  // 260510-osn: client's most-recent assessment coach (null for non-clients).
  coachId: string | null;
  coachName: string | null;
};

type Invitation = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  accepted: boolean;
};

type ToastState = { variant: ToastVariant; message: string } | null;

type InviteRole = 'admin' | 'coach' | 'client';

export default function AdminPeoplePage() {
  const router = useRouter();
  const { data: sessionData, isPending } = authClient.useSession();
  const userRole = sessionData?.user?.role;

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  // Invite-form state.
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('client');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null);

  // D-10/D-11: client-side admin gating (defence-in-depth; server is source of truth)
  useEffect(() => {
    if (!isPending && userRole && userRole !== 'admin') {
      router.replace('/portal');
    }
  }, [userRole, isPending, router]);

  const refresh = useCallback(async () => {
    setListLoading(true);
    try {
      const [usersRes, invitesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/invitations'),
      ]);
      const usersData = await usersRes.json().catch(() => null);
      const invitesData = await invitesRes.json().catch(() => null);
      setUsers(
        usersRes.ok && usersData?.success ? (usersData.data as AdminUserRow[]) : [],
      );
      setInvites(
        invitesRes.ok && invitesData?.success
          ? (invitesData.data as Invitation[])
          : [],
      );
    } catch {
      setUsers([]);
      setInvites([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userRole === 'admin') {
      void refresh();
    }
  }, [userRole, refresh]);

  const adminCount = users.filter((u) => u.role === 'admin').length;

  const groups = useMemo(() => {
    const admins = users
      .filter((u) => u.role === 'admin')
      .sort((a, b) => a.name.localeCompare(b.name));
    const coachesAll = users.filter((u) => u.role === 'coach');
    const clients = users.filter((u) => u.role === 'client');

    const clientsByCoach = new Map<string, AdminUserRow[]>();
    for (const c of clients) {
      if (c.coachId) {
        if (!clientsByCoach.has(c.coachId)) clientsByCoach.set(c.coachId, []);
        clientsByCoach.get(c.coachId)!.push(c);
      }
    }

    const coachesWithClients = coachesAll
      .filter((c) => clientsByCoach.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const unassignedClients = clients
      .filter((c) => !c.coachId)
      .sort((a, b) => a.name.localeCompare(b.name));

    const coachesWithoutClients = coachesAll
      .filter((c) => !clientsByCoach.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const pendingInvites = invites.filter((i) => !i.accepted);

    return {
      admins,
      coachesWithClients,
      clientsByCoach,
      unassignedClients,
      coachesWithoutClients,
      pendingInvites,
    };
  }, [users, invites]);

  const handleRoleChange = useCallback(
    async (userId: string, name: string, newRole: Role) => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/role`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setUsers((u) =>
            u.map((x) => (x.id === userId ? { ...x, role: newRole } : x)),
          );
          setToast({ variant: 'success', message: `Role updated for ${name}.` });
        } else if (res.status === 409) {
          // Race detected — server already rolled back; refetch to reflect truth.
          void refresh();
          setToast({
            variant: 'error',
            message:
              "Couldn't update the role — another admin change happened simultaneously. The previous role was restored. Try again.",
          });
        } else {
          setToast({
            variant: 'error',
            message: data?.error || "Couldn't update the role. Try again.",
          });
        }
      } catch {
        setToast({
          variant: 'error',
          message: "Couldn't update the role. Try again.",
        });
      }
    },
    [refresh],
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMessage(null);
    setInviteLoading(true);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
          role: inviteRole,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInviteMessage({
          type: 'success',
          text: `Invitation sent to ${inviteEmail.trim()}.`,
        });
        setInviteEmail('');
        setInviteName('');
        setInviteRole('client');
        // Refresh BOTH datasets so the new pending row appears in-place.
        void refresh();
      } else if (
        typeof data.error === 'string' &&
        data.error.toLowerCase().includes('already exists')
      ) {
        setInviteMessage({
          type: 'error',
          text: 'An account with this email already exists.',
        });
      } else {
        setInviteMessage({
          type: 'error',
          text: data.error || "Couldn't send the invitation. Try again.",
        });
      }
    } catch {
      setInviteMessage({
        type: 'error',
        text: "We couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  if (isPending || userRole !== 'admin') return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header — frontend-design vibe: gold mono eyebrow + navy heading.
          UI-SPEC 2-weight contract: font-semibold only. */}
      <div
        className="relative overflow-hidden"
        style={{
          backgroundColor: '#0f2440',
          backgroundImage: `radial-gradient(circle, rgba(245,166,35,0.07) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      >
        <div className="relative px-8 py-14">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mb-5">
            <Link
              href="/portal/admin"
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-gold/70 transition-colors"
            >
              Administration
            </Link>
            <svg
              className="w-3 h-3 text-white/20"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold/70">
              People
            </span>
          </div>

          <h1 className="text-[2.75rem] font-semibold text-white tracking-tight leading-none mb-3">
            People
          </h1>
          <p className="text-white/40 text-sm max-w-md leading-relaxed">
            Manage everyone with portal access — admins, coaches, clients, and
            pending invitations.
          </p>
        </div>

        {/* Gold accent line */}
        <div className="h-px w-full bg-gradient-to-r from-gold/60 via-gold/20 to-transparent" />
      </div>

      {/* Body */}
      <div className="px-8 py-10 max-w-6xl space-y-10">
        {/* Invite form (anchor target #invite). */}
        <section
          id="invite"
          className="bg-surface rounded-2xl border border-border p-6 scroll-mt-24"
        >
          <div className="mb-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
              Onboarding
            </p>
            <h2 className="text-xl font-semibold text-navy mt-1">
              Send an invitation
            </h2>
            <p className="text-sm text-muted mt-1">
              Recipients receive a magic-link sign-in. Admin can invite any role.
            </p>
          </div>
          <form onSubmit={handleInvite} className="grid gap-3 max-w-xl">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              required
              className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/25"
            />
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Full name (optional)"
              className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/25"
            />
            <label className="text-xs text-muted">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as InviteRole)}
              className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-gold/50"
            >
              <option value="client">Client</option>
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviteLoading || !inviteEmail.trim()}
              className="bg-gold text-navy px-4 py-2 rounded-md font-semibold hover:bg-gold/90 text-sm disabled:opacity-40 w-fit"
            >
              {inviteLoading ? 'Sending…' : 'Send invitation'}
            </button>
            {inviteMessage && (
              <p
                className={`text-sm ${
                  inviteMessage.type === 'success'
                    ? 'text-green-700'
                    : 'text-red-700'
                }`}
              >
                {inviteMessage.text}
              </p>
            )}
          </form>
        </section>

        {/* 1. Admins */}
        <GroupSection
          eyebrow="Administrators"
          title="Admins"
          count={groups.admins.length}
        >
          {listLoading ? (
            <SkeletonTable rows={3} />
          ) : groups.admins.length === 0 ? (
            <EmptyRow text="No admins yet." />
          ) : (
            <UserTable
              users={groups.admins}
              adminCount={adminCount}
              openUserId={openUserId}
              onToggleOpen={(id) => setOpenUserId(openUserId === id ? null : id)}
              onRoleChange={handleRoleChange}
            />
          )}
        </GroupSection>

        {/* 2. Per-coach groups */}
        {!listLoading &&
          groups.coachesWithClients.map((coach) => {
            const clients = groups.clientsByCoach.get(coach.id) ?? [];
            return (
              <GroupSection
                key={coach.id}
                eyebrow="Coach + clients"
                title={`${coach.name}'s clients`}
                count={clients.length}
                subtitle={
                  <span className="text-xs text-muted flex items-center gap-2">
                    <RolePill role="coach" />
                    {coach.email}
                  </span>
                }
              >
                <UserTable
                  users={clients}
                  adminCount={adminCount}
                  openUserId={openUserId}
                  onToggleOpen={(id) =>
                    setOpenUserId(openUserId === id ? null : id)
                  }
                  onRoleChange={handleRoleChange}
                />
              </GroupSection>
            );
          })}

        {/* 3. Unassigned clients (only if any) */}
        {!listLoading && groups.unassignedClients.length > 0 && (
          <GroupSection
            eyebrow="Unassigned"
            title="Clients without a coach"
            count={groups.unassignedClients.length}
          >
            <UserTable
              users={groups.unassignedClients}
              adminCount={adminCount}
              openUserId={openUserId}
              onToggleOpen={(id) =>
                setOpenUserId(openUserId === id ? null : id)
              }
              onRoleChange={handleRoleChange}
            />
          </GroupSection>
        )}

        {/* 4. Coaches without clients (only if any) */}
        {!listLoading && groups.coachesWithoutClients.length > 0 && (
          <GroupSection
            eyebrow="Coaches"
            title="Coaches without assigned clients"
            count={groups.coachesWithoutClients.length}
          >
            <UserTable
              users={groups.coachesWithoutClients}
              adminCount={adminCount}
              openUserId={openUserId}
              onToggleOpen={(id) =>
                setOpenUserId(openUserId === id ? null : id)
              }
              onRoleChange={handleRoleChange}
            />
          </GroupSection>
        )}

        {/* 5. Pending invitations */}
        <GroupSection
          eyebrow="Pending"
          title="Pending invitations"
          count={groups.pendingInvites.length}
        >
          {listLoading ? (
            <p className="text-sm text-muted px-4 py-3">Loading…</p>
          ) : groups.pendingInvites.length === 0 ? (
            <EmptyRow text="No pending invitations." />
          ) : (
            <InviteTable invites={groups.pendingInvites} />
          )}
        </GroupSection>
      </div>

      {toast ? (
        <Toast
          variant={toast.variant}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}

// ---- Sub-components (kept inline per plan: no separate files) ----

function GroupSection({
  eyebrow,
  title,
  count,
  subtitle,
  children,
}: {
  eyebrow: string;
  title?: string;
  count: number;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
            {eyebrow}
          </p>
          {title ? (
            <h2 className="text-xl font-semibold text-navy mt-1">{title}</h2>
          ) : null}
          {subtitle ? <div className="mt-1">{subtitle}</div> : null}
        </div>
        <span className="text-xs text-muted whitespace-nowrap">
          {count} {count === 1 ? 'person' : 'people'}
        </span>
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="bg-surface rounded-2xl border border-border px-4 py-6 text-sm text-muted text-center">
      {text}
    </div>
  );
}

function SkeletonTable({ rows }: { rows: number }) {
  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="h-4 w-32 rounded bg-border/60 animate-pulse" />
            <div className="h-4 w-48 rounded bg-border/60 animate-pulse" />
            <div className="h-4 w-16 rounded bg-border/60 animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

function UserTable({
  users,
  adminCount,
  openUserId,
  onToggleOpen,
  onRoleChange,
}: {
  users: AdminUserRow[];
  adminCount: number;
  openUserId: string | null;
  onToggleOpen: (id: string) => void;
  onRoleChange: (userId: string, name: string, newRole: Role) => void;
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt border-b border-border">
            <tr>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">
                Name
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">
                Email
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">
                Role
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">
                Status
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">
                Joined
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">
                Last active
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">
                Assessments
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const totalAssessments = u.coachCount + u.clientCount;
              const isOnlyAdmin = u.role === 'admin' && adminCount <= 1;
              const tooltip = isOnlyAdmin
                ? "You can't change the role of the only admin. Promote another user to admin first."
                : undefined;
              const isOpen = openUserId === u.id;
              return (
                <Fragment key={u.id}>
                  <tr className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-navy font-medium">{u.name}</span>
                        <RolePill role={u.role} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={isOnlyAdmin}
                        title={tooltip}
                        onChange={(e) =>
                          onRoleChange(u.id, u.name, e.target.value as Role)
                        }
                        className="text-sm border border-border rounded-md px-2 py-1 bg-white text-navy disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="admin">admin</option>
                        <option value="coach">coach</option>
                        <option value="client">client</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {u.banned === true ? <StatusPill status="banned" /> : null}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {u.lastActive ? (
                        <span className="text-muted text-xs">
                          {new Date(u.lastActive).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted italic">
                          Never signed in
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onToggleOpen(u.id)}
                        className="text-xs text-navy hover:text-gold transition-colors underline-offset-2 hover:underline"
                      >
                        View {totalAssessments} assessment
                        {totalAssessments === 1 ? '' : 's'}
                      </button>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr className="bg-surface-alt/40 border-b border-border last:border-0">
                      <td colSpan={7} className="px-4 py-3 text-xs text-muted">
                        <div className="flex flex-col gap-1">
                          <span>
                            As coach:{' '}
                            <span className="text-navy font-medium">
                              {u.coachCount}
                            </span>
                          </span>
                          <span>
                            As client:{' '}
                            <span className="text-navy font-medium">
                              {u.clientCount}
                            </span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list (<768px) */}
      <div className="md:hidden flex flex-col gap-3">
        {users.map((u) => {
          const totalAssessments = u.coachCount + u.clientCount;
          const isOnlyAdmin = u.role === 'admin' && adminCount <= 1;
          const tooltip = isOnlyAdmin
            ? "You can't change the role of the only admin. Promote another user to admin first."
            : undefined;
          return (
            <div key={u.id} className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-col">
                  <span className="text-navy font-medium text-sm">{u.name}</span>
                  <span className="text-muted text-xs flex items-center gap-2">
                    {u.email}
                    {u.banned === true ? <StatusPill status="banned" /> : null}
                  </span>
                </div>
                <RolePill role={u.role} />
              </div>
              <div className="flex flex-col gap-2 text-xs text-muted">
                <div className="flex items-center justify-between">
                  <span>Role</span>
                  <select
                    value={u.role}
                    disabled={isOnlyAdmin}
                    title={tooltip}
                    onChange={(e) =>
                      onRoleChange(u.id, u.name, e.target.value as Role)
                    }
                    className="text-xs border border-border rounded-md px-2 py-1 bg-white text-navy disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="admin">admin</option>
                    <option value="coach">coach</option>
                    <option value="client">client</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span>Joined</span>
                  <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last active</span>
                  {u.lastActive ? (
                    <span>{new Date(u.lastActive).toLocaleDateString()}</span>
                  ) : (
                    <span className="italic">Never signed in</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Assessments</span>
                  <span>
                    View {totalAssessments} assessment
                    {totalAssessments === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function InviteTable({ invites }: { invites: Invitation[] }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt border-b border-border">
            <tr>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">
                Email
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">
                Name
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">
                Role
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">
                Sent
              </th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors"
              >
                <td className="px-4 py-3 text-navy">{inv.email}</td>
                <td className="px-4 py-3 text-muted">{inv.name}</td>
                <td className="px-4 py-3 text-muted">{inv.role}</td>
                <td className="px-4 py-3 text-muted text-xs">
                  {new Date(inv.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status="pending" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="md:hidden space-y-3">
        {invites.map((inv) => (
          <li
            key={inv.id}
            className="bg-surface rounded-xl border border-border p-3 text-sm flex flex-col gap-1"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-navy break-all">{inv.email}</span>
              <StatusPill status="pending" />
            </div>
            <div className="text-xs text-muted">
              {inv.name} · {inv.role} ·{' '}
              {new Date(inv.createdAt).toLocaleDateString()}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
