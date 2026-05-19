'use client';

import { Fragment, useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import RolePill from '@/components/ui/RolePill';
import StatusPill from '@/components/ui/StatusPill';
import Toast, { type ToastVariant } from '@/components/ui/Toast';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

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
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null);
  // After a successful create we surface the credentials inline so the admin
  // can copy them and share with the user out-of-band (email isn't wired up).
  const [createdCredentials, setCreatedCredentials] = useState<
    { email: string; password: string } | null
  >(null);
  const [credentialsCopied, setCredentialsCopied] = useState(false);

  // Shared with the reset-password modal — generates a 16-char readable password.
  // Crockford-ish alphabet — no 0/O/1/I/l ambiguity for read-aloud sharing.
  const buildPassword = useCallback(() => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = new Uint32Array(16);
    crypto.getRandomValues(bytes);
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  }, []);

  const generatePassword = useCallback(() => {
    setInvitePassword(buildPassword());
  }, [buildPassword]);

  // Reset-password modal state — null when closed.
  const [resetTarget, setResetTarget] = useState<
    { id: string; email: string; name: string } | null
  >(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetCredentials, setResetCredentials] = useState<
    { email: string; password: string } | null
  >(null);
  const [resetCredentialsCopied, setResetCredentialsCopied] = useState(false);

  const openResetModal = useCallback(
    (u: { id: string; email: string; name: string }) => {
      setResetTarget(u);
      setResetPasswordValue('');
      setResetError(null);
      setResetCredentials(null);
      setResetCredentialsCopied(false);
    },
    [],
  );

  const closeResetModal = useCallback(() => {
    setResetTarget(null);
    setResetPasswordValue('');
    setResetError(null);
    setResetCredentials(null);
    setResetCredentialsCopied(false);
  }, []);

  const handleResetSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetTarget) return;
      const pw = resetPasswordValue;
      if (pw.length < 8) {
        setResetError('Password must be at least 8 characters.');
        return;
      }
      setResetError(null);
      setResetLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${resetTarget.id}/password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: pw }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setResetCredentials({ email: resetTarget.email, password: pw });
          setResetPasswordValue('');
          setToast({
            variant: 'success',
            message: `Password reset for ${resetTarget.name || resetTarget.email}.`,
          });
        } else {
          setResetError(data?.error || "Couldn't set password. Try again.");
        }
      } catch {
        setResetError("We couldn't reach the server. Check your connection and try again.");
      } finally {
        setResetLoading(false);
      }
    },
    [resetTarget, resetPasswordValue],
  );

  // Assign-coach modal state — null when closed.
  const [coachTarget, setCoachTarget] = useState<
    { id: string; name: string; email: string; currentCoachId: string | null } | null
  >(null);
  const [coachSelection, setCoachSelection] = useState<string>('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  const openCoachModal = useCallback(
    (u: { id: string; name: string; email: string; currentCoachId: string | null }) => {
      setCoachTarget(u);
      setCoachSelection(u.currentCoachId ?? '');
      setCoachError(null);
    },
    [],
  );

  const closeCoachModal = useCallback(() => {
    setCoachTarget(null);
    setCoachSelection('');
    setCoachError(null);
  }, []);

  // handleAssignCoach is defined further down — after `refresh` is in scope.

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

  const handleAssignCoach = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!coachTarget) return;
      setCoachError(null);
      setCoachLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${coachTarget.id}/coach`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coachId: coachSelection || null }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setToast({
            variant: 'success',
            message: `Coach updated for ${coachTarget.name || coachTarget.email}.`,
          });
          closeCoachModal();
          void refresh();
        } else {
          setCoachError(data?.error || "Couldn't update coach. Try again.");
        }
      } catch {
        setCoachError("We couldn't reach the server. Check your connection and try again.");
      } finally {
        setCoachLoading(false);
      }
    },
    [coachTarget, coachSelection, closeCoachModal, refresh],
  );

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

  const handleRename = useCallback(
    async (userId: string, newName: string): Promise<boolean> => {
      const trimmed = newName.trim();
      if (!trimmed) {
        setToast({ variant: 'error', message: 'Name cannot be empty.' });
        return false;
      }
      try {
        const res = await fetch(`/api/admin/users/${userId}/name`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setUsers((u) =>
            u.map((x) => (x.id === userId ? { ...x, name: trimmed } : x)),
          );
          if (data?.changed !== false) {
            setToast({ variant: 'success', message: `Renamed to ${trimmed}.` });
          }
          return true;
        }
        setToast({
          variant: 'error',
          message: data?.error || "Couldn't rename. Try again.",
        });
        return false;
      } catch {
        setToast({ variant: 'error', message: "Couldn't rename. Try again." });
        return false;
      }
    },
    [],
  );

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
    setCreatedCredentials(null);
    setCredentialsCopied(false);
    setInviteLoading(true);
    const submittedEmail = inviteEmail.trim();
    const submittedPassword = invitePassword;
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: submittedEmail,
          name: inviteName.trim() || undefined,
          role: inviteRole,
          password: submittedPassword || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInviteMessage({
          type: 'success',
          text: `User created: ${submittedEmail}.`,
        });
        if (submittedPassword) {
          setCreatedCredentials({ email: submittedEmail, password: submittedPassword });
        }
        setInviteEmail('');
        setInviteName('');
        setInviteRole('client');
        setInvitePassword('');
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
          text: data.error || "Couldn't create the user. Try again.",
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
    <div className="min-h-screen">
      {/* Hero */}
      <header className="pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Link
            href="/portal/admin"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text-faint hover:text-gold-brand mb-4 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            ADMIN
          </Link>
          <MonoEyebrow variant="hero" as="div" className="mb-3">
            ADMIN · USERS
          </MonoEyebrow>
          <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
            People
          </h1>
          <p className="mt-3 text-[13px] text-text-dim leading-[1.55] max-w-2xl">
            Manage everyone with portal access — admins, coaches, and clients.
          </p>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-12 space-y-10">
        {/* Invite form (anchor target #invite). */}
        <section
          id="invite"
          className="bg-bg-3 rounded-2xl border border-line p-6 scroll-mt-24"
        >
          <div className="mb-4">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-gold-brand">
              Onboarding
            </p>
            <h2 className="text-[20px] font-medium text-text mt-1 tracking-[-0.015em]">
              Create a user
            </h2>
            <p className="text-[13px] text-text-dim mt-1">
              Add a user record with the chosen role.
            </p>
          </div>
          <form onSubmit={handleInvite} className="grid gap-3 max-w-xl">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              required
              className="h-12 px-4 border border-line rounded-md text-[13px] bg-bg-3 text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors"
            />
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Full name (optional)"
              className="h-12 px-4 border border-line rounded-md text-[13px] bg-bg-3 text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors"
            />
            <label className="text-[11px] text-text-dim">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as InviteRole)}
              className="h-12 px-4 border border-line rounded-md text-[13px] bg-bg-3 text-text focus:outline-none focus:border-gold-brand transition-colors"
            >
              <option value="client">Client</option>
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
            <label className="text-[11px] text-text-dim">Password</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="Set or generate a password (min 8 chars)"
                minLength={8}
                autoComplete="new-password"
                spellCheck={false}
                className="flex-1 h-12 px-4 border border-line rounded-md text-[13px] font-mono bg-bg-3 text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors"
              />
              <button
                type="button"
                onClick={generatePassword}
                className="h-12 px-4 border border-line-2 rounded-md text-[13px] font-medium tracking-[0.02em] text-text hover:border-gold-brand hover:text-gold-brand transition-colors"
              >
                Generate
              </button>
            </div>
            <p className="text-[11px] text-text-faint -mt-1">
              Copy this password and share it with the user out-of-band. Minimum 8 characters.
            </p>
            <button
              type="submit"
              disabled={inviteLoading || !inviteEmail.trim() || invitePassword.length < 8}
              className="bg-gold-brand text-bg hover:bg-champagne px-4 py-2 rounded-md text-[13px] font-medium tracking-[0.02em] disabled:opacity-40 w-fit transition-colors"
            >
              {inviteLoading ? 'Creating…' : 'Create user'}
            </button>
            {inviteMessage && (
              <p
                className={`text-[13px] ${
                  inviteMessage.type === 'success'
                    ? 'text-status-good'
                    : 'text-danger'
                }`}
              >
                {inviteMessage.text}
              </p>
            )}
            {createdCredentials && (
              <div className="mt-2 rounded-lg border border-gold-brand/50 bg-bg-2 p-4 space-y-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-brand">
                  Credentials to share
                </p>
                <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                  <dt className="text-text-dim">Email</dt>
                  <dd className="font-mono text-text break-all">{createdCredentials.email}</dd>
                  <dt className="text-text-dim">Password</dt>
                  <dd className="font-mono text-text break-all">{createdCredentials.password}</dd>
                </dl>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`,
                        );
                        setCredentialsCopied(true);
                        setTimeout(() => setCredentialsCopied(false), 2000);
                      } catch {
                        // Clipboard API unavailable — admin can select manually.
                      }
                    }}
                    className="px-3 py-1.5 rounded-md border border-line-2 text-[12px] font-medium tracking-[0.02em] text-text hover:border-gold-brand hover:text-gold-brand transition-colors"
                  >
                    {credentialsCopied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCreatedCredentials(null); setCredentialsCopied(false); }}
                    className="px-3 py-1.5 rounded-md border border-transparent text-[12px] font-medium tracking-[0.02em] text-text-dim hover:text-text transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-[11px] text-text-faint">
                  This is the only time the password is shown. Save it before dismissing.
                </p>
              </div>
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
              onRename={handleRename}
              onResetPassword={openResetModal}
              onAssignCoach={openCoachModal}
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
                  <span className="text-[11px] text-text-dim flex items-center gap-2 whitespace-nowrap">
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
                  onRename={handleRename}
                  onResetPassword={openResetModal}
                  onAssignCoach={openCoachModal}
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
              onRename={handleRename}
              onResetPassword={openResetModal}
              onAssignCoach={openCoachModal}
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
              onRename={handleRename}
              onResetPassword={openResetModal}
              onAssignCoach={openCoachModal}
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
            <p className="text-[13px] text-text-dim px-4 py-3">Loading…</p>
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

      {resetTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            // Close when clicking the backdrop, not the dialog itself.
            if (e.target === e.currentTarget && !resetLoading) closeResetModal();
          }}
        >
          <div className="w-full max-w-md bg-bg-3 border border-line rounded-2xl p-6 space-y-4 shadow-2xl">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-brand">
                Admin action
              </p>
              <h2 id="reset-password-title" className="text-[20px] font-medium text-text mt-1 tracking-[-0.015em]">
                Reset password
              </h2>
              <p className="text-[13px] text-text-dim mt-1 break-all">
                {resetTarget.name ? `${resetTarget.name} · ` : ''}
                {resetTarget.email}
              </p>
            </div>

            {!resetCredentials ? (
              <form onSubmit={handleResetSubmit} className="space-y-3">
                <label className="text-[11px] text-text-dim">New password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    placeholder="Set or generate (min 8 chars)"
                    minLength={8}
                    autoComplete="new-password"
                    spellCheck={false}
                    autoFocus
                    className="flex-1 h-12 px-4 border border-line rounded-md text-[13px] font-mono bg-bg-3 text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setResetPasswordValue(buildPassword())}
                    className="h-12 px-4 border border-line-2 rounded-md text-[13px] font-medium tracking-[0.02em] text-text hover:border-gold-brand hover:text-gold-brand transition-colors"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-[11px] text-text-faint">
                  The user&apos;s existing sessions stay active until they re-authenticate.
                </p>
                {resetError && (
                  <p className="text-[13px] text-danger">{resetError}</p>
                )}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    disabled={resetLoading}
                    className="px-3 py-2 rounded-md border border-transparent text-[13px] font-medium tracking-[0.02em] text-text-dim hover:text-text transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading || resetPasswordValue.length < 8}
                    className="bg-gold-brand text-bg hover:bg-champagne px-4 py-2 rounded-md text-[13px] font-medium tracking-[0.02em] disabled:opacity-40 transition-colors"
                  >
                    {resetLoading ? 'Saving…' : 'Set password'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-gold-brand/50 bg-bg-2 p-4 space-y-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-brand">
                    Credentials to share
                  </p>
                  <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                    <dt className="text-text-dim">Email</dt>
                    <dd className="font-mono text-text break-all">{resetCredentials.email}</dd>
                    <dt className="text-text-dim">Password</dt>
                    <dd className="font-mono text-text break-all">{resetCredentials.password}</dd>
                  </dl>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `Email: ${resetCredentials.email}\nPassword: ${resetCredentials.password}`,
                        );
                        setResetCredentialsCopied(true);
                        setTimeout(() => setResetCredentialsCopied(false), 2000);
                      } catch {
                        // Clipboard unavailable — admin can select manually.
                      }
                    }}
                    className="px-3 py-1.5 rounded-md border border-line-2 text-[12px] font-medium tracking-[0.02em] text-text hover:border-gold-brand hover:text-gold-brand transition-colors"
                  >
                    {resetCredentialsCopied ? 'Copied' : 'Copy'}
                  </button>
                  <p className="text-[11px] text-text-faint">
                    This is the only time the password is shown. Save it before closing.
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="px-4 py-2 rounded-md bg-gold-brand text-bg hover:bg-champagne text-[13px] font-medium tracking-[0.02em] transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {coachTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-coach-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !coachLoading) closeCoachModal();
          }}
        >
          <div className="w-full max-w-md bg-bg-3 border border-line rounded-2xl p-6 space-y-4 shadow-2xl">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-brand">
                Admin action
              </p>
              <h2 id="assign-coach-title" className="text-[20px] font-medium text-text mt-1 tracking-[-0.015em]">
                {coachTarget.currentCoachId ? 'Change coach' : 'Assign coach'}
              </h2>
              <p className="text-[13px] text-text-dim mt-1 break-all">
                {coachTarget.name ? `${coachTarget.name} · ` : ''}
                {coachTarget.email}
              </p>
            </div>

            <form onSubmit={handleAssignCoach} className="space-y-3">
              <label className="text-[11px] text-text-dim">Coach</label>
              <select
                value={coachSelection}
                onChange={(e) => setCoachSelection(e.target.value)}
                className="w-full h-12 px-4 border border-line rounded-md text-[13px] bg-bg-3 text-text focus:outline-none focus:border-gold-brand transition-colors"
              >
                <option value="">— No coach —</option>
                {users
                  .filter((u) => u.role === 'coach' || u.role === 'admin')
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
              </select>
              {coachError && (
                <p className="text-[13px] text-danger">{coachError}</p>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeCoachModal}
                  disabled={coachLoading}
                  className="px-3 py-2 rounded-md border border-transparent text-[13px] font-medium tracking-[0.02em] text-text-dim hover:text-text transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={coachLoading}
                  className="bg-gold-brand text-bg hover:bg-champagne px-4 py-2 rounded-md text-[13px] font-medium tracking-[0.02em] disabled:opacity-40 transition-colors"
                >
                  {coachLoading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-gold-brand">
            {eyebrow}
          </p>
          {title ? (
            <h2 className="text-[20px] font-medium text-text mt-1 tracking-[-0.015em]">{title}</h2>
          ) : null}
          {subtitle ? <div className="mt-1">{subtitle}</div> : null}
        </div>
        <span className="text-[11px] text-text-dim whitespace-nowrap">
          {count} {count === 1 ? 'person' : 'people'}
        </span>
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="bg-bg-3 rounded-2xl border border-line px-4 py-6 text-[13px] text-text-dim text-center">
      {text}
    </div>
  );
}

function SkeletonTable({ rows }: { rows: number }) {
  return (
    <div className="bg-bg-3 rounded-2xl border border-line overflow-hidden">
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="h-4 w-32 rounded bg-line animate-pulse" />
            <div className="h-4 w-48 rounded bg-line animate-pulse" />
            <div className="h-4 w-16 rounded bg-line animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableName({
  value,
  onSave,
  compact,
}: {
  value: string;
  onSave: (next: string) => Promise<boolean>;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = useCallback(async () => {
    const next = draft.trim();
    if (!next || next === value) {
      setDraft(value);
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await onSave(next);
    setSaving(false);
    if (ok) {
      setEditing(false);
    } else {
      // keep editing so the user can retry / fix
      setDraft(next);
    }
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const textCls = compact
    ? 'text-text font-medium text-[13px]'
    : 'text-text font-medium';

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Click to rename"
        className={`${textCls} text-left hover:text-gold-brand transition-colors`}
      >
        {value}
      </button>
    );
  }

  return (
    <input
      type="text"
      autoFocus
      value={draft}
      disabled={saving}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          void commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        }
      }}
      className={`${textCls} bg-bg-2 border border-line rounded-md px-2 py-1 focus:outline-none focus:border-gold-brand disabled:opacity-60`}
    />
  );
}

function UserTable({
  users,
  adminCount,
  openUserId,
  onToggleOpen,
  onRoleChange,
  onRename,
  onResetPassword,
  onAssignCoach,
}: {
  users: AdminUserRow[];
  adminCount: number;
  openUserId: string | null;
  onToggleOpen: (id: string) => void;
  onRoleChange: (userId: string, name: string, newRole: Role) => void;
  onRename: (userId: string, newName: string) => Promise<boolean>;
  onResetPassword: (u: { id: string; email: string; name: string }) => void;
  onAssignCoach: (u: { id: string; name: string; email: string; currentCoachId: string | null }) => void;
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-bg-3 rounded-2xl border border-line overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-bg-2 border-b border-line">
            <tr>
              <th className="text-left font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint px-4 py-3">
                Name
              </th>
              <th className="text-left font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint px-4 py-3">
                Email
              </th>
              <th className="text-left font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint px-4 py-3">
                Role
              </th>
              <th className="text-left font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint px-4 py-3">
                Status
              </th>
              <th className="text-left font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint px-4 py-3">
                Joined
              </th>
              <th className="text-left font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint px-4 py-3">
                Last active
              </th>
              <th className="text-left font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint px-4 py-3">
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
                  <tr className="border-b border-line last:border-0 hover:bg-bg-2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <EditableName value={u.name} onSave={(v) => onRename(u.id, v)} />
                        <RolePill role={u.role} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-dim">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={isOnlyAdmin}
                        title={tooltip}
                        onChange={(e) =>
                          onRoleChange(u.id, u.name, e.target.value as Role)
                        }
                        className="text-[13px] border border-line rounded-md px-2 py-1 bg-bg-3 text-text disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-gold-brand transition-colors"
                      >
                        <option value="admin">admin</option>
                        <option value="coach">coach</option>
                        <option value="client">client</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {u.banned === true ? <StatusPill status="banned" /> : null}
                    </td>
                    <td className="px-4 py-3 text-text-dim text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {u.lastActive ? (
                        <span className="text-text-dim text-[11px]">
                          {new Date(u.lastActive).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-[11px] text-text-dim italic">
                          Never signed in
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onToggleOpen(u.id)}
                          className="text-[11px] text-text hover:text-gold-brand transition-colors underline-offset-2 hover:underline"
                        >
                          View {totalAssessments} assessment
                          {totalAssessments === 1 ? '' : 's'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onResetPassword({ id: u.id, email: u.email, name: u.name })}
                          className="text-[11px] text-text-dim hover:text-gold-brand transition-colors underline-offset-2 hover:underline"
                        >
                          Reset password
                        </button>
                        {u.role === 'client' && (
                          <button
                            type="button"
                            onClick={() => onAssignCoach({ id: u.id, name: u.name, email: u.email, currentCoachId: u.coachId })}
                            className="text-[11px] text-text-dim hover:text-gold-brand transition-colors underline-offset-2 hover:underline"
                          >
                            {u.coachId ? 'Change coach' : 'Assign coach'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr className="bg-bg-2/50 border-b border-line last:border-0">
                      <td colSpan={7} className="px-4 py-3 text-[11px] text-text-dim">
                        <div className="flex flex-col gap-1">
                          <span>
                            As coach:{' '}
                            <span className="text-text font-medium">
                              {u.coachCount}
                            </span>
                          </span>
                          <span>
                            As client:{' '}
                            <span className="text-text font-medium">
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
            <div key={u.id} className="bg-bg-3 rounded-xl border border-line p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-col">
                  <EditableName value={u.name} onSave={(v) => onRename(u.id, v)} compact />
                  <span className="text-text-dim text-[11px] flex items-center gap-2">
                    {u.email}
                    {u.banned === true ? <StatusPill status="banned" /> : null}
                  </span>
                </div>
                <RolePill role={u.role} />
              </div>
              <div className="flex flex-col gap-2 text-[11px] text-text-dim">
                <div className="flex items-center justify-between">
                  <span>Role</span>
                  <select
                    value={u.role}
                    disabled={isOnlyAdmin}
                    title={tooltip}
                    onChange={(e) =>
                      onRoleChange(u.id, u.name, e.target.value as Role)
                    }
                    className="text-[11px] border border-line rounded-md px-2 py-1 bg-bg-3 text-text disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-gold-brand transition-colors"
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
                <div className="flex flex-wrap gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => onResetPassword({ id: u.id, email: u.email, name: u.name })}
                    className="px-2 py-1 rounded-md border border-line-2 text-[11px] font-medium tracking-[0.02em] text-text hover:border-gold-brand hover:text-gold-brand transition-colors"
                  >
                    Reset password
                  </button>
                  {u.role === 'client' && (
                    <button
                      type="button"
                      onClick={() => onAssignCoach({ id: u.id, name: u.name, email: u.email, currentCoachId: u.coachId })}
                      className="px-2 py-1 rounded-md border border-line-2 text-[11px] font-medium tracking-[0.02em] text-text hover:border-gold-brand hover:text-gold-brand transition-colors"
                    >
                      {u.coachId ? 'Change coach' : 'Assign coach'}
                    </button>
                  )}
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
      <div className="hidden md:block bg-bg-3 rounded-2xl border border-line overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-bg-2 border-b border-line">
            <tr>
              <th className="text-left font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint px-4 py-3">
                Email
              </th>
              <th className="text-left font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint px-4 py-3">
                Name
              </th>
              <th className="text-left font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint px-4 py-3">
                Role
              </th>
              <th className="text-left font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint px-4 py-3">
                Sent
              </th>
              <th className="text-left font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint px-4 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-line last:border-0 hover:bg-bg-2 transition-colors"
              >
                <td className="px-4 py-3 text-text">{inv.email}</td>
                <td className="px-4 py-3 text-text-dim">{inv.name}</td>
                <td className="px-4 py-3 text-text-dim">{inv.role}</td>
                <td className="px-4 py-3 text-text-dim text-[11px]">
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
            className="bg-bg-3 rounded-xl border border-line p-3 text-[13px] flex flex-col gap-1"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-text break-all">{inv.email}</span>
              <StatusPill status="pending" />
            </div>
            <div className="text-[11px] text-text-dim">
              {inv.name} · {inv.role} ·{' '}
              {new Date(inv.createdAt).toLocaleDateString()}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
