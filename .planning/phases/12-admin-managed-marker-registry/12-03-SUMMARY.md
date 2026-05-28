---
phase: 12-admin-managed-marker-registry
plan: 03
subsystem: admin-ui
tags: [admin-ui, react, ssr-gate, dark-portal-brand, form, optimistic-concurrency, cascade-delete]

requires:
  - phase: 12-admin-managed-marker-registry
    plan: 02
    provides: GET/POST /api/admin/markers + GET/PUT/DELETE /api/admin/markers/[testKey] + GET /api/markers (merged registry)
  - phase: 11-report-marker-detail-coach-insights
    provides: admin marker-content page structure (SSR-gated wrapper + client form, hero header pattern, beforeunload dirty guard, optimistic-concurrency 409 handling)
  - phase: 9
    provides: dark portal brand tokens (bg-bg-3, border-line, text-text, text-text-dim, text-gold-brand), MonoEyebrow primitive, FormField primitive
provides:
  - /portal/admin/markers - SSR-gated list page (Phase 9 dark brand) showing all markers grouped by section; SEEDED badge on REPORT_MARKERS rows (link to existing normative + marker-content editors); DB rows with Edit + two-click inline-confirm Delete
  - /portal/admin/markers/new - create form (label auto-derives test_key + data_key with editable override; section/pillar dropdowns; category/subcategory/fallbackUnit; hasNorms toggle gating inline 5-tier ranges editor; AI aliases textarea with D-16 multi-word guidance; severity slider 0..10); POST /api/admin/markers and redirect to /portal/admin/marker-content/[testKey] on 201 (D-06)
  - /portal/admin/markers/[testKey] - edit form (testKey read-only; dataKey input disabled+readOnly with 'Locked after creation' helper; optimistic-concurrency PUT with marker.updatedAt; 409 shows Reload affordance via reloadTick state; cascade delete via two-click inline confirm; cross-links to /portal/admin/normative/[testKey] and /portal/admin/marker-content/[testKey])
  - Admin landing card (ADMIN_SECTIONS) inserted between Marker Content and Audit Logs
affects:
  - 12-04 - the post-create redirect target /portal/admin/marker-content/[testKey] will 404 for DB markers until Plan 04 migrates that editor's REPORT_MARKERS lookup to getReportMarkers()
  - end-user admin workflow - non-developers can now register a new marker end-to-end through the UI (registry row + optional initial unisex range + optional AI aliases)

tech-stack:
  added: []
  patterns:
    - "SSR-gated page wrapping client form: server page does auth.api.getSession + role check + redirect, then renders the 'use client' child with primitive props (testKey: string). Avoids the 'use client + use(params)' chain and keeps the gate impossible to bypass via client-side routing."
    - "react-hooks/set-state-in-effect compliance: never call setState synchronously inside a useEffect body. For data fetching, inline the fetch and only setState from .then/.catch with a cancelled flag; trigger refetch via a reloadTick state increment instead of an imperative load() function."
    - "Derived-state via nullable override: testKeyOverride/dataKeyOverride are null while admin accepts the auto-derived value (computed via deriveTestKey/deriveDataKey on every render); on first edit the override flips to a string and from then on the input is purely controlled. No effect needed to mirror derived state into useState."
    - "Two-click inline destructive confirm: first click sets a confirmKey state (auto-clears after 5s via setTimeout); second click within the window fires the destructive action. Button label + color swap on confirm. Used on both the list-row delete and the edit-page Danger Zone."
    - "Optimistic-concurrency Reload affordance: when PUT returns 409, surface the server's human-readable error string verbatim and render a Reload button that increments reloadTick to refetch the row fresh from the server."
    - "Phase 9 dark portal form composition: rounded-xl border border-line bg-bg-3 p-5 sm:p-6 card sections, FormField primitive for text inputs, native select styled to match (h-12 px-4 bg-bg-3 border-line rounded-lg), mono eyebrows (font-mono text-[11px] uppercase tracking-[0.18em])."
    - "Section-grouped list: ORDERED_SECTIONS [1..10] iterated with per-section header (mono eyebrow + divider + count + DB-count chip); seeded vs DB distinguished by source field on RegistryMarker (from /api/markers)."

key-files:
  created:
    - src/app/portal/admin/markers/page.tsx
    - src/app/portal/admin/markers/MarkersList.tsx
    - src/app/portal/admin/markers/new/page.tsx
    - src/app/portal/admin/markers/new/NewMarkerForm.tsx
    - src/app/portal/admin/markers/[testKey]/page.tsx
    - src/app/portal/admin/markers/[testKey]/EditMarkerForm.tsx
  modified:
    - src/app/portal/admin/page.tsx (added Markers card to ADMIN_SECTIONS)

decisions:
  - "Split each route into an SSR-gated page.tsx + 'use client' child (NewMarkerForm / EditMarkerForm / MarkersList). The SSR shell does the redirect for non-admins; the client child does the data fetching + form. This satisfies the plan's 'SSR admin gate' acceptance criterion uniformly across all three new routes even though the closest Phase 11 analog (marker-content/[marker]/page.tsx) is a single 'use client' page with no SSR gate."
  - "Edit page does NOT show the inline 5-tier ranges editor that the create form has. Editing gender/age range variants requires the dedicated /portal/admin/normative/[testKey] editor; the marker edit page only exposes hasNorms as a boolean toggle (with a helper sentence pointing at the cross-link). This avoids two editors competing for the same range data and matches D-12's deferred-editing flow."
  - "Delete confirm window: 5 seconds. Long enough that an admin can read 'Confirm delete - this also clears marker_content and normative ranges' and click again deliberately; short enough that a stray click won't linger and accidentally fire a delete later. Auto-clears via setTimeout in a useEffect cleanup."
  - "Section labels (SECTION_LABELS in MarkersList) hardcoded inline rather than reading from a config. Section names are stable; centralizing them in a new file isn't worth the indirection for a 10-entry map."
  - "Pillar dropdown labels (PILLAR_LABELS) defined inline in both NewMarkerForm and EditMarkerForm rather than shared via a barrel. The two forms are small and the labels are visual-only - keeping them adjacent to the JSX where they're used is clearer than a shared module."
  - "Form action button placement: 'Save & continue to content' on create (signals the D-06 redirect) vs 'Save changes' on edit (no redirect). The label sets expectations."

metrics:
  duration: "9m 53s"
  completed_at: "2026-05-28T08:34:39Z"
  tasks_completed: 3
  files_changed: 7
  commits: 4
  lines_added: 1638
---

# Phase 12 Plan 03: Admin UI - List, Create, Edit Markers Summary

## One-Liner

Built the three admin UI pages (list + create + edit) and a landing-card entry that turn the marker registry from "developer-only" into an admin workflow: register a new marker end-to-end through the browser (with initial ranges + AI aliases), and route into the existing Phase 11 marker-content editor for the second authoring step (D-06).

## What Was Built

### 1. Admin landing card (`src/app/portal/admin/page.tsx`)

Inserted a `Markers` entry into `ADMIN_SECTIONS` between `Marker Content` and `Audit Logs` per 12-PATTERNS section 8. The card is rendered automatically by the existing `.map()` at line 97 of the admin page, so no other code change was needed.

### 2. List page (`src/app/portal/admin/markers/page.tsx` + `MarkersList.tsx`)

- SSR-gated server component (auth.api.getSession + redirect) wraps a client `<MarkersList />`.
- Hero header: breadcrumb back to /portal/admin, `ADMIN · REGISTRY` mono eyebrow, h1 `Markers`, descriptive subtitle, top-right `Add marker` CTA linking to `/portal/admin/markers/new`.
- `MarkersList` fetches `/api/markers` (merged seed + DB), groups by section (1..10), and renders one row per marker:
  - Seeded rows carry a muted `SEEDED` badge and expose `Ranges` + `Content` links pointing at the existing Phase 3 / Phase 11 editors.
  - DB rows carry a gold `DB` badge and expose `Edit` (link) + `Delete` (two-click inline confirm). Confirmed delete fires `DELETE /api/admin/markers/[testKey]` and refreshes the list via a `reloadTick` state increment.
- Search input filters by label / testKey / category / subcategory; per-section header shows the row count and a `N DB` chip when DB rows are present.

### 3. Create page (`src/app/portal/admin/markers/new/page.tsx` + `NewMarkerForm.tsx`)

- SSR shell + client form.
- Form sections (rounded-xl Phase 9 dark cards):
  1. **Identity** - label (required); auto-derived `test_key` (snake_case via `deriveTestKey`) and `data_key` (camelCase via `deriveDataKey`) shown as read-only mono text, with an `Edit` button that toggles them into editable inputs. Client-side regex validation matches the server contract (`^[a-z][a-z0-9_]*$` and `^[a-z][a-zA-Z0-9]*$`).
  2. **Placement** - section dropdown (1..10, default 5), pillar dropdown (5 PILLAR_KEYS with human-readable labels), category (required), subcategory (optional), fallbackUnit (optional).
  3. **Normative ranges** - `hasNorms` toggle (default ON). When ON, shows an optional initialUnit field and the inline 5-tier min/max grid (poor / cautious / normal / great / elite) cloned from the normative editor.
  4. **AI extraction aliases** - textarea with the D-16 guidance copy: *"Be specific. Prefer multi-word terms (e.g. 'apolipoprotein b' not 'iron'). Markers without aliases are manual-entry only."*
  5. **Red flag severity** - 0..10 range slider with live value readout (default 5).
- Submit POSTs to `/api/admin/markers`. On 201, `router.push('/portal/admin/marker-content/[testKey]')` per D-06. 400/409 errors render inline next to the submit button.

### 4. Edit page (`src/app/portal/admin/markers/[testKey]/page.tsx` + `EditMarkerForm.tsx`)

- SSR shell + client form.
- Loads marker via `GET /api/admin/markers/[testKey]` and prefills every editable field. 404 renders a friendly "Marker not found" view with cross-links to the seeded-marker editors (a seeded testKey will 404 here per Plan 02 GET, by design - D-12).
- Locked section: `testKey` displayed as read-only mono text; `dataKey` rendered as a `disabled readOnly` input with the helper "Locked after creation - changing this would orphan existing assessment data." (mirrors the server-side D-13 guard).
- Editable: label, section, pillar, category, subcategory, fallbackUnit, hasNorms toggle, aiAliases textarea, severityWeight slider.
- Save PUTs with `marker.updatedAt` for optimistic concurrency. On 409, surfaces the server error and renders a `Reload` button that increments `reloadTick` to refetch the row.
- Beforeunload guard warns on unsaved changes.
- Cross-links section: `Edit ranges (gender / age) -> /portal/admin/normative/[testKey]` and `Edit content (definition / impact / coach insights) -> /portal/admin/marker-content/[testKey]`.
- Danger zone: two-click inline confirm (auto-clears after 5s). On confirmed click, `DELETE /api/admin/markers/[testKey]` fires; on success, `router.push('/portal/admin/markers')`.

## Deviations from Plan

**1. [Rule 1 - Bug] react-hooks/set-state-in-effect lint errors**
- **Found during:** Task 3 post-implementation lint check (`npx eslint src/app/portal/admin/markers/`).
- **Issue:** All three new client files called setState synchronously inside `useEffect` bodies (`MarkersList.load()` did `setLoading(true)` before the fetch; `NewMarkerForm` had an effect mirroring derived test_key/data_key into useState; `EditMarkerForm.load()` did the same). Three errors total, each blocking lint clean.
- **Fix:** Refactored all three to compliant patterns:
  - `MarkersList` + `EditMarkerForm`: inline the fetch inside the useEffect with a `cancelled` flag; expose a `reload()` helper that increments a `reloadTick` state, which is in the effect's dependency array (no setState happens synchronously - all setState calls live inside `.then` / `.catch`).
  - `NewMarkerForm`: replaced the effect with a nullable-override pattern. `testKeyOverride`/`dataKeyOverride` are `null` while accepting the auto-derive; `testKey = testKeyOverride ?? deriveTestKey(label)` is computed inline every render. The `Edit` button doesn't toggle a separate "edited" flag; the first character typed flips the override from null to a string.
- **Files modified:** all 3 new client components.
- **Commit:** `5b273b8`

No Rule 2 (missing critical functionality), Rule 3 (blocking issues), or Rule 4 (architectural) deviations.

## Task 4 Smoke Test - Result

`Task 4` is the `checkpoint:human-verify` smoke gate. With `auto_advance: true` config and no `gate="blocking-human"` marker on this checkpoint (it is not a package-legitimacy gate), the executor auto-approves and records the automated verification it could perform:

- **Build:** `npm run build` succeeded. All three new routes (`/portal/admin/markers`, `/portal/admin/markers/[testKey]`, `/portal/admin/markers/new`) appear in the Next.js route manifest as dynamic functions.
- **Type-check:** `npx tsc --noEmit` clean on all 7 new/modified source files (pre-existing test errors in `__tests__/` are unrelated).
- **Lint:** `npx eslint src/app/portal/admin/markers/` clean (no warnings, no errors).
- **HTTP smoke:** `curl /portal/admin/markers` and `curl /portal/admin/markers/new` both return `HTTP 307` (redirect to /login) - confirms the SSR admin gate is functioning. Authenticated UAT is left to the orchestrator's verifier step.

**Step 5 deferral (expected):** The post-create redirect lands on `/portal/admin/marker-content/[testKey]`. For DB-only markers, the marker-content editor currently does `REPORT_MARKERS.find((m) => m.testKey === marker)` (line 70 of that page) and will not find the row, surfacing a stale-content state. Per the plan's "step 5 deferred to Plan 04" note and 12-PATTERNS section 15 ("MIGRATE - must accept DB-marker testKeys, otherwise the post-create redirect (D-06) 404s. Critical for v1."), Plan 12-04 must migrate that page's REPORT_MARKERS lookup to `getReportMarkers()`. Documented here as a known follow-up, not a blocker for 12-03.

## Verification

- [x] Admin landing page has the `Markers` card (between Marker Content and Audit Logs)
- [x] List page renders all markers grouped by section with seeded vs DB distinction
- [x] Create form captures every field Plan 02 validates and redirects to marker-content on success
- [x] Edit page enforces dataKey lock (disabled + readOnly + helper), optimistic concurrency via updatedAt, cascade delete via two-click confirm
- [x] All surfaces use Phase 9 dark portal brand tokens (bg-bg-3, border-line, text-text, text-text-dim, text-gold-brand, MonoEyebrow)
- [x] `npx tsc --noEmit` clean (no source errors)
- [x] `npx eslint src/app/portal/admin/markers/` clean
- [x] `npm run build` succeeded; all three routes in manifest
- [x] HTTP smoke: non-authenticated request to `/portal/admin/markers` returns 307 redirect (SSR gate working)

## Commits

| Hash    | Message                                                  |
| ------- | -------------------------------------------------------- |
| a6494ec | feat(12-03): admin markers nav card + list page          |
| 6b39700 | feat(12-03): create-marker form at /portal/admin/markers/new |
| 053f3b1 | feat(12-03): edit-marker page with data_key lock + cascade delete |
| 5b273b8 | fix(12-03): silence react-hooks/set-state-in-effect on markers UI |

## Known Stubs

None - every UI affordance maps to a working Plan 02 API endpoint.

## Threat Flags

None - no new network endpoints, auth paths, or trust-boundary surfaces introduced. UI surfaces are SSR-gated on the admin role and consume API routes that also enforce `requireAdmin()` server-side (defense in depth). The dataKey lock is UX-only per the plan's threat register T-12-11 (server is the authority).

## Self-Check: PASSED

- [x] src/app/portal/admin/markers/page.tsx exists
- [x] src/app/portal/admin/markers/MarkersList.tsx exists
- [x] src/app/portal/admin/markers/new/page.tsx exists
- [x] src/app/portal/admin/markers/new/NewMarkerForm.tsx exists
- [x] src/app/portal/admin/markers/[testKey]/page.tsx exists
- [x] src/app/portal/admin/markers/[testKey]/EditMarkerForm.tsx exists
- [x] src/app/portal/admin/page.tsx modified (Markers card present in ADMIN_SECTIONS)
- [x] commit a6494ec in git log
- [x] commit 6b39700 in git log
- [x] commit 053f3b1 in git log
- [x] commit 5b273b8 in git log
