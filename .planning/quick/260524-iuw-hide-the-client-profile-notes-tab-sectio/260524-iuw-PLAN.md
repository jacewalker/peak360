---
phase: quick-260524-iuw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/portal/clients/[name]/page.tsx
autonomous: true
requirements:
  - IUW-01  # Notes tab/section visible only to coach/admin, never to client-role users
must_haves:
  truths:
    - "The Notes tab button on /portal/clients/[name] renders only when the signed-in user's role is coach or admin"
    - "A client-role user (or while role is still loading/undefined) never sees the Notes tab or its content"
    - "The notes fetch does not fire for non-coach/admin users"
    - "Coach and admin behaviour is unchanged — they still see and use Notes"
  artifacts:
    - path: "src/app/portal/clients/[name]/page.tsx"
      provides: "Role-gated Notes tab"
      contains: "useSession"
  key_links:
    - from: "src/app/portal/clients/[name]/page.tsx"
      to: "authClient.useSession"
      via: "derive role, gate Notes tab + content + fetch"
      pattern: "useSession"
---

# Quick 260524-iuw — Role-gate the client-profile Notes tab

## Why

The `/api/client-notes` route already returns 403 for `role === 'client'` (data
is protected server-side). But the client detail page `/portal/clients/[name]`
renders the **Notes** tab for everyone, so a client who reaches the page by URL
would still *see* the Notes section (empty + an add form that 403s). The user
wants Notes to be completely non-client-facing — coaches/admins only.

## Current structure (for reference)

`src/app/portal/clients/[name]/page.tsx` ('use client'):
- `const [tab, setTab] = useState<'assessments' | 'trends' | 'notes'>('assessments');` (~L61)
- Notes tab button ~L275 (`onClick={() => setTab('notes')}`)
- Lazy-load effect ~L158 (`if (tab !== 'notes' || notesLoaded) return; ... fetch('/api/client-notes?...')`)
- Notes content ~L357 (`{tab === 'notes' && (...)}`)
- The page does NOT currently import `authClient` / use the session.

The established role pattern (see `src/components/layout/Sidebar.tsx` and
`src/app/portal/clients/page.tsx`): `authClient.useSession()` → `sessionData?.user?.role`,
with **strict equality** so the loading state (`role === undefined`) does NOT
render privileged UI (D-12 — "MUST NOT flash for non-admins").

## Task 1 — Gate the Notes tab on coach/admin role

**File:** `src/app/portal/clients/[name]/page.tsx`

**Action:**
1. Add `import { authClient } from '@/lib/auth-client';`.
2. Inside the component: `const { data: sessionData } = authClient.useSession();`
   and `const canViewNotes = sessionData?.user?.role === 'coach' || sessionData?.user?.role === 'admin';`
   (strict — undefined/'client' → false, so nothing flashes while the session resolves).
3. Notes tab **button** (~L275): render only when `canViewNotes` (wrap the button in `{canViewNotes && ( ... )}`).
4. Notes tab **content** (~L357): change the guard to `{tab === 'notes' && canViewNotes && ( ... )}` (defensive — even if `tab` were somehow 'notes').
5. Lazy-load **effect** (~L158): bail early when `!canViewNotes` (e.g. `if (!canViewNotes || tab !== 'notes' || notesLoaded) return;`) so the `/api/client-notes` GET never fires for non-coach/admin. Add `canViewNotes` to the effect's dependency array (keep it lint-clean — no setState-in-render).
6. Leave the Assessments and Trends tabs untouched. Do not change the API.

**Verify:**
- `npx tsc --noEmit` clean for the file.
- `npx eslint 'src/app/portal/clients/[name]/page.tsx'` clean (mind the react-hooks deps rule).

**Done when:** coach/admin see and use Notes exactly as before; a client-role session (and the loading state) shows no Notes tab, no Notes content, and triggers no notes fetch.

## Out of scope

- No API changes (already 403s clients).
- No change to the rest of the page (roster, assessments, trends) or to broader
  route-level access control for `/portal/clients` (separate concern).

## Conventions

Follow `CLAUDE.md` + the existing `authClient.useSession()` strict-equality role
pattern used in Sidebar.tsx / clients/page.tsx. `'use client'`, `@/` imports.
