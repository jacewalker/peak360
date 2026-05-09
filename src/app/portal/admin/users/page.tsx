'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
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
};

type ToastState = { variant: ToastVariant; message: string } | null;

export default function AdminUsersPage() {
  const router = useRouter();
  const { data: sessionData, isPending } = authClient.useSession();
  const userRole = sessionData?.user?.role;

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  // D-10/D-11: client-side admin gating (defence-in-depth; server is source of truth)
  useEffect(() => {
    if (!isPending && userRole && userRole !== 'admin') {
      router.replace('/portal');
    }
  }, [userRole, isPending, router]);

  const refreshList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && data?.success) {
        setUsers(data.data as AdminUserRow[]);
      } else {
        setUsers([]);
      }
    } catch {
      setUsers([]);
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

  const adminCount = users.filter((u) => u.role === 'admin').length;

  const handleRoleChange = async (userId: string, name: string, newRole: Role) => {
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
        void refreshList();
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
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header — mirror /portal/admin shell, change copy only.
          Uses font-semibold per UI-SPEC 2-weight contract (warning 4 fix). */}
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
              Users
            </span>
          </div>

          <h1 className="text-[2.75rem] font-semibold text-white tracking-tight leading-none mb-3">
            Users
          </h1>
          <p className="text-white/40 text-sm max-w-md leading-relaxed">
            Manage roles for everyone with portal access.
          </p>
        </div>

        {/* Gold accent line */}
        <div className="h-px w-full bg-gradient-to-r from-gold/60 via-gold/20 to-transparent" />
      </div>

      {/* Body */}
      <div className="px-8 py-10 max-w-6xl">
        {/* Desktop table */}
        <div className="hidden md:block bg-surface rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt border-b border-border">
              <tr>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">Name</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">Email</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">Role</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">Status</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">Joined</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">Last active</th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted px-4 py-3">Assessments</th>
              </tr>
            </thead>
            <tbody>
              {listLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="border-b border-border last:border-0">
                      <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-border/60 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-40 rounded bg-border/60 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-border/60 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-border/60 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-border/60 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-border/60 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-border/60 animate-pulse" /></td>
                    </tr>
                  ))
                : users.map((u) => {
                    const totalAssessments = u.coachCount + u.clientCount;
                    const isOnlyAdmin = u.role === 'admin' && adminCount <= 1;
                    const tooltip = isOnlyAdmin
                      ? "You can't change the role of the only admin. Promote another user to admin first."
                      : undefined;
                    const isOpen = openUserId === u.id;
                    return (
                      <Fragment key={u.id}>
                        <tr
                          className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors"
                        >
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
                              onChange={(e) => handleRoleChange(u.id, u.name, e.target.value as Role)}
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
                              <span className="text-xs text-muted italic">Never signed in</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setOpenUserId(isOpen ? null : u.id)}
                              className="text-xs text-navy hover:text-gold transition-colors underline-offset-2 hover:underline"
                            >
                              View {totalAssessments} assessment{totalAssessments === 1 ? '' : 's'}
                            </button>
                          </td>
                        </tr>
                        {isOpen ? (
                          <tr className="bg-surface-alt/40 border-b border-border last:border-0">
                            <td colSpan={7} className="px-4 py-3 text-xs text-muted">
                              <div className="flex flex-col gap-1">
                                <span>
                                  As coach: <span className="text-navy font-medium">{u.coachCount}</span>
                                </span>
                                <span>
                                  As client: <span className="text-navy font-medium">{u.clientCount}</span>
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
          {listLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={`skeleton-card-${i}`} className="bg-surface rounded-xl border border-border p-4">
                  <div className="h-4 w-32 rounded bg-border/60 animate-pulse mb-2" />
                  <div className="h-3 w-48 rounded bg-border/60 animate-pulse" />
                </div>
              ))
            : users.map((u) => {
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
                          onChange={(e) => handleRoleChange(u.id, u.name, e.target.value as Role)}
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
                          View {totalAssessments} assessment{totalAssessments === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
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
