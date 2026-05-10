---
quick_id: 260510-osn
type: summary
status: complete
plan: 260510-osn-PLAN.md
files_changed:
  - src/app/api/admin/users/route.ts
  - src/app/portal/admin/users/page.tsx
  - src/app/portal/admin/invitations/page.tsx
  - src/app/portal/admin/page.tsx
commits:
  - 16812eb feat(260510-osn): add coachId + coachName to GET /api/admin/users
  - 36c6ba8 feat(260510-osn): rebuild /portal/admin/users as grouped People page
  - 2d980ad feat(260510-osn): redirect /portal/admin/invitations + merge admin home cards
---

# Quick 260510-osn — Merge Admin Invitations + Users into one People page

## One-liner

Unified `/portal/admin/invitations` and `/portal/admin/users` into a single grouped People page (admins, per-coach client groups, unassigned, coaches-without-clients, pending invitations) with an inline invite form anchored at `#invite`.

## Files changed (4)

| File | Change |
|------|--------|
| `src/app/api/admin/users/route.ts` | **Additive only.** Added `coachId: string \| null` and `coachName: string \| null` to every row in the GET response. Populated only when `role === 'client'`. |
| `src/app/portal/admin/users/page.tsx` | Full rewrite. New grouped People layout, inline `#invite` form, refresh-both-datasets on invite success. Reuses `RolePill`, `StatusPill`, `Toast`. |
| `src/app/portal/admin/invitations/page.tsx` | Replaced with a server-component `redirect('/portal/admin/users#invite')`. |
| `src/app/portal/admin/page.tsx` | Replaced separate **Users** + **Invitations** cards with a single **People** card linking to `/portal/admin/users`. |

## API change — additive

`GET /api/admin/users` response now includes two new keys per row:

```ts
coachId:   string | null;  // coachId of client's MOST RECENT assessment, else null
coachName: string | null;  // display name of that coach, else null
```

Source: correlated subquery against `assessments` (ordered by `created_at DESC LIMIT 1`), then a nested correlated subquery against `user` to resolve the name. Defensive post-process forces both fields to `null` for non-client rows so admins/coaches never accidentally surface a coach pointer. All previous fields (`banned`, `lastActive`, `coachCount`, `clientCount`, etc.) are unchanged.

Both correlated-subquery forms work on Postgres and SQLite, matching the project's dual-driver setup.

## Coach-grouping rule

Each client's coach = `coachId` of their **most recent** assessment (`ORDER BY assessments.created_at DESC LIMIT 1`). Clients with no assessments — or only assessments where `coachId IS NULL` — fall into the **Unassigned clients** group.

## Render order on the People page

1. **Admins** — alphabetical
2. **Per-coach groups** (`{coach.name}'s clients`) — coaches who have ≥1 assigned client, alphabetical by coach name
3. **Unassigned clients** — clients where `coachId === null` (omitted if empty)
4. **Coaches without clients** — coaches with zero assigned clients (omitted if empty)
5. **Pending invitations** — `accepted === false` from `GET /api/admin/invitations`

Above all groups: a `<section id="invite">` with the invite form. Submitting `POST /api/invitations` triggers `Promise.all([refresh /api/admin/users, refresh /api/admin/invitations])` so the new pending row appears in-place without navigation.

## Preserved behaviour

- Last-admin guard: server is still source of truth; client-side select disables when `adminCount <= 1` and shows the existing tooltip. 409 race detection preserved.
- Banned status: `<StatusPill status="banned" />` shown inline per row.
- Magic-link delivery: invite form posts to existing `POST /api/invitations` (unchanged).
- RBAC: admin can invite any role; coach-only-invites-client gate stays server-side.
- Audit logging: untouched (lives in role-change route).
- Sidebar: untouched (no nav item points at either old route).

## Old URL behaviour

`/portal/admin/invitations` now serves a Next.js `redirect()` (HTTP 307) to `/portal/admin/users#invite`. Browsers preserve URL fragments client-side, so the page lands with the invite form scrolled into view (`scroll-mt-24` keeps it clear of the hero header).

## Styling

Frontend-design vibe applied to each group section:

```tsx
<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">{eyebrow}</p>
<h2 className="text-xl font-semibold text-navy mt-1">{title}</h2>
```

Hero header re-uses the existing navy `#0f2440` + radial-gold-dot pattern with the gold gradient accent line. Mobile responsive split (`md:hidden` cards / `hidden md:block` table) preserved per group.

## Verification

- `npm run build` — passes (TypeScript clean, all routes compile).
- `npx eslint` on the four touched files — clean (no output).
- Inline sub-components (`GroupSection`, `UserTable`, `InviteTable`, `SkeletonTable`, `EmptyRow`) all live in the same `users/page.tsx` to avoid copy-pasting the table six times — no new files added.
- No new dependencies; no schema changes.

## Self-Check: PASSED

- `src/app/api/admin/users/route.ts` — exists, returns `coachId` + `coachName`
- `src/app/portal/admin/users/page.tsx` — exists, 653-line People page
- `src/app/portal/admin/invitations/page.tsx` — exists, server redirect only
- `src/app/portal/admin/page.tsx` — exists, single People card
- Commits 16812eb, 36c6ba8, 2d980ad all present in `git log`
