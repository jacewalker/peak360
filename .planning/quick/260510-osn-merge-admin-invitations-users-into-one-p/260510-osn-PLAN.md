---
quick_id: 260510-osn
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/admin/users/route.ts
  - src/app/portal/admin/users/page.tsx
  - src/app/portal/admin/invitations/page.tsx
  - src/app/portal/admin/page.tsx
autonomous: true
must_haves:
  truths:
    - "Admin visits /portal/admin/users and sees one People page with all platform humans grouped by relationship"
    - "Admins are listed in their own group at the top of the page"
    - "Each coach with at least one client gets a section titled \"{Coach Name}'s clients\" listing those clients"
    - "Clients with no coach assignment appear in an \"Unassigned\" group"
    - "Pending invitations (users with no session yet) are shown in their own group with status pending"
    - "Admin can send a new invitation from an inline form anchored at #invite on the same page"
    - "Visiting the old /portal/admin/invitations URL lands the admin on /portal/admin/users with the invite form in view"
    - "The /portal/admin card grid shows a single \"People\" tile (no separate Users + Invitations tiles)"
    - "Existing role-change select and last-admin guard continue to work inline per row"
  artifacts:
    - path: src/app/api/admin/users/route.ts
      provides: "GET returns coachId + coachName for client-role users (most-recent assessment's coach)"
      contains: "coachId"
    - path: src/app/portal/admin/users/page.tsx
      provides: "Grouped People page (admins, per-coach, unassigned, pending invitations) + inline invite form"
      min_lines: 350
    - path: src/app/portal/admin/invitations/page.tsx
      provides: "Server redirect to /portal/admin/users#invite"
      contains: "redirect"
    - path: src/app/portal/admin/page.tsx
      provides: "Admin card grid with single \"People\" tile"
      contains: "People"
  key_links:
    - from: src/app/portal/admin/users/page.tsx
      to: /api/admin/users
      via: "fetch on mount"
      pattern: "fetch\\(['\"]/api/admin/users"
    - from: src/app/portal/admin/users/page.tsx
      to: /api/admin/invitations
      via: "fetch on mount (parallel) — sources pending-invite group"
      pattern: "fetch\\(['\"]/api/admin/invitations"
    - from: src/app/portal/admin/users/page.tsx
      to: /api/invitations
      via: "POST from inline invite form"
      pattern: "fetch\\(['\"]/api/invitations"
    - from: src/app/api/admin/users/route.ts
      to: assessments.coachId
      via: "subquery — most-recent coachId per client user"
      pattern: "assessments\\.coachId"
---

<objective>
Merge `/portal/admin/invitations` into `/portal/admin/users` as a single combined People-management page grouped by coach relationship.

Purpose: One screen for everything coach/admin/client related — admins see who's on the platform, who they're working with, and pending invitations all in one place. Eliminates context-switching between two admin pages.

Output: A grouped People page at `/portal/admin/users` (Admins → per-coach client groups → Unassigned → Pending invitations) with an inline invite form at `#invite`. The old `/portal/admin/invitations` URL becomes a server redirect to preserve any saved bookmarks.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@.planning/phases/07-multi-tenant-auth-ux/07-06-SUMMARY.md
@.planning/phases/07-multi-tenant-auth-ux/07-07-SUMMARY.md

<interfaces>
<!-- Key contracts the executor needs. Extracted from codebase to avoid scavenger hunts. -->

From `src/lib/db/schema.ts` (relevant tables):
```typescript
// Coach assignment for a CLIENT user lives on the assessment row, NOT on `user`.
// There is NO coachId column on `user`. Source of truth for "client X belongs
// to coach Y" = assessments.coachId where assessments.clientId = X.
// A client may have multiple assessments; this plan defines the canonical
// coach as the coachId of the client's MOST RECENT assessment (by createdAt).

assessments: {
  id, clientId, coachId, // both nullable for legacy rows
  clientName, clientEmail, /* ...  */
  createdAt, updatedAt,
}

user: {
  id, name, email, role: 'admin'|'coach'|'client',
  banned, banReason, banExpires, createdAt, updatedAt,
  // NO coachId column.
}

session: {
  id, userId, createdAt, /* ... */
}
```

From `src/app/api/admin/users/route.ts` (current response — DO NOT BREAK):
```typescript
// GET /api/admin/users
// { success: true, data: Array<{
//   id, email, name, role, banned, banReason, banExpires,
//   createdAt, lastActive, coachCount, clientCount
// }> }
```

From `src/app/api/admin/invitations/route.ts` (current response — UNCHANGED):
```typescript
// GET /api/admin/invitations
// { success: true, data: Array<{
//   id, email, name, role, createdAt, accepted: boolean
// }> }
// `accepted = false` ↔ "pending invitation" (user has no session row yet).
```

From `src/app/api/invitations/route.ts` (POST — UNCHANGED):
```typescript
// POST /api/invitations  body: { email, name?, role: 'admin'|'coach'|'client' }
// Admin can invite any role; coach can invite client only (server-enforced).
```

From `src/components/ui/StatusPill.tsx`:
```typescript
type StatusPillProps = { status: 'accepted' | 'pending' | 'banned' };
```

From `src/components/ui/RolePill.tsx`:
```typescript
type RolePillProps = { role: 'admin' | 'coach' | 'client' };
```
</interfaces>

<design-tokens>
<!-- Match existing /portal/admin and /portal/admin/users styling -->
- Hero header: `backgroundColor: '#0f2440'` + radial-gradient dot pattern, `font-semibold` heading per UI-SPEC 2-weight contract
- Gold accent line below hero: `bg-gradient-to-r from-gold/60 via-gold/20 to-transparent`
- Group section header: `text-[11px] font-bold uppercase tracking-[0.15em] text-muted` (mono eyebrow)
- Group container: `bg-surface rounded-2xl border border-border` + table inside (desktop) / card list (mobile)
- Active admin highlight: `bg-navy/5` row tint optional (not required)
</design-tokens>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend GET /api/admin/users to include each client's assigned coach</name>
  <files>src/app/api/admin/users/route.ts</files>
  <action>
    Add two fields to every row in the response — `coachId: string | null` and `coachName: string | null`. They are populated ONLY for users where `role === 'client'`; admins and coaches always get `null` for both.

    Implementation:
    1. Add a correlated subquery using the existing `sql` template, equivalent to:
       ```
       SELECT a.coach_id
       FROM assessments a
       WHERE a.client_id = user.id AND a.coach_id IS NOT NULL
       ORDER BY a.created_at DESC
       LIMIT 1
       ```
       Alias as `coach_id` and select into `coachId`.
    2. Resolve the coach's display name with a second subquery joining `user` on `coach_id`:
       ```
       SELECT u2.name FROM user u2 WHERE u2.id = (subquery above)
       ```
       Alias as `coach_name` and select into `coachName`.
       Either inline the join via `sql` or do a single `LEFT JOIN LATERAL`-equivalent — Postgres supports `LEFT JOIN LATERAL` directly; SQLite path uses two correlated subqueries. Pick the form that works with the project's Drizzle setup (this codebase runs both pg and better-sqlite3 selected via `DATABASE_URL`). Both correlated-subquery forms work on SQLite and Postgres, so default to that.
    3. After mapping, post-process: if `role !== 'client'`, force `coachId = null` and `coachName = null` (defensive — prevents leaking accidental data for coach/admin rows).
    4. Existing fields (`banned`, `lastActive`, `coachCount`, `clientCount`, etc.) are unchanged.
    5. Update the doc-comment at the top of the file to list the two new fields.

    Do NOT change the `requireAdmin` gate, ordering, or any other field. Additive only.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -20</automated>
    Manual sanity (optional, dev): `curl -s http://localhost:3000/api/admin/users -H "Cookie: $ADMIN_COOKIE" | jq '.data[0] | keys'` shows `coachId` and `coachName` keys.
  </verify>
  <done>
    `GET /api/admin/users` response now contains `coachId` and `coachName` on every row (null for non-clients, populated from most-recent assessment for clients with at least one assessment that has a coachId). All existing fields preserved. Build passes typecheck.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Rebuild /portal/admin/users as a grouped People page with inline invite form</name>
  <files>src/app/portal/admin/users/page.tsx</files>
  <behavior>
    - Page fetches BOTH `/api/admin/users` and `/api/admin/invitations` in parallel on mount.
    - Renders five vertically-stacked groups in this order:
        1. **Admins** — all `role === 'admin'` users (always-open group; no collapse)
        2. **Per-coach groups** — for each coach who has ≥1 client assigned, a section titled `{coach.name}'s clients` listing those clients. Coach order: alphabetical by coach name.
        3. **Unassigned clients** — clients with `coachId === null` (from extended API in Task 1)
        4. **Coaches without clients** — coaches with zero assigned clients (so they're still visible/manageable)
        5. **Pending invitations** — invitation rows where `accepted === false`
    - A "Send invitation" form sits ABOVE the groups, anchored as `<section id="invite">`. The form posts to `POST /api/invitations` with `{email, name?, role}` and shows success/error feedback (existing pattern).
    - On successful invite POST, refresh BOTH datasets (users + invitations) so the new pending row appears immediately.
    - Inline role-change select on every user row remains; last-admin guard preserved (cannot demote the only admin). Server is still source of truth.
    - Keep the existing desktop-table / mobile-card responsive split (`md:hidden` cards, `hidden md:block` table).
    - Hero header: change h1 from "Users" to "People". Breadcrumb "Users" → "People". Subtitle: "Manage everyone with portal access — admins, coaches, clients, and pending invitations."
  </behavior>
  <action>
    Replace the existing `Users` page entirely with a `People` page implementation.

    1. Imports: keep `RolePill`, `StatusPill`, `Toast`, `authClient`. Keep the existing `Role` and `AdminUserRow` types but extend `AdminUserRow` with two optional fields:
       ```ts
       coachId: string | null;
       coachName: string | null;
       ```
       Add an `Invitation` type identical to the one currently in `src/app/portal/admin/invitations/page.tsx` (id, email, name, role, createdAt, accepted).

    2. State: `users: AdminUserRow[]`, `invites: Invitation[]`, `listLoading: boolean`, plus invite-form state (`email`, `name`, `role`, `inviteLoading`, `inviteMessage`). Reuse the existing `toast` state.

    3. Data fetch: a single `refresh()` callback that does `Promise.all([fetch('/api/admin/users'), fetch('/api/admin/invitations')])`, parses both, and updates state. Call it on `userRole === 'admin'` mount and after a successful invite.

    4. Grouping (pure function, derive from `users` + `invites` via `useMemo`):
       ```
       const admins = users.filter(u => u.role === 'admin')
       const coachesAll = users.filter(u => u.role === 'coach')
       const clients = users.filter(u => u.role === 'client')

       // Map of coachId → client[]
       const clientsByCoach = new Map<string, AdminUserRow[]>()
       for (const c of clients) {
         if (c.coachId) {
           if (!clientsByCoach.has(c.coachId)) clientsByCoach.set(c.coachId, [])
           clientsByCoach.get(c.coachId)!.push(c)
         }
       }

       // Coaches who have clients — ordered alphabetically by name
       const coachesWithClients = coachesAll
         .filter(c => clientsByCoach.has(c.id))
         .sort((a, b) => a.name.localeCompare(b.name))

       const unassignedClients = clients.filter(c => !c.coachId)
       const coachesWithoutClients = coachesAll
         .filter(c => !clientsByCoach.has(c.id))
         .sort((a, b) => a.name.localeCompare(b.name))

       const pendingInvites = invites.filter(i => !i.accepted)
       ```

    5. Render order in the body:
       - `<section id="invite">` — invite form (port from `src/app/portal/admin/invitations/page.tsx` lines 153–198, adapt styling to match this page's `bg-surface rounded-2xl border border-border` containers; preserve the role select with admin/coach/client options)
       - Group: **Admins** (table of `admins`)
       - For each coach in `coachesWithClients`: a group titled `{coach.name}'s clients` with its clients in a table. The coach themselves is rendered as the section header line (showing the coach's email and role pill), and below them sits the table of clients.
       - Group: **Unassigned clients** (only render if `unassignedClients.length > 0`)
       - Group: **Coaches without clients** (only render if `coachesWithoutClients.length > 0`)
       - Group: **Pending invitations** — table with columns Email / Name / Role / Sent / Status (StatusPill `pending`). Empty-state copy if zero.

    6. Each user-row table is the same as today (Name + RolePill, Email, Role select, Status pill if banned, Joined, Last active, "View N assessments" expand). Extract a small inline `<UserTable users={...} />` sub-component INSIDE the same file (no separate file) to avoid copy-pasting the table six times. Mobile card variant likewise.

    7. Group section component (also inline in this file):
       ```tsx
       function GroupSection({
         eyebrow, title, count, children,
       }: { eyebrow: string; title?: string; count: number; children: React.ReactNode }) {
         return (
           <section className="space-y-3">
             <div className="flex items-baseline justify-between">
               <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">{eyebrow}</p>
               <span className="text-xs text-muted">{count} {count === 1 ? 'person' : 'people'}</span>
             </div>
             {title ? <h2 className="text-base font-semibold text-navy">{title}</h2> : null}
             {children}
           </section>
         );
       }
       ```

    8. Hero header: copy the existing hero markup; change "Users" → "People" in three places (breadcrumb tail, h1, optional subtitle). Keep `font-semibold`, navy bg, gold accent line.

    9. Page body wrapper: `<div className="px-8 py-10 max-w-6xl space-y-10">` so groups have generous spacing.

    10. Preserve `handleRoleChange` exactly as it is today (including the 409 race detection and `void refreshList()` — but call the new combined `refresh()` instead of the old `refreshList`).

    11. On invite success: call `refresh()` (not just refreshList) so the new pending row appears under "Pending invitations" without the user navigating elsewhere.

    12. Loading state: while `listLoading` is true, show the existing skeleton rows inside the Admins group only; other groups can show "Loading…" muted text or be hidden until data arrives.

    13. Keep the client-side admin gate (the `useEffect` redirecting non-admins to `/portal`) unchanged.

    14. Self-imposed constraints:
        - Do NOT add new dependencies.
        - Do NOT modify any API route in this task.
        - Do NOT touch StatusPill or RolePill.
        - Mobile card layout must match the existing pattern (one card per user); group eyebrows render above each card stack.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -20</automated>
    Manual smoke:
    1. `npm run dev`, sign in as admin, visit `/portal/admin/users` — see "People" hero, Admins group, per-coach groups (if any clients have assessments), Unassigned clients, Pending invitations.
    2. `/portal/admin/users#invite` scrolls to the invite form. Submit a new invite → toast shows success → new row appears under "Pending invitations" without page reload.
    3. Change a user's role via the inline select → toast confirms; the only-admin lock still applies.
    4. Visit on mobile (`Cmd+Shift+M`) — cards stack, eyebrows readable.
  </verify>
  <done>
    Single People page at `/portal/admin/users` shows admins, per-coach client groups, unassigned clients, coaches-without-clients, and pending invitations in that order. Inline invite form at `#invite` posts to `/api/invitations` and refreshes both datasets on success. Existing role-change inline behavior preserved. Build passes.
  </done>
</task>

<task type="auto">
  <name>Task 3: Redirect old /portal/admin/invitations and merge admin card grid</name>
  <files>src/app/portal/admin/invitations/page.tsx, src/app/portal/admin/page.tsx</files>
  <action>
    A) Replace `src/app/portal/admin/invitations/page.tsx` with a server-side redirect to `/portal/admin/users#invite`. Use the App Router's `redirect()` from `next/navigation` in a server component:

    ```tsx
    import { redirect } from 'next/navigation';

    export default function AdminInvitationsRedirect() {
      redirect('/portal/admin/users#invite');
    }
    ```

    Note: Next.js's `redirect()` issues a 307 server response — the URL fragment (`#invite`) is preserved by the browser since fragments are client-only. This is the simplest correct implementation; no middleware change needed. Remove `'use client'` and all the old imports/state/JSX from this file (full rewrite).

    B) Update `src/app/portal/admin/page.tsx` to merge the two cards:
    - Remove the standalone `Invitations` entry from `ADMIN_SECTIONS` (currently lines ~54–69).
    - Update the existing `Users` entry:
      - `label: 'Users'` → `label: 'People'`
      - `description: 'View everyone with portal access. Edit roles, see assigned assessments, and audit activity.'` → `description: 'Admins, coaches, clients, and pending invitations — all in one place. Send invites and manage roles.'`
      - `stat: 'Roles'` → `stat: 'People'` (or keep `'Roles'` if you prefer — single token only)
      - `href: '/portal/admin/users'` (unchanged)
    - Leave all other cards (Normative Ranges, Audit Logs, Coming Soon placeholders) untouched.

    Do NOT modify `src/components/layout/Sidebar.tsx` — the sidebar does not link directly to either `/portal/admin/users` or `/portal/admin/invitations` (admins reach these via the `/portal/admin` card grid). Confirmed by reading the sidebar file (no nav item points there).
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -20</automated>
    Manual smoke:
    1. Visit `/portal/admin/invitations` → browser lands on `/portal/admin/users#invite` with the invite form scrolled into view.
    2. Visit `/portal/admin` → see a single "People" card (no separate Invitations card). Click it → lands on `/portal/admin/users`.
  </verify>
  <done>
    `/portal/admin/invitations` server-redirects to `/portal/admin/users#invite`. `/portal/admin` card grid shows one "People" tile instead of two separate Users + Invitations tiles. Build passes.
  </done>
</task>

</tasks>

<verification>
End-to-end manual flow as admin:
1. `/portal/admin` shows ONE People card (not two).
2. Click People → `/portal/admin/users` renders with hero "People".
3. Inline invite form at `#invite` works — submits, success toast, new row in Pending invitations.
4. Groups render in the documented order: Admins → per-coach → Unassigned clients → Coaches without clients → Pending invitations.
5. Role-change select per row still works; only-admin lock still active.
6. Visiting `/portal/admin/invitations` redirects to `/portal/admin/users#invite`.
7. `npm run build` passes (typecheck + lint clean).
</verification>

<success_criteria>
- One unified People page at `/portal/admin/users` showing admins, per-coach groups, unassigned clients, coaches-without-clients, pending invitations
- Inline invite form at `#invite` posting to `POST /api/invitations`
- `GET /api/admin/users` returns additive `coachId` + `coachName` fields (null for non-clients)
- `/portal/admin/invitations` 307-redirects to `/portal/admin/users#invite`
- `/portal/admin` admin card grid shows a single "People" tile
- No changes to `GET /api/admin/invitations` or `POST /api/invitations` endpoints
- No changes to Sidebar.tsx
- Last-admin guard, role-pill colors, and audit logging unchanged
- `npm run build` passes
</success_criteria>

<output>
After completion, create `.planning/quick/260510-osn-merge-admin-invitations-users-into-one-p/260510-osn-SUMMARY.md` documenting:
- Files changed (4)
- API change: additive `coachId` + `coachName` fields in `GET /api/admin/users`
- Coach-grouping rule: client's coach = `coachId` of their most recent assessment
- Old `/portal/admin/invitations` URL preserved as redirect
</output>
