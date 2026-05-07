# Phase 7: Multi-tenant Auth UX — Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 12 (7 modify + 5 create)
**Analogs found:** 12 / 12

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `src/lib/auth.ts` (modify) | config | event-driven (callbacks) | self — extend existing `magicLink` template | exact |
| `src/app/api/invitations/route.ts` (modify) | route handler | request-response | `src/app/api/admin/normative/[marker]/route.ts` (auth gating + body validate) | role-match |
| `src/app/api/assessments/route.ts` (modify) | route handler | CRUD (read JOIN) | self — extend role-branched select with leftJoin | exact |
| `src/app/portal/page.tsx` (modify) | page (client) | request-response | self — extend existing `userRole`/role-branch pattern (lines 17-18, 254) | exact |
| `src/components/layout/Sidebar.tsx` (modify) | component (client) | event-driven (session) | self — refactor static `NAV_ITEMS` array to derived | role-match |
| `src/app/login/page.tsx` (modify) | page (client) | request-response | self — re-enable mode toggle on line 13, remove register block 209-294 | exact |
| `src/app/portal/admin/page.tsx` (modify) | page (client) | n/a (static layout) | self — replace placeholder card 130-145 with link card matching ADMIN_SECTIONS shape | exact |
| `src/app/reset-password/page.tsx` (new) | page (client) | request-response | `src/app/login/page.tsx` (glassmorphic shell + form pattern) | exact |
| `src/app/portal/admin/users/page.tsx` (new) | page (client) | CRUD (read + inline mutate) | `src/app/portal/admin/page.tsx` (hero header) + `src/app/portal/clients/[name]/page.tsx` (table-style listing) | role-match |
| `src/app/portal/admin/invitations/page.tsx` (new) | page (client) | CRUD (read + form mutate) | `src/app/portal/page.tsx:254-285` (Invite form) + `src/app/portal/clients/[name]/page.tsx` (listing) | role-match |
| `src/app/portal/assessment/[id]/report/page.tsx` (new) | page (client) | request-response | `src/app/portal/assessment/[id]/section/[num]/page.tsx` (Section 11 branch lines 183-206 — strip auto-save) | role-match |
| `src/app/api/admin/users/[userId]/role/route.ts` (new) | route handler | CRUD (write + audit) | `src/app/api/admin/normative/[marker]/route.ts` (`requireAdmin` + validation + audit log call) | exact |

---

## Pattern Assignments

### `src/lib/auth.ts` (modify — config, callback-driven)

**Analog:** self (lines 54-63 — magic-link `sendMagicLink` template).

**`disableSignUp` config addition** (current lines 15-18 → extend in place):

```typescript
emailAndPassword: {
  enabled: true,
  minPasswordLength: 4,
  disableSignUp: true, // D-01: block public coach signup; existing accounts unaffected (D-04)
  sendResetPassword: async ({ user, url }) => {
    await sendEmailViaSMTP2Go({
      to: user.email,
      subject: 'Reset your Peak360 password',
      html: `<p>Click the link below to set a new password:</p><a href="${url}">Reset password</a><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
    });
  },
},
```

**Template aesthetic to mirror** (lines 54-63 — magic-link inline template):

```typescript
magicLink({
  sendMagicLink: async ({ email, url }) => {
    await sendEmailViaSMTP2Go({
      to: email,
      subject: 'Your Peak360 Login Link',
      html: `<p>Click the link below to sign in to Peak360:</p><a href="${url}">Sign in to Peak360</a><p>This link expires in 5 minutes.</p>`,
    });
  },
  expiresIn: 300,
}),
```

The reset-password email keeps the same one-paragraph + raw `<a>` style — no wrapping `<div>`, no inline button styling, matches the existing magic-link delivery surface.

---

### `src/app/api/invitations/route.ts` (modify — route handler, request-response)

**Analog:** self (current handler) + `src/app/api/admin/normative/[marker]/route.ts` (multi-step validation pattern).

**Existing role-gating pattern** (current lines 9-19 — KEEP, extend):

```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
if (session.user.role === 'client') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**Replace** the current `signUpEmail` + `db.update(role)` (lines 47-58) with `auth.api.createUser` from the admin plugin (per D-02). Add `role` extraction + role-of-caller validation BEFORE existing email validation.

**New role-validation block** (insert after current line 19, before email parsing):

```typescript
const body = await request.json().catch(() => null);
const requestedRole = (body?.role as 'admin' | 'coach' | 'client' | undefined) ?? 'client';

// D-05: admin → any role; coach → 'client' only
if (session.user.role === 'coach' && requestedRole !== 'client') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
if (!['admin', 'coach', 'client'].includes(requestedRole)) {
  return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
}
```

**Atomic create with role** (replaces current lines 47-58 — D-02):

```typescript
await auth.api.createUser({
  body: {
    email,
    password: crypto.randomUUID(),
    name: body?.name?.trim() || email.split('@')[0],
    role: requestedRole,
  },
});
```

---

### `src/app/api/assessments/route.ts` (modify — CRUD read with JOIN)

**Analog:** self (current GET handler — extend select with `leftJoin`).

**Current role-branched select** (lines 14-31 — KEEP structure, extend SELECT shape):

```typescript
if (session.user.role === 'admin') {
  rows = await db.select().from(assessments).orderBy(desc(assessments.updatedAt));
} else if (session.user.role === 'coach') {
  rows = await db
    .select()
    .from(assessments)
    .where(eq(assessments.coachId, session.user.id))
    .orderBy(desc(assessments.updatedAt));
}
```

**Target** (D-14 — JOIN `user` and project `coachName`):

```typescript
import { user } from '@/lib/db/schema';
// ...
rows = await db
  .select({
    // spread all assessments columns explicitly OR alias with leftJoin
    ...assessments,
    coachName: user.name, // null if coachId is NULL (legacy)
  } as any) // typed via Drizzle inference; keep explicit if TS infers narrowly
  .from(assessments)
  .leftJoin(user, eq(assessments.coachId, user.id))
  .orderBy(desc(assessments.updatedAt));
```

Apply identical leftJoin to all three role branches; coach/client dashboards ignore `coachName`. Response shape remains a flat array (per D-14).

---

### `src/app/portal/page.tsx` (modify — page, role-aware grouping)

**Analog:** self (existing `userRole` pattern at lines 17-18, 254).

**Existing role-branch pattern** (lines 254-285 — copy this exact gating shape):

```typescript
const { data: sessionData } = authClient.useSession();
const userRole = sessionData?.user?.role;

// ...

{(userRole === 'coach' || userRole === 'admin') && (
  <div className="bg-white rounded-xl border border-border p-5 mb-6">
    {/* Invite form */}
  </div>
)}
```

**New grouping logic** (D-15 — admin sees coach-grouped sections, coach/client see flat):

```typescript
// Extend Assessment type locally with coachId + coachName from API response
const grouped = useMemo(() => {
  if (userRole !== 'admin') return null;
  const myClients = assessments.filter((a) => a.coachId === sessionData?.user?.id);
  const others = assessments.filter((a) => a.coachId && a.coachId !== sessionData?.user?.id);
  const unassigned = assessments.filter((a) => !a.coachId);
  // group `others` by coachId, label by coachName ?? `Coach ${coachId.slice(-4)}` (D-16)
  const byCoach = new Map<string, { name: string; rows: typeof others }>();
  for (const a of others) {
    const key = a.coachId!;
    const label = a.coachName || `Coach ${key.slice(-4)}`;
    if (!byCoach.has(key)) byCoach.set(key, { name: label, rows: [] });
    byCoach.get(key)!.rows.push(a);
  }
  return { myClients, byCoach: Array.from(byCoach.values()), unassigned };
}, [assessments, userRole, sessionData?.user?.id]);
```

**Empty-state branching** (D-29 — replace lines 354-363 with role-aware copy):

```typescript
{assessments.length === 0 && (
  userRole === 'client' ? (
    <p className="text-sm text-muted">Your coach will set up your first assessment. You'll see it here when it's ready.</p>
  ) : (
    <button onClick={createAssessment} className="text-sm font-medium text-gold hover:text-gold-dark">
      Create your first assessment
    </button>
  )
)}
```

---

### `src/components/layout/Sidebar.tsx` (modify — derive nav from role)

**Analog:** self (current `NAV_ITEMS` constant at lines 8-42; Admin block at lines 119-141).

**Pattern to copy** — keep the per-item `{ label, href, icon, matchPaths }` shape and `isActive` resolver (lines 59-64). Refactor `NAV_ITEMS` from module-scope constant to a derived value inside the component:

```typescript
import { authClient } from '@/lib/auth-client';
// ...
const { data: sessionData } = authClient.useSession();
const role = sessionData?.user?.role;

// D-12: render Dashboard immediately; role-specific items only after session resolves
const navItems = useMemo(() => {
  const items = [DASHBOARD_ITEM]; // always present
  if (!role) return items; // privileged items MUST NOT flash
  if (role === 'client') items.push(MY_ASSESSMENTS_ITEM); // points to /portal per D-13
  if (role === 'coach' || role === 'admin') items.push(ASSESSMENTS_ITEM, CLIENTS_ITEM);
  return items;
}, [role]);
```

**Admin link block** (current lines 119-141 — wrap in role check; the existing JSX is the visual contract for new conditional items):

```typescript
{role === 'admin' && (
  <Link href="/portal/admin" className={`...`}>
    {/* existing icon + label + active dot — UNCHANGED */}
  </Link>
)}
```

Existing `px-3 py-2.5` and active-state classes (lines 97-110) are inherited literally for any new conditional item — no new visual treatment per UI-SPEC Reference Anchors.

---

### `src/app/login/page.tsx` (modify — re-enable toggle, remove register, add CTAs)

**Analog:** self (current dead-coded UI block + the existing `handleMagicLink` handler at lines 88-110).

**Mode toggle** (D-27 — replace line 13):

```typescript
// BEFORE (line 13)
const mode = 'coach' as AuthMode;

// AFTER
const [mode, setMode] = useState<AuthMode>('coach');
```

**Render the segmented toggle** (insert at line ~140 where the comment "Mode toggle hidden" sits):

```tsx
<div className="bg-white/[0.05] rounded-xl p-1 mb-6 flex">
  {(['coach', 'client'] as const).map((m) => (
    <button
      key={m}
      type="button"
      onClick={() => { setMode(m); setError(''); setSuccess(''); }}
      aria-pressed={mode === m}
      className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
        mode === m ? 'bg-white/[0.1] text-white' : 'text-white/40 hover:text-white/70'
      }`}
    >
      {m === 'coach' ? 'Coach / Admin' : 'Client'}
    </button>
  ))}
</div>
```

**Magic-link CTA + Forgot password link** (D-25, D-26 — insert below primary submit button at line 195, inside the coach login form):

```tsx
<div className="mt-3 text-right">
  <button
    type="button"
    onClick={async () => {
      // POST email to better-auth reset-request; on success show same banner as magic-link
      await authClient.forgetPassword({ email, redirectTo: `${window.location.origin}/reset-password` });
      setSuccess('Check your email for a password reset link.');
    }}
    className="text-xs text-white/60 hover:text-gold transition-colors"
  >
    Forgot password?
  </button>
</div>

{/* OR divider */}
<div className="flex items-center gap-3 my-4">
  <span className="flex-1 h-px bg-white/10" />
  <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">OR</span>
  <span className="flex-1 h-px bg-white/10" />
</div>

<button
  type="button"
  onClick={handleMagicLink} // reuse existing handler from lines 88-110
  disabled={loading || !email}
  className="w-full py-3 bg-transparent border border-white/20 text-white rounded-xl font-semibold text-sm hover:border-gold hover:text-gold transition-all disabled:opacity-40"
>
  Email me a sign-in link
</button>
```

**Delete blocks:** lines 197-205 (Create one link), lines 209-294 (`mode === 'coach' && coachView === 'register'` view), `handleCoachRegister` handler (lines 50-86), `coachView` state + related fields (`name`, `confirmPassword`).

---

### `src/app/portal/admin/page.tsx` (modify — replace placeholder)

**Analog:** self (`ADMIN_SECTIONS` array at lines 5-38 — copy this shape for the two new live cards).

**Pattern to copy** — the live `Link` card render at lines 92-127 is the visual contract. Replace the placeholder div at lines 130-145 with TWO entries appended to the `ADMIN_SECTIONS` array:

```typescript
{
  label: 'Users',
  href: '/portal/admin/users',
  description: 'View everyone with portal access. Edit roles, see assigned assessments, and audit activity.',
  stat: 'Roles',
  icon: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
},
{
  label: 'Invitations',
  href: '/portal/admin/invitations',
  description: 'Invite new coaches, admins, or clients. Track which invitations have been accepted.',
  stat: 'Onboarding',
  icon: (/* paper-airplane SVG */),
},
```

Delete the static placeholder div (lines 130-145).

---

### `src/app/reset-password/page.tsx` (NEW — page, request-response)

**Analog:** `src/app/login/page.tsx` — verbatim glassmorphic shell.

**Imports + state pattern** (mirror lines 1-22 of `login/page.tsx`):

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
```

**Submit handler** (mirror `handleCoachLogin` shape at lines 24-48):

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  if (password !== confirm) { setError("Passwords don't match."); return; }
  if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
  if (!token) { setError('Invalid reset link'); return; }
  setLoading(true);
  try {
    const res = await authClient.resetPassword({ newPassword: password, token });
    if (res.error) setError('This reset link has expired. Request a new one from the sign-in page.');
    else {
      setSuccess(true);
      setTimeout(() => router.push('/login'), 1500);
    }
  } catch { setError("We couldn't reach the server. Check your connection and try again."); }
  finally { setLoading(false); }
};
```

**Shell + glass card** (verbatim from `login/page.tsx` lines 112-143, 405-411):

```tsx
<div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br from-[#0f2440] via-[#1a365d] to-[#2d5986]" />
  {/* ... two radial decorative divs verbatim ... */}
  <div className="relative z-10 w-full max-w-sm mx-4">
    {/* Logo + gold accent line — verbatim from login/page.tsx 128-138 */}
    <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
      <h2 className="text-white text-lg font-semibold mb-1 text-center">Set a new password</h2>
      <p className="text-white/40 text-xs text-center mb-6">Choose a strong password to secure your account.</p>
      {/* form with two password inputs — same styling as lines 162-169 */}
    </div>
    <p className="text-center text-white/20 text-[10px] mt-6 tracking-wide">
      Authorised access only. All activity is monitored.
    </p>
  </div>
</div>
```

Input field classes are copied verbatim from `login/page.tsx:151-159` (`bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 ...`). Primary button mirrors lines 181-194 (`bg-[#F5A623] text-[#1a365d] rounded-xl font-semibold ...`). Inline error row mirrors lines 172-179.

**Missing-token early return** (D-24 acceptance: invalid token shows error, not silent fail):

```tsx
if (!token) {
  return (
    /* same shell, but card body shows: */
    <h2>Invalid reset link</h2>
    <p>This link is missing or invalid. Request a new password reset from the sign-in page.</p>
    <Link href="/login">Back to sign in</Link>
  );
}
```

---

### `src/app/portal/admin/users/page.tsx` (NEW — page, list + inline mutate)

**Analogs:**
- Hero header: `src/app/portal/admin/page.tsx` lines 42-82 (verbatim except H1 copy)
- Auth gating: client-side via `authClient.useSession()` (matches `portal/page.tsx:17-18`)
- Listing pattern: `src/app/portal/clients/[name]/page.tsx` lines 188-235 (rows with status pills)

**Hero header** (verbatim shell from admin page, change copy only):

```tsx
<div className="relative overflow-hidden" style={{
  backgroundColor: '#0f2440',
  backgroundImage: `radial-gradient(circle, rgba(245,166,35,0.07) 1px, transparent 1px)`,
  backgroundSize: '28px 28px',
}}>
  <div className="relative px-8 py-14">
    <div className="flex items-center gap-1.5 mb-5">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Peak360</span>
      {/* chevron svg verbatim */}
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold/70">Administration</span>
    </div>
    <h1 className="text-[2.75rem] font-black text-white tracking-tight leading-none mb-3">Users</h1>
    <p className="text-white/40 text-sm max-w-md leading-relaxed">Manage roles for everyone with portal access.</p>
  </div>
  <div className="h-px w-full bg-gradient-to-r from-gold/60 via-gold/20 to-transparent" />
</div>
```

**Data fetch** (mirror `portal/page.tsx` lines 29-37):

```typescript
useEffect(() => {
  fetch('/api/auth/admin/list-users') // Better Auth admin plugin endpoint
    .then((r) => r.json())
    .then((res) => { setUsers(res.users || []); setLoading(false); });
}, []);
```

**Inline role mutation pattern** (mirror invite form at `portal/page.tsx:262-283` for async submit + message state):

```typescript
const handleRoleChange = async (userId: string, newRole: string) => {
  setMessage(null);
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: newRole }),
  });
  const data = await res.json();
  if (res.ok) {
    setUsers((u) => u.map((x) => x.id === userId ? { ...x, role: newRole } : x));
    setToast({ type: 'success', text: `Role updated for ${name}.` });
  } else {
    setToast({ type: 'error', text: data.error || "Couldn't update the role. Try again." });
  }
};
```

**Last-admin guard UI** (D-22 — disable select for the only admin row):

```typescript
const adminCount = users.filter((u) => u.role === 'admin').length;
// in the row render:
<select
  disabled={user.role === 'admin' && adminCount <= 1}
  title={user.role === 'admin' && adminCount <= 1 ? "You can't change the role of the only admin. Promote another user to admin first." : undefined}
  // ...
/>
```

Table row hover/styling mirrors `portal/clients/[name]/page.tsx:199-203` (`hover:shadow-md hover:border-gold/30`).

---

### `src/app/portal/admin/invitations/page.tsx` (NEW — page, form + listing)

**Analogs:**
- Form: `portal/page.tsx:262-283` (Invite form pattern — verbatim styling, add role select)
- Listing: `portal/clients/[name]/page.tsx:188-235` (row card style)
- Hero header: `portal/admin/page.tsx:42-82` (verbatim shell)

**Invite form** (extend the existing pattern at `portal/page.tsx:262-283` with a role selector + name field):

```tsx
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
  <select
    value={role}
    onChange={(e) => setRole(e.target.value as 'admin' | 'coach' | 'client')}
    className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-gold/50"
  >
    <option value="client">Client</option>
    <option value="coach">Coach</option>
    <option value="admin">Admin</option>
  </select>
  <button
    type="submit"
    disabled={loading || !email.trim()}
    className="bg-gold text-navy px-4 py-2 rounded-md font-medium hover:bg-gold/90 text-sm disabled:opacity-40"
  >
    {loading ? 'Sending...' : 'Send invitation'}
  </button>
</form>
```

**Submit handler** (mirror `portal/page.tsx:49-72` shape):

```typescript
const res = await fetch('/api/invitations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, role }),
});
```

**Past invitations data source** (D-08 — derive from `user` table; no new endpoint needed if admin plugin's listUsers exposes joined session info, otherwise add a small `/api/admin/invitations` GET that wraps `db.select().from(user).leftJoin(session)`):

```typescript
useEffect(() => {
  fetch('/api/admin/invitations').then((r) => r.json()).then((res) => setInvites(res.data || []));
}, []);
// each invite row: { id, email, name, role, createdAt, accepted: boolean }
```

**Status pill** (StatusPill component — accepted/pending colors per UI-SPEC):

```tsx
{invite.accepted ? (
  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Accepted</span>
) : (
  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
)}
```

---

### `src/app/portal/assessment/[id]/report/page.tsx` (NEW — read-only report page)

**Analog:** `src/app/portal/assessment/[id]/section/[num]/page.tsx` lines 183-206 (the `num === 11` branch — copy MINUS ProgressBar / NavigationButtons / auto-save).

**Pattern to keep from analog** — Section 11 is reused as-is per D-20:

```tsx
import Section11 from '@/components/sections/Section11';
// ...
<main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
  <Section11 assessmentId={id} />
</main>
```

**Pattern to OMIT from analog** — DO NOT bring in:
- `useAssessmentStore` import (line 7) — no auto-save subscription (D-17)
- `ProgressBar` component (line 5)
- `NavigationButtons` component (line 6)
- `saveSection` callback (lines 73-100)
- The `useEffect` auto-save loop (lines 103-110)
- The `beforeunload` sendBeacon (lines 113-127)

**New minimal header** (D-17 — date + Download PDF button):

```tsx
const [assessment, setAssessment] = useState<Assessment | null>(null);
useEffect(() => {
  fetch(`/api/assessments/${id}`).then((r) => r.json()).then((res) => setAssessment(res.data));
}, [id]);

return (
  <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-lg font-semibold text-navy">
        Assessment · {assessment?.assessmentDate || '—'}
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
```

The PDF endpoint at `src/app/api/assessments/[id]/pdf/route.ts:11-20` already enforces ownership via `hasAccess(role, userId, row)` — no extra guard needed on the client side.

**Server-side redirect guard** (D-19 — add to `src/app/portal/assessment/[id]/section/[num]/page.tsx`):

The current section page is a Client Component (`'use client'` line 1). To enforce server redirect, EITHER convert wrapper to a Server Component that reads session and redirects, OR add a client-side redirect inside the existing `useEffect` at lines 50-70:

```typescript
const { data: sessionData } = authClient.useSession();
useEffect(() => {
  if (sessionData?.user?.role === 'client') {
    router.replace(`/portal/assessment/${id}/report`);
    return;
  }
  // ... existing fetch
}, [id, num, sessionData?.user?.role]);
```

---

### `src/app/api/admin/users/[userId]/role/route.ts` (NEW — admin route)

**Analog:** `src/app/api/admin/normative/[marker]/route.ts` (auth gating + body validation + audit-style write).

**Imports + auth gate** (verbatim from analog lines 1-7, 91-96):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const { userId } = await params;
  const body = await request.json().catch(() => null);
  const newRole = body?.role as 'admin' | 'coach' | 'client' | undefined;
  if (!newRole || !['admin', 'coach', 'client'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
```

**Last-admin guard** (D-21 step 2):

```typescript
  const [target] = await db.select().from(user).where(eq(user.id, userId));
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const oldRole = target.role;
  if (oldRole === 'admin' && newRole !== 'admin') {
    const adminCount = await db.select().from(user).where(eq(user.role, 'admin'));
    if (adminCount.length <= 1) {
      return NextResponse.json(
        { error: 'Cannot change the role of the only admin. Promote another user to admin first.' },
        { status: 400 }
      );
    }
  }
```

**Persist via admin plugin + audit log** (D-21 steps 3, 4):

```typescript
  await auth.api.setRole({
    body: { userId, role: newRole },
    headers: await headers(),
  });

  const ctx = await getRequestContext();
  await logAuditEvent({
    userId: session.user.id,
    action: 'user.manage', // existing AuditAction enum value covers this
    resourceType: 'user',
    resourceId: userId,
    metadata: { from: oldRole, to: newRole, action: 'role.changed' },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return NextResponse.json({ success: true });
}
```

Note: the existing `AuditAction` union in `src/lib/audit.ts:6-12` does not include `'user.role.changed'`. Either extend the union (preferred — minimal diff) or use the existing `'user.manage'` action with a `metadata.action: 'role.changed'` discriminator. The plan should pick one explicitly.

---

## Shared Patterns

### Auth gating (server)

**Source:** `src/lib/auth-helpers.ts:35-58` (`requireSession`, `requireAdmin`)
**Apply to:** All new and modified API routes

```typescript
const [session, errorRes] = await requireAdmin(); // or requireSession()
if (errorRes) return errorRes;
// session.user.{id, email, name, role} is now typed and guaranteed non-null
```

**Key point:** Tuple-destructuring pattern is the project standard — don't introduce alternatives. `requireAdmin` returns 401 for unauthed and 403 for non-admin roles.

---

### Auth gating (client / role-aware UI)

**Source:** `src/app/portal/page.tsx:17-18, 254`
**Apply to:** Sidebar.tsx, portal/page.tsx, portal/admin/users/page.tsx, portal/admin/invitations/page.tsx, reset-password/page.tsx

```typescript
const { data: sessionData } = authClient.useSession();
const userRole = sessionData?.user?.role;

// later:
{(userRole === 'coach' || userRole === 'admin') && <RestrictedComponent />}
```

**D-12 nuance:** When `sessionData` is undefined (still loading), privileged UI MUST NOT render — guard with strict equality (`userRole === 'admin'`), never with `userRole !== 'client'`.

---

### Audit logging

**Source:** `src/lib/audit.ts:14-39` (`logAuditEvent`) + `src/lib/audit.ts:45-54` (`getRequestContext`)
**Apply to:** `src/app/api/admin/users/[userId]/role/route.ts`

```typescript
import { logAuditEvent, getRequestContext } from '@/lib/audit';

const ctx = await getRequestContext();
await logAuditEvent({
  userId: session.user.id,
  action: 'user.manage',
  resourceType: 'user',
  resourceId: targetUserId,
  metadata: { from: oldRole, to: newRole },
  ipAddress: ctx.ipAddress,
  userAgent: ctx.userAgent,
});
```

The helper is fire-and-forget (`try/catch` swallows errors per line 35-38) — never gate the main op on log success.

---

### API response shape

**Source:** All existing API routes (`src/app/api/admin/normative/[marker]/route.ts`, `src/app/api/invitations/route.ts`, `src/app/api/assessments/route.ts`)
**Apply to:** `src/app/api/admin/users/[userId]/role/route.ts`, `src/app/api/invitations/route.ts` (modified)

```typescript
// Success
return NextResponse.json({ success: true, data: { ... } }, { status: 201 });
// Error
return NextResponse.json({ error: 'Reason' }, { status: 400 });
// Conflict / state collision
return NextResponse.json({ success: false, error: '...' }, { status: 409 });
```

The `success: true` flag is consistent across the codebase; clients call `.ok` on the Response and read `data` (`portal/page.tsx:60-62`).

---

### Email template aesthetic

**Source:** `src/lib/auth.ts:54-63` (magic-link inline template)
**Apply to:** `src/lib/auth.ts` (new `sendResetPassword` template)

Minimal HTML — paragraph + raw `<a>` + expiry note. Don't introduce a templating library. SMTP2Go env-var fallback at `src/lib/email/send.ts:10-16` keeps dev mode working (logs the URL to console when no API key).

---

### Glassmorphic unauthed shell

**Source:** `src/app/login/page.tsx:113-143, 405-411`
**Apply to:** `src/app/reset-password/page.tsx`

The shell is hand-rolled — gradient background + two radial decorative divs + max-w-sm centered card. Copy verbatim. No need to extract a `GlassCard` component for two surfaces (UI-SPEC notes the option as Claude's discretion; the executor can decide based on actual duplication count).

---

### Recharts trends pattern (client dashboard)

**Source:** `src/app/portal/clients/[name]/TrendsTab.tsx:70-199` (`MetricChart` component)
**Apply to:** `src/app/portal/page.tsx` (client dashboard trends block — D-28)

The existing `MetricChart` is already a reusable unit. Two options per UI-SPEC:
1. **Extract** `MetricChart` to `src/components/charts/MetricChart.tsx` and import in both surfaces.
2. **Duplicate** the JSX block on the client dashboard with client-scoped data assembly.

The data assembly pattern at `src/app/portal/clients/[name]/page.tsx:43-110` (fetch all assessments → filter by client → fetch each section in parallel → build `MarkerTimeline`) is the source of truth for the timeline shape `client/page.tsx` consumes.

For the client dashboard (D-28), simplify: the API already returns only the client's assessments (per role scoping in `assessments/route.ts:24-30`), so step "filter by client" is unnecessary.

**Empty-state copy** (UI-SPEC trends section):

```tsx
{timelines.length < 2 && (
  <p className="text-sm text-muted">Complete more assessments to see trends over time.</p>
)}
```

---

## No Analog Found

None. Every new file has a strong analog in the existing codebase.

---

## Metadata

**Analog search scope:** `src/app/login/`, `src/app/portal/**`, `src/app/api/**`, `src/components/layout/`, `src/components/sections/`, `src/lib/`
**Files scanned:** 20+ (focused reads of 14 files)
**Pattern extraction date:** 2026-05-07
